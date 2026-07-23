// The computed-field engine. This is the "small script that fakes the logic"
// the brief explicitly blesses. Formulas are registered per field id rather
// than parsed from strings — honest, debuggable, and 20 lines instead of an
// expression evaluator.
//
// Each entry: (values) => number, where `values` maps input field id → value.

export const FORMULAS = {
  f_int_total: (v) =>
    round2(v.f_int_chase + v.f_int_fidelity + v.f_int_vanguard),

  // SALT cap: statutory $10,000 ceiling. This is why the blurry
  // property-tax digit doesn't actually move the return.
  f_salt_total: (v) =>
    round2(Math.min(v.f_state_tax + v.f_prop_tax, 10000)),

  // Capital loss limited to $3,000/yr; the rest carries forward.
  f_cap_loss_allowed: (v) =>
    round2(Math.max(v.f_cap_loss_carryover, -3000)),

  f_home_office_ded: (v) =>
    round2(v.f_home_expenses * (v.f_home_office_pct / 100)),
}

function round2(n) {
  return Math.round(n * 100) / 100
}

// Given a corrected field id, which computed fields must recompute?
// Built once from fields.json inputs at store init — see store.jsx.
export function buildCascadeMap(fields) {
  const map = {} // inputFieldId -> [computedFieldId, ...]
  for (const f of fields) {
    if (f.provenance?.type === 'computed') {
      for (const inputId of f.provenance.inputs) {
        ;(map[inputId] ??= []).push(f.id)
      }
    }
  }
  return map
}

// Inherited confidence for a computed field: min of its inputs' confidences.
// Inputs without a confidence (client_provided, carried_forward) don't
// weaken the total — no model judgment was involved in them.
export function inheritedConfidence(computedField, getField) {
  const confs = computedField.provenance.inputs
    .map((id) => getField(id)?.provenance?.confidence)
    .filter((c) => typeof c === 'number')
  return confs.length ? Math.min(...confs) : null
}
