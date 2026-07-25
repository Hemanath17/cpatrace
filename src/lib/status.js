// Return status, derived from field states. One source of truth so the
// dashboard, the return header, and any client view all agree — the whole
// point of challenge 06 (status that reads the same to everyone).

const UNREVIEWED = ['ai_suggested', 'needs_review', 'pending_approval']

export const STAGES = [
  { key: 'documents', label: 'Documents in' },
  { key: 'extraction', label: 'AI extraction' },
  { key: 'review', label: 'Under review' },
  { key: 'ready', label: 'Ready to file' },
  { key: 'filed', label: 'Filed' },
]

export function deriveStatus(fields) {
  const total = fields.length
  const counts = fields.reduce((acc, f) => {
    acc[f.state] = (acc[f.state] || 0) + 1
    return acc
  }, {})

  const needsReview = counts.needs_review || 0
  const pending = counts.pending_approval || 0
  const aiSuggested = counts.ai_suggested || 0
  const reviewed = (counts.verified || 0) + (counts.corrected || 0) + (counts.locked || 0)
  const unreviewed = fields.filter((f) => UNREVIEWED.includes(f.state)).length

  // Current stage. (Extraction is always done in this prototype — the AI ran.)
  let stage = 'review'
  if (unreviewed === 0) stage = 'ready'

  // The five questions the brief asks, answered in plain language.
  const flaggedFields = fields.filter((f) => f.state === 'needs_review')
  const blocking =
    needsReview > 0
      ? `${needsReview} field${needsReview === 1 ? '' : 's'} flagged for review`
      : pending > 0
        ? `${pending} correction${pending === 1 ? '' : 's'} awaiting approval`
        : null

  const nextAction =
    needsReview > 0
      ? 'Review the flagged fields'
      : pending > 0
        ? 'A second reviewer must approve the pending corrections'
        : aiSuggested > 0
          ? 'Verify the remaining AI-suggested values'
          : 'Sign off and file'

  return {
    stage,
    stageIndex: STAGES.findIndex((s) => s.key === stage),
    total,
    reviewed,
    unreviewed,
    counts,
    blocking,
    nextAction,
    owner: 'Camila Ceal (Preparer)',
    // Same status, two audiences — the core idea of the challenge.
    cpaSummary: `${reviewed} of ${total} fields reviewed · ${unreviewed} remaining`,
    clientSummary:
      unreviewed === 0
        ? 'Your return is reviewed and ready to file.'
        : 'Your accountant is reviewing your return. No action needed from you right now.',
    percent: total ? Math.round((reviewed / total) * 100) : 0,
  }
}
