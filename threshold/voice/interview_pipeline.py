"""Pipecat voice interview pipeline — assembles transport, STT, LLM, TTS,
engagement tracking, and the MI-grounded FlowManager.

Run with:
    python -m threshold.voice.bot
"""
from __future__ import annotations

import logging
import os
import re

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.frames.frames import Frame, TextFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
from pipecat.transports.base_transport import BaseTransport

from pipecat_flows import FlowManager

from threshold.services.interview_context import InterviewCache

from .engagement_tracker import EngagementTracker
from .interview_flow import MI_ROLE_MESSAGE, create_welcome_phase
from .interview_tools import DEFAULT_USER_ID, set_cache, set_event_callback
from .shared_state import mark_inactive, set_phase

logger = logging.getLogger(__name__)

# Matches tool-call-like text: word(anything) or word('anything')
_TOOL_CALL_RE = re.compile(
    r"\b(?:save_field|log_observation|mark_needs_help|advance_phase|crisis_response|adjust_voice)"
    r"\s*\([^)]*\)\s*",
    re.IGNORECASE,
)


class ToolCallTextFilter(FrameProcessor):
    """Strips leaked tool-call syntax from LLM text before it reaches TTS.

    Important: don't touch whitespace on frames that have no tool-call match.
    Streaming LLM text relies on leading/trailing spaces for word boundaries.
    """

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        if isinstance(frame, TextFrame) and frame.text:
            if _TOOL_CALL_RE.search(frame.text):
                cleaned = _TOOL_CALL_RE.sub(" ", frame.text)
                cleaned = re.sub(r"  +", " ", cleaned)
                logger.warning("[filter] stripped tool-call text: %r -> %r", frame.text, cleaned)
                if cleaned.strip():
                    frame.text = cleaned
                    await self.push_frame(frame, direction)
            else:
                await self.push_frame(frame, direction)
        else:
            await self.push_frame(frame, direction)

DEFAULT_ELEVENLABS_VOICE_ID = os.getenv(
    "ELEVENLABS_VOICE_ID", "nPczCjzI2devNBz1zQrb"  # Brian
)


async def run_interview(
    transport: BaseTransport,
    *,
    runner_args=None,
    event_callback=None,
    on_complete=None,
):
    """Start the voice interview pipeline on any Pipecat transport.

    Args:
        transport: A Pipecat transport (SmallWebRTCTransport, DailyTransport, etc.)
        runner_args: Optional RunnerArguments from the Pipecat dev runner.
        event_callback: Optional async callback(event_type, data) for
            broadcasting real-time events to the frontend.
        on_complete: Optional async callback(flow_state) called when the
            interview ends, with all saved fields and observations.
    """
    if event_callback:
        set_event_callback(event_callback)

    # --- STT ---
    stt = DeepgramSTTService(api_key=os.getenv("DEEPGRAM_API_KEY"))

    # --- LLM ---
    llm = OpenAILLMService(
        api_key=os.getenv("OPENAI_API_KEY"),
        settings=OpenAILLMService.Settings(
            model="gpt-4o-mini",
            max_tokens=1024,
            temperature=0.7,
            system_instruction=MI_ROLE_MESSAGE,
        ),
    )

    # --- TTS ---
    tts = ElevenLabsTTSService(
        api_key=os.getenv("ELEVENLABS_API_KEY"),
        settings=ElevenLabsTTSService.Settings(
            voice=DEFAULT_ELEVENLABS_VOICE_ID,
            model="eleven_turbo_v2_5",
            stability=0.7,
            similarity_boost=0.75,
            speed=0.95,
        ),
    )

    # --- Engagement Tracker ---
    engagement_tracker = EngagementTracker(event_callback=event_callback)

    # --- Tool-call text filter (between LLM and TTS) ---
    tool_call_filter = ToolCallTextFilter()

    # --- Context + Aggregators ---
    context = LLMContext()
    context_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            vad_analyzer=SileroVADAnalyzer(
                params=VADParams(
                    min_volume=0.5,
                    stop_secs=1.2,
                )
            ),
        ),
    )

    # --- Pipeline ---
    pipeline = Pipeline([
        transport.input(),
        stt,
        engagement_tracker,
        context_aggregator.user(),
        llm,
        tool_call_filter,
        tts,
        transport.output(),
        context_aggregator.assistant(),
    ])

    idle_timeout = getattr(runner_args, "pipeline_idle_timeout_secs", None)
    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True,
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
        idle_timeout_secs=idle_timeout,
    )

    # --- Flow Manager ---
    flow_manager = FlowManager(
        task=task,
        llm=llm,
        context_aggregator=context_aggregator,
        transport=transport,
    )

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info("[interview] client connected — loading profile cache")
        from threshold.db.database import get_db
        cache = InterviewCache()
        db = get_db()
        try:
            cache.load(db, DEFAULT_USER_ID)
        finally:
            db.close()
        set_cache(cache)

        welcome_node = create_welcome_phase()
        tool_names = [f.name for f in welcome_node.get("functions", [])]
        logger.warning("[interview] starting welcome phase — tools: %s", tool_names)
        flow_manager.state["current_phase"] = "welcome"
        set_phase("welcome")
        await flow_manager.initialize(welcome_node)

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("[interview] client disconnected — clearing cache")
        set_cache(None)
        mark_inactive()
        if on_complete:
            try:
                await on_complete(flow_manager.state)
            except Exception as e:
                logger.error("[interview] on_complete callback failed: %s", e)
        await task.cancel()

    handle_sigint = getattr(runner_args, "handle_sigint", True)
    runner = PipelineRunner(handle_sigint=handle_sigint)
    await runner.run(task)

    return flow_manager.state
