// Upload flow. Real UI over the backend's simulated extraction endpoint.
// Pick a file → realistic processing animation → fields revealed → into review.
// The extraction itself is simulated server-side (see backend/upload.py);
// a real model (Gemini Flash) would slot in behind the same endpoint later.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'

const STEPS = [
  'Uploading document…',
  'Reading form layout…',
  'Extracting field values…',
  'Scoring confidence…',
  'Flagging items for review…',
]

export default function UploadModal({ onClose }) {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [phase, setPhase] = useState('idle') // idle | processing | done | error
  const [stepIndex, setStepIndex] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const onPick = (e) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const runExtraction = async () => {
    setPhase('processing')
    setError(null)

    // Animate through the steps while the request is in flight.
    let i = 0
    const timer = setInterval(() => {
      i = Math.min(i + 1, STEPS.length - 1)
      setStepIndex(i)
    }, 550)

    try {
      const res = await api.simulateExtraction('ret_martinez')
      clearInterval(timer)
      setStepIndex(STEPS.length - 1)
      setResult(res)
      setPhase('done')
    } catch (e) {
      clearInterval(timer)
      setError(e.message || 'Extraction failed')
      setPhase('error')
    }
  }

  const goToReview = () => {
    onClose()
    navigate('/return/ret_martinez')
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Upload a tax document
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>

        {/* IDLE — file picker */}
        {phase === 'idle' && (
          <>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-6 py-10 text-center hover:border-teal-400 hover:bg-teal-50/30">
              <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
              <span className="text-sm font-medium text-slate-700">
                {file ? file.name : 'Choose a W-2, 1099, or 1098'}
              </span>
              <span className="text-xs text-slate-400">PDF, JPG, or PNG</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={onPick} className="hidden" />
            </label>

            <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
              Extraction is simulated for this prototype — any file you pick reveals
              the pre-loaded Martinez return so you can see how extracted output is
              presented and reviewed.
            </p>

            <button
              onClick={runExtraction}
              disabled={!file}
              className="mt-4 w-full rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Extract fields
            </button>
          </>
        )}

        {/* PROCESSING — animated steps */}
        {phase === 'processing' && (
          <div className="py-6">
            <div className="mb-5 flex justify-center">
              <svg className="h-8 w-8 animate-spin text-teal-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
              </svg>
            </div>
            <ul className="space-y-2">
              {STEPS.map((step, i) => (
                <li key={i} className={`flex items-center gap-2 text-sm ${
                  i < stepIndex ? 'text-slate-400' : i === stepIndex ? 'font-medium text-slate-800' : 'text-slate-300'
                }`}>
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                    i < stepIndex ? 'bg-teal-600 text-white' : i === stepIndex ? 'bg-teal-100 text-teal-700' : 'bg-slate-100'
                  }`}>
                    {i < stepIndex ? '✓' : ''}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* DONE — result summary */}
        {phase === 'done' && result && (
          <div className="py-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-800">
              Extracted {result.field_count} fields
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Some need your review — two were flagged for low confidence or a source conflict.
            </p>
            <button
              onClick={goToReview}
              className="mt-4 w-full rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Review the return →
            </button>
          </div>
        )}

        {/* ERROR */}
        {phase === 'error' && (
          <div className="py-4 text-center">
            <p className="text-sm font-medium text-red-700">Extraction failed</p>
            <p className="mt-1 text-xs text-red-500">{error}</p>
            <p className="mt-1 text-xs text-slate-400">The API may be waking up — try again in ~30s.</p>
            <button onClick={() => setPhase('idle')} className="mt-3 rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
