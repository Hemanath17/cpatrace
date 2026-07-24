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

import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import StateBadge, { ConfidenceBadge } from './StateBadge.jsx'
import DocumentViewer from './DocumentViewer.jsx'
import FieldDetail from './FieldDetail.jsx'

function formatMoney(n) {
  const s = Math.abs(n).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })
  return n < 0 ? `(${s})` : s
}

function formatFieldValue(f) {
  if (typeof f.value !== 'number') return f.value
  if (f.unit === 'percent') return `${f.value}%`
  return formatMoney(f.value)
}

function formHeading(form) {
  if (form.startsWith('Sch ')) return `Schedule ${form.slice(4)}`
  if (form.startsWith('Form ')) return form
  return `Form ${form}`
}

function groupFields(fields) {
  const map = new Map()
  for (const f of fields) {
    if (!map.has(f.form)) map.set(f.form, [])
    map.get(f.form).push(f)
  }
  return [...map.entries()]
}

function FieldRow({ f, selected, onSelect, onOpenDetail, confidence }) {
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(f.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onSelect(f.id)
        }}
        onDoubleClick={() => onOpenDetail(f.id)}
        className={[
          'cursor-pointer rounded-md border bg-white px-4 py-3',
          selected
            ? 'border-teal-600 bg-teal-50/40 ring-1 ring-teal-600/30'
            : 'border-slate-200 hover:border-slate-300',
          f.recomputed ? 'border-l-[3px] border-l-sky-400' : '',
        ].join(' ')}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-slate-800">{f.label}</p>
            <p className="mt-1 text-xs text-slate-500">
              {f.form} · line {f.line}
              {f.recomputed && (
                <span className="ml-2 text-sky-700">recomputed</span>
              )}
            </p>
          </div>

          <span className="w-28 shrink-0 text-right text-sm font-medium tabular-nums text-slate-900">
            {formatFieldValue(f)}
          </span>

          <div className="flex w-36 shrink-0 justify-end">
            <ConfidenceBadge value={confidence} />
          </div>

          <div className="flex w-[7.5rem] shrink-0 justify-end">
            <StateBadge state={f.state} small />
          </div>

          <button
            type="button"
            className="shrink-0 text-xs font-medium text-teal-700 hover:text-teal-900"
            onClick={(e) => {
              e.stopPropagation()
              onOpenDetail(f.id)
            }}
          >
            Details
          </button>
        </div>

        {f.flags?.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-amber-200/80 pt-2">
            {f.flags.map((flag) => (
              <p key={flag.code} className="text-xs leading-snug text-amber-900">
                {flag.message}
              </p>
            ))}
          </div>
        )}
      </div>
    </li>
  )
}

export default function ReturnReview() {
  const { id } = useParams()
  const store = useStore()
  const [selectedId, setSelectedId] = useState(null)
  const [detailId, setDetailId] = useState(null)

  const isMartinez = id === 'ret_martinez'
  const ret = store.returns.find((r) => r.id === id)
  const blockers = store.signoffBlockers()
  const selected = selectedId ? store.getField(selectedId) : null
  const groups = useMemo(
    () => groupFields(store.fieldsList),
    [store.fieldsList],
  )

  if (!isMartinez)
    return (
      <main className="px-6 py-6 text-slate-500">
        <p className="mb-2 font-display text-lg font-semibold text-slate-800">
          {ret?.client}
        </p>
        <p className="text-sm">
          Sample return — full field data is wired for the Martinez return.{' '}
          <Link className="font-medium text-teal-700 underline" to="/return/ret_martinez">
            Open Martinez →
          </Link>
        </p>
      </main>
    )

  const ready = blockers.length === 0

  return (
    <main className="grid h-[calc(100vh-49px)] grid-cols-2">
      <section className="flex min-h-0 flex-col border-r border-slate-200 bg-slate-50/50">
        <div className="shrink-0 space-y-3 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <Link
                to="/"
                className="text-xs font-medium text-slate-400 hover:text-teal-700"
              >
                ← Queue
              </Link>
              <h1 className="mt-1 text-lg text-slate-900">{ret?.client}</h1>
              <p className="mt-1 text-xs text-slate-500">
                {ret?.entity} · tax year 2025
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (blockers[0]) setSelectedId(blockers[0].id)
            }}
            className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
              ready
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-amber-300 bg-amber-50 text-amber-950'
            }`}
          >
            {ready
              ? 'All fields reviewed — ready for sign-off'
              : `Not ready to file — ${blockers.length} items unreviewed`}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-6">
            {groups.map(([form, fields]) => (
              <div key={form}>
                <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  {formHeading(form)}
                </h2>
                <ul className="space-y-2">
                  {fields.map((f) => (
                    <FieldRow
                      key={f.id}
                      f={f}
                      selected={selectedId === f.id}
                      onSelect={setSelectedId}
                      onOpenDetail={setDetailId}
                      confidence={store.confidenceOf(f)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sticky top-0 h-[calc(100vh-49px)] overflow-auto bg-white px-4 py-4">
        <DocumentViewer field={selected} onSelectField={setSelectedId} />
      </section>

      {detailId && (
        <FieldDetail
          fieldId={detailId}
          onClose={() => setDetailId(null)}
          onSelectField={setSelectedId}
          onAdvance={(nextId) => {
            setSelectedId(nextId)
            setDetailId(nextId)
          }}
        />
      )}
    </main>
  )
}
