// ============================================================================
// DASHBOARD (challenge 07) — dense list view
// ----------------------------------------------------------------------------
//  - A scannable table, not cards. CPAs manage volume; density signals a tool
//    that respects the work. Rank IS the answer — top row is where to start.
//  - No charts. Decisions, not reporting.
//  - Filter pills mirror the three questions a reviewer asks each morning.
//  - Blocked-on-client returns sink to their own group: unfinished is not
//    the same as actionable.
// ============================================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { rankReturns } from '../lib/priority.js'

const WIRED_RETURN = 'ret_martinez'

const PEOPLE = {
  'dana.k': { name: 'Camila C.', initials: 'CC', tint: 'bg-teal-700' },
  'marcus.r': { name: 'Marcus R.', initials: 'MR', tint: 'bg-indigo-500' },
}

function totalFields(c) {
  return Object.values(c).reduce((a, b) => a + b, 0)
}
function reviewedFields(c) {
  return c.verified + c.corrected + c.locked
}

// The single most important status per return, shown as a pill.
function primaryStatus(r) {
  if (r.done) return { label: 'Filed', cls: 'bg-slate-100 text-slate-500' }
  if (r.awaitingMyApproval)
    return { label: 'Needs your approval', cls: 'bg-violet-100 text-violet-700' }
  if (r.state_counts.needs_review > 0)
    return {
      label: `${r.state_counts.needs_review} need review`,
      cls: 'bg-amber-100 text-amber-800',
    }
  if (r.waitingOnClient)
    return { label: 'Waiting on client', cls: 'bg-rose-100 text-rose-700' }
  if (r.state_counts.ai_suggested > 0)
    return { label: 'In review', cls: 'bg-sky-100 text-sky-700' }
  return { label: 'Ready to file', cls: 'bg-emerald-100 text-emerald-700' }
}

function DueCell({ daysLeft, done }) {
  if (done) return <span className="text-xs text-slate-400">—</span>
  if (daysLeft < 0)
    return <span className="text-xs font-semibold text-red-700">Overdue</span>
  const urgent = daysLeft <= 7
  return (
    <span className={`text-xs font-medium ${urgent ? 'text-red-700' : 'text-slate-600'}`}>
      {daysLeft === 0 ? 'Today' : `${daysLeft} days`}
    </span>
  )
}

function Progress({ counts }) {
  const total = totalFields(counts)
  const done = reviewedFields(counts)
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-teal-600" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-slate-400">
        {done}/{total}
      </span>
    </div>
  )
}

function Assignee({ id }) {
  const p = PEOPLE[id] ?? { name: id, initials: '??', tint: 'bg-slate-400' }
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ${p.tint}`}>
        {p.initials}
      </span>
      <span className="hidden text-xs text-slate-600 lg:inline">{p.name}</span>
    </div>
  )
}

function Row({ r, lead, onOpen }) {
  const status = primaryStatus(r)
  const isWired = r.id === WIRED_RETURN
  return (
    <tr
      onClick={() => onOpen(r.id)}
      className={`cursor-pointer border-b border-slate-100 hover:bg-teal-50/40 ${
        lead ? 'bg-teal-50/30' : ''
      }`}
    >
      <td className="py-3 pl-5 pr-3">
        <div className="flex items-center gap-2">
          {lead && <span className="h-8 w-[3px] shrink-0 rounded-full bg-teal-600" />}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{r.client}</p>
            <p className="text-[11px] text-slate-400">
              {r.entity}
              {!isWired && <span className="ml-1.5 text-slate-300">· sample</span>}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${status.cls}`}>
          {status.label}
        </span>
      </td>
      <td className="px-3 py-3">
        <Progress counts={r.state_counts} />
      </td>
      <td className="px-3 py-3">
        <DueCell daysLeft={r.daysLeft} done={r.done} />
      </td>
      <td className="px-3 py-3 pr-5">
        <Assignee id={r.assignee} />
      </td>
    </tr>
  )
}

