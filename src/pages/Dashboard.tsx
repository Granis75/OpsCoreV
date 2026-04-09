import { useEffect, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { navigationItems } from '../data/navigation'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

interface DashboardKpis {
  openTickets: number
  criticalTickets: number
  todayExpenses: number
  activeVendors: number
}

interface AlertItem {
  id: string
  message: string
}

interface RecentActivityItem {
  id: string
  occurredAt: string
  label: string
}

interface ExpenseAmountRow {
  amount: number | string | null
}

interface MaintenanceTicketActivityRow {
  id: string
  title: string
  reported_at: string
}

interface VendorInteractionActivityRow {
  id: string
  vendor_id: string | null
  interaction_type: string
  interaction_at: string
  summary: string
}

interface VendorNameRow {
  id: string
  name: string
}

const emptyKpis: DashboardKpis = {
  openTickets: 0,
  criticalTickets: 0,
  todayExpenses: 0,
  activeVendors: 0,
}

function getTodayDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatActivityTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Recently'
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatInteractionLabel(value: string) {
  return value.replace(/_/g, ' ')
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural
}

function buildPriorityActions(
  kpis: DashboardKpis,
  alerts: AlertItem[],
): string[] {
  const actions: string[] = []

  if (kpis.criticalTickets > 0) {
    actions.push(
      `${kpis.criticalTickets} critical ticket${
        kpis.criticalTickets > 1 ? 's' : ''
      } blocking operations`,
    )
  }

  if (alerts.some((a) => a.id === 'overdue-tickets')) {
    actions.push('Overdue tickets require immediate attention')
  }

  if (alerts.some((a) => a.id === 'pending-expenses')) {
    actions.push('Expenses pending validation')
  }

  return actions
}

async function getKpis(): Promise<DashboardKpis> {
  if (!supabase) {
    throw new Error(
      'Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the root .env.local file.',
    )
  }

  const today = getTodayDateString()

  const [
    { count: openTicketsCount, error: openTicketsError },
    { count: criticalTicketsCount, error: criticalTicketsError },
    { data: todayExpensesRows, error: todayExpensesError },
    { count: activeVendorsCount, error: activeVendorsError },
  ] = await Promise.all([
    supabase
      .from('maintenance_tickets')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'resolved')
      .neq('status', 'closed'),
    supabase
      .from('maintenance_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('priority', 'critical')
      .neq('status', 'resolved'),
    supabase
      .from('cash_expenses')
      .select('amount')
      .eq('expense_date', today),
    supabase
      .from('vendors')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
  ])

  if (openTicketsError) {
    throw new Error(openTicketsError.message)
  }

  if (criticalTicketsError) {
    throw new Error(criticalTicketsError.message)
  }

  if (todayExpensesError) {
    throw new Error(todayExpensesError.message)
  }

  if (activeVendorsError) {
    throw new Error(activeVendorsError.message)
  }

  const todayExpenses = ((todayExpensesRows as ExpenseAmountRow[] | null) ?? []).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  )

  return {
    openTickets: openTicketsCount ?? 0,
    criticalTickets: criticalTicketsCount ?? 0,
    todayExpenses,
    activeVendors: activeVendorsCount ?? 0,
  }
}

