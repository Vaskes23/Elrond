from __future__ import annotations
import argparse
import os
from typing import Any, Dict, List
from pathlib import Path

# Load local .env if available (CWD and project root fallback)
try:
    from dotenv import load_dotenv  # type: ignore
    # 1) Try CWD
    load_dotenv()
    # 2) Try project root (one level up from this file)
    root_env = Path(__file__).resolve().parents[1] / ".env"
    if root_env.exists():
        load_dotenv(dotenv_path=root_env)
except Exception:
    pass

from .clients import ChatBackend, MockChatClient, ElevenLabsChatClient, ElevenLabsWebSocketClient, ChatMessage
from . import transcripts, summarize, precedents


def choose_backend(name: str) -> ChatBackend:
    if name == "mock":
        return MockChatClient()
    if name == "elevenlabs":
        return ElevenLabsChatClient()
    if name == "elevenlabs-ws":
        return ElevenLabsWebSocketClient()
    raise ValueError("Unknown backend: " + name)


def run_chat(backend: ChatBackend, jurisdiction: str, language: str) -> None:
    session_id = backend.start_session()
    call_id = session_id  # reuse for local logging
    session_file = transcripts.session_filename()

    print("Type your messages. Ctrl+C to exit.")

    try:
        while True:
            user_text = input("You: ")
            transcripts.append_transcript(call_id, f"User: {user_text}", session_file)
            reply = backend.send(session_id, ChatMessage(role="user", content=user_text))
            print("Agent:", reply.content)
            transcripts.append_transcript(call_id, f"Agent: {reply.content}", session_file)
    except KeyboardInterrupt:
        pass

    # Create placeholder summary at end of session
    product_payload: Dict[str, Any] = {"title": None, "description": None, "key_facts": []}
    candidates: List[Dict[str, Any]] = []
    summary = summarize.summarize_call(call_id, product_payload, candidates, jurisdiction, language)
    summary.setdefault("attachments", {})["transcript_url"] = transcripts.get_transcript_url(call_id, session_file)
    path = precedents.store_precedent(summary)
    print("\nSaved transcript and precedent:")
    print(" - Transcript:", summary["attachments"]["transcript_url"])
    print(" - Precedent:", path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Text chat CLI for Durin with pluggable backend")
    parser.add_argument("--backend", default="mock", choices=["mock", "elevenlabs", "elevenlabs-ws"], help="Choose chat backend")
    parser.add_argument("--jurisdiction", default="DE")
    parser.add_argument("--language", default="en")
    args = parser.parse_args()

    backend = choose_backend(args.backend)

    # Special handling for WebSocket backend
    if args.backend == "elevenlabs-ws":
        print("Starting WebSocket connection to ElevenLabs...")
        print("This may take a moment to establish the connection...")

    run_chat(backend, jurisdiction=args.jurisdiction, language=args.language)


if __name__ == "__main__":
    main()
