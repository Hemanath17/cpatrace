// ============================================================================
// PREVIEW SCREEN — static, illustrative sections for the nav shell.
// ----------------------------------------------------------------------------
// Documents / Clients / Messages / Billing / Reports are NOT wired. Rather
// than dead links, each renders a believable, static sample of what the full
// product would show — behind an honest banner that says so. This reads as a
// deliberate scoping decision (which it is), not a broken feature.
//
// Everything here is hardcoded. No store, no logic. One route drives all five
// via /preview/:section.
// ============================================================================

import { useParams, Link } from 'react-router-dom'

const SECTIONS = {
  documents: {
    title: 'Documents',
    blurb: 'the full document library, with AI extraction status per file',
    columns: ['Document', 'Type', 'Client', 'Received', 'Quality'],
    rows: [
      ['w2_maria_martinez_2025.pdf', 'W-2', 'Martinez', 'Feb 2', 'Clean'],
      ['1099int_chase_2025_CORRECTED.pdf', '1099-INT', 'Martinez', 'Feb 19', 'Clean'],
      ['1099int_fidelity_2025.pdf', '1099-INT', 'Martinez', 'Jan 31', 'Clean'],
      ['1098_rocket_2025.pdf', '1098', 'Martinez', 'Feb 8', 'Clean'],
      ['IMG_4417.jpg', 'Property tax', 'Martinez', 'Mar 2', 'Poor'],
      ['1099nec_halcyon_2025.pdf', '1099-NEC', 'Martinez', 'Feb 12', 'Clean'],
      ['martinez_1040_2024_filed.pdf', 'Prior return', 'Martinez', 'Jan 15', 'Clean'],
      ['okafor_w2_2025.pdf', 'W-2', 'Okafor', 'Feb 4', 'Clean'],
      ['delgado_k1_2025.pdf', 'K-1', 'Delgado LLC', 'Mar 1', 'Clean'],
      ['bergstrom_foreign_stmt.pdf', 'Bank stmt', 'Bergström', 'Feb 22', 'Fair'],
    ],
    qualityTint: {
      Poor: 'bg-red-100 text-red-700',
      Fair: 'bg-amber-100 text-amber-800',
      Clean: 'bg-emerald-100 text-emerald-700',
    },
  },
  clients: {
    title: 'Clients',
    blurb: 'the firm’s client roster and their engagements',
    columns: ['Client', 'Entity', 'Returns in progress', 'Primary contact'],
    rows: [
      ['Maria & Carlos Martinez', '1040 (MFJ)', '1', 'maria.martinez@email.com'],
      ['Delgado Landscaping LLC', '1065', '1', 'ops@delgadolawn.com'],
      ['Adaeze Okafor', '1040', '1', 'a.okafor@email.com'],
      ['Yamamoto Consulting Inc.', '1120-S', '1', 'kaz@yamamotoco.com'],
      ['Ingrid Bergström', '1040 + FBAR', '1', 'ingrid.b@email.com'],
      ['Castellanos Dental PLLC', '1120-S', '1', 'admin@castellanosdental.com'],
    ],
  },
  messages: {
    title: 'Messages',
    blurb: 'client and internal firm communication, tied to returns',
    kind: 'threads',
    threads: [
      ['MM', 'bg-teal-600', 'Maria Martinez', 'Re: property tax bill — is a clearer photo okay?', '2h'],
      ['DL', 'bg-indigo-500', 'Delgado Landscaping', 'K-1s ready once review wraps — timeline?', '5h'],
      ['IB', 'bg-rose-500', 'Ingrid Bergström', 'Sent the foreign account statements', 'Yesterday'],
      ['TW', 'bg-amber-500', 'Theodore Finch', 'Still waiting on my brokerage 1099-B', '2d'],
      ['—', 'bg-slate-400', 'Internal · Marcus R.', 'Flagged the SALT cap on Castellanos', '3d'],
    ],
  },
  billing: {
    title: 'Billing',
    blurb: 'invoices and prepayments across engagements',
    columns: ['Client', 'Invoice', 'Amount', 'Status'],
    rows: [
      ['Martinez', 'INV-1043', '$1,200.00', 'Outstanding'],
      ['Okafor', 'INV-1041', '$650.00', 'Paid'],
      ['Delgado Landscaping', 'INV-1039', '$2,400.00', 'Paid'],
      ['Yamamoto Consulting', 'INV-1044', '$1,850.00', 'Outstanding'],
      ['Castellanos Dental', 'INV-1038', '$3,100.00', 'Paid'],
    ],
    statusTint: {
      Paid: 'bg-emerald-100 text-emerald-700',
      Outstanding: 'bg-amber-100 text-amber-800',
    },
  },
  reports: {
    title: 'Reports',
    blurb: 'firm-level metrics for the season',
    kind: 'tiles',
    tiles: [
      ['47', 'Returns filed this season'],
      ['6m 12s', 'Median review time per return'],
      ['1,308', 'AI-extracted fields verified'],
      ['4.2%', 'Fields corrected by a reviewer'],
    ],
  },
}

function Banner({ blurb }) {
  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16h.01" />
      </svg>
      <p className="text-xs leading-relaxed text-amber-900">
        <span className="font-semibold">Preview.</span> This is where {blurb} would
        live. This prototype focuses on the AI return-review workflow, so this
        screen is illustrative and not wired up.
      </p>
    </div>
  )
}

function Table({ section }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {section.columns.map((c) => (
              <th key={c} className="px-5 py-2.5">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              {row.map((cell, j) => {
                const isQuality = section.qualityTint && j === row.length - 1
                const isStatus = section.statusTint && j === row.length - 1
                const tint =
                  (isQuality && section.qualityTint[cell]) ||
                  (isStatus && section.statusTint[cell])
                return (
                  <td key={j} className="px-5 py-3 text-sm text-slate-700">
                    {tint ? (
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${tint}`}>
                        {cell}
                      </span>
                    ) : j === 0 ? (
                      <span className="font-medium text-slate-800">{cell}</span>
                    ) : (
                      cell
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Threads({ section }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {section.threads.map(([initials, tint, name, preview, when], i) => (
        <div key={i} className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5 last:border-0 hover:bg-slate-50">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${tint}`}>
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800">{name}</p>
            <p className="truncate text-xs text-slate-500">{preview}</p>
          </div>
          <span className="shrink-0 text-[11px] text-slate-400">{when}</span>
        </div>
      ))}
    </div>
  )
}

function Tiles({ section }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {section.tiles.map(([value, label], i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white px-4 py-5 shadow-sm">
          <p className="font-display text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
          <p className="mt-1 text-xs leading-tight text-slate-500">{label}</p>
        </div>
      ))}
    </div>
  )
}

export default function PreviewScreen() {
  const { section } = useParams()
  const data = SECTIONS[section]

  if (!data) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-6">
        <p className="text-sm text-slate-500">
          Unknown section.{' '}
          <Link to="/" className="text-teal-700 hover:underline">Back to dashboard</Link>
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <h1 className="font-display text-2xl tracking-tight text-slate-900">{data.title}</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">Firm workspace</p>
      <Banner blurb={data.blurb} />
      {data.kind === 'threads' ? (
        <Threads section={data} />
      ) : data.kind === 'tiles' ? (
        <Tiles section={data} />
      ) : (
        <Table section={data} />
      )}
    </main>
  )
}