async function getAlerts(): Promise<AlertItem[]> {
  if (!supabase) {
    throw new Error(
      'Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the root .env.local file.',
    )
  }

  const now = new Date().toISOString()

  const [
    { count: criticalTicketsCount, error: criticalTicketsError },
    { count: overdueTicketsCount, error: overdueTicketsError },
    { count: pendingExpensesCount, error: pendingExpensesError },
  ] = await Promise.all([
    supabase
      .from('maintenance_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('priority', 'critical')
      .neq('status', 'resolved'),
    supabase
      .from('maintenance_tickets')
      .select('id', { count: 'exact', head: true })
      .lt('due_at', now)
      .neq('status', 'resolved')
      .neq('status', 'closed'),
    supabase
      .from('cash_expenses')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'submitted'),
  ])

  if (criticalTicketsError) {
    throw new Error(criticalTicketsError.message)
  }

  if (overdueTicketsError) {
    throw new Error(overdueTicketsError.message)
  }

  if (pendingExpensesError) {
    throw new Error(pendingExpensesError.message)
  }

  const alerts: AlertItem[] = []

  if ((criticalTicketsCount ?? 0) > 0) {
    const count = criticalTicketsCount ?? 0
    alerts.push({
      id: 'critical-tickets',
      message: `${count} critical ${pluralize(count, 'ticket')} need attention`,
    })
  }

  if ((overdueTicketsCount ?? 0) > 0) {
    const count = overdueTicketsCount ?? 0
    alerts.push({
      id: 'overdue-tickets',
      message: `${count} overdue ${pluralize(count, 'ticket')}`,
    })
  }

  if ((pendingExpensesCount ?? 0) > 0) {
    const count = pendingExpensesCount ?? 0
    alerts.push({
      id: 'pending-expenses',
      message: `${count} ${pluralize(count, 'expense')} pending approval`,
    })
  }

  return alerts
}

async function getRecentActivity(): Promise<RecentActivityItem[]> {
  if (!supabase) {
    throw new Error(
      'Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the root .env.local file.',
    )
  }

  const [
    { data: recentTicketsRows, error: recentTicketsError },
    { data: recentInteractionsRows, error: recentInteractionsError },
  ] = await Promise.all([
    supabase
      .from('maintenance_tickets')
      .select('id, title, reported_at')
      .order('reported_at', { ascending: false })
      .limit(5),
    supabase
      .from('vendor_interactions')
      .select('id, vendor_id, interaction_type, interaction_at, summary')
      .order('interaction_at', { ascending: false })
      .limit(5),
  ])

  if (recentTicketsError) {
    throw new Error(recentTicketsError.message)
  }

  if (recentInteractionsError) {
    throw new Error(recentInteractionsError.message)
  }

  const interactions =
    (recentInteractionsRows as VendorInteractionActivityRow[] | null) ?? []
  const vendorIds = Array.from(
    new Set(
      interactions
        .map((interaction) => interaction.vendor_id)
        .filter((vendorId): vendorId is string => Boolean(vendorId)),
    ),
  )

  let vendorNameMap = new Map<string, string>()

  if (vendorIds.length > 0) {
    const { data: vendorRows, error: vendorError } = await supabase
      .from('vendors')
      .select('id, name')
      .in('id', vendorIds)

    if (vendorError) {
      throw new Error(vendorError.message)
    }

    vendorNameMap = new Map(
      ((vendorRows as VendorNameRow[] | null) ?? []).map((vendor) => [
        vendor.id,
        vendor.name,
      ]),
    )
  }

  const ticketItems = ((recentTicketsRows as MaintenanceTicketActivityRow[] | null) ?? []).map(
    (ticket) => ({
      id: `ticket-${ticket.id}`,
      occurredAt: ticket.reported_at,
      label: `Ticket: ${ticket.title}`,
    }),
  )

  const interactionItems = interactions.map((interaction) => ({
    id: `interaction-${interaction.id}`,
    occurredAt: interaction.interaction_at,
    label: `Vendor ${formatInteractionLabel(interaction.interaction_type)}: ${
      interaction.vendor_id
        ? vendorNameMap.get(interaction.vendor_id) ?? interaction.summary
        : interaction.summary
    }`,
  }))

  return [...ticketItems, ...interactionItems]
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
    )
    .slice(0, 10)
}

interface KpiCardProps {
  label: string
  value: string
  helper: string
}

function KpiCard({ label, value, helper }: KpiCardProps) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-shell backdrop-blur">
      <div className="space-y-3">
        <p className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
          {value}
        </p>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-700">{label}</p>
          <p className="text-sm leading-6 text-slate-500">{helper}</p>
        </div>
      </div>
    </div>
  )
}

