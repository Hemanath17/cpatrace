// ============================================================================
// RETURN REVIEW (challenge 01) — the core screen.
// ----------------------------------------------------------------------------
// Split view. LEFT: the return, field by field, grouped by form.
// RIGHT: DocumentViewer — click a field, its source highlights.
// Sign-off banner up top is the anti-rubber-stamp rule made visible.
// FieldDetail opens as a slide-over (not a route) to preserve context.
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
          'group cursor-pointer border-b border-slate-100 px-4 py-2.5 transition-colors',
          selected
            ? 'bg-teal-50 ring-1 ring-inset ring-teal-500/40'
            : 'hover:bg-slate-50',
          f.recomputed ? 'border-l-[3px] border-l-sky-400' : 'border-l-[3px] border-l-transparent',
        ].join(' ')}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-slate-800">{f.label}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {f.form} · line {f.line}
              {f.recomputed && (
                <span className="ml-2 font-medium text-sky-600">recomputed</span>
              )}
            </p>
          </div>

          <span className="w-24 shrink-0 text-right text-sm font-medium tabular-nums text-slate-900">
            {formatFieldValue(f)}
          </span>

          <div className="hidden w-32 shrink-0 justify-end lg:flex">
            <ConfidenceBadge value={confidence} />
          </div>

          <div className="flex w-[6.5rem] shrink-0 justify-end">
            <StateBadge state={f.state} small />
          </div>

          <button
            type="button"
            className="shrink-0 text-xs font-medium text-teal-700 opacity-0 transition-opacity hover:text-teal-900 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              onOpenDetail(f.id)
            }}
          >
            Details
          </button>
        </div>

        {f.flags?.length > 0 && (
          <div className="mt-2 flex items-start gap-2 rounded bg-amber-50 px-2.5 py-1.5">
            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16h.01" />
            </svg>
            <div className="space-y-1">
              {f.flags.map((flag) => (
                <p key={flag.code} className="text-[11px] leading-snug text-amber-900">
                  {flag.message}
                </p>
              ))}
            </div>
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
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link to="/" className="text-xs font-medium text-slate-400 hover:text-teal-700">
          ← Back to queue
        </Link>
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="font-display text-xl font-semibold text-slate-800">
            {ret?.client}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{ret?.entity} · tax year 2025</p>
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-900">
              This is a sample return used to populate the dashboard queue. Full
              field-level data — with source documents, confidence, and the
              review workflow — is wired for the Martinez return.
            </p>
          </div>
          <Link
            className="mt-4 inline-block rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
            to="/return/ret_martinez"
          >
            Open the Martinez return →
          </Link>
        </div>
      </main>
    )

  const ready = blockers.length === 0

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Return header bar */}
      <div className="flex shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-5 py-3">
        <div className="min-w-0">
          <Link to="/" className="text-xs font-medium text-slate-400 hover:text-teal-700">
            ← Queue
          </Link>
          <h1 className="font-display text-lg font-semibold tracking-tight text-slate-900">
            {ret?.client}
          </h1>
        </div>
        <span className="hidden text-xs text-slate-400 sm:inline">
          {ret?.entity} · tax year 2025
        </span>

        <button
          type="button"
          onClick={() => {
            if (blockers[0]) setSelectedId(blockers[0].id)
          }}
          className={`ml-auto flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium ${
            ready
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${ready ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {ready
            ? 'Ready for sign-off'
            : `${blockers.length} items need review before filing`}
        </button>
      </div>

      {/* Split view: field list (wider) | document pane */}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
          {groups.map(([form, fields]) => (
            <div key={form}>
              <div className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 px-4 py-1.5 backdrop-blur">
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {formHeading(form)}
                </h2>
              </div>
              <ul>
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
        </section>

        <section className="min-h-0 overflow-auto bg-slate-100 px-4 py-4">
          <DocumentViewer field={selected} onSelectField={setSelectedId} />
        </section>
      </div>

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
    </div>
  )
}