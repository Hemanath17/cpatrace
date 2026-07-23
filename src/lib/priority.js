// Dashboard ranking: "what should I work on right now?"
//
// Design decisions encoded here (say these in the video):
//  1. Deadline proximity dominates — a return due in 4 days with 3 flags
//     beats a return due in 34 days with 7 flags.
//  2. Blocked-on-client returns sink to the bottom regardless of state:
//     unfinished ≠ actionable. Nothing Dana does today moves them.
//  3. "Waiting on YOUR approval" ranks high — a colleague is stalled on you;
//     unblocking others beats advancing your own queue.
//  4. Done returns drop off the working list entirely (shown in a quiet
//     "recently completed" strip instead).

const DAY = 24 * 60 * 60 * 1000

export function scoreReturn(r, asOf) {
  const today = new Date(asOf)
  const due = new Date(r.due)
  const daysLeft = Math.round((due - today) / DAY)
  const c = r.state_counts

  const openWork = c.ai_suggested + c.needs_review + c.pending_approval
  const done = openWork === 0 && r.blockers.length === 0

  const waitingOnClient = r.blockers.some((b) => b.code === 'waiting_on_client')
  const onlyBlockedOnClient = waitingOnClient && c.needs_review === 0
  const awaitingMyApproval = r.blockers.some((b) => b.code === 'awaiting_approval')

  let score = 0

  // 1. Urgency curve: explodes as deadline approaches, gentle far out.
  if (daysLeft <= 7) score += 500 + (7 - daysLeft) * 100
  else if (daysLeft <= 21) score += 200 + (21 - daysLeft) * 10
  else if (daysLeft <= 45) score += 50
  // (extension returns due in autumn score ~0 on urgency — correctly parked)

  // 2. Attention demand: flags are worth more than untouched fields —
  //    they're where the AI itself asked for a human.
  score += c.needs_review * 40
  score += c.ai_suggested * 4
  score += c.pending_approval * 30

  // 3. You are someone's blocker.
  if (awaitingMyApproval) score += 350

  // 4. Nearly-done bonus: closing a return that's 95% reviewed clears desk
  //    space and mental load cheaply. Small nudge, not a dominator.
  const total = Object.values(c).reduce((a, b) => a + b, 0)
  const reviewed = c.verified + c.corrected + c.locked
  if (openWork > 0 && reviewed / total > 0.8) score += 60

  // 5. Sinks.
  if (onlyBlockedOnClient) score = Math.min(score, 15) // visible, but bottom
  if (done) score = -1                                  // off the working list

  return { score, daysLeft, openWork, done, waitingOnClient, awaitingMyApproval }
}

export function rankReturns(returns, asOf) {
  return returns
    .map((r) => ({ ...r, ...scoreReturn(r, asOf) }))
    .sort((a, b) => b.score - a.score)
}
