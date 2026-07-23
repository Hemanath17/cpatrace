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

import { useStore } from '../lib/store.jsx'

/** Letter-paper frame every document mock renders inside. */
function PaperShell({ doc, children }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 shrink-0 border-b border-slate-200 pb-2">
        <p className="truncate text-sm font-medium text-slate-800">{doc.title}</p>
        <p className="truncate text-xs text-slate-400">{doc.filename}</p>
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

/** W-2: boxes placed by bbox_pct so highlights share the same coordinates. */
function W2Layout({ doc }) {
  const { boxes } = doc.render

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

      {boxes.map((b) => (
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
      ))}
    </div>
  )
}

function DocumentBody({ doc }) {
  switch (doc.render?.kind) {
    case 'w2':
      return <W2Layout doc={doc} />
    default:
      return (
        <div className="p-6 text-sm text-slate-400">
          {doc.render?.kind ?? 'unknown'} layout — next
        </div>
      )
  }
}

/** Resolve the box this field's provenance points at on the shown doc. */
function regionForField(field) {
  const p = field.provenance
  if (p.type === 'conflicted') {
    return p.candidates[p.ai_pick]?.region
  }
  return p.region
}

/**
 * Signature interaction: pulse the exact box the selected field came from.
 * Parent must pass key={field.id} so remounting replays the pulse.
 */
function TraceHighlight({ field, doc }) {
  const region = regionForField(field)
  const box = doc.render?.boxes?.find((b) => b.box === region)
  if (!box) return null

  return (
    <div
      className="trace-highlight pointer-events-none absolute z-10"
      style={bboxStyle(box.bbox_pct)}
      aria-hidden
    />
  )
}

export default function DocumentViewer({ field }) {
  const { documentById } = useStore()

  if (!field)
    return (
      <div className="grid h-full place-items-center text-sm text-slate-400">
        Select a field to trace it to its source.
      </div>
    )

  // --- skeleton proof-of-plumbing: replace with the spec above ---
  const p = field.provenance
  const doc =
    p.type === 'conflicted'
      ? documentById(p.candidates[p.ai_pick].source_doc)
      : p.source_doc
        ? documentById(p.source_doc)
        : null

  if (!doc) {
    return (
      <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">
          {p.type}
        </p>
        <p className="text-sm text-slate-600">
          Computed: <code className="text-xs">{p.formula}</code> over{' '}
          {p.inputs?.join(', ')}
        </p>
      </div>
    )
  }

  return (
    <PaperShell doc={doc}>
      <DocumentBody doc={doc} />
      <TraceHighlight key={field.id} field={field} doc={doc} />
    </PaperShell>
  )
}
