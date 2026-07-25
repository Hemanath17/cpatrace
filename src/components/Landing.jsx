// Mercury-inspired landing + login. Guest login enters as Camila.
// "Sign in with Google" is present but shows an honest demo notice — not
// a broken error. Auth is simulated (see README); this is the entry point.

import { useState } from 'react'

export default function Landing({ onEnter }) {
  const [notice, setNotice] = useState(false)

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-600 font-display text-sm font-bold text-white">
            CT
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            CPA Trace
          </span>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-6">
        <section className="grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-4 inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
              AI-assisted tax review
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Every number, back to its source.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-600">
              An AI fills the return. CPA Trace lets you verify every figure in
              seconds — trace it to its document, see the AI's confidence, and
              correct it with a full audit trail.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onEnter}
                className="rounded-md bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800"
              >
                Continue as guest (Camila) →
              </button>
              <button
                onClick={() => setNotice(true)}
                className="flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                </svg>
                Sign in with Google
              </button>
            </div>

            {notice && (
              <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Google sign-in isn't enabled in this demo. Continue as guest to
                explore the full product as Camila.
              </p>
            )}
          </div>

          {/* Product screenshot stand-in */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-display text-sm font-semibold">Returns</span>
                <span className="text-[10px] text-slate-400">Ranked by urgency</span>
              </div>
              {[
                ['Martinez', '2 need review', 'bg-amber-100 text-amber-800'],
                ['Delgado LLC', 'Due in 4 days', 'bg-red-100 text-red-700'],
                ['Okafor', 'Ready to file', 'bg-emerald-100 text-emerald-700'],
              ].map(([name, status, cls]) => (
                <div key={name} className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
                  <span className="text-sm text-slate-700">{name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>{status}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature row */}
        <section className="grid gap-6 border-t border-slate-100 py-12 md:grid-cols-3">
          {[
            ['Traceability', 'Click any figure to see the exact document and region it came from.'],
            ['Trustworthy AI', 'Confidence scores, conflict detection, and an on-demand second opinion.'],
            ['Full audit trail', 'Every verification and correction recorded — who, when, and why.'],
          ].map(([title, body]) => (
            <div key={title}>
              <h3 className="font-display text-base font-semibold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        CPA Trace · Prototype · Authentication simulated
      </footer>
    </div>
  )
}
