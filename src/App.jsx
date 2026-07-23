import { Routes, Route, Link } from 'react-router-dom'
import Dashboard from './components/Dashboard.jsx'
import ReturnReview from './components/ReturnReview.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-3 flex items-baseline gap-3">
        <Link to="/" className="font-semibold tracking-tight text-lg">
          CPA<span className="text-teal-700"> Trace</span>
        </Link>
        <span className="text-xs text-slate-500">Every number, back to its source.</span>
        <span className="ml-auto text-xs text-slate-400">
          Dana Kowalski · Mar 12, 2026 · 34 days to deadline
        </span>
      </header>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/return/:id" element={<ReturnReview />} />
      </Routes>
    </div>
  )
}
