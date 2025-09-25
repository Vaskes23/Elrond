from __future__ import annotations
from typing import Any, Dict
from datetime import datetime

# Placeholder: use ElevenLabs tools later

def summarize_call(call_id: str, product: Any, candidates: Any, jurisdiction: str, language: str = "en") -> Dict[str, Any]:
    now = datetime.utcnow().isoformat() + "Z"
    return {
        "call_metadata": {
            "jurisdiction": jurisdiction,
            "language": language,
            "dial_path": [],
            "timestamps": {"created_at": now, "completed_at": now},
        },
        "contact": {"officer_name": None, "department": None},
        "product": product,
        "candidates_considered": candidates,
        "officer_guidance": {
            "advice_type": None,
            "recommended_code": None,
            "legal_basis": [],
            "quotes": [],
        },
        "next_steps": [],
        "confidence": {"level": "low", "rationale": "placeholder"},
        "attachments": {"recording_url": None, "transcript_url": None},
        "compliance_notes": [],
        "fail_reasons": [],
    }
