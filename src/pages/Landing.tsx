import { Link } from 'react-router-dom'
import { SurfaceCard } from '../components/ui/SurfaceCard'

const principles = [
  'One workspace for incidents, vendors, spend, and guest impact.',
  'Clear ownership on every open issue.',
  'See what matters, then act.',
]

const snapshot = [
  {
    label: 'Blocked rooms',
    value: '2',
    detail: 'Room 214 HVAC and Room 402 lock access still unresolved.',
    tone: 'critical',
  },
  {
    label: 'Pending approvals',
    value: '3',
    detail: 'Submitted expenses awaiting decision before close.',
    tone: 'warning',
  },
  {
    label: 'Vendor escalations',
    value: '1',
    detail: 'Laundry supplier SLA breach flagged for follow-up.',
    tone: 'warning',
  },
  {
    label: 'Guest response due',
    value: '1',
    detail: 'Negative review awaiting manager response.',
    tone: 'critical',
  },
] as const

function getToneClass(tone: 'critical' | 'warning') {
  if (tone === 'critical') {
    return 'bg-red-50 text-red-700'
  }

  return 'bg-amber-50 text-amber-700'
}

export function Landing() {
  return (
    <div className="min-h-screen bg-transparent px-5 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white">
              OC
            </div>
            <span className="text-sm font-semibold text-slate-900">Ops Core</span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/sign-in" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Sign in
            </Link>
            <Link to="/sign-up" className="button-primary px-4 py-2.5">
              Create account
            </Link>
          </div>
        </header>

        <section className="space-y-5">
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            Structured operations for teams under pressure.
          </h1>
          <p className="max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
            Track incidents, spend, vendors, and guest impact in one workspace.
          </p>
          <div className="space-y-2">
            <Link to="/sign-up" className="button-primary inline-flex px-5 py-3">
              Create account
            </Link>
            <p className="text-sm text-slate-500">
              Setup takes minutes. Your team can start acting today.
            </p>
          </div>
        </section>

        <SurfaceCard
          title="Operational Snapshot"
          description="A real-time view of pressure points and actions."
          className="border-slate-200 bg-white"
        >
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-4">
              {snapshot.map((item) => (
                <div key={item.label} className="rounded-lg border border-slate-200 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Open now
                </p>
                <div className="space-y-2">
                  {snapshot.map((item) => (
                    <div
                      key={`${item.label}-detail`}
                      className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-3"
                    >
                      <p className="text-sm text-slate-700">{item.detail}</p>
                      <span
                        className={[
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                          getToneClass(item.tone),
                        ].join(' ')}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Recent action
                </p>
                <div className="rounded-lg border border-slate-200 px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">
                    19:42 · Room 214 recovery assigned to Engineering
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Priority set to critical. Vendor follow-up requested.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">
                    19:17 · Expense approval queue updated
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Three submitted items now pending final decision.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SurfaceCard>

        <section className="grid gap-2 border-t border-slate-200 pt-4 text-sm text-slate-600 md:grid-cols-3">
          {principles.map((principle) => (
            <p key={principle}>{principle}</p>
          ))}
        </section>
      </div>
    </div>
  )
}
