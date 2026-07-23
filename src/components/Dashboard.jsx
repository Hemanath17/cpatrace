// ============================================================================
// DASHBOARD (challenge 07)
// ----------------------------------------------------------------------------
// Answers one question: "what should I work on right now?"
//
// Design decisions to defend on video:
//  - No charts. A dashboard of decisions, not reporting. The only
//    visualization is ORDER — rank IS the answer.
//  - Three header numbers, not six. Each is a decision aid ("is there
//    anything I'm blocking?"), not a statistic.
//  - Blocked-on-client returns are demoted below active work: unfinished
//    is not the same as actionable. Nothing Dana does today moves them.
//  - Completed returns leave the working list entirely.
//  - The top card is visually heavier so the eye lands on the answer
//    without being told where to look.
// ============================================================================

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { rankReturns } from '../lib/priority.js'

const WIRED_RETURN = 'ret_martinez'

const PEOPLE = {
  'dana.k': 'Dana K.',
  'marcus.r': 'Marcus R.',
}

const BLOCKER_STYLES = {
  deadline_imminent: 'border-red-300 bg-red-50 text-red-800',
  awaiting_approval: 'border-violet-300 bg-violet-50 text-violet-800',
  waiting_on_client: 'border-amber-300 bg-amber-50 text-amber-900',
  source_conflict: 'border-amber-300 bg-amber-50 text-amber-900',
  poor_source: 'border-amber-300 bg-amber-50 text-amber-900',
  high_flag_density: 'border-slate-300 bg-slate-100 text-slate-700',
  yoy_anomaly: 'border-slate-300 bg-slate-100 text-slate-700',
}

const STATE_SUMMARY_ORDER = [
  ['needs_review', 'need review'],
  ['pending_approval', 'awaiting approval'],
  ['ai_suggested', 'unreviewed'],
  ['corrected', 'corrected'],
  ['verified', 'verified'],
]

function totalFields(c) {
  return Object.values(c).reduce((a, b) => a + b, 0)
}

function reviewedFields(c) {
  return c.verified + c.corrected + c.locked
}

function stateSummary(c) {
  const parts = STATE_SUMMARY_ORDER.filter(([key]) => c[key] > 0).map(
    ([key, label]) => `${c[key]} ${label}`,
  )
  return parts.length ? parts.join(' · ') : 'No open items'
}

function DueLabel({ daysLeft, done }) {
  if (done) return <span className="text-xs text-slate-400">Filed</span>
  if (daysLeft < 0)
    return <span className="text-xs font-semibold text-red-700">Overdue</span>
  const urgent = daysLeft <= 7
  return (
    <span
      className={`text-xs font-medium ${urgent ? 'text-red-700' : 'text-slate-500'}`}
    >
      {daysLeft === 0 ? 'Due today' : `${daysLeft} days`}
    </span>
  )
}

function ProgressBar({ counts }) {
  const total = totalFields(counts)
  const pct = total ? Math.round((reviewedFields(counts) / total) * 100) : 0
  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-teal-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-slate-400">
        {pct}%
      </span>
    </div>
  )
}

function BlockerChips({ blockers }) {
  if (!blockers?.length) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {blockers.map((b) => (
        <span
          key={b.code}
          className={`rounded border px-2 py-0.5 text-[11px] leading-relaxed ${
            BLOCKER_STYLES[b.code] ?? BLOCKER_STYLES.high_flag_density
          }`}
        >
          {b.detail}
        </span>
      ))}
    </div>
  )
}

function ReturnCard({ r, lead, muted }) {
  const isWired = r.id === WIRED_RETURN
  return (
    <Link
      to={`/return/${r.id}`}
      className={`block rounded-lg border bg-white transition-colors ${
        lead
          ? 'border-slate-300 border-l-[3px] border-l-teal-600 p-4 shadow-sm hover:border-teal-600'
          : 'border-slate-200 p-3.5 hover:border-teal-600'
      } ${muted ? 'opacity-70' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={`truncate font-semibold text-slate-900 ${lead ? 'text-[15px]' : 'text-sm'}`}
        >
          {r.client}
        </span>
        <DueLabel daysLeft={r.daysLeft} done={r.done} />
      </div>

      <p className="mt-0.5 text-xs text-slate-500">
        {r.entity} · {PEOPLE[r.assignee] ?? r.assignee}
        {!isWired && (
          <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
            sample
          </span>
        )}
      </p>

      <p className="mt-2 text-xs text-slate-700">{stateSummary(r.state_counts)}</p>

      <BlockerChips blockers={r.blockers} />
      <ProgressBar counts={r.state_counts} />
    </Link>
  )
}

function HeaderStat({ value, label, tone }) {
  const tones = {
    amber: 'text-amber-700',
    red: 'text-red-700',
    violet: 'text-violet-700',
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className={`text-2xl font-semibold tabular-nums ${tones[tone] ?? ''}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs leading-tight text-slate-500">{label}</p>
    </div>
  )
}

export default function Dashboard() {
  const { returns, meta } = useStore()
  const [showCompleted, setShowCompleted] = useState(false)
  const ranked = rankReturns(returns, meta.as_of)

  const mine = ranked.filter((r) => r.assignee === meta.user.id)

  const flagsWaiting = mine.reduce((n, r) => n + r.state_counts.needs_review, 0)
  const dueSoon = mine.filter((r) => !r.done && r.daysLeft <= 7).length
  const awaitingMe = ranked.filter((r) => r.awaitingMyApproval).length

  const completed = ranked.filter((r) => r.done)
  const blocked = ranked.filter(
    (r) => !r.done && r.waitingOnClient && r.state_counts.needs_review === 0,
  )
  const active = ranked.filter(
    (r) =>
      !r.done &&
      !(r.waitingOnClient && r.state_counts.needs_review === 0),
  )

  return (
    <main className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Good morning, {meta.user.name.split(' ')[0]}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Ranked by what needs you first — not alphabetically, not by date added.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <HeaderStat
          value={flagsWaiting}
          label="flagged fields waiting on your judgment"
          tone="amber"
        />
        <HeaderStat value={dueSoon} label="returns due within 7 days" tone="red" />
        <HeaderStat
          value={awaitingMe}
          label="returns where you are the blocker"
          tone="violet"
        />
      </div>

      <section>
        <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
          Work on these
        </h2>
        <ul className="space-y-2">
          {active.map((r, i) => (
            <li key={r.id}>
              <ReturnCard r={r} lead={i === 0} />
            </li>
          ))}
        </ul>
      </section>

      {blocked.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            Blocked on client
          </h2>
          <p className="mb-2 text-xs text-slate-500">
            Unfinished, but nothing you do today moves them.
          </p>
          <ul className="space-y-2">
            {blocked.map((r) => (
              <li key={r.id}>
                <ReturnCard r={r} muted />
              </li>
            ))}
          </ul>
        </section>
      )}

      {completed.length > 0 && (
        <section className="mt-7">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase hover:text-slate-600"
          >
            {showCompleted ? '▾' : '▸'} Completed ({completed.length})
          </button>
          {showCompleted && (
            <ul className="mt-2 space-y-1">
              {completed.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/return/${r.id}`}
                    className="flex items-baseline justify-between rounded border border-slate-200 bg-white px-3 py-2 text-sm hover:border-teal-600"
                  >
                    <span className="text-slate-600">{r.client}</span>
                    <span className="text-xs text-slate-400">
                      {r.entity} · filed
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  )
}
