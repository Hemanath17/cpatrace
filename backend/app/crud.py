"""
The state machine — every operation a reviewer can perform on a field.
Server-side equivalent of the frontend's store.jsx reducer. Each function:
  1. loads the field
  2. GUARDRAIL: checks the transition is legal for the current state
  3. applies the change + appends an append-only audit row
  4. runs the cascade if a value changed
  5. persists exactly the fields that were touched

Legal transitions (rejected otherwise):
  verify:   ai_suggested | needs_review        -> verified
  correct:  ai_suggested | needs_review | verified | corrected
              -> corrected            (small change)
              -> pending_approval     (|Δ| > $5,000 or requires_approval)
  resolve:  conflicted field          -> verified (records which candidate won)
  approve:  pending_approval          -> verified
  reject:   pending_approval          -> needs_review
  locked:   no transitions (edit at source)
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlmodel import Session, select

from app.models import FieldModel, FieldState
from app.formulas import build_cascade_map, cascade

APPROVAL_DELTA = 5000.0


class TransitionError(Exception):
    """Raised when an operation is illegal for a field's current state.
    The router turns this into an HTTP 409 Conflict."""


def _now() -> str:
    # Keep demo timestamps on the app's fictional 'today'.
    return "2026-03-12T" + datetime.now(timezone.utc).strftime("%H:%M:%SZ")


def _all_fields(session: Session) -> list[FieldModel]:
    return list(session.exec(select(FieldModel)).all())


def _get(session: Session, field_id: str) -> FieldModel:
    field = session.get(FieldModel, field_id)
    if field is None:
        raise TransitionError(f"field {field_id} not found")
    return field


def _append_history(field: FieldModel, entry: dict) -> None:
    # Reassign (not .append) so SQLModel detects the JSON column changed.
    field.edit_history = field.edit_history + [entry]


def _run_cascade_and_persist(session: Session, changed_id: str) -> list[str]:
    """After a value change, recompute downstream computed fields and save
    exactly those that moved."""
    fields = _all_fields(session)
    by_id = {f.id: _to_dict(f) for f in fields}
    cascade_map = build_cascade_map(list(by_id.values()))

    touched = cascade(by_id, changed_id, cascade_map, _now())

    for tid in touched:
        f = session.get(FieldModel, tid)
        d = by_id[tid]
        f.value = d["value"]
        f.state = FieldState(d["state"])
        f.recomputed = d["recomputed"]
        f.flags = d["flags"]
        f.edit_history = d["edit_history"]
        session.add(f)
    return list(touched)


def _to_dict(f: FieldModel) -> dict:
    """FieldModel -> plain dict the pure cascade logic can mutate."""
    return {
        "id": f.id,
        "value": f.value,
        "state": f.state.value if isinstance(f.state, FieldState) else f.state,
        "recomputed": f.recomputed,
        "flags": list(f.flags),
        "edit_history": list(f.edit_history),
        "provenance": f.provenance,
    }


# ---------------------------------------------------------------------------
# Operations
# ---------------------------------------------------------------------------

def verify(session: Session, field_id: str, user: str) -> FieldModel:
    field = _get(session, field_id)
    if field.state not in (FieldState.ai_suggested, FieldState.needs_review):
        raise TransitionError(
            f"cannot verify a field in state '{field.state.value}'"
        )
    field.state = FieldState.verified
    _append_history(field, {
        "who": user, "when": _now(), "event": "verified", "value": field.value,
    })
    session.add(field)
    session.commit()
    session.refresh(field)
    return field


def correct(session: Session, field_id: str, value: float,
            note: str | None, user: str) -> FieldModel:
    field = _get(session, field_id)
    if field.state == FieldState.locked:
        raise TransitionError("locked fields cannot be edited — resolve at source")

    delta = abs(value - field.value)
    needs_approval = field.requires_approval or delta > APPROVAL_DELTA
    new_state = FieldState.pending_approval if needs_approval else FieldState.corrected

    old_value = field.value
    field.value = value
    field.state = new_state
    _append_history(field, {
        "who": user, "when": _now(), "event": "corrected",
        "old_value": old_value, "value": value, "note": note or "",
    })
    if needs_approval:
        _append_history(field, {
            "who": "system", "when": _now(), "event": "sent_for_approval",
            "note": f"delta ${delta:,.0f} exceeds ${APPROVAL_DELTA:,.0f} threshold",
        })
    session.add(field)
    session.commit()

    _run_cascade_and_persist(session, field_id)
    session.commit()
    session.refresh(field)
    return field


def resolve_conflict(session: Session, field_id: str, candidate_index: int,
                     note: str | None, user: str) -> FieldModel:
    field = _get(session, field_id)
    prov = field.provenance
    if prov.get("type") != "conflicted":
        raise TransitionError("field is not a conflict")
    candidates = prov.get("candidates", [])
    if not (0 <= candidate_index < len(candidates)):
        raise TransitionError("candidate_index out of range")

    chosen = candidates[candidate_index]
    old_value = field.value
    field.value = chosen["value"]
    field.state = FieldState.verified
    # record the resolution on the provenance (reassign for JSON change detection)
    field.provenance = {
        **prov,
        "resolved": True,
        "resolved_candidate": candidate_index,
        "resolution_note": note or "",
    }
    field.flags = []
    _append_history(field, {
        "who": user, "when": _now(), "event": "conflict_resolved",
        "old_value": old_value, "value": chosen["value"],
        "note": note or f"chose {chosen['source_doc']}",
    })
    session.add(field)
    session.commit()

    _run_cascade_and_persist(session, field_id)
    session.commit()
    session.refresh(field)
    return field


def approve(session: Session, field_id: str, user: str) -> FieldModel:
    field = _get(session, field_id)
    if field.state != FieldState.pending_approval:
        raise TransitionError("only pending_approval fields can be approved")
    field.state = FieldState.verified
    _append_history(field, {
        "who": user, "when": _now(), "event": "approved", "value": field.value,
    })
    session.add(field)
    session.commit()
    session.refresh(field)
    return field


def reject(session: Session, field_id: str, note: str | None, user: str) -> FieldModel:
    field = _get(session, field_id)
    if field.state != FieldState.pending_approval:
        raise TransitionError("only pending_approval fields can be rejected")
    field.state = FieldState.needs_review
    _append_history(field, {
        "who": user, "when": _now(), "event": "rejected", "note": note or "",
    })
    session.add(field)
    session.commit()
    session.refresh(field)
    return field
