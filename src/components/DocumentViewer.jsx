// ============================================================================
// DOCUMENT VIEWER — SKELETON. You build this one.
// ----------------------------------------------------------------------------
// Renders a source document as an HTML mock from documents.json `render`
// data, and highlights the region the selected field came from. No PDFs.
//
// SPEC:
//  1. Shell: paper look — white card, subtle shadow, aspect ratio ~8.5/11,
//     relative positioning (the highlight overlay is position:absolute
//     using bbox_pct percentages).
//  2. Per render.kind, lay out a recognizable mock:
//       w2 / 1099int / 1099nec / 1098: form-ish header (issuer, year, type),
//         then labeled boxes in a grid. Doesn't need to be pixel-faithful —
//         recognizable beats accurate.
//       1099int with corrected_checkbox: render "☑ CORRECTED" prominently
//         top-right in red — it's the whole evidence for the conflict pick.
//       scan: apply className "scan-poor" (CSS blur already in index.css)
//         to the content; render value with the ambiguous digit ("6,15?.00").
//       prior_return / payment_list / questionnaire: simple labeled rows.
//  3. Highlight: for the selected field's provenance (source_doc + region),
//     find the matching box; absolutely position a div at bbox_pct with
//     className "trace-highlight" (pulse animation, already in CSS).
//     Key the div by field id so re-selecting replays the pulse.
//  4. Conflicted provenance: toggle strip at top — [Original] [Corrected ✓] —
//     switching which candidate doc is shown. Default to the AI's pick.
//  5. Computed provenance: THERE IS NO DOCUMENT. Render the formula card
//     instead: human-readable formula, then each input as a row
//     (label, value, StateBadge, its own confidence) — each row clickable
//     → selects that input field (lifts selection via onSelectField prop
//     if you add one). This is the "no page to highlight" case done right.
//  6. client_provided: render the questionnaire mock with the answer
//     highlighted + "answered by {answered_by} on {answered_at}". No
//     confidence anywhere on this view.
//  7. Nothing selected: quiet empty state — "Select a field to trace it
//     to its source."
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import StateBadge, { ConfidenceBadge } from './StateBadge.jsx'

/** Letter-paper frame every document mock renders inside. */
function PaperShell({ doc, children, attribution }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 shrink-0 border-b border-slate-200 pb-2">
        <p className="truncate text-sm font-medium text-slate-800">{doc.title}</p>
        <p className="truncate text-xs text-slate-400">{doc.filename}</p>
        {attribution && (
          <p className="mt-1.5 text-xs text-slate-500">{attribution}</p>
        )}
      </div>
      <div className="relative min-h-0 flex-1 overflow-auto">
        <div className="relative mx-auto aspect-[8.5/11] w-full max-w-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)] ring-1 ring-slate-200/80">
          {children}
        </div>
      </div>
    </div>
  )
}

function bboxStyle(bbox) {
  return {
    top: `${bbox.top}%`,
    left: `${bbox.left}%`,
    width: `${bbox.width}%`,
    height: `${bbox.height}%`,
  }
}

/** Bordered cells at bbox_pct — shared by W-2 and 1099-family forms. */
function FormBoxes({ boxes }) {
  return boxes.map((b) => (
    <div
      key={b.box}
      className="absolute overflow-hidden border border-slate-300 bg-slate-50/80 px-1 py-0.5"
      style={bboxStyle(b.bbox_pct)}
    >
      <div className="flex items-baseline gap-1 leading-none">
        <span className="text-[8px] font-bold text-slate-500">{b.box}</span>
        <span className="truncate text-[7px] text-slate-400">{b.label}</span>
      </div>
      <p className="mt-0.5 truncate font-mono text-[10px] font-semibold text-slate-800">
        {b.value}
      </p>
    </div>
  ))
}

/** W-2: boxes placed by bbox_pct so highlights share the same coordinates. */
function W2Layout({ doc }) {
  return (
    <div className="absolute inset-0">
      <div className="absolute left-[4%] right-[4%] top-[6%] border-b border-slate-300 pb-2">
        <p className="text-[10px] font-semibold tracking-wide text-slate-700 uppercase">
          Form W-2 Wage and Tax Statement
        </p>
        <p className="mt-0.5 text-xs text-slate-600">
          {doc.issuer} · Form W-2 · {doc.tax_year}
        </p>
        <p className="text-[10px] text-slate-400">
          Employee: {doc.recipient}
          {doc.issuer_ein ? ` · EIN ${doc.issuer_ein}` : ''}
        </p>
      </div>
      <FormBoxes boxes={doc.render.boxes} />
    </div>
  )
}

