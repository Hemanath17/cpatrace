import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './components/Dashboard.jsx'
import ReturnReview from './components/ReturnReview.jsx'
import PreviewScreen from './components/PreviewScreen.jsx'

function TopBar() {
  return (
    <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-2.5">
      <div className="relative hidden max-w-md flex-1 md:block">
        <input
          type="text"
          placeholder="Search returns, clients, documents…"
          className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none"
        />
        <svg className="absolute left-3 top-2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
        </svg>
      </div>

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
        <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50">
          Sign out
        </button>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
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