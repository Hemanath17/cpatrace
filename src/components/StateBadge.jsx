// The visual grammar for field states (challenge 08's atom).
// Working baseline — restyle in the day-2 visual pass, but keep the
// PRINCIPLES, which are the graded part:
//
//  - needs_review is the ONLY loud state (amber). If everything shouts,
//    nothing does — alarm fatigue is a named failure mode.
//  - ai_suggested is quiet but visibly "not yet human-touched" (dashed
//    border = provisional).
//  - verified vs corrected are both "settled" (solid, calm) but
//    distinguishable — endorsing the AI ≠ overriding it.
//  - locked is muted + always paired with a reason elsewhere in the UI.
//  - This exact component appears on the dashboard, the return rows, and
//    the detail panel — one grammar, every context ("across several
//    different screens, not just one component").

const STYLES = {
  ai_suggested: {
    label: 'AI suggested',
    cls: 'border border-dashed border-slate-400 text-slate-600 bg-white',
    dot: 'bg-slate-400',
  },
  needs_review: {
    label: 'Needs review',
    cls: 'border border-amber-500 text-amber-800 bg-amber-50 font-medium',
    dot: 'bg-amber-500',
  },
  verified: {
    label: 'Verified',
    cls: 'border border-emerald-600/40 text-emerald-800 bg-emerald-50',
    dot: 'bg-emerald-600',
  },
  corrected: {
    label: 'Corrected',
    cls: 'border border-sky-600/40 text-sky-800 bg-sky-50',
    dot: 'bg-sky-600',
  },
  pending_approval: {
    label: 'Awaiting approval',
    cls: 'border border-violet-500/40 text-violet-800 bg-violet-50',
    dot: 'bg-violet-500',
  },
  locked: {
    label: 'Locked',
    cls: 'border border-slate-300 text-slate-500 bg-slate-100',
    dot: 'bg-slate-400',
  },
}

export default function StateBadge({ state, small }) {
  const s = STYLES[state] ?? STYLES.ai_suggested
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${
        small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'
      } ${s.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

// Confidence rendering — actionable, not numeric-first (challenge 10).
// Rule from the data model: only shown where a model made a judgment.
export function ConfidenceBadge({ value }) {
  if (value == null) return null // client_provided / carried_forward: NO badge
  if (value >= 0.9)
    return <span className="text-[11px] text-slate-400">AI {Math.round(value * 100)}%</span>
  if (value >= 0.7)
    return (
      <span className="text-[11px] text-amber-700">
        AI {Math.round(value * 100)}% — verify this
      </span>
    )
  return (
    <span className="text-[11px] font-medium text-red-700">
      AI {Math.round(value * 100)}% — low confidence
    </span>
  )
}
