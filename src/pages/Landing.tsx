import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SurfaceCard } from '../components/ui/SurfaceCard'

const heroCards = [
  {
    label: 'Capture',
    title: 'Turn daily noise into a readable operating baseline.',
    description:
      'Maintenance, spend, vendors and guest issues stay visible in one system instead of drifting across inboxes and spreadsheets.',
  },
  {
    label: 'Coordination',
    title: 'Keep ownership clear while work is still moving.',
    description:
      'The workspace keeps open loops, dependencies and follow-ups visible before they become escalation threads.',
  },
  {
    label: 'Visibility',
    title: 'See operational pressure without adding reporting work.',
    description:
      'Teams get a clean read on workload, risks and response timing without building another layer of manual updates.',
  },
]

const supportingCards = [
  {
    label: 'Workspace',
    title: 'A control surface designed for daily execution.',
    description:
      'Open work, review cycles and guest-impacting signals stay close enough to act on in minutes.',
  },
  {
    label: 'System',
    title: 'Structured operations replace scattered follow-up.',
    description:
      'The product is shaped around clarity, ownership and repeatable routines rather than extra process.',
  },
]

const signals = [
  {
    category: 'Maintenance',
    message: 'One room recovery ticket is overdue and still waiting on engineering confirmation.',
    status: 'Warning',
    tone: 'warning',
  },
  {
    category: 'Expenses',
    message: 'Two approvals are sitting in review and need a final decision before close.',
    status: 'Warning',
    tone: 'warning',
  },
  {
    category: 'Reputation',
    message: 'A negative guest review is still open and should be answered today.',
    status: 'Critical',
    tone: 'critical',
  },
  {
    category: 'Vendors',
    message: 'Partner follow-up is on track with no blocked escalation at the moment.',
    status: 'Normal',
    tone: 'normal',
  },
] as const

function LandingCard({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <SurfaceCard
      title=""
      description=""
      className={[
        'rounded-2xl border-slate-100 bg-white p-8 shadow-sm backdrop-blur-none',
        '[&>div:first-child]:hidden [&>div:last-child]:mt-0',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </SurfaceCard>
  )
}

function LandingLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
      {children}
    </p>
  )
}

export function Landing() {
  return (
    <div className="min-h-screen bg-transparent px-5 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between gap-6">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-sm">
            OC
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/sign-in"
              className="button-secondary px-4 py-2.5"
            >
              Sign in
            </Link>
            <Link
              to="/sign-up"
              className="button-primary px-4 py-2.5"
            >
              Create account
            </Link>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.38fr)_minmax(0,0.62fr)]">
          <LandingCard className="h-full">
            <LandingLabel>Ops Core V12</LandingLabel>
            <h1 className="mt-6 text-4xl font-bold tracking-tighter text-black md:text-5xl">
              I turn fragmented operations into structured systems.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-500">
              From manual workflows (Excel, calls, scattered tools) to clear,
              reliable and trackable operations.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/sign-in"
                className="button-primary px-5"
              >
                View work
              </Link>
              <a
                href="mailto:contact@ops-core.app"
                className="button-secondary px-5"
              >
                Contact
              </a>
            </div>
          </LandingCard>

          <LandingCard className="h-full">
            <LandingLabel>Today Signals</LandingLabel>
            <div className="mt-6 space-y-3">
              {signals.map((signal) => (
                <div
                  key={signal.category}
                  className="flex items-center gap-4 rounded-2xl border border-slate-100 px-4 py-4"
                >
                  <span className="w-24 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {signal.category}
                  </span>

                  <span className="flex-1 text-sm leading-relaxed text-slate-600">
                    {signal.message}
                  </span>

                  <span
                    className={[
                      'rounded-full px-2 py-1 text-xs font-medium',
                      signal.tone === 'critical'
                        ? 'bg-red-500/10 text-red-600'
                        : signal.tone === 'warning'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-slate-200/50 text-slate-600',
                    ].join(' ')}
                  >
                    {signal.status}
                  </span>
                </div>
              ))}
            </div>
          </LandingCard>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {heroCards.map((card) => (
            <LandingCard key={card.title} className="h-full">
              <LandingLabel>{card.label}</LandingLabel>
              <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                {card.title}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-500">
                {card.description}
              </p>
            </LandingCard>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          {supportingCards.map((card) => (
            <LandingCard key={card.title} className="h-full">
              <LandingLabel>{card.label}</LandingLabel>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                {card.title}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-500">
                {card.description}
              </p>
            </LandingCard>
          ))}
        </div>
      </div>
    </div>
  )
}
