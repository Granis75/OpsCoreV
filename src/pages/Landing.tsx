import { Link } from 'react-router-dom'
import { SurfaceCard } from '../components/ui/SurfaceCard'

const benefits = [
  {
    title: 'Detect issues earlier',
    description:
      'Bring maintenance, spend, vendors, and guest feedback into one readable system.',
  },
  {
    title: 'Centralize operational signals',
    description:
      'Keep today’s incidents, approvals, and guest concerns in one shared workspace.',
  },
  {
    title: 'Improve decision-making',
    description:
      'Help teams act on real signals instead of switching between fragmented tools.',
  },
]

export function Landing() {
  return (
    <div className="min-h-screen px-5 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-shell">
            OC
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/sign-in"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Sign in
            </Link>
            <Link
              to="/sign-up"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Create account
            </Link>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <SurfaceCard
            title="Operations, made readable."
            description="From fragmented tracking to a clear operational system."
            className="h-full"
          >
            <div className="space-y-5">
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                Ops Core gives teams one place to monitor incidents, operational spend,
                partners, and guest quality without losing the context of the day.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/sign-in"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Sign in
                </Link>
                <Link
                  to="/sign-up"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Create account
                </Link>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard
            title="Today signals"
            description="A compact example of the operational rhythm the product makes visible."
            className="h-full"
          >
            <div className="divide-y divide-slate-100">
              {[
                ['Maintenance', '1 overdue ticket in room 214', 'Warning'],
                ['Expenses', '2 approvals waiting validation', 'Warning'],
                ['Reputation', '1 guest review needs follow-up', 'Critical'],
              ].map(([type, label, severity]) => (
                <div
                  key={label}
                  className="grid gap-2 py-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"
                >
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                    {type}
                  </span>
                  <p className="text-sm font-medium text-slate-900">{label}</p>
                  <span
                    className={[
                      'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
                      severity === 'Critical'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-amber-50 text-amber-700',
                    ].join(' ')}
                  >
                    {severity}
                  </span>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {benefits.map((benefit) => (
            <SurfaceCard
              key={benefit.title}
              title={benefit.title}
              description={benefit.description}
              className="h-full"
            />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <SurfaceCard
            title="Product preview"
            description="A control surface designed to make the day readable in minutes."
            className="h-full"
          >
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ['Open tickets', '12'],
                  ['Today spend', '€153'],
                  ['Active vendors', '18'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-4"
                  >
                    <p className="text-xl font-semibold tracking-tight text-slate-950">
                      {value}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm font-semibold text-slate-900">Requires attention</p>
                <div className="mt-3 divide-y divide-slate-200">
                  {[
                    'Maintenance — 1 overdue ticket',
                    'Expenses — 2 approvals waiting',
                    'Reputation — 1 negative review',
                  ].map((item) => (
                    <p key={item} className="py-2 text-sm text-slate-600">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard
            title="Built for operational teams"
            description="A shared SaaS workspace for people who need clean visibility before they need more meetings."
            className="h-full"
          >
            <div className="space-y-5">
              <p className="text-sm leading-7 text-slate-600">
                Use one product to spot incidents faster, review approvals sooner, and
                keep guest-impacting issues visible while they can still be resolved.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/sign-in"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Sign in
                </Link>
                <Link
                  to="/sign-up"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Create account
                </Link>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  )
}
