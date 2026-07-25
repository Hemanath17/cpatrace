import { Link, useLocation } from 'react-router-dom'

// Nav shell. "Returns" is the landing queue; the rest show where the full
// product lives (documents, messaging, billing). Preview routes are
// illustrative — see README.
const NAV = [
  { label: 'Returns', to: '/', icon: 'file', live: true, badge: 15 },
  { label: 'Clients', to: '/preview/clients', icon: 'users', live: true },
  { label: 'Documents', to: '/preview/documents', icon: 'folder', live: true, badge: 10 },
  { label: 'Messages', to: '/preview/messages', icon: 'mail', live: true, badge: 3 },
  { label: 'Billing', to: '/preview/billing', icon: 'card', live: true },
  { label: 'Reports', to: '/preview/reports', icon: 'chart', live: true },
]

const ICONS = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  file: 'M6 2h9l5 5v15H6zM15 2v5h5',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87',
  folder: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
  mail: 'M4 4h16v16H4zM22 6l-10 7L2 6',
  card: 'M1 4h22v16H1zM1 10h22',
  chart: 'M3 3v18h18M7 16v-6M12 16V8M17 16v-4',
}

function Icon({ name }) {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  )
}

export default function Sidebar() {
  const { pathname } = useLocation()

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-2.5 px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-500 font-display text-sm font-bold text-slate-900">
          CT
        </span>
        <div className="leading-tight">
          <p className="font-display text-[15px] font-semibold tracking-tight text-white">
            CPA Trace
          </p>
          <p className="text-[10px] text-slate-400">Every number, back to its source</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 px-3">
        {NAV.map((item, i) => {
          const active = item.to === '/'
            ? pathname === '/'
            : pathname === item.to
          const base =
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors'
          return (
            <Link
              key={i}
              to={item.to}
              className={`${base} ${
                active
                  ? 'bg-slate-800 font-medium text-white'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Icon name={item.icon} />
              <span className="flex-1">{item.label}</span>
              {item.badge != null && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    active
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-700/60 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-800 px-4 py-3">
        <p className="text-[10px] text-slate-500">Sundial &amp; Associates CPA</p>
        <p className="text-[10px] text-slate-600">Tax season 2025 · Prototype</p>
      </div>
    </aside>
  )
}