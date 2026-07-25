// The single place that talks to the backend. Everything else imports these.
// Base URL comes from an env var: localhost in dev, Render in production.

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body.detail) detail = body.detail
    } catch {
      // non-JSON error body — keep the status text
    }
    throw new Error(detail)
  }
  return res.json()
}

export const api = {
  // reads
  getFields: (returnId) => request(`/api/returns/${returnId}/fields`),
  getField: (fieldId) => request(`/api/fields/${fieldId}`),

  // mutations — each returns the updated field
  verify: (fieldId, user = 'camila.c') =>
    request(`/api/fields/${fieldId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ user }),
    }),

  correct: (fieldId, value, note, user = 'camila.c') =>
    request(`/api/fields/${fieldId}/correct`, {
      method: 'POST',
      body: JSON.stringify({ value, note, user }),
    }),

  resolveConflict: (fieldId, candidateIndex, note, user = 'camila.c') =>
    request(`/api/fields/${fieldId}/resolve-conflict`, {
      method: 'POST',
      body: JSON.stringify({ candidate_index: candidateIndex, note, user }),
    }),

  approve: (fieldId, user = 'camila.c') =>
    request(`/api/fields/${fieldId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ user }),
    }),

  reject: (fieldId, note, user = 'camila.c') =>
    request(`/api/fields/${fieldId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ note, user }),
    }),

  simulateExtraction: (returnId) =>
    request(`/api/simulate-extraction/${returnId}`, { method: 'POST' }),

  secondOpinion: (fieldId) =>
    request(`/api/fields/${fieldId}/second-opinion`, { method: 'POST' }),
}