const FORM_META = {
  '1099int': { title: 'Form 1099-INT Interest Income', short: '1099-INT' },
  '1099nec': {
    title: 'Form 1099-NEC Nonemployee Compensation',
    short: '1099-NEC',
  },
  '1098': { title: 'Form 1098 Mortgage Interest Statement', short: '1098' },
}

/** 1099-INT / 1099-NEC / 1098 — same pattern; CORRECTED badge when flagged. */
function InfoReturnLayout({ doc, kind }) {
  const meta = FORM_META[kind]
  const corrected = doc.render.corrected_checkbox === true

  return (
    <div className="absolute inset-0">
      <div className="absolute left-[4%] right-[4%] top-[6%] border-b border-slate-300 pb-2 pr-24">
        <p className="text-[10px] font-semibold tracking-wide text-slate-700 uppercase">
          {meta.title}
        </p>
        <p className="mt-0.5 text-xs text-slate-600">
          {doc.issuer} · Form {meta.short} · {doc.tax_year}
        </p>
        <p className="text-[10px] text-slate-400">Recipient: {doc.recipient}</p>
      </div>

      {corrected && (
        <div className="absolute top-[5%] right-[4%] z-20 rounded border-2 border-red-600 bg-red-50 px-2 py-1 text-center shadow-sm">
          <p className="text-sm font-black tracking-wide text-red-600">
            ☑ CORRECTED
          </p>
        </div>
      )}

      <FormBoxes boxes={doc.render.boxes} />
    </div>
  )
}

/** Blurry phone-photo property tax bill — value keeps the ambiguous digit. */
function ScanLayout({ doc }) {
  const box = doc.render.boxes[0]

  return (
    <div className="scan-poor absolute inset-0 bg-[#f4f0e6]">
      <div className="absolute left-[6%] right-[6%] top-[8%]">
        <p className="text-[11px] font-bold text-slate-800">
          {doc.issuer}
        </p>
        <p className="text-[9px] text-slate-600">Property Tax Statement · {doc.tax_year}</p>
        <p className="mt-2 text-[9px] text-slate-500">Parcel owner</p>
        <p className="text-[10px] text-slate-700">{doc.recipient}</p>
        <div className="mt-4 border-t border-dashed border-slate-400 pt-2 text-[9px] text-slate-500">
          <p>Assessed value …………… $412,000</p>
          <p>Exemptions …………… ($40,000)</p>
          <p>Taxable value …………… $372,000</p>
        </div>
      </div>

      {box && (
        <div
          className="absolute overflow-hidden border border-slate-500/60 bg-white/50 px-1 py-0.5"
          style={bboxStyle(box.bbox_pct)}
        >
          <p className="truncate text-[7px] text-slate-500">{box.label}</p>
          <p className="font-mono text-[11px] font-bold tracking-wide text-slate-900">
            {box.value}
          </p>
        </div>
      )}
    </div>
  )
}

