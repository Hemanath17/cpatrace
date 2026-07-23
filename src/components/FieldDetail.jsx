// ============================================================================
// FIELD DETAIL SLIDE-OVER (challenge 10) — SKELETON. You build this one.
// ----------------------------------------------------------------------------
// The "should I believe this number?" panel. Slide-over from the right,
// overlaying the doc pane but NOT navigating away — closing it returns the
// CPA exactly where they were. That's the context-preservation decision.
//
// SPEC — top to bottom:
//  1. Header: field label, form/line, current value (large, tabular-nums),
//     StateBadge. Close (×) + Esc.
//  2. "What the AI did" block — one PLAIN-ENGLISH sentence built from
//     provenance, not a data dump (the brief: full technical detail is an
//     unacceptable answer):
//       extracted     → "Read $18,204.77 from box 1 of the Rocket Mortgage
//                        1098 (raw text: '18,204.77'), 94% confident."
//       computed      → "Calculated as [formula in words] from 3 fields."
//       conflicted    → "Found two disagreeing sources; recommends the
//                        corrected form because: {ai_pick_reason}"
//       client_provided → "Answered by {answered_by} in the tax organizer
//                        on {date}. The AI made no judgment on this value."
//       carried_forward → "Carried from the filed 2024 return."
//  3. Flags: each flag.message as an amber callout. These are the AI's
//     self-doubts — give them room.
//  4. Evidence: mini DocumentViewer (reuse it) pinned to the provenance
//     region. For conflicted: BOTH candidates side by side with values,
//     confidences, and dates — with [Use this one] under each. Wire to
//     store.resolveConflict(id, index, note).
//  5. Action zone by state:
//       ai_suggested / needs_review → [Verify] + inline correct: number
//         input prefilled with current value + note field + [Save
//         correction] → store.correct(id, value, note). If |Δ| > $5,000 the
//         store routes to pending_approval automatically — show a small
//         explainer when it happens ("sent for second review: firm policy
//         for changes over $5,000").
//       pending_approval → approval card: old vs new value diff,
//         who/when/why from history, [Approve] [Reject + note].
//       locked → lock_reason prominently + link to resolve_at doc if any.
//         No inputs at all — don't render disabled ones; absence is clearer
//         than gray.
//  6. History timeline (audit trail): every edit_history entry, newest
//     first — who (ai/system/user chip), when, event, old → new value,
//     note. THIS is the liability story: "AI said 18,240.77 → Dana
//     corrected to 18,204.77."
//
// After verify/correct, auto-advance selection to the next unreviewed field
// (nice-to-have; big demo payoff — review flow feels like a flow).
// ============================================================================

import { useStore } from '../lib/store.jsx'
import StateBadge, { ConfidenceBadge } from './StateBadge.jsx'

export default function FieldDetail({ fieldId, onClose }) {
  const store = useStore()
  const f = store.getField(fieldId)
  if (!f) return null

  // --- skeleton proof-of-plumbing: replace with the spec above ---
  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-slate-900/20">
      <aside className="h-full w-[420px] overflow-auto bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500">
              {f.form} · line {f.line}
            </p>
            <h2 className="font-semibold">{f.label}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>

        <p className="mb-2 text-2xl tabular-nums">
          {f.unit === 'percent'
            ? `${f.value}%`
            : f.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        </p>
        <div className="mb-4 flex items-center gap-2">
          <StateBadge state={f.state} />
          <ConfidenceBadge value={store.confidenceOf(f)} />
        </div>

        {['ai_suggested', 'needs_review'].includes(f.state) && (
          <button
            onClick={() => {
              store.verify(f.id)
              onClose()
            }}
            className="mb-4 rounded bg-teal-700 px-3 py-1.5 text-sm text-white"
          >
            Verify
          </button>
        )}

        <h3 className="mb-1 text-xs font-semibold uppercase text-slate-400">
          History
        </h3>
        <ul className="space-y-1 text-xs text-slate-600">
          {[...f.edit_history].reverse().map((h, i) => (
            <li key={i}>
              <span className="font-medium">{h.who}</span> · {h.event}
              {'old_value' in h &&
                ` · ${h.old_value.toLocaleString()} → ${h.value.toLocaleString()}`}
              {h.note && <span className="text-slate-400"> — {h.note}</span>}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