function StatCard({ value, label, tone, active, onClick }) {
  const tones = {
    amber: 'text-amber-700',
    red: 'text-red-700',
    violet: 'text-violet-700',
    slate: 'text-slate-700',
  }
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border bg-white px-4 py-3 text-left transition-colors ${
        active ? 'border-teal-500 ring-1 ring-teal-500' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <p className={`text-2xl font-semibold tabular-nums ${tones[tone]}`}>{value}</p>
      <p className="mt-0.5 text-xs leading-tight text-slate-500">{label}</p>
    </button>
  )
}

export default function Dashboard() {
  const { returns, meta } = useStore()
  const navigate = useNavigate()
  const [filter, setFilter] = useState(null) // null | 'flags' | 'due' | 'approve'

  const ranked = rankReturns(returns, meta.as_of)
  const mine = ranked.filter((r) => r.assignee === meta.user.id)

  const flagsWaiting = mine.reduce((n, r) => n + r.state_counts.needs_review, 0)
  const dueSoon = mine.filter((r) => !r.done && r.daysLeft <= 7).length
  const awaitingMe = ranked.filter((r) => r.awaitingMyApproval).length

  const completed = ranked.filter((r) => r.done)
  const blocked = ranked.filter(
    (r) => !r.done && r.waitingOnClient && r.state_counts.needs_review === 0,
  )
  let active = ranked.filter(
    (r) => !r.done && !(r.waitingOnClient && r.state_counts.needs_review === 0),
  )

  if (filter === 'flags') active = active.filter((r) => r.state_counts.needs_review > 0)
  if (filter === 'due') active = active.filter((r) => r.daysLeft <= 7)
  if (filter === 'approve') active = active.filter((r) => r.awaitingMyApproval)

  const open = (id) => navigate(`/return/${id}`)

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-5">
        <h1 className="font-display text-2xl tracking-tight text-slate-900">
          Good morning, {meta.user.name.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {active.length + blocked.length} open returns · ranked by what needs you first.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard value={flagsWaiting} label="flagged fields waiting on your judgment" tone="amber"
          active={filter === 'flags'} onClick={() => setFilter(filter === 'flags' ? null : 'flags')} />
        <StatCard value={dueSoon} label="returns due within 7 days" tone="red"
          active={filter === 'due'} onClick={() => setFilter(filter === 'due' ? null : 'due')} />
        <StatCard value={awaitingMe} label="returns where you are the blocker" tone="violet"
          active={filter === 'approve'} onClick={() => setFilter(filter === 'approve' ? null : 'approve')} />
        <StatCard value={completed.length} label="filed this season" tone="slate"
          active={false} onClick={() => {}} />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-700">
            {filter ? 'Filtered returns' : 'Work on these'}
          </h2>
          {filter && (
            <button onClick={() => setFilter(null)} className="text-xs text-teal-700 hover:underline">
              Clear filter
            </button>
          )}
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <th className="py-2.5 pl-5 pr-3">Client / Return</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Progress</th>
              <th className="px-3 py-2.5">Due</th>
              <th className="px-3 py-2.5 pr-5">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {active.map((r, i) => (
              <Row key={r.id} r={r} lead={i === 0 && !filter} onOpen={open} />
            ))}
            {active.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                  Nothing matches this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {blocked.length > 0 && !filter && (
          <>
            <div className="border-t border-slate-100 bg-slate-50 px-5 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Blocked on client · nothing you do today moves them
              </p>
            </div>
            <table className="w-full">
              <tbody>
                {blocked.map((r) => (
                  <Row key={r.id} r={r} onOpen={open} />
                ))}
              </tbody>
            </table>
          </>
        )}

        {completed.length > 0 && !filter && (
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-2.5">
            <span className="text-[11px] text-slate-400">
              {completed.length} completed returns hidden ·{' '}
              <button
                onClick={() => open(completed[0].id)}
                className="text-teal-700 hover:underline"
              >
                view a filed example
              </button>
            </span>
          </div>
        )}
      </div>
    </main>
  )
}