/** prior_return / payment_list / questionnaire — stacked rows at bbox coords. */
function SimpleRowsLayout({ doc, heading, pageLabel }) {
  return (
    <div className="absolute inset-0">
      <div className="absolute left-[5%] right-[5%] top-[6%]">
        <p className="text-[10px] font-semibold text-slate-700">{heading}</p>
        <p className="text-[9px] text-slate-500">
          {doc.issuer} · {doc.tax_year}
          {pageLabel ? ` · ${pageLabel}` : ''}
        </p>
      </div>

      {doc.render.boxes.map((b) => (
        <div
          key={b.box}
          className="absolute flex items-center justify-between gap-2 border-b border-slate-200 px-1"
          style={bboxStyle(b.bbox_pct)}
        >
          <span className="min-w-0 flex-1 truncate text-[8px] text-slate-500">
            {b.label}
          </span>
          <span className="shrink-0 font-mono text-[10px] font-semibold text-slate-800">
            {b.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function DocumentBody({ doc }) {
  const kind = doc.render?.kind

  switch (kind) {
    case 'w2':
      return <W2Layout doc={doc} />
    case '1099int':
    case '1099nec':
    case '1098':
      return <InfoReturnLayout doc={doc} kind={kind} />
    case 'scan':
      return <ScanLayout doc={doc} />
    case 'prior_return':
      return (
        <SimpleRowsLayout
          doc={doc}
          heading="Prior-year filed return (excerpt)"
          pageLabel={`Page ${doc.render.boxes[0]?.page ?? doc.pages} of ${doc.pages}`}
        />
      )
    case 'payment_list':
      return (
        <SimpleRowsLayout doc={doc} heading="Estimated tax payment confirmations" />
      )
    case 'questionnaire':
      return (
        <SimpleRowsLayout doc={doc} heading="Client tax organizer — answers" />
      )
    default:
      return (
        <div className="p-6 text-sm text-slate-400">
          {kind ?? 'unknown'} layout — unsupported
        </div>
      )
  }
}

/** Resolve the box this field's provenance points at on the shown doc. */
function regionForField(field, candidateIdx) {
  const p = field.provenance
  if (p.type === 'conflicted') {
    return p.candidates[candidateIdx ?? p.ai_pick]?.region
  }
  return p.region
}

/**
 * Signature interaction: pulse the exact box(es) the selected field came from.
 * Parent must pass a remounting key so the pulse replays.
 * region may be a string or an array (e.g. four quarterly payment rows).
 */
function TraceHighlight({ field, doc, candidateIdx }) {
  const ref = useRef(null)
  const region = regionForField(field, candidateIdx)

  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [])

  if (region == null) return null
  const regions = Array.isArray(region) ? region : [region]
  const boxes = (doc.render?.boxes ?? []).filter((b) => regions.includes(b.box))
  if (!boxes.length) return null

  return boxes.map((box, i) => (
    <div
      key={box.box}
      ref={i === 0 ? ref : undefined}
      className="trace-highlight pointer-events-none absolute z-10"
      style={bboxStyle(box.bbox_pct)}
      aria-hidden
    />
  ))
}

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

/** Human-readable formula line for the "no document" computed card. */
function formulaInWords(field) {
  if (field.lock_reason?.startsWith('Computed — ')) {
    return field.lock_reason.slice('Computed — '.length)
  }
  const n = field.provenance.inputs?.length ?? 0
  return `Computed from ${n} input${n === 1 ? '' : 's'}`
}

/**
 * Computed provenance: there is no page to highlight.
 * Show the formula and clickable input rows that jump selection.
 */
function FormulaCard({ field, onSelectField }) {
  const { getField, confidenceOf } = useStore()
  const inputs = (field.provenance.inputs ?? [])
    .map((id) => getField(id))
    .filter(Boolean)

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        Computed field — no source document
      </p>
      <h3 className="mt-1 text-sm font-medium text-slate-800">{field.label}</h3>
      <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {formulaInWords(field)}
      </p>

      <p className="mt-5 mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        Inputs
      </p>
      <ul className="space-y-1.5">
        {inputs.map((input) => (
          <li key={input.id}>
            <button
              type="button"
              onClick={() => onSelectField?.(input.id)}
              className="flex w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:border-teal-600 hover:bg-teal-50/40"
            >
              <span className="min-w-0 flex-1 truncate text-slate-700">
                {input.label}
              </span>
              <span className="shrink-0 tabular-nums font-medium text-slate-900">
                {formatFieldValue(input)}
              </span>
              <ConfidenceBadge value={confidenceOf(input)} />
              <StateBadge state={input.state} small />
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-auto pt-4 text-right text-sm tabular-nums font-semibold text-slate-800">
        Result: {formatFieldValue(field)}
      </p>
    </div>
  )
}

/** Two-button strip: disagreement visible before you toggle. */
function ConflictToggle({ field, selectedIdx, onSelect }) {
  const { documentById } = useStore()
  const { candidates, ai_pick, resolved, resolved_candidate } = field.provenance
  const isResolved = resolved === true
  const chosenIdx = isResolved ? resolved_candidate : null

  return (
    <div className="mb-3 shrink-0">
      <p
        className={`mb-1.5 text-[10px] font-semibold tracking-wide uppercase ${
          isResolved ? 'text-teal-700' : 'text-amber-700'
        }`}
      >
        {isResolved
          ? 'Conflict resolved — inspecting chosen source'
          : 'Source conflict — pick which document to inspect'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {candidates.map((c, i) => {
          const doc = documentById(c.source_doc)
          const isCorrected =
            doc?.render?.corrected_checkbox === true || doc?.corrected_flag === true
          const label = isCorrected ? 'Corrected' : 'Original'
          const isAi = i === ai_pick
          const isActive = i === selectedIdx
          const isChosen = chosenIdx === i

          return (
            <button
              key={c.source_doc}
              type="button"
              onClick={() => onSelect(i)}
              className={`rounded-md border px-3 py-2 text-left transition ${
                isActive
                  ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="text-xs font-semibold text-slate-800">
                {label}
                {isChosen
                  ? ' · chosen'
                  : isAi
                    ? ' ✓'
                    : ''}
                {!isResolved && isAi && (
                  <span className="ml-1 font-normal text-slate-400">(AI pick)</span>
                )}
              </p>
              <p className="mt-0.5 tabular-nums text-sm font-medium text-slate-900">
                {formatMoney(c.value)}
              </p>
              <p className="text-[11px] text-slate-500">
                AI {Math.round(c.confidence * 100)}%
              </p>
            </button>
          )
        })}
      </div>
      {isResolved && field.provenance.resolution_note ? (
        <p className="mt-2 text-[11px] leading-snug text-slate-500">
          {field.provenance.resolution_note}
        </p>
      ) : (
        field.provenance.ai_pick_reason && (
          <p className="mt-2 text-[11px] leading-snug text-slate-500">
            {field.provenance.ai_pick_reason}
          </p>
        )
      )}
    </div>
  )
}

function DocPane({ field, doc, candidateIdx, attribution }) {
  return (
    <PaperShell doc={doc} attribution={attribution}>
      <DocumentBody doc={doc} />
      <TraceHighlight
        key={`${field.id}-${candidateIdx ?? 'solo'}`}
        field={field}
        doc={doc}
        candidateIdx={candidateIdx}
      />
    </PaperShell>
  )
}

function ConflictedDocView({ field }) {
  const { documentById } = useStore()
  const initialIdx =
    field.provenance.resolved === true
      ? field.provenance.resolved_candidate
      : field.provenance.ai_pick
  const [candidateIdx, setCandidateIdx] = useState(initialIdx)

  useEffect(() => {
    const next =
      field.provenance.resolved === true
        ? field.provenance.resolved_candidate
        : field.provenance.ai_pick
    setCandidateIdx(next)
  }, [
    field.id,
    field.provenance.ai_pick,
    field.provenance.resolved,
    field.provenance.resolved_candidate,
  ])

  const candidate = field.provenance.candidates[candidateIdx]
  const doc = documentById(candidate?.source_doc)
  if (!doc) return null

  return (
    <div className="flex h-full flex-col">
      <ConflictToggle
        field={field}
        selectedIdx={candidateIdx}
        onSelect={setCandidateIdx}
      />
      <div className="min-h-0 flex-1">
        <DocPane field={field} doc={doc} candidateIdx={candidateIdx} />
      </div>
    </div>
  )
}

export default function DocumentViewer({ field, onSelectField }) {
  const { documentById } = useStore()

  if (!field)
    return (
      <div className="grid h-full place-items-center text-sm text-slate-400">
        Select a field to trace it to its source.
      </div>
    )

  const p = field.provenance

  if (p.type === 'computed') {
    return <FormulaCard field={field} onSelectField={onSelectField} />
  }

  if (p.type === 'conflicted') {
    return <ConflictedDocView field={field} />
  }

  const doc = p.source_doc ? documentById(p.source_doc) : null

  if (!doc) {
    return (
      <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">
          {p.type}
        </p>
        <p className="text-sm text-slate-600">
          No document available for this provenance type.
        </p>
      </div>
    )
  }

  // Attribution when there's no model confidence to show.
  const attribution =
    p.type === 'client_provided' && p.answered_by
      ? `Answered by ${p.answered_by} on ${p.answered_at}`
      : p.type === 'carried_forward'
        ? `Carried forward from the filed ${doc.tax_year} return`
        : null

  return (
    <DocPane field={field} doc={doc} attribution={attribution} />
  )
}
