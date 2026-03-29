"""Standalone voice interview bot entry point using Pipecat's dev runner.

Run with:
    python -m threshold.voice.bot

Serves the client at http://localhost:7860/client
"""
from __future__ import annotations

import os
import sys

from dotenv import load_dotenv

load_dotenv(override=True)

_project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from pipecat.runner.types import RunnerArguments
from pipecat.runner.utils import create_transport
from pipecat.transports.base_transport import TransportParams

from threshold.voice.interview_pipeline import run_interview
from threshold.voice.session_manager import make_event_callback, register_local_session

transport_params = {
    "webrtc": lambda: TransportParams(
        audio_in_enabled=True,
        audio_out_enabled=True,
        audio_out_sample_rate=24000,
        audio_in_sample_rate=16000,
    ),
}


async def bot(runner_args: RunnerArguments):
    """Main bot entry point called by Pipecat's dev runner."""
    transport = await create_transport(runner_args, transport_params)

    session = register_local_session()
    event_cb = make_event_callback(session.session_id)

    async def on_complete(flow_state):
        from threshold.voice.session_manager import end_session
        await end_session(session.session_id, flow_state)

    await run_interview(
        transport,
        runner_args=runner_args,
        event_callback=event_cb,
        on_complete=on_complete,
    )


if __name__ == "__main__":
    from pipecat.runner.run import main
    main()
