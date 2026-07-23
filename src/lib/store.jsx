// Global store: loads the three JSON files once, exposes the field state
// machine as actions. In-memory only — refresh resets it. That's a feature
// for a demo (and a README line: "persistence is simulated").
//
// The state machine rules implemented here (from docs/data-model.md):
//   verify:   ai_suggested | needs_review -> verified
//   correct:  ai_suggested | needs_review | verified | corrected
//               -> corrected            (small change)
//               -> pending_approval     (|Δ| > $5,000 firm-policy rule)
//   approve:  pending_approval -> verified
//   reject:   pending_approval -> needs_review (with note)
//   locked:   no transitions here — resolve at source
//   CASCADE:  any value change recomputes downstream computed fields and
//             resets their state to ai_suggested (endorsement of a total is
//             void once an input changes).

import { createContext, useContext, useReducer, useMemo } from 'react'
import documentsData from '../data/documents.json'
import fieldsData from '../data/fields.json'
import returnsData from '../data/returns.json'
import { FORMULAS, buildCascadeMap, inheritedConfidence } from './formulas.js'

const APPROVAL_DELTA = 5000
const CURRENT_USER = returnsData.current_user.id
const CASCADE_MAP = buildCascadeMap(fieldsData.fields)

const StoreCtx = createContext(null)

function now() {
  // Fictional clock: keep demo timestamps on the app's "today".
  return '2026-03-12T' + new Date().toISOString().slice(11)
}

function initialState() {
  return {
    documents: documentsData.documents,
    fields: Object.fromEntries(fieldsData.fields.map((f) => [f.id, f])),
    fieldOrder: fieldsData.fields.map((f) => f.id),
    returns: returnsData.returns,
    meta: {
      as_of: returnsData.as_of,
      deadline: returnsData.filing_deadline,
      user: returnsData.current_user,
    },
  }
}

function withHistory(field, entry) {
  return { ...field, edit_history: [...field.edit_history, entry] }
}

// Recompute every computed field downstream of changedId. Returns a new
// fields map. Verified totals visibly lose their badge here — the demo's
// best moment happens in these 15 lines.
function cascade(fields, changedId) {
  const targets = CASCADE_MAP[changedId] ?? []
  let next = fields
  for (const tid of targets) {
    const t = next[tid]
    const values = Object.fromEntries(
      t.provenance.inputs.map((id) => [id, next[id].value]),
    )
    const newValue = FORMULAS[tid] ? FORMULAS[tid](values) : t.value
    next = {
      ...next,
      [tid]: withHistory(
        {
          ...t,
          value: newValue,
          state: 'locked', // computed fields stay locked...
          recomputed: true, // ...but flag that endorsement was reset
          flags: (t.flags ?? []).filter((fl) => fl.code !== 'input_unresolved'),
        },
        {
          who: 'system',
          when: now(),
          event: 'recomputed',
          value: newValue,
          note: `input ${changedId} changed`,
        },
      ),
    }
    // Recurse: a recomputed total may itself feed another computed field.
    next = cascade(next, tid)
  }
  return next
}

function reducer(state, action) {
  const f = state.fields[action.id]
  switch (action.type) {
    case 'verify': {
      if (!f || !['ai_suggested', 'needs_review'].includes(f.state)) return state
      const updated = withHistory(
        { ...f, state: 'verified' },
        { who: CURRENT_USER, when: now(), event: 'verified', value: f.value },
      )
      return { ...state, fields: { ...state.fields, [action.id]: updated } }
    }

    case 'correct': {
      if (!f || f.state === 'locked') return state
      const delta = Math.abs(action.value - f.value)
      const needsApproval = f.requires_approval || delta > APPROVAL_DELTA
      const newState = needsApproval ? 'pending_approval' : 'corrected'
      let updated = withHistory(
        { ...f, value: action.value, state: newState },
        {
          who: CURRENT_USER, when: now(), event: 'corrected',
          old_value: f.value, value: action.value, note: action.note ?? '',
        },
      )
      if (needsApproval) {
        updated = withHistory(updated, {
          who: 'system', when: now(), event: 'sent_for_approval',
          note: `Δ $${delta.toLocaleString()} exceeds $${APPROVAL_DELTA.toLocaleString()} threshold`,
        })
      }
      const fields = cascade(
        { ...state.fields, [action.id]: updated },
        action.id,
      )
      return { ...state, fields }
    }

    // Conflict resolution is a correct() with provenance bookkeeping:
    // record which candidate won and why.
    case 'resolveConflict': {
      if (!f || f.provenance.type !== 'conflicted') return state
      const chosen = f.provenance.candidates[action.candidateIndex]
      let updated = withHistory(
        {
          ...f,
          value: chosen.value,
          state: 'verified',
          provenance: {
            ...f.provenance,
            resolved: true,
            resolved_candidate: action.candidateIndex,
            resolution_note: action.note ?? '',
          },
          flags: [],
        },
        {
          who: CURRENT_USER, when: now(), event: 'conflict_resolved',
          value: chosen.value,
          note: action.note ?? `Chose ${chosen.source_doc}`,
        },
      )
      const fields = cascade(
        { ...state.fields, [action.id]: updated },
        action.id,
      )
      return { ...state, fields }
    }

    case 'approve': {
      if (!f || f.state !== 'pending_approval') return state
      const updated = withHistory(
        { ...f, state: 'verified' },
        { who: CURRENT_USER, when: now(), event: 'approved', value: f.value },
      )
      return { ...state, fields: { ...state.fields, [action.id]: updated } }
    }

    case 'reject': {
      if (!f || f.state !== 'pending_approval') return state
      const updated = withHistory(
        { ...f, state: 'needs_review' },
        { who: CURRENT_USER, when: now(), event: 'rejected', note: action.note ?? '' },
      )
      return { ...state, fields: { ...state.fields, [action.id]: updated } }
    }

    default:
      return state
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  const api = useMemo(() => {
    const getField = (id) => state.fields[id]
    return {
      ...state,
      getField,
      fieldsList: state.fieldOrder.map(getField),
      documentById: (id) => state.documents.find((d) => d.id === id),
      confidenceOf: (field) =>
        field.provenance.type === 'computed'
          ? inheritedConfidence(field, getField)
          : field.provenance.confidence ?? null,

      // Sign-off rule: the anti-rubber-stamp mechanism. A return is ready
      // only when nothing is unreviewed.
      signoffBlockers: () =>
        state.fieldOrder
          .map(getField)
          .filter((f) =>
            ['ai_suggested', 'needs_review', 'pending_approval'].includes(f.state),
          ),

      verify: (id) => dispatch({ type: 'verify', id }),
      correct: (id, value, note) => dispatch({ type: 'correct', id, value, note }),
      resolveConflict: (id, candidateIndex, note) =>
        dispatch({ type: 'resolveConflict', id, candidateIndex, note }),
      approve: (id) => dispatch({ type: 'approve', id }),
      reject: (id, note) => dispatch({ type: 'reject', id, note }),
    }
  }, [state])

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
