"""
LLM-as-a-judge: an independent second opinion on a field.
Text-in, text-out — reasons over the extracted value + source, never an image.

STUB-FIRST: if GEMINI_API_KEY is missing or the call fails, returns a sensible
fallback verdict so the demo never breaks. Flip on the real call by setting
the key in the environment.

The verdict is ADVISORY. It may include a suggested value, but it never
changes anything — the human applies it with one click, or ignores it.
"""

from __future__ import annotations

import os
import json

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.database import get_session
from app.models import FieldModel

router = APIRouter(prefix="/api/fields", tags=["second-opinion"])

GEMINI_KEY = os.getenv("GEMINI_API_KEY")


def _build_prompt(field: FieldModel) -> str:
    prov = field.provenance
    flags = "; ".join(f.get("message", "") for f in (field.flags or [])) or "none"

    lines = [
        "You are a second reviewer double-checking a value a tax-extraction AI produced.",
        "You reason ONLY about what you're told — you cannot see the document image.",
        "",
        f"Field: {field.label} (Form {field.form}, line {field.line})",
        f"Extracted value: {field.value}",
        f"Provenance type: {prov.get('type')}",
    ]
    if prov.get("type") == "extracted":
        lines += [
            f"Source document: {prov.get('source_doc')}",
            f"Raw text read: {prov.get('raw_text')}",
            f"Extractor confidence: {prov.get('confidence')}",
        ]
    if prov.get("type") == "conflicted":
        cands = prov.get("candidates", [])
        lines.append("Two sources disagree:")
        for c in cands:
            lines.append(f"  - {c['value']} from {c['source_doc']} (conf {c['confidence']})")
        lines.append(f"The extractor picked: {prov.get('ai_pick_reason')}")
    lines += [
        f"Flags raised: {flags}",
        "",
        "Respond ONLY with a JSON object, no markdown, with keys:",
        '  "verdict": one of "agree" | "disagree" | "uncertain"',
        '  "reasoning": one sentence, plain English, for a busy CPA',
        '  "suggested_value": a number if you would change it, else null',
    ]
    return "\n".join(lines)


def _stub_verdict(field: FieldModel) -> dict:
    """Deterministic fallback per provenance/flags — keeps the demo alive."""
    prov = field.provenance
    conf = prov.get("confidence")
    if prov.get("type") == "conflicted":
        return {
            "verdict": "agree",
            "reasoning": "The corrected form issued later supersedes the original per IRS guidance; the extractor's pick is sound.",
            "suggested_value": None,
            "source": "stub",
        }
    if isinstance(conf, (int, float)) and conf < 0.70:
        return {
            "verdict": "uncertain",
            "reasoning": "The source text is ambiguous and confidence is low — I can't confirm this value from the reading alone; recommend a clearer copy.",
            "suggested_value": None,
            "source": "stub",
        }
    return {
        "verdict": "agree",
        "reasoning": "The extracted value is consistent with a clean, high-confidence source.",
        "suggested_value": None,
        "source": "stub",
    }


def _gemini_verdict(field: FieldModel) -> dict:
    """Real Gemini call. Falls back to stub on any error."""
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")
        resp = model.generate_content(_build_prompt(field))
        text = resp.text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        data = json.loads(text)
        data["source"] = "gemini"
        # basic shape guard
        if data.get("verdict") not in ("agree", "disagree", "uncertain"):
            raise ValueError("bad verdict")
        return data
    except Exception as e:
        fallback = _stub_verdict(field)
        fallback["source"] = "stub-fallback"
        fallback["_error"] = str(e)[:120]
        return fallback


@router.post("/{field_id}/second-opinion")
def second_opinion(field_id: str, session: Session = Depends(get_session)):
    field = session.get(FieldModel, field_id)
    if field is None:
        return {"verdict": "uncertain", "reasoning": "Field not found.", "suggested_value": None, "source": "error"}

    if GEMINI_KEY:
        return _gemini_verdict(field)
    return _stub_verdict(field)