export function Dashboard() {
  const modules = navigationItems.filter((item) => item.to !== '/')
  const [kpis, setKpis] = useState<DashboardKpis>(emptyKpis)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const priorityActions = buildPriorityActions(kpis, alerts)

  useEffect(() => {
    let isCancelled = false

    async function loadDashboard() {
      if (!isSupabaseConfigured || !supabase) {
        if (!isCancelled) {
          setErrorMessage(
            'Supabase env missing. Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to load live operations data.',
          )
          setIsLoading(false)
        }
        return
      }

      setIsLoading(true)
      setErrorMessage(null)

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (!session) {
          if (!isCancelled) {
            setErrorMessage('Sign in to view the live operations dashboard.')
            setIsLoading(false)
          }
          return
        }

        const [nextKpis, nextAlerts, nextActivity] = await Promise.all([
          getKpis(),
          getAlerts(),
          getRecentActivity(),
        ])

        if (!isCancelled) {
          setKpis(nextKpis)
          setAlerts(nextAlerts)
          setRecentActivity(nextActivity)
        }
      } catch (error) {
        console.error('Unable to load dashboard data', error)

        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load live dashboard data right now.',
          )
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      isCancelled = true
    }
  }, [])

  const kpiCards = [
    {
      label: 'Open tickets',
      value: isLoading ? '...' : String(kpis.openTickets),
      helper: 'Issues still active across operations.',
    },
    {
      label: 'Critical tickets',
      value: isLoading ? '...' : String(kpis.criticalTickets),
      helper: 'Immediate incidents requiring escalation.',
    },
    {
      label: 'Today expenses',
      value: isLoading ? '...' : formatCurrency(kpis.todayExpenses),
      helper: 'Approved and submitted cash activity for today.',
    },
    {
      label: 'Active vendors',
      value: isLoading ? '...' : String(kpis.activeVendors),
      helper: 'Partners currently available in the directory.',
    },
  ]

  return (
    <PageSection
      title="Dashboard"
      description="Live snapshot of operations activity, vendor follow-up, and today’s spend across the property."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <KpiCard
            key={card.label}
            label={card.label}
            value={card.value}
            helper={card.helper}
          />
        ))}
      </div>

      {!isLoading && !errorMessage && priorityActions.length > 0 ? (
        <SurfaceCard
          title="Priority actions"
          description="Immediate operational issues requiring attention."
        >
          <ul className="space-y-2">
            {priorityActions.map((action, index) => (
              <li
                key={index}
                className="text-sm font-medium text-red-600"
              >
                🚨 {action}
              </li>
            ))}
          </ul>
        </SurfaceCard>
      ) : null}

      {errorMessage ? (
        <SurfaceCard
          title="Live data unavailable"
          description={errorMessage}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <SurfaceCard
          title="Alerts"
          description="Signals that need action before they become guest-facing issues."
          className="h-full"
        >
          {isLoading ? (
            <p className="text-sm text-slate-600">Loading alerts...</p>
          ) : alerts.length > 0 ? (
            <ul className="space-y-3">
              {alerts.map((alert) => (
                <li key={alert.id} className="text-sm leading-7 text-slate-700">
                  <span className="mr-2 text-amber-500">⚠️</span>
                  {alert.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-7 text-slate-600">
              All operations under control
            </p>
          )}
        </SurfaceCard>

        <SurfaceCard
          title="Recent activity"
          description="Latest ticket reports and vendor touchpoints coming from the live ops feed."
          className="h-full"
        >
          {isLoading ? (
            <p className="text-sm text-slate-600">Loading activity...</p>
          ) : recentActivity.length > 0 ? (
            <ul className="space-y-3">
              {recentActivity.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0 md:flex-row md:items-baseline md:justify-between"
                >
                  <span className="text-sm font-medium text-slate-900">
                    {item.label}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {formatActivityTime(item.occurredAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-7 text-slate-600">
              No recent operations activity recorded yet.
            </p>
          )}
        </SurfaceCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map(({ description, icon: Icon, label, to }) => (
          <Link key={to} to={to}>
            <SurfaceCard title={label} description={description} className="h-full">
              <div className="flex items-center justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </div>
            </SurfaceCard>
          </Link>
        ))}
      </div>
    </PageSection>
  )
}
