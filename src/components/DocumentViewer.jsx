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

  return (
    <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
      <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">
        {p.type}
      </p>
      {doc ? (
        <>
          <p className="font-medium">{doc.title}</p>
          <p className="text-sm text-slate-500">
            {doc.filename} · page {p.page ?? 1} · region “{p.region ?? '—'}”
          </p>
        </>
      ) : (
        <p className="text-sm text-slate-600">
          Computed: <code className="text-xs">{p.formula}</code> over{' '}
          {p.inputs?.join(', ')}
        </p>
      )}
    </div>
  )
}
