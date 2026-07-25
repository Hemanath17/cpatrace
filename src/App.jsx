// Adds the login gate. Everything below the gate is your existing shell, unchanged.
import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './components/Dashboard.jsx'
import ReturnReview from './components/ReturnReview.jsx'
import PreviewScreen from './components/PreviewScreen.jsx'
import Landing from './components/Landing.jsx'

function TopBar({ onSignOut }) {
  return (
    <header className="relative flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-2.5">
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-xs text-slate-400 sm:inline">
          Mar 12, 2026 · 34 days to deadline
        </span>
        <div className="flex items-center gap-2 rounded-md border border-slate-200 py-1 pl-1 pr-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-700 text-[11px] font-semibold text-white">
            CC
          </span>
          <div className="leading-tight">
            <p className="text-xs font-medium text-slate-800">Camila Ceal</p>
            <p className="text-[10px] text-slate-400">Preparer / Reviewer</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}

export default function App() {
  const [signedIn, setSignedIn] = useState(false)

  if (!signedIn) {
    return <Landing onEnter={() => setSignedIn(true)} />
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onSignOut={() => setSignedIn(false)} />
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/return/:id" element={<ReturnReview />} />
            <Route path="/preview/:section" element={<PreviewScreen />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
