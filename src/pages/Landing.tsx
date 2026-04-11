import { Link } from 'react-router-dom'

const kpis = [
  { label: 'Blocked rooms', value: '2' },
  { label: 'Pending approvals', value: '3' },
  { label: 'Vendor escalations', value: '1' },
  { label: 'Guest response due', value: '1' },
]

const openNowItems = [
  {
    title: 'Room 214 HVAC still blocked',
    detail: 'Engineering follow-up pending since 17:40',
    tone: 'critical',
  },
  {
    title: 'Room 402 lock access unresolved',
    detail: 'Guest relocation completed, permanent fix pending',
    tone: 'critical',
  },
  {
    title: 'Laundry vendor escalation open',
    detail: 'SLA breach requires callback confirmation',
    tone: 'warning',
  },
] as const

const recentActivityItems = [
  {
    title: 'Expense approval queue updated',
    detail: '3 submitted items awaiting final decision',
    time: '19:17',
  },
  {
    title: 'Negative review flagged for response',
    detail: 'Manager response due on current shift',
    time: '18:54',
  },
  {
    title: 'Blocked room reassigned to engineering',
    detail: 'Priority confirmed as critical',
    time: '18:32',
  },
]

function getToneClass(tone: 'critical' | 'warning') {
  if (tone === 'critical') {
    return 'bg-red-50 text-red-700'
  }

  return 'bg-amber-50 text-amber-700'
}

export function Landing() {
  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-4 md:px-6 md:py-5">
      <div className="mx-auto w-full max-w-[1100px]">
        <header className="flex items-center justify-between">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-semibold text-white">
            OC
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

        <main className="mt-6 space-y-5 md:mt-8">
          <section className="max-w-[760px] space-y-3.5">
            <h1 className="text-3xl font-semibold leading-[1.05] tracking-tight text-slate-950 md:text-[52px] md:leading-[1.03]">
              Operations don’t break.
              <br />
              They drift.
              <br />
              This keeps them under control.
            </h1>

            <p className="max-w-[680px] text-sm leading-6 text-slate-600 md:text-base">
              Incidents, spend, vendors, and guest impact in one control surface.
            </p>

            <Link to="/sign-up" className="button-primary inline-flex px-4 py-2.5">
              Create account
            </Link>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Product preview
              </p>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">
                Operational snapshot
              </h2>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-4">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-2xl border border-slate-200 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {kpi.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Open now
                </p>
                <div className="space-y-1.5">
                  {openNowItems.map((item) => (
                    <Link
                      key={item.title}
                      to="/app"
                      className="block cursor-pointer rounded-2xl border border-slate-200 px-3 py-2.5 transition duration-150 hover:-translate-y-0.5 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium leading-5 text-slate-900">{item.title}</p>
                          <p className="mt-0.5 text-sm leading-5 text-slate-600">{item.detail}</p>
                        </div>
                        <span
                          className={[
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                            getToneClass(item.tone),
                          ].join(' ')}
                        >
                          Open
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Recent activity
                </p>
                <div className="space-y-1.5">
                  {recentActivityItems.map((item) => (
                    <Link
                      key={item.title}
                      to="/app"
                      className="block cursor-pointer rounded-2xl border border-slate-200 px-3 py-2.5 transition duration-150 hover:-translate-y-0.5 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium leading-5 text-slate-900">{item.title}</p>
                          <p className="mt-0.5 text-sm leading-5 text-slate-600">{item.detail}</p>
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          {item.time}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
