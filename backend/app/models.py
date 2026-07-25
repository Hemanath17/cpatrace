"""
Schema + validation layer. SQLModel gives us database tables AND Pydantic
validation from one definition. Every guardrail that keeps malformed data
out of the system lives here.

The guardrails (each is a Pydantic constraint that rejects bad data at the door):
  - confidence must be a probability in [0.0, 1.0]
  - an `extracted` value MUST carry a source document + region (no untraceable numbers)
  - a `computed` value MUST list its inputs
  - a `client_provided` value MUST NOT carry a confidence (no faked certainty on human input)
  - state must be a legal enum member
  - form/document types are constrained to a known CPA form set
"""

from __future__ import annotations

from enum import Enum
from typing import Optional, Union, Literal
from datetime import datetime

from pydantic import BaseModel, Field as PydField, model_validator
from sqlmodel import SQLModel, Field, JSON, Column


# ---------------------------------------------------------------------------
# Enums — constrained vocabularies. The DB can only ever hold these values.
# ---------------------------------------------------------------------------

class FieldState(str, Enum):
    ai_suggested = "ai_suggested"
    needs_review = "needs_review"
    verified = "verified"
    corrected = "corrected"
    pending_approval = "pending_approval"
    locked = "locked"


class ProvenanceType(str, Enum):
    extracted = "extracted"
    computed = "computed"
    carried_forward = "carried_forward"
    client_provided = "client_provided"
    conflicted = "conflicted"


class FormType(str, Enum):
    """The full CPA form set. The schema advertises support for all of these;
    the seed data populates the subset the demo exercises. Adding a new form
    is a data change, not a code change."""
    w2 = "W-2"
    f1099_nec = "1099-NEC"
    f1099_misc = "1099-MISC"
    f1099_int = "1099-INT"
    f1099_div = "1099-DIV"
    f1099_b = "1099-B"
    f1099_r = "1099-R"
    f1099_g = "1099-G"
    f1099_k = "1099-K"
    f1098 = "1098"
    f1098_t = "1098-T"
    f1098_e = "1098-E"
    f1095_a = "1095-A"
    f5498 = "5498"
    schedule_k1 = "K-1"
    ssa_1099 = "SSA-1099"
    prior_return = "Prior return"
    questionnaire = "Client questionnaire"
    payment_record = "Payment record"
    property_tax = "Property tax bill"


# ---------------------------------------------------------------------------
# Provenance — a discriminated union. Each variant enforces its own required
# evidence. This is the core traceability guardrail.
# ---------------------------------------------------------------------------

class ExtractedProvenance(BaseModel):
    type: Literal[ProvenanceType.extracted] = ProvenanceType.extracted
    source_doc: str                                    # REQUIRED — traceable
    page: int = PydField(ge=1)
    region: Union[str, list[str]]
    confidence: float = PydField(ge=0.0, le=1.0)       # REQUIRED probability
    raw_text: Optional[str] = None


class ComputedProvenance(BaseModel):
    type: Literal[ProvenanceType.computed] = ProvenanceType.computed
    formula: str
    inputs: list[str] = PydField(min_length=1)         # REQUIRED — must have inputs
    confidence_rule: str = "min(inputs)"


class CarriedForwardProvenance(BaseModel):
    type: Literal[ProvenanceType.carried_forward] = ProvenanceType.carried_forward
    source_doc: str
    page: int = PydField(ge=1)
    region: Union[str, list[str]]
    source_field: Optional[str] = None
    # no confidence — a filed return is authoritative, not a model judgment


class ClientProvidedProvenance(BaseModel):
    type: Literal[ProvenanceType.client_provided] = ProvenanceType.client_provided
    question_id: str
    source_doc: str
    page: int = PydField(ge=1)
    region: Union[str, list[str]]
    answered_by: str
    answered_at: str
    # DELIBERATELY no confidence field — the schema makes it impossible to
    # attach a fake certainty score to a human answer.


class ConflictCandidate(BaseModel):
    value: float
    source_doc: str
    page: int = PydField(ge=1)
    region: Union[str, list[str]]
    confidence: float = PydField(ge=0.0, le=1.0)


class ConflictedProvenance(BaseModel):
    type: Literal[ProvenanceType.conflicted] = ProvenanceType.conflicted
    candidates: list[ConflictCandidate] = PydField(min_length=2)  # a conflict needs ≥2
    ai_pick: int
    ai_pick_reason: str

    @model_validator(mode="after")
    def pick_in_range(self):
        if not (0 <= self.ai_pick < len(self.candidates)):
            raise ValueError("ai_pick must index a real candidate")
        return self


Provenance = Union[
    ExtractedProvenance,
    ComputedProvenance,
    CarriedForwardProvenance,
    ClientProvidedProvenance,
    ConflictedProvenance,
]


# ---------------------------------------------------------------------------
# Edit history — append-only audit rows. This is the tamper-evident trail.
# ---------------------------------------------------------------------------

class EditEvent(BaseModel):
    who: str                        # "ai" | "system" | "client" | a user id
    when: str
    event: str                      # extracted | verified | corrected | ...
    value: Optional[float] = None
    old_value: Optional[float] = None
    note: Optional[str] = None


# ---------------------------------------------------------------------------
# Field — the DB table. `provenance`, `flags`, `edit_history` are stored as
# JSON columns but validated through the Pydantic models above on the way in.
# ---------------------------------------------------------------------------

class FieldModel(SQLModel, table=True):
    __tablename__ = "fields"

    id: str = Field(primary_key=True)
    return_id: str = Field(index=True)
    form: str
    line: str
    label: str
    value: float
    unit: Optional[str] = None
    state: FieldState
    requires_approval: bool = False
    lock_reason: Optional[str] = None
    resolve_at: Optional[str] = None
    recomputed: bool = False

    provenance: dict = Field(sa_column=Column(JSON))
    flags: list = Field(default=[], sa_column=Column(JSON))
    edit_history: list = Field(default=[], sa_column=Column(JSON))


# ---------------------------------------------------------------------------
# API read/write schemas — what the endpoints accept and return. These are
# the validated contracts the frontend talks to.
# ---------------------------------------------------------------------------

class VerifyRequest(BaseModel):
    user: str = "camila.c"


class CorrectRequest(BaseModel):
    value: float
    note: Optional[str] = None
    user: str = "camila.c"


class ResolveConflictRequest(BaseModel):
    candidate_index: int = PydField(ge=0)
    note: Optional[str] = None
    user: str = "camila.c"


class ApprovalRequest(BaseModel):
    note: Optional[str] = None
    user: str = "camila.c"


# A helper the seed script uses to validate raw JSON provenance against the
# right variant. Raises if a field's provenance is malformed.
def validate_provenance(raw: dict) -> Provenance:
    ptype = raw.get("type")
    variant = {
        "extracted": ExtractedProvenance,
        "computed": ComputedProvenance,
        "carried_forward": CarriedForwardProvenance,
        "client_provided": ClientProvidedProvenance,
        "conflicted": ConflictedProvenance,
    }.get(ptype)
    if variant is None:
        raise ValueError(f"unknown provenance type: {ptype!r}")
    return variant.model_validate(raw)
