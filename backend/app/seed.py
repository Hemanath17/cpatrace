"""
Seed the database from the three JSON files. Runs once at startup if the DB
is empty. Every field's provenance is validated through the Pydantic models
before insertion — so a malformed seed (bad confidence, missing source,
faked certainty on a client answer) fails LOUDLY here, not silently at runtime.

This is the guardrail in action: the data is provably well-formed the moment
it enters the system.
"""

from __future__ import annotations

import json
from pathlib import Path

from sqlmodel import Session, select

from app.models import (
    FieldModel,
    FieldState,
    validate_provenance,
)
from app.database import engine

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _load_json(name: str) -> dict:
    with open(DATA_DIR / name, "r", encoding="utf-8") as fh:
        return json.load(fh)


def already_seeded(session: Session) -> bool:
    return session.exec(select(FieldModel).limit(1)).first() is not None


def seed() -> None:
    """Idempotent: does nothing if fields already exist."""
    with Session(engine) as session:
        if already_seeded(session):
            print("[seed] database already populated — skipping")
            return

        fields_data = _load_json("fields.json")
        raw_fields = fields_data["fields"]

        inserted = 0
        for raw in raw_fields:
            # --- GUARDRAIL: validate provenance against its variant ---
            # Raises ValueError if extracted has no source, computed has no
            # inputs, client_provided carries a confidence, etc.
            prov_model = validate_provenance(raw["provenance"])

            # --- GUARDRAIL: state must be a legal enum member ---
            state = FieldState(raw["state"])  # raises if not a valid state

            field = FieldModel(
                id=raw["id"],
                return_id=fields_data.get("return_id", "ret_martinez"),
                form=raw["form"],
                line=raw["line"],
                label=raw["label"],
                value=float(raw["value"]),
                unit=raw.get("unit"),
                state=state,
                requires_approval=raw.get("requires_approval", False),
                lock_reason=raw.get("lock_reason"),
                resolve_at=raw.get("resolve_at"),
                recomputed=raw.get("recomputed", False),
                # store the *validated* provenance back as a plain dict
                provenance=prov_model.model_dump(mode="json"),
                flags=raw.get("flags", []),
                edit_history=raw.get("edit_history", []),
            )
            session.add(field)
            inserted += 1

        session.commit()
        print(f"[seed] inserted {inserted} fields — all validated")


if __name__ == "__main__":
    # Allow running the seed directly: python -m app.seed
    from app.database import create_db_and_tables
    create_db_and_tables()
    seed()
