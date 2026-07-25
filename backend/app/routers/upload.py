"""Simulated extraction endpoint. No real model — returns the seeded fields
after a short fake 'processing' delay, as if just extracted from an upload.
This is the stub the brief blesses; a real model would slot in behind the
same interface later (Gemini Flash, etc.)."""

import time

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models import FieldModel

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/simulate-extraction/{return_id}")
def simulate_extraction(return_id: str, session: Session = Depends(get_session)):
    """Pretend to extract fields from an uploaded document. Returns the
    return's fields exactly as a real extraction pass would populate them."""
    time.sleep(1.2)  # fake processing so the UI can show a realistic spinner
    fields = session.exec(
        select(FieldModel).where(FieldModel.return_id == return_id)
    ).all()
    return {
        "status": "extracted",
        "model": "simulated",  # swap to "gemini-flash" when wired for real
        "field_count": len(fields),
        "fields": fields,
    }
