from __future__ import annotations
import os
import json
from typing import Any, Dict, List

from .transcripts import TRANSCRIPTS_DIR

_PRECEDENTS_DIR = os.path.join(TRANSCRIPTS_DIR, "precedents")


def _ensure_dir() -> None:
    os.makedirs(_PRECEDENTS_DIR, exist_ok=True)


def store_precedent(summary: Dict[str, Any]) -> str:
    _ensure_dir()
    key = summary.get("call_metadata", {}).get("timestamps", {}).get("created_at") or "unknown"
    safe = key.replace(":", "-")
    path = os.path.join(_PRECEDENTS_DIR, f"precedent-{safe}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    return path


def list_precedents(limit: int = 10) -> List[Dict[str, Any]]:
    _ensure_dir()
    files = sorted(
        [f for f in os.listdir(_PRECEDENTS_DIR) if f.endswith(".json")],
        reverse=True,
    )[: max(0, limit)]
    results: List[Dict[str, Any]] = []
    for name in files:
        path = os.path.join(_PRECEDENTS_DIR, name)
        try:
            with open(path, "r", encoding="utf-8") as f:
                results.append(json.load(f))
        except Exception:
            continue
    return results
