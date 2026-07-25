"""Simulated extraction endpoint + an admin reset utility.

- simulate-extraction: no real model — returns the seeded fields after a
  short fake 'processing' delay, as if just extracted from an upload. A real
  model (e.g. Gemini Flash) would slot in behind this same interface later.
- admin/reset: wipes and reseeds the DB. Used to restore clean demo data
  after test mutations. Admin utility, not part of the product surface.
"""

import time

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models import FieldModel
from app.seed import seed

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


@router.post("/admin/reset")
def reset_db(session: Session = Depends(get_session)):
    """Wipe all fields and reseed from JSON — restores clean demo data.
    Call once before recording to clear any test mutations."""
    existing = session.exec(select(FieldModel)).all()
    for f in existing:
        session.delete(f)
    session.commit()
    seed()  # idempotent; re-inserts the 17 validated fields
    return {"status": "reset", "message": "database restored to seed state"}
