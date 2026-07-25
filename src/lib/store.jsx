// Global store — now backed by the FastAPI server instead of in-memory data.
// Loads fields from the backend on mount; every action calls the API and
// updates local state from the server's authoritative response.
//
// The store keeps the SAME interface the components already use
// (fieldsList, verify, correct, etc.), so the UI layer barely changes.
// State/cascade/validation now live server-side; this is a client of that.

import {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react'
import { api } from './api.js'
import documentsData from '../data/documents.json'
import returnsData from '../data/returns.json'
import { inheritedConfidence } from './formulas.js'

const RETURN_ID = 'ret_martinez'
const StoreCtx = createContext(null)

export function StoreProvider({ children }) {
  const [fields, setFields] = useState({})        // id -> field
  const [fieldOrder, setFieldOrder] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load fields from the backend once on mount.
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await api.getFields(RETURN_ID)
      const byId = Object.fromEntries(list.map((f) => [f.id, f]))
      setFields(byId)
      setFieldOrder(list.map((f) => f.id))
    } catch (e) {
      setError(e.message || 'Could not reach the server')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Merge one updated field (or several) back into state.
  const mergeFields = useCallback((updated) => {
    const arr = Array.isArray(updated) ? updated : [updated]
    setFields((prev) => {
      const next = { ...prev }
      for (const f of arr) next[f.id] = f
      return next
    })
  }, [])

  // After a mutation, the server may have cascaded other fields. The single
  // returned field isn't enough, so we refetch all fields to stay in sync.
  const runAction = useCallback(
    async (actionPromise) => {
      try {
        await actionPromise
        const list = await api.getFields(RETURN_ID)
        const byId = Object.fromEntries(list.map((f) => [f.id, f]))
        setFields(byId)
      } catch (e) {
        setError(e.message || 'Action failed')
        throw e
      }
    },
    [],
  )

  const api_ = useMemo(() => {
    const getField = (id) => fields[id]
    return {
      loading,
      error,
      reload: load,
      documents: documentsData.documents,
      returns: returnsData.returns,
      meta: {
        as_of: returnsData.as_of,
        deadline: returnsData.filing_deadline,
        user: returnsData.current_user,
      },

      fields,
      fieldOrder,
      getField,
      fieldsList: fieldOrder.map((id) => fields[id]).filter(Boolean),
      documentById: (id) => documentsData.documents.find((d) => d.id === id),

      confidenceOf: (field) => {
        if (!field) return null
        if (field.provenance.type === 'computed')
          return inheritedConfidence(field, getField)
        return field.provenance.confidence ?? null
      },

      signoffBlockers: () =>
        fieldOrder
          .map((id) => fields[id])
          .filter(
            (f) =>
              f &&
              ['ai_suggested', 'needs_review', 'pending_approval'].includes(
                f.state,
              ),
          ),

      // actions — call the backend, then refetch to pick up cascades
      verify: (id) => runAction(api.verify(id)),
      correct: (id, value, note) => runAction(api.correct(id, value, note)),
      resolveConflict: (id, idx, note) =>
        runAction(api.resolveConflict(id, idx, note)),
      approve: (id) => runAction(api.approve(id)),
      reject: (id, note) => runAction(api.reject(id, note)),
      secondOpinion: (id) => api.secondOpinion(id),
    }
  }, [fields, fieldOrder, loading, error, load, runAction])

  return <StoreCtx.Provider value={api_}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
