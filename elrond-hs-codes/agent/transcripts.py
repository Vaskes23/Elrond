from __future__ import annotations
import os
from datetime import datetime
from typing import Optional

TRANSCRIPTS_DIR = os.getenv("TRANSCRIPTS_DIR", "transcripts")


def _ensure_dir() -> None:
    os.makedirs(TRANSCRIPTS_DIR, exist_ok=True)


def session_filename(dt: Optional[datetime] = None) -> str:
    dt = dt or datetime.utcnow()
    return f"session-{dt.strftime('%Y%m%d-%H%M%S')}.json"


def append_transcript(call_id: str, text: str, filename: Optional[str] = None) -> str:
    _ensure_dir()
    path = os.path.join(TRANSCRIPTS_DIR, filename or session_filename())
    payload = {"call_id": call_id, "timestamp": datetime.utcnow().isoformat() + "Z", "text": text}
    # One JSON object per line for easy appends
    with open(path, "a", encoding="utf-8") as f:
        f.write(__import__("json").dumps(payload, ensure_ascii=False) + "\n")
    return path


def get_transcript_text(call_id: str, filename: str) -> str:
    path = os.path.join(TRANSCRIPTS_DIR, filename)
    if not os.path.exists(path):
        return ""
    lines = []
    import json
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                obj = json.loads(line)
                if obj.get("call_id") == call_id and obj.get("text"):
                    lines.append(obj["text"])
            except Exception:
                continue
    return "\n".join(lines)


def get_transcript_url(call_id: str, filename: str) -> str:
    # For now return a local file path URL
    return os.path.join(TRANSCRIPTS_DIR, filename)
