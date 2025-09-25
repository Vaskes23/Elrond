from __future__ import annotations
import argparse
from typing import Any, Dict, List
from datetime import datetime

from . import telephony
from . import transcripts
from . import summarize
from . import precedents

DE_CUSTOMS = "+49 69 20971-545"
AT_CUSTOMS = "+43 50 233 561"


def prompt(prompt_text: str) -> str:
    try:
        return input(prompt_text)
    except EOFError:
        return ""


def run_interactive(jurisdiction: str, language: str = "en", title: str | None = None, description: str | None = None) -> None:
    candidates: List[Dict[str, Any]] = [
        {"code": "8471.30", "reason": "portable data processing machine"},
        {"code": "8517.12", "reason": "cellular device"},
    ]

    number = DE_CUSTOMS if jurisdiction.lower().startswith("de") else AT_CUSTOMS

    call_id = telephony.dial_customs_helpdesk(number, ivr=True)
    session_file = transcripts.session_filename()

    # Greeting
    agent_line = "Hello, this is Durin from Elrond calling the customs helpdesk."
    print(f"Agent: {agent_line}")
    transcripts.append_transcript(call_id, f"Agent: {agent_line}", session_file)

    # Product info
    if not title:
        title = prompt("Officer: (You) What's the product title? ") or "Unknown Product"
    transcripts.append_transcript(call_id, f"Officer: {title}", session_file)

    if not description:
        description = prompt("Officer: (You) Briefly describe the product: ") or "No description provided."
    transcripts.append_transcript(call_id, f"Officer: {description}", session_file)

    # Present candidates
    line = (
        "We have candidate CN codes "
        + ", ".join([c["code"] for c in candidates])
        + ". Could you advise the correct code and legal basis (notes/BTIs)?"
    )
    print(f"Agent: {line}")
    transcripts.append_transcript(call_id, f"Agent: {line}", session_file)

    # Officer guidance
    guidance = prompt("Officer: (You) Provide recommended code and legal basis: ")
    transcripts.append_transcript(call_id, f"Officer: {guidance}", session_file)

    # Confirmation
    confirm_line = "To confirm, is that recommendation correct and complete?"
    print(f"Agent: {confirm_line}")
    transcripts.append_transcript(call_id, f"Agent: {confirm_line}", session_file)

    confirm_reply = prompt("Officer: (You) Yes/No and any corrections: ")
    transcripts.append_transcript(call_id, f"Officer: {confirm_reply}", session_file)

    # Wrap up
    wrap_line = "Thank you. We will record this guidance and store the precedent."
    print(f"Agent: {wrap_line}")
    transcripts.append_transcript(call_id, f"Agent: {wrap_line}", session_file)

    product_payload = {"title": title, "description": description, "key_facts": []}

    summary = summarize.summarize_call(
        call_id=call_id,
        product=product_payload,
        candidates=candidates,
        jurisdiction=jurisdiction,
        language=language,
    )

    # Attach transcript path
    summary.setdefault("attachments", {})["transcript_url"] = transcripts.get_transcript_url(call_id, session_file)

    precedent_path = precedents.store_precedent(summary)
    telephony.end_call(call_id)

    print("\n=== Interactive Demo Complete ===")
    print(f"Call ID: {call_id}")
    print(f"Jurisdiction: {jurisdiction} | Number: {number}")
    print(f"Transcript: {summary['attachments']['transcript_url']}")
    print(f"Precedent: {precedent_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Interactive Durin CLI (no real dialing)")
    parser.add_argument("--jurisdiction", default="DE", help="Jurisdiction hint (DE/AT). Default: DE")
    parser.add_argument("--language", default="en", help="Language code. Default: en")
    parser.add_argument("--title", default=None, help="Optional product title to prefill")
    parser.add_argument("--description", default=None, help="Optional product description to prefill")
    args = parser.parse_args()

    run_interactive(
        jurisdiction=args.jurisdiction,
        language=args.language,
        title=args.title,
        description=args.description,
    )


if __name__ == "__main__":
    main()
