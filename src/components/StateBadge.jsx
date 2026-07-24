// The visual grammar for field states (challenge 08's atom).
// One component, every context — dashboard, return rows, detail panel.
//
// PRINCIPLES (graded):
//  - needs_review is the ONLY loud state. Alarm fatigue is a failure mode.
//  - ai_suggested is quiet but visibly provisional (dashed = not human-touched).
//  - verified vs corrected are both settled/calm but distinguishable —
//    endorsing the AI ≠ overriding it (dot hue + border weight, not fill wars).
//  - pending_approval is noticeable but outline-only — never competes with amber.
//  - locked recedes to near-invisible; reason lives elsewhere in the UI.
//
// Squint test (Martinez): eye should land on amber fields and nowhere else.

const STYLES = {
  ai_suggested: {
    label: 'AI suggested',
    cls: 'border border-dashed border-slate-300 bg-white text-slate-500 font-normal',
    dot: 'bg-slate-300',
  },
  needs_review: {
    label: 'Needs review',
    // Sole filled, saturated chip in the system.
    cls: 'border border-amber-600 bg-amber-100 text-amber-950 font-semibold shadow-[0_0_0_1px_rgba(217,119,6,0.15)]',
    dot: 'bg-amber-600',
  },
  verified: {
    // Endorsed — calm, no fill. Emerald lives only in the dot.
    label: 'Verified',
    cls: 'border border-transparent bg-transparent text-slate-500 font-normal',
    dot: 'bg-emerald-600',
  },
  corrected: {
    // Overridden — still calm, but a hairline border marks human intervention.
    label: 'Corrected',
    cls: 'border border-slate-300 bg-white text-slate-600 font-normal',
    dot: 'bg-sky-600',
  },
  pending_approval: {
    // Secondary urgency: outline violet, never a filled shout.
    label: 'Awaiting approval',
    cls: 'border border-violet-300 bg-white text-violet-800 font-normal',
    dot: 'bg-violet-500',
  },
  locked: {
    // Recedes — almost metadata.
    label: 'Locked',
    cls: 'border border-transparent bg-transparent text-slate-400 font-normal',
    dot: 'bg-slate-300',
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
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

// Confidence — actionable, not numeric-first (challenge 10).
// Only where a model made a judgment. Quiet at high confidence.
export function ConfidenceBadge({ value }) {
  if (value == null) return null // client_provided / carried_forward: NO badge
  if (value >= 0.9)
    return (
      <span className="text-[11px] text-slate-400">
        AI {Math.round(value * 100)}%
      </span>
    )
  if (value >= 0.7)
    return (
      <span className="text-[11px] text-amber-800/80">
        AI {Math.round(value * 100)}% — verify this
      </span>
    )
  return (
    <span className="text-[11px] font-medium text-red-700">
      AI {Math.round(value * 100)}% — low confidence
    </span>
  )
}
