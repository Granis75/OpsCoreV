import { AlertTriangle, BarChart3, Building2, ReceiptText, ShieldCheck, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'

const modules = [
  {
    icon: AlertTriangle,
    label: 'Incident Management',
    description:
      'Track and resolve operational incidents, blocked rooms, and critical issues in real time.',
  },
  {
    icon: Building2,
    label: 'Vendor Management',
    description:
      'Manage vendor relationships, SLA adherence, contacts, and escalation history.',
  },
  {
    icon: Wrench,
    label: 'Maintenance',
    description:
      'Assign, track, and close maintenance tickets with priority and location tracking.',
  },
  {
    icon: ReceiptText,
    label: 'Expense Control',
    description:
      'Submit, review, and approve cash expenses with full audit trail and spend visibility.',
  },
  {
    icon: BarChart3,
    label: 'Operations Visibility',
    description:
      'Director-level dashboard with KPIs across all operational modules, unified in one view.',
  },
  {
    icon: ShieldCheck,
    label: 'Access & Security',
    description:
      'Organization-scoped data isolation with row-level security. Every action is tied to an authenticated user.',
  },
]

export function Landing() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-semibold text-white">
              OC
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-slate-950">Ops Core</p>
              <p className="text-[11px] leading-tight text-slate-400">Internal Operations Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 sm:inline-flex">
              <ShieldCheck className="h-3 w-3 text-slate-400" />
              Authorized access only
            </span>
            <Link to="/sign-in" className="button-primary px-4 py-2">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-16 md:py-24">
        <div className="max-w-[680px] space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            Private platform for authorized teams
          </div>

          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-slate-950 md:text-[52px]">
            Internal operations,
            <br />
            unified and controlled.
          </h1>

          <p className="text-base leading-7 text-slate-600 md:text-lg">
            Incidents, vendors, maintenance, spend, and guest quality — managed in one secure
            control surface for authorized operations teams.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/sign-in" className="button-primary px-5 py-3">
              Sign in to workspace
            </Link>
            <a
              href="mailto:?subject=Ops Core — Access Request"
              className="button-secondary px-5 py-3"
            >
              Request access
            </a>
          </div>

          <p className="text-sm text-slate-400">
            Access is granted by your organization's operations lead. Accounts are not
            self-provisioned.
          </p>
        </div>

        <div className="mt-20 space-y-6">
          <div>
            <p className="eyebrow-label">Platform capabilities</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Everything operations needs, nothing it doesn't.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ icon: Icon, label, description }) => (
              <div key={label} className="surface-panel space-y-3 p-6">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-950">{label}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 rounded-3xl border border-slate-200 bg-slate-950 px-8 py-10 text-white md:px-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Restricted access
                </p>
              </div>
              <p className="text-xl font-semibold">For authorized personnel only</p>
              <p className="max-w-lg text-sm leading-6 text-slate-400">
                Ops Core is a private internal tool. Accounts are provisioned by your
                organization's administrator. If you need access, contact your operations lead or
                request a demo below.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                to="/sign-in"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition-all duration-150 hover:-translate-y-px hover:shadow-lg"
              >
                Sign in
              </Link>
              <a
                href="mailto:?subject=Ops Core — Request a Demo"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-5 py-3 text-sm font-medium text-white transition-all duration-150 hover:-translate-y-px hover:border-white/40 hover:bg-white/10"
              >
                Request a demo
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200/70 py-8">
        <div className="mx-auto max-w-[1100px] px-6">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950 text-xs font-semibold text-white">
                OC
              </div>
              <p className="text-sm font-medium text-slate-600">Ops Core</p>
            </div>
            <p className="text-xs text-slate-400">
              Private platform · Authorized access only · All activity is logged
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
