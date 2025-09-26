from __future__ import annotations
import argparse
import json
from datetime import datetime
from typing import Any, Dict, List

from . import telephony
from . import transcripts
from . import summarize
from . import precedents

DE_CUSTOMS = "+49 69 20971-545"
AT_CUSTOMS = "+43 50 233 561"


def run_demo(product_title: str, product_description: str, jurisdiction: str, language: str = "en") -> None:
    # Fake candidate list
    candidates: List[Dict[str, Any]] = [
        {"code": "8471.30", "reason": "portable data processing machine"},
        {"code": "8517.12", "reason": "cellular device"},
    ]

    # Choose number by jurisdiction hint (no real dialing, just metadata)
    number = DE_CUSTOMS if jurisdiction.lower().startswith("de") else AT_CUSTOMS

    # Simulate call lifecycle
    call_id = telephony.dial_customs_helpdesk(number, ivr=True)

    # Create one transcript JSON file per session (using default naming)
    # Append a few turns
    session_file = transcripts.session_filename()

    transcripts.append_transcript(call_id, f"Agent: Hello, this is Durin calling the customs helpdesk.", session_file)
    transcripts.append_transcript(call_id, f"Agent: Product: {product_title}. {product_description}", session_file)
    transcripts.append_transcript(call_id, "Officer: Please provide key materials and intended use.", session_file)
    transcripts.append_transcript(call_id, "Agent: Understood. We seek guidance on correct CN classification.", session_file)

    # Produce placeholder summary (to be replaced with ElevenLabs summarization later)
    product_payload = {
        "title": product_title,
        "description": product_description,
        "key_facts": [],
    }

    summary = summarize.summarize_call(
        call_id=call_id,
        product=product_payload,
        candidates=candidates,
        jurisdiction=jurisdiction,
        language=language,
    )

    # Link transcript file path into summary attachments
    summary.setdefault("attachments", {})["transcript_url"] = transcripts.get_transcript_url(call_id, session_file)

    # Store as a precedent file
    precedent_path = precedents.store_precedent(summary)

    # End call (simulated)
    telephony.end_call(call_id)

    # Print outputs for CLI users
    print("=== Demo Call Complete ===")
    print(f"Call ID: {call_id}")
    print(f"Jurisdiction: {jurisdiction} | Number: {number}")
    print(f"Transcript file: {summary['attachments']['transcript_url']}")
    print(f"Precedent file: {precedent_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Simulate a Durin call (no dialing).")
    parser.add_argument("--jurisdiction", default="DE", help="Jurisdiction hint (e.g., DE or AT). Default: DE")
    parser.add_argument("--language", default="en", help="Language code. Default: en")
    parser.add_argument("--title", required=False, default="Laptop Computer", help="Product title")
    parser.add_argument(
        "--description",
        required=False,
        default="14-inch portable laptop with aluminum chassis and cellular modem option.",
        help="Product description",
    )
    args = parser.parse_args()

    run_demo(
        product_title=args.title,
        product_description=args.description,
        jurisdiction=args.jurisdiction,
        language=args.language,
    )


if __name__ == "__main__":
    main()
