// ============================================================================
// DASHBOARD (challenge 07) — SKELETON. You build this one.
// ----------------------------------------------------------------------------
// The question it answers: "what should I work on RIGHT NOW?"
// rankReturns() already does the thinking — your job is rendering the answer
// so the top of the list is obviously the place to click.
//
// SPEC — build in this order:
//  1. Header strip: 3 numbers that summarize the day —
//     total flags across my returns / returns due within 7 days / items
//     awaiting my approval. Each is a *decision aid*, not a stat.
//  2. The ranked queue (rankReturns(returns, meta.as_of)):
//     - Card per return: client, entity type, due date w/ days-left,
//       StateBadge-style progress summary ("2 need review · 6 unreviewed"),
//       blocker chips (amber for waiting_on_client, violet for
//       awaiting_approval, red for deadline_imminent).
//     - Top item visually heavier (slightly larger, left accent bar) —
//       the eye should land there first.
//     - done === true → move to a collapsed "Completed" strip at bottom.
//     - waitingOnClient-only returns → bottom section "Blocked on client",
//       muted. Unfinished ≠ actionable; don't let them nag.
//  3. Whole card clicks through to /return/{id}. Only ret_martinez has field
//     data — for the other 14, route to the same page and show a friendly
//     "sample return — field data exists for Martinez" note (README: honest
//     about what's wired).
//  4. Progress bar per card: reviewed / total fields, thin, under the name.
//
// DESIGN NOTES (defend these in the video):
//  - No charts. A dashboard of decisions, not reporting — straight from the
//    brief. The only visualization is order.
//  - Blocked-on-client sinking is the "unfinished ≠ actionable" argument.
// ============================================================================

import { Link } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { rankReturns } from '../lib/priority.js'

export default function Dashboard() {
  const { returns, meta } = useStore()
  const ranked = rankReturns(returns, meta.as_of)

  // --- skeleton proof-of-plumbing: replace everything below with the spec ---
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-xl font-semibold">My returns (ranked)</h1>
      <ul className="space-y-2">
        {ranked.map((r) => (
          <li key={r.id}>
            <Link
              to={`/return/${r.id}`}
              className="block rounded border border-slate-200 bg-white px-4 py-3 hover:border-teal-600"
            >
              <span className="font-medium">{r.client}</span>
              <span className="ml-2 text-sm text-slate-500">
                {r.entity} · due {r.due} · score {r.score} ·{' '}
                {r.done ? 'done' : `${r.openWork} open`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
