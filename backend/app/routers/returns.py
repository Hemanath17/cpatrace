"""Read endpoints: the dashboard queue and a return's fields."""

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models import FieldModel

router = APIRouter(prefix="/api", tags=["returns"])


@router.get("/returns/{return_id}/fields")
def get_fields(return_id: str, session: Session = Depends(get_session)):
    """All fields for a return, each with full provenance, flags, and history."""
    fields = session.exec(
        select(FieldModel).where(FieldModel.return_id == return_id)
    ).all()
    return fields


@router.get("/fields/{field_id}")
def get_field(field_id: str, session: Session = Depends(get_session)):
    """A single field — used to refresh one row after an action."""
    return session.get(FieldModel, field_id)
