from __future__ import annotations
from typing import List
import uuid

_FAKE_ACTIVE_CALLS = {}


def dial_customs_helpdesk(number: str, ivr: bool = True) -> str:
    call_id = str(uuid.uuid4())
    _FAKE_ACTIVE_CALLS[call_id] = {"number": number, "ivr": ivr, "status": "connected"}
    return call_id


def play_keypad_tone(sequence: List[str]) -> bool:
    return True


def end_call(call_id: str) -> bool:
    if call_id in _FAKE_ACTIVE_CALLS:
        _FAKE_ACTIVE_CALLS[call_id]["status"] = "ended"
        return True
    return False
