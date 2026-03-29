"""Real-time engagement tracking processor for the voice interview pipeline.

Sits in the Pipecat pipeline between STT and the User Context Aggregator.
Observes user transcription frames without modifying the stream — maintains
a rolling engagement score based on behavioral signals.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field

from pipecat.frames.frames import (
    Frame,
    TranscriptionFrame,
    TTSStartedFrame,
    TTSStoppedFrame,
    TTSUpdateSettingsFrame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.services.elevenlabs.tts import ElevenLabsTTSSettings

logger = logging.getLogger(__name__)

AVOIDANCE_PHRASES = {
    "i don't know",
    "i dunno",
    "not sure",
    "whatever",
    "next question",
    "i'd rather not",
    "skip",
    "i don't want to",
    "can we move on",
    "doesn't matter",
    "i guess",
    "sure",
}

LOW_ENGAGEMENT_THRESHOLD = 0.4
RECOVERY_THRESHOLD = 0.6


@dataclass
class EngagementState:
    """Rolling engagement measurements."""
    score: float = 0.7
    response_latencies: list[float] = field(default_factory=list)
    response_lengths: list[int] = field(default_factory=list)
    avoidance_count: int = 0
    turn_count: int = 0
    last_agent_stop_time: float | None = None
    agent_speaking: bool = False
    vad_extended: bool = False

    @property
    def trend(self) -> str:
        if len(self.response_lengths) < 3:
            return "stable"
        recent = self.response_lengths[-3:]
        earlier = self.response_lengths[-6:-3] if len(self.response_lengths) >= 6 else self.response_lengths[:3]
        avg_recent = sum(recent) / len(recent)
        avg_earlier = sum(earlier) / len(earlier)
        if avg_recent < avg_earlier * 0.6:
            return "declining"
        if avg_recent > avg_earlier * 1.3:
            return "improving"
        return "stable"


class EngagementTracker(FrameProcessor):
    """Pipecat processor that tracks user engagement signals.

    Passthrough processor — all frames are forwarded unchanged. It observes
    TranscriptionFrame (user speech) and TTS frames (agent speech) to compute
    a rolling engagement score.

    The score and trend are available via get_engagement() and can be polled
    by the FlowManager or broadcast to the frontend.
    """

    def __init__(self, event_callback=None, **kwargs):
        super().__init__(**kwargs)
        self._state = EngagementState()
        self._event_callback = event_callback

    def get_engagement(self) -> dict:
        return {
            "score": round(self._state.score, 2),
            "trend": self._state.trend,
            "turn_count": self._state.turn_count,
            "avoidance_count": self._state.avoidance_count,
        }

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, TTSStartedFrame):
            self._state.agent_speaking = True

        elif isinstance(frame, TTSStoppedFrame):
            self._state.agent_speaking = False
            self._state.last_agent_stop_time = time.monotonic()

        elif isinstance(frame, TranscriptionFrame) and not self._state.agent_speaking:
            await self._process_user_turn(frame.text)

        await self.push_frame(frame, direction)

    async def _process_user_turn(self, text: str):
        self._state.turn_count += 1
        text_lower = text.strip().lower()
        word_count = len(text.split())

        # Response latency
        if self._state.last_agent_stop_time is not None:
            latency = time.monotonic() - self._state.last_agent_stop_time
            self._state.response_latencies.append(latency)

        # Response length
        self._state.response_lengths.append(word_count)

        # Avoidance detection
        is_avoidant = any(phrase in text_lower for phrase in AVOIDANCE_PHRASES)
        if is_avoidant:
            self._state.avoidance_count += 1

        self._update_score(word_count, is_avoidant)

        if self._event_callback:
            try:
                await self._event_callback("engagement_update", self.get_engagement())
            except Exception:
                pass

    def _update_score(self, word_count: int, is_avoidant: bool):
        score = self._state.score

        # Length signal: very short responses pull score down
        if word_count <= 2:
            score -= 0.08
        elif word_count <= 5:
            score -= 0.03
        elif word_count >= 20:
            score += 0.05

        # Avoidance signal
        if is_avoidant:
            score -= 0.12

        # Latency signal (if we have enough data)
        if len(self._state.response_latencies) >= 2:
            recent_lat = self._state.response_latencies[-1]
            avg_lat = sum(self._state.response_latencies[:-1]) / len(self._state.response_latencies[:-1])
            if recent_lat > avg_lat * 2.0:
                score -= 0.06

        # Trend signal
        if self._state.trend == "declining":
            score -= 0.03
        elif self._state.trend == "improving":
            score += 0.03

        # Gradual recovery toward baseline
        score += (0.7 - score) * 0.05

        self._state.score = max(0.0, min(1.0, score))
