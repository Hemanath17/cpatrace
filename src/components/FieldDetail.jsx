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

import { useEffect, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import StateBadge, { ConfidenceBadge } from './StateBadge.jsx'
import DocumentViewer from './DocumentViewer.jsx'

const APPROVAL_DELTA = 5000
const UNREVIEWED = ['ai_suggested', 'needs_review', 'pending_approval']

function formatMoney(n) {
  if (typeof n !== 'number') return String(n)
  const s = Math.abs(n).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })
  return n < 0 ? `(${s})` : s
}

function formatHistoryValue(n, field) {
  if (typeof n !== 'number') return String(n)
  if (field.unit === 'percent') return `${n}%`
  return formatMoney(n)
}

function formatFieldValue(f) {
  if (typeof f.value !== 'number') return f.value
  if (f.unit === 'percent') return `${f.value}%`
  return formatMoney(f.value)
}

function formatWhen(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatAnsweredDate(isoDate) {
  if (!isoDate) return ''
  const d = new Date(isoDate + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formulaInWords(field) {
  if (field.lock_reason?.startsWith('Computed — ')) {
    return field.lock_reason.slice('Computed — '.length)
  }
  const n = field.provenance.inputs?.length ?? 0
  return `Computed from ${n} input${n === 1 ? '' : 's'}`
}

/** One plain-English sentence — never a provenance data dump. */
function aiDidSentence(field, documentById) {
  const p = field.provenance

  switch (p.type) {
    case 'extracted': {
      const doc = documentById(p.source_doc)
      const pct = Math.round((p.confidence ?? 0) * 100)
      const region = Array.isArray(p.region)
        ? p.region.join(', ')
        : p.region
      const amount = p.raw_text ? `$${p.raw_text}` : formatMoney(field.value)
      const formLabel = doc
        ? `${doc.issuer.replace(/,?\s*(LLC|Inc\.|N\.A\.).*$/, '').trim()} ${doc.type}`
        : 'the source form'
      return `Read ${amount} from box ${region} of the ${formLabel}. ${pct}% confident.`
    }
    case 'computed':
      return formulaInWords(field)
    case 'conflicted':
      return `Found two disagreeing sources. Recommends the corrected form: ${p.ai_pick_reason}`
    case 'client_provided':
      return `Answered by ${p.answered_by} on ${formatAnsweredDate(p.answered_at)}. The AI made no judgment on this value.`
    case 'carried_forward': {
      const doc = documentById(p.source_doc)
      return `Carried from the filed ${doc?.tax_year ?? 'prior'} return.`
    }
    default:
      return 'No AI provenance available for this field.'
  }
}

function WhoChip({ who }) {
  const kind =
    who === 'ai' ? 'ai' : who === 'system' || who === 'client' ? who : 'user'
  const styles = {
    ai: 'bg-slate-100 text-slate-700',
    system: 'bg-slate-200 text-slate-600',
    client: 'bg-sky-50 text-sky-800',
    user: 'bg-teal-50 text-teal-800',
  }
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[kind]}`}
    >
      {who}
    </span>
  )
}

function ActionZone({
  field,
  store,
  onDone,
  approvalExplainer,
  setApprovalExplainer,
}) {
  const [correctValue, setCorrectValue] = useState(String(field.value))
  const [note, setNote] = useState('')
  const [rejectNote, setRejectNote] = useState('')

  // Keep correct input in sync when advancing to another field.
  useEffect(() => {
    setCorrectValue(String(field.value))
    setNote('')
    setRejectNote('')
  }, [field.id, field.value])

  useEffect(() => {
    setApprovalExplainer(false)
  }, [field.id, setApprovalExplainer])

  const f = field

  if (f.state === 'locked') {
    const resolveDoc = f.resolve_at ? store.documentById(f.resolve_at) : null
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          Locked — edit at the source
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {f.lock_reason}
        </p>
        {resolveDoc && (
          <p className="mt-3 text-sm text-teal-800">
            Resolve at:{' '}
            <span className="font-medium underline decoration-teal-600/40">
              {resolveDoc.title}
            </span>
          </p>
        )}
      </div>
    )
  }

  if (f.state === 'pending_approval') {
    const corrected = [...f.edit_history].reverse().find((h) => h.event === 'corrected')
    return (
      <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-4">
        {approvalExplainer && (
          <p className="mb-3 rounded-md border border-violet-300 bg-white px-3 py-2 text-xs text-violet-900">
            Sent for second review — firm policy for changes over{' '}
            {formatMoney(APPROVAL_DELTA)}. This is expected, not a bug.
          </p>
        )}
        <p className="text-[10px] font-semibold tracking-wide text-violet-700 uppercase">
          Awaiting second-reviewer approval
        </p>
        {corrected && (
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            <p className="tabular-nums text-base font-semibold">
              {formatMoney(corrected.old_value)} → {formatMoney(corrected.value)}
            </p>
            <p>
              <WhoChip who={corrected.who} />{' '}
              <span className="text-slate-500">{formatWhen(corrected.when)}</span>
            </p>
            {corrected.note && (
              <p className="text-slate-600">Why: {corrected.note}</p>
            )}
            {f.approval_rule && (
              <p className="mt-2 text-xs text-violet-800">{f.approval_rule}</p>
            )}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <button
            type="button"
            onClick={() => {
              store.approve(f.id)
              onDone()
            }}
            className="rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            Approve
          </button>
          <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
            <input
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Reject reason"
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                store.reject(f.id, rejectNote)
                onDone()
              }}
              className="rounded-md border border-violet-300 bg-white px-3 py-1.5 text-sm text-violet-900 hover:bg-violet-50"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (f.provenance.type === 'conflicted' && !f.provenance.resolved) {
    return (
      <div className="space-y-3">
        <p className="text-[10px] font-semibold tracking-wide text-amber-700 uppercase">
          Resolve conflict — choose the source of truth
        </p>
        <div className="grid grid-cols-1 gap-2">
          {f.provenance.candidates.map((c, i) => {
            const doc = store.documentById(c.source_doc)
            const isAi = i === f.provenance.ai_pick
            const isCorrected =
              doc?.render?.corrected_checkbox || doc?.corrected_flag
            return (
              <div
                key={c.source_doc}
                className={`rounded-md border p-3 ${
                  isAi ? 'border-teal-600 bg-teal-50/50' : 'border-slate-200'
                }`}
              >
                <p className="text-xs font-semibold text-slate-800">
                  {isCorrected ? 'Corrected' : 'Original'}
                  {isAi ? ' · AI pick' : ''}
                </p>
                <p className="mt-0.5 tabular-nums text-sm font-medium">
                  {formatMoney(c.value)} · AI {Math.round(c.confidence * 100)}%
                </p>
                <p className="text-[11px] text-slate-500">{doc?.title}</p>
                <button
                  type="button"
                  onClick={() => {
                    store.resolveConflict(
                      f.id,
                      i,
                      `Chose ${isCorrected ? 'corrected' : 'original'} form`,
                    )
                    onDone()
                  }}
                  className="mt-2 rounded-md bg-teal-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-800"
                >
                  Use this one
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (['ai_suggested', 'needs_review', 'verified', 'corrected'].includes(f.state)) {
    const showVerify = ['ai_suggested', 'needs_review'].includes(f.state)
    const verifyButton = showVerify && (
      <button
        type="button"
        onClick={() => {
          store.verify(f.id)
          onDone()
        }}
        className={
          f.state === 'needs_review'
            ? 'w-full rounded-md border border-teal-700 bg-white px-3 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50'
            : 'w-full rounded-md bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800'
        }
      >
        {f.state === 'needs_review' ? 'Confirm as correct' : '✓ Verify'}
      </button>
    )

    return (
      <div className="space-y-3">
        {f.state === 'needs_review' && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Flagged fields skip one-click verify — review the evidence first,
            then confirm or correct deliberately.
          </p>
        )}

        {f.state === 'ai_suggested' && verifyButton}

        <div className="rounded-lg border border-slate-200 p-3">
          <p className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
            Correct this value
          </p>
          <label className="block text-xs text-slate-500">
            New value
            <input
              type="number"
              step="0.01"
              value={correctValue}
              onChange={(e) => setCorrectValue(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-sm tabular-nums"
            />
          </label>
          <label className="mt-2 block text-xs text-slate-500">
            Note (why)
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Required for the audit trail"
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              const next = Number(correctValue)
              if (Number.isNaN(next)) return
              const delta = Math.abs(next - f.value)
              const willRoute = f.requires_approval || delta > APPROVAL_DELTA
              store.correct(f.id, next, note)
              if (willRoute) {
                setApprovalExplainer(true)
              } else {
                onDone()
              }
            }}
            className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Save correction
          </button>
        </div>

        {f.state === 'needs_review' && verifyButton}
      </div>
    )
  }

  return null
}

export default function FieldDetail({
  fieldId,
  onClose,
  onSelectField,
  onAdvance,
}) {
  const store = useStore()
  const f = store.getField(fieldId)
  const [entered, setEntered] = useState(false)
  const [approvalExplainer, setApprovalExplainer] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!f) return null

  function advanceAfterAction() {
    const next = store.fieldsList.find(
      (b) => b.id !== f.id && UNREVIEWED.includes(b.state),
    )
    if (next && onAdvance) {
      onAdvance(next.id)
    } else if (next && onSelectField) {
      onSelectField(next.id)
      onClose()
    } else {
      onClose()
    }
  }

  const sentence = aiDidSentence(f, store.documentById)
  // No confidence badge for client_provided / carried_forward (null from store).
  const confidence = store.confidenceOf(f)

  return (
    <div
      className={`fixed inset-0 z-30 flex justify-end transition-colors duration-200 ${
        entered ? 'bg-slate-900/25' : 'bg-transparent'
      }`}
      onClick={onClose}
      role="presentation"
    >
      <aside
        className={`flex h-full w-full max-w-[440px] flex-col bg-white shadow-2xl transition-transform duration-200 ease-out ${
          entered ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Field detail"
      >
        {/* Header */}
        <header className="shrink-0 border-b border-slate-200 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">
                {f.form} · line {f.line}
              </p>
              <h2 className="mt-1 text-lg text-slate-900">{f.label}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
            {formatFieldValue(f)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StateBadge state={f.state} />
            <ConfidenceBadge value={confidence} />
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {f.recomputed && (
            <div className="rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900">
              Recomputed — an input changed, so this value was recalculated.
            </div>
          )}

          {/* What the AI did */}
          <section>
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              What the AI did
            </h3>
            <p className="text-sm leading-relaxed text-slate-700">{sentence}</p>
          </section>

          {/* Flags */}
          {f.flags?.length > 0 && (
            <section className="space-y-2">
              {f.flags.map((flag) => (
                <div
                  key={flag.code}
                  className="rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950"
                >
                  {flag.message}
                </div>
              ))}
            </section>
          )}

          {/* Evidence */}
          {f.provenance.type !== 'computed' && (
            <section>
              <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Evidence
              </h3>
              <div className="h-80 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                <div className="h-full min-h-0">
                  <DocumentViewer field={f} onSelectField={onSelectField} />
                </div>
              </div>
            </section>
          )}

          {/* Actions */}
          <section>
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Actions
            </h3>
            <ActionZone
              field={f}
              store={store}
              onDone={advanceAfterAction}
              approvalExplainer={approvalExplainer}
              setApprovalExplainer={setApprovalExplainer}
            />
          </section>

          {/* History */}
          <section>
            <h3 className="mb-3 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              History
            </h3>
            <ol className="space-y-3 border-l border-slate-200 pl-3">
              {[...f.edit_history].reverse().map((h, i) => (
                <li key={`${h.when}-${h.event}-${i}`} className="relative text-sm">
                  <span className="absolute top-1.5 -left-[17px] h-2 w-2 rounded-full bg-slate-300" />
                  <div className="flex flex-wrap items-center gap-2">
                    <WhoChip who={h.who} />
                    <span className="text-xs text-slate-400">
                      {formatWhen(h.when)}
                    </span>
                    <span className="text-xs font-medium text-slate-600">
                      {h.event.replaceAll('_', ' ')}
                    </span>
                  </div>
                  {'old_value' in h && (
                    <p className="mt-1 tabular-nums text-slate-800">
                      {formatHistoryValue(h.old_value, f)} →{' '}
                      {formatHistoryValue(h.value, f)}
                    </p>
                  )}
                  {'value' in h && !('old_value' in h) && typeof h.value === 'number' && (
                    <p className="mt-1 tabular-nums text-slate-600">
                      {formatHistoryValue(h.value, f)}
                    </p>
                  )}
                  {h.note && (
                    <p className="mt-1 text-xs text-slate-500">{h.note}</p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </aside>
    </div>
  )
}
