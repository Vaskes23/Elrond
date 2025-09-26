from __future__ import annotations
import time


def detect_language(text: str) -> str:
    # Placeholder: default to English; can be swapped for real detection
    return "en"


def skip_turn(ms: int = 15000) -> None:
    time.sleep(max(0, ms) / 1000.0)
