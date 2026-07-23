// ============================================================================
// RETURN REVIEW (challenge 01) — SKELETON. The core screen. You build this.
// ----------------------------------------------------------------------------
// Split view. LEFT: the return, field by field. RIGHT: DocumentViewer.
// The defining interaction: click a field → right pane shows its source doc
// with the exact region highlighted (trace-highlight CSS class, already in
// index.css).
//
// SPEC — build in this order:
//  1. Layout: grid grid-cols-[1fr_1fr] gap-0, full height minus header.
//     Left scrolls independently; right is sticky.
//  2. Sign-off banner across the top (the anti-rubber-stamp rule, already
//     computed): signoffBlockers().length > 0
//       → amber banner "Not ready to file — N items unreviewed" with count
//         breakdown; clicking it scrolls to the first blocker.
//       → else emerald "All fields reviewed — ready for sign-off".
//     This banner is the state machine made visible. Show it in the video.
//  3. Field list: group by form ("Form 1040", "Schedule A", ...) with small
//     section headers. Render FieldRow (below) per field.
//  4. Selection state: selectedFieldId in useState here; clicking a row
//     selects it AND drives the right pane (doc + region from the field's
//     provenance). For conflicted fields default to the AI's pick candidate.
//  5. FieldDetail slide-over (separate file) opens on "Details" or
//     double-click. Slide-over, NOT a route — context preservation is a
//     graded design decision.
//
// FieldRow SPEC (inline component below):
//  - Row: label + form/line (small, slate-500) | value (tabular-nums,
//    font-medium) | ConfidenceBadge | StateBadge | actions.
//  - Actions by state (the affordance system doing its job):
//      ai_suggested:      [✓ Verify] [✎ Correct]   — verify is ONE CLICK.
//      needs_review:      [Review →] (opens detail — no quick-verify here:
//                         a flagged field deserves eyes, so the fast path is
//                         deliberately removed. Say this in the video.)
//      verified:          quiet ✓, hover reveals [Reopen]
//      corrected:         quiet, hover reveals [Edit]
//      pending_approval:  [Approve] [Reject] (you're the second reviewer)
//      locked:            🔒 + lock_reason as tooltip/subtext + resolve link
//  - Flags render as a thin amber strip under the row (flag.message).
//  - field.recomputed === true → brief sky-blue left border: "recomputed
//    after an input changed" — the cascade made visible.
// ============================================================================

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import StateBadge, { ConfidenceBadge } from './StateBadge.jsx'
import DocumentViewer from './DocumentViewer.jsx'
import FieldDetail from './FieldDetail.jsx'

export default function ReturnReview() {
  const { id } = useParams()
  const store = useStore()
  const [selectedId, setSelectedId] = useState(null)
  const [detailId, setDetailId] = useState(null)

  const isMartinez = id === 'ret_martinez'
  const ret = store.returns.find((r) => r.id === id)
  const blockers = store.signoffBlockers()
  const selected = selectedId ? store.getField(selectedId) : null

  if (!isMartinez)
    return (
      <main className="p-8 text-slate-500">
        <p className="mb-2 font-medium text-slate-700">{ret?.client}</p>
        <p>
          Sample return — full field data is wired for the Martinez return.{' '}
          <Link className="text-teal-700 underline" to="/return/ret_martinez">
            Open Martinez →
          </Link>
        </p>
      </main>
    )

  // --- skeleton proof-of-plumbing: replace with the spec above ---
  return (
    <main className="grid grid-cols-2">
      <section className="border-r border-slate-200 p-4">
        <div className="mb-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {blockers.length > 0
            ? `Not ready to file — ${blockers.length} items unreviewed`
            : 'All fields reviewed — ready for sign-off'}
        </div>
        <ul className="space-y-1">
          {store.fieldsList.map((f) => (
            <li
              key={f.id}
              onClick={() => setSelectedId(f.id)}
              className={`cursor-pointer rounded border px-3 py-2 text-sm ${
                selectedId === f.id ? 'border-teal-600' : 'border-slate-200'
              } bg-white`}
            >
              <div className="flex items-center gap-2">
                <span className="flex-1">{f.label}</span>
                <span className="tabular-nums font-medium">
                  {typeof f.value === 'number'
                    ? f.unit === 'percent'
                      ? `${f.value}%`
                      : f.value.toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        })
                    : f.value}
                </span>
                <ConfidenceBadge value={store.confidenceOf(f)} />
                <StateBadge state={f.state} small />
                <button
                  className="text-xs text-teal-700 underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDetailId(f.id)
                  }}
                >
                  Details
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="sticky top-0 h-[calc(100vh-49px)] overflow-auto p-4">
        <DocumentViewer field={selected} />
      </section>

      {detailId && (
        <FieldDetail fieldId={detailId} onClose={() => setDetailId(null)} />
      )}
    </main>
  )
}
