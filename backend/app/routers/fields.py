"""Mutation endpoints: the state machine, exposed over HTTP.
Illegal transitions become HTTP 409 Conflict."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.database import get_session
from app import crud
from app.crud import TransitionError
from app.models import (
    VerifyRequest, CorrectRequest, ResolveConflictRequest, ApprovalRequest,
)

router = APIRouter(prefix="/api/fields", tags=["fields"])


def _guard(fn):
    """Turn a TransitionError into a clean 409 for the client."""
    try:
        return fn()
    except TransitionError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post("/{field_id}/verify")
def verify(field_id: str, body: VerifyRequest,
           session: Session = Depends(get_session)):
    return _guard(lambda: crud.verify(session, field_id, body.user))


@router.post("/{field_id}/correct")
def correct(field_id: str, body: CorrectRequest,
            session: Session = Depends(get_session)):
    return _guard(lambda: crud.correct(session, field_id, body.value, body.note, body.user))


@router.post("/{field_id}/resolve-conflict")
def resolve_conflict(field_id: str, body: ResolveConflictRequest,
                     session: Session = Depends(get_session)):
    return _guard(lambda: crud.resolve_conflict(
        session, field_id, body.candidate_index, body.note, body.user))


@router.post("/{field_id}/approve")
def approve(field_id: str, body: ApprovalRequest,
            session: Session = Depends(get_session)):
    return _guard(lambda: crud.approve(session, field_id, body.user))


@router.post("/{field_id}/reject")
def reject(field_id: str, body: ApprovalRequest,
           session: Session = Depends(get_session)):
    return _guard(lambda: crud.reject(session, field_id, body.note, body.user))
