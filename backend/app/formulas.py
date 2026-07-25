"""
Computed-field engine + cascade. Direct port of the frontend's formulas.js.
Pure logic — no web, no DB. Two responsibilities:
  1. FORMULAS: how each computed field derives its value from its inputs
  2. cascade(): when an input changes, recompute every downstream total

The formulas encode real tax rules a CPA would recognize:
  - interest total is a straight sum
  - SALT is capped at the statutory $10,000
  - the capital-loss deduction is limited to $3,000/yr
  - the home-office deduction is expenses × business-use %
"""

from __future__ import annotations


def _round2(n: float) -> float:
    return round(n * 100) / 100


# Each formula takes a dict of {input_field_id: value} and returns the result.
# Registered per field id — explicit and debuggable, no string-parsing an
# expression evaluator.
FORMULAS = {
    "f_int_total": lambda v: _round2(
        v["f_int_chase"] + v["f_int_fidelity"] + v["f_int_vanguard"]
    ),

    # SALT cap: statutory $10,000 ceiling. This is why the blurry
    # property-tax digit doesn't actually move the return.
    "f_salt_total": lambda v: _round2(
        min(v["f_state_tax"] + v["f_prop_tax"], 10000)
    ),

    # Capital loss limited to $3,000/yr; the remainder carries forward.
    "f_cap_loss_allowed": lambda v: _round2(
        max(v["f_cap_loss_carryover"], -3000)
    ),

    "f_home_office_ded": lambda v: _round2(
        v["f_home_expenses"] * (v["f_home_office_pct"] / 100)
    ),
}


def build_cascade_map(fields: list[dict]) -> dict[str, list[str]]:
    """Map each input field id -> [computed field ids that depend on it].
    Built once from the seed data. A field feeding a total appears as a key
    pointing at that total."""
    cascade_map: dict[str, list[str]] = {}
    for f in fields:
        prov = f.get("provenance", {})
        if prov.get("type") == "computed":
            for input_id in prov.get("inputs", []):
                cascade_map.setdefault(input_id, []).append(f["id"])
    return cascade_map


def cascade(
    fields_by_id: dict[str, dict],
    changed_id: str,
    cascade_map: dict[str, list[str]],
    now_iso: str,
) -> set[str]:
    """
    Recompute every computed field downstream of `changed_id`, in place.
    Returns the set of field ids that were recomputed (so the caller can
    persist exactly those). Recurses: a recomputed total may itself feed
    another computed field.

    A recomputed field:
      - gets its new value
      - stays `locked` (computed fields are never independently edited)
      - is marked recomputed=True (the sky-blue "recomputed" cue in the UI)
      - clears any stale `input_unresolved` flag
      - appends a 'recomputed' row to its edit history
    """
    touched: set[str] = set()
    targets = cascade_map.get(changed_id, [])

    for tid in targets:
        target = fields_by_id[tid]
        prov = target["provenance"]
        values = {inp: fields_by_id[inp]["value"] for inp in prov["inputs"]}

        formula = FORMULAS.get(tid)
        new_value = formula(values) if formula else target["value"]

        target["value"] = new_value
        target["state"] = "locked"
        target["recomputed"] = True
        # Clear the "this total is provisional" flag now that an input moved.
        target["flags"] = [
            fl for fl in target.get("flags", [])
            if fl.get("code") != "input_unresolved"
        ]
        target["edit_history"] = target.get("edit_history", []) + [{
            "who": "system",
            "when": now_iso,
            "event": "recomputed",
            "value": new_value,
            "note": f"input {changed_id} changed",
        }]

        touched.add(tid)
        # Recurse — this total might feed another computed field.
        touched |= cascade(fields_by_id, tid, cascade_map, now_iso)

    return touched


def inherited_confidence(
    computed_field: dict, fields_by_id: dict[str, dict]
) -> float | None:
    """A computed field's confidence = min of its inputs' confidences.
    One weak input poisons the total. Inputs without a confidence
    (client-provided, carried-forward) don't weaken it — no model judged them."""
    confs = []
    for inp in computed_field["provenance"]["inputs"]:
        prov = fields_by_id[inp].get("provenance", {})
        c = prov.get("confidence")
        if isinstance(c, (int, float)):
            confs.append(c)
    return min(confs) if confs else None
