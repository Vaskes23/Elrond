from __future__ import annotations

def kb(topic: str) -> str:
    topic = (topic or "").strip().lower()
    if topic in {"hs", "harmonized system"}:
        return "HS is a standardized nomenclature for classifying traded products (WCO)."
    if topic in {"cn", "combined nomenclature"}:
        return "CN is the EU’s 8-digit goods classification derived from HS."
    if topic in {"bti", "binding tariff information"}:
        return "BTI is an EU ruling providing binding classification for a product."
    if topic in {"gri", "general rules of interpretation"}:
        return "GRIs are the legal rules for classifying goods within HS/CN."
    return ""
