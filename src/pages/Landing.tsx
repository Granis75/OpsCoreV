import { AlertTriangle, BarChart3, Building2, ReceiptText, ShieldCheck, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'

const modules = [
  {
    icon: AlertTriangle,
    index: '01',
    label: 'Incident Management',
    description:
      'Track and resolve operational incidents, blocked rooms, and critical issues in real time.',
  },
  {
    icon: Building2,
    index: '02',
    label: 'Vendor Management',
    description:
      'Manage vendor relationships, SLA adherence, contacts, and escalation history.',
  },
  {
    icon: Wrench,
    index: '03',
    label: 'Maintenance',
    description:
      'Assign, track, and close maintenance tickets with priority and location tracking.',
  },
  {
    icon: ReceiptText,
    index: '04',
    label: 'Expense Control',
    description:
      'Submit, review, and approve cash expenses with full audit trail and spend visibility.',
  },
  {
    icon: BarChart3,
    index: '05',
    label: 'Operations Visibility',
    description:
      'Director-level dashboard with KPIs across all operational modules, unified in one view.',
  },
  {
    icon: ShieldCheck,
    index: '06',
    label: 'Access & Security',
    description:
      'Organization-scoped isolation with row-level security. Every action is tied to an authenticated user.',
  },
]

export function Landing() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-8 py-4">
          <p
            className="font-serif text-[20px] font-semibold leading-none tracking-[-0.02em]"
            style={{ color: 'var(--black)' }}
          >
            OPS
          </p>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 sm:inline-flex">
              <ShieldCheck className="h-3 w-3" strokeWidth={1.5} />
              Authorized access only
            </span>
            <Link to="/sign-in" className="button-primary">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1100px] px-8 pb-20 pt-24 md:pt-32">
        <div className="max-w-[680px] space-y-8">
          <div className="flex items-center gap-3">
            <div className="h-px w-6 bg-slate-300" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Private platform · Authorized teams only
            </span>
          </div>

          <h1 className="font-serif text-[44px] font-medium leading-[1.06] tracking-tight text-slate-950 md:text-[64px]">
            Internal operations,
            <br />
            unified and{' '}
            <em className="font-serif italic" style={{ color: 'var(--accent)' }}>
              controlled.
            </em>
          </h1>

          <p className="max-w-[520px] text-base leading-7 text-slate-600">
            Incidents, vendors, maintenance, spend, and guest quality — managed in one
            secure control surface for authorized operations teams.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/sign-in" className="button-primary">
              Sign in to workspace
            </Link>
            <a
              href="mailto:?subject=OPS — Access Request"
              className="button-secondary"
            >
              Request access
            </a>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
            Access is granted by your organization's administrator — no self-registration.
          </p>
        </div>
      </section>

      {/* ── Modules ───────────────────────────────────────────────── */}
      <section className="border-t border-slate-200">
        <div className="mx-auto max-w-[1100px] px-8 py-20">
          <div className="mb-12 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px w-6 bg-slate-300" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Platform capabilities
              </span>
            </div>
            <h2 className="font-serif text-2xl font-medium tracking-tight text-slate-950 md:text-3xl">
              Everything operations needs,{' '}
              <em className="font-serif italic" style={{ color: 'var(--accent)' }}>
                nothing it doesn't.
              </em>
            </h2>
          </div>

          <div className="grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ icon: Icon, index, label, description }) => (
              <div key={label} className="space-y-4 bg-white p-7">
                <div className="flex items-center justify-between">
                  <Icon className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
                  <span className="font-mono text-[10px] tracking-[0.16em] text-slate-300">
                    {index}
                  </span>
                </div>
                <div>
                  <p className="font-serif text-base font-medium text-slate-900">{label}</p>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Access CTA ────────────────────────────────────────────── */}
      <section className="border-t border-slate-200">
        <div className="mx-auto max-w-[1100px] px-8 py-20">
          <div
            className="rounded-xl p-10 md:p-14"
            style={{ background: 'var(--black)' }}
          >
            <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="h-px w-6" style={{ background: 'var(--line-soft)' }} />
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.18em]"
                    style={{ color: 'var(--muted)' }}
                  >
                    Restricted access
                  </span>
                </div>

                <p
                  className="font-serif text-[28px] font-medium leading-[1.1] tracking-tight md:text-[36px]"
                  style={{ color: 'var(--paper)' }}
                >
                  OPS
                </p>

                <p className="max-w-md text-sm leading-7" style={{ color: 'var(--muted)' }}>
                  A private internal tool for authorized operations teams. Accounts are
                  provisioned by your organization's administrator. Contact your operations
                  lead to request access.
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                <Link
                  to="/sign-in"
                  className="inline-flex items-center justify-center rounded-full px-6 py-3 text-[13px] font-medium transition-all duration-200 hover:-translate-y-px"
                  style={{
                    background: 'var(--paper)',
                    color: 'var(--black)',
                    border: '1px solid var(--paper)',
                  }}
                >
                  Sign in
                </Link>
                <a
                  href="mailto:?subject=OPS — Request a Demo"
                  className="inline-flex items-center justify-center rounded-full px-6 py-3 text-[13px] font-medium transition-all duration-200 hover:-translate-y-px"
                  style={{
                    background: 'transparent',
                    color: 'var(--paper)',
                    border: '1px solid rgba(220,216,204,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLAnchorElement).style.borderColor =
                      'rgba(220,216,204,0.7)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLAnchorElement).style.borderColor =
                      'rgba(220,216,204,0.3)'
                  }}
                >
                  Request a demo
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-3 px-8 py-6 sm:flex-row">
          <p
            className="font-serif text-base font-semibold leading-none tracking-[-0.02em]"
            style={{ color: 'var(--black)' }}
          >
            OPS
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-400">
            Private platform · Authorized access only · All activity is logged
          </p>
        </div>
      </footer>
    </div>
  )
}
