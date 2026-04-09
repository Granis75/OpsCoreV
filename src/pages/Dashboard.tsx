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

type Signal = {
  id: string
  type: 'maintenance' | 'expense' | 'reputation'
  entity: string
  label: string
  severity: 'critical' | 'warning' | 'normal'
  timestamp: string
}

interface ExpenseAmountRow {
  amount: number | string | null
}

type MaintenanceTicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_vendor'
  | 'resolved'
  | 'closed'

type PriorityLevel = 'low' | 'medium' | 'high' | 'critical'

type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed'

interface MaintenanceTicketSignalRow {
  id: string
  title: string
  location: string
  reported_at: string
  due_at: string | null
  status: MaintenanceTicketStatus
  priority: PriorityLevel
}

interface ExpenseSignalRow {
  id: string
  description: string
  amount: number | string
  status: ExpenseStatus
  created_at: string
}

interface ReviewSignalRow {
  id: string
  title: string | null
  body: string | null
  rating: number | string
  reviewed_at: string
}

const emptyKpis: DashboardKpis = {
  openTickets: 0,
  criticalTickets: 0,
  todayExpenses: 0,
  activeVendors: 0,
}

type Event = Signal

interface EventGroup {
  id: string
  type: Event['type']
  entity: string
  isIncident: boolean
  latestTimestamp: string
  events: Event[]
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

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural
}

function truncateSignalLabel(value: string, maxLength = 88) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1)}…`
}

function getExpenseAmountValue(expense: ExpenseSignalRow) {
  return Number(expense.amount ?? 0)
}

function isFlaggedExpense(expense: ExpenseSignalRow) {
  return getExpenseAmountValue(expense) > 200
}

function isNegativeReview(review: ReviewSignalRow) {
  return Number(review.rating ?? 0) <= 3
}

function getReviewComment(review: ReviewSignalRow) {
  return review.body ?? review.title ?? 'Guest feedback recorded'
}

function getMaintenanceSignalSeverity(
  ticket: MaintenanceTicketSignalRow,
): Signal['severity'] {
  if (ticket.priority === 'critical') {
    return 'critical'
  }

  if (ticket.due_at) {
    const dueAt = new Date(ticket.due_at)

    if (!Number.isNaN(dueAt.getTime()) && dueAt.getTime() < Date.now()) {
      return 'warning'
    }
  }

  return 'normal'
}

function getExpenseSignalSeverity(expense: ExpenseSignalRow): Signal['severity'] {
  if (isFlaggedExpense(expense)) {
    return 'warning'
  }

  if (expense.status === 'submitted') {
    return 'warning'
  }

  return 'normal'
}

function getReviewSignalSeverity(review: ReviewSignalRow): Signal['severity'] {
  const rating = Number(review.rating ?? 0)

  if (rating <= 2) {
    return 'critical'
  }

  if (isNegativeReview(review)) {
    return 'warning'
  }

  return 'normal'
}

function sortEvents(events: Event[]) {
  return [...events].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  )
}

function groupEvents(events: Event[]) {
  const groups = new Map<string, EventGroup>()

  for (const event of sortEvents(events)) {
    const groupId = `${event.type}:${event.entity}`
    const existingGroup = groups.get(groupId)

    if (!existingGroup) {
      groups.set(groupId, {
        id: groupId,
        type: event.type,
        entity: event.entity,
        isIncident: event.severity === 'critical',
        latestTimestamp: event.timestamp,
        events: [event],
      })
      continue
    }

    existingGroup.events.push(event)
    existingGroup.isIncident =
      existingGroup.isIncident || event.severity === 'critical'

    if (
      new Date(event.timestamp).getTime() >
      new Date(existingGroup.latestTimestamp).getTime()
    ) {
      existingGroup.latestTimestamp = event.timestamp
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      events: sortEvents(group.events),
    }))
    .sort(
      (left, right) =>
        new Date(right.latestTimestamp).getTime() -
        new Date(left.latestTimestamp).getTime(),
    )
}

function getSeverityToneClasses(severity: Event['severity']) {
  if (severity === 'critical') {
    return 'bg-red-50 text-red-600'
  }

  if (severity === 'warning') {
    return 'bg-amber-50 text-amber-700'
  }

  return 'bg-slate-100 text-slate-600'
}

function getSeverityLabel(severity: Event['severity']) {
  if (severity === 'critical') {
    return 'Critical'
  }

  if (severity === 'warning') {
    return 'Warning'
  }

  return 'Normal'
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

async function getEvents(): Promise<Event[]> {
  if (!supabase) {
    throw new Error(
      'Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the root .env.local file.',
    )
  }

  const [
    { data: ticketRows, error: ticketsError },
    { data: expenseRows, error: expensesError },
    { data: reviewRows, error: reviewsError },
  ] = await Promise.all([
    supabase
      .from('maintenance_tickets')
      .select('id, title, location, reported_at, due_at, status, priority')
      .order('reported_at', { ascending: false })
      .limit(10),
    supabase
      .from('cash_expenses')
      .select('id, description, amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('reviews')
      .select('id, title, body, rating, reviewed_at')
      .order('reviewed_at', { ascending: false })
      .limit(10),
  ])

  if (ticketsError) {
    throw new Error(ticketsError.message)
  }

  if (expensesError) {
    throw new Error(expensesError.message)
  }

  if (reviewsError) {
    throw new Error(reviewsError.message)
  }

  const maintenanceEvents = (
    (ticketRows as MaintenanceTicketSignalRow[] | null) ?? []
  ).map((ticket) => {
    const severity = getMaintenanceSignalSeverity(ticket)

    return {
      id: `maintenance-${ticket.id}`,
      type: 'maintenance' as const,
      entity: ticket.location || ticket.title,
      severity,
      timestamp: ticket.reported_at,
      label:
        severity === 'critical'
          ? `Critical ticket: ${ticket.title}`
          : severity === 'warning'
            ? `Overdue ticket: ${ticket.title}`
            : `Ticket update: ${ticket.title}`,
    }
  })

  const expenseEvents = ((expenseRows as ExpenseSignalRow[] | null) ?? []).map(
    (expense) => {
      const severity = getExpenseSignalSeverity(expense)

      return {
        id: `expense-${expense.id}`,
        type: 'expense' as const,
        entity:
          severity === 'warning' ? 'Expense approvals' : 'Operating spend',
        severity,
        timestamp: expense.created_at,
        label:
          severity === 'warning'
            ? `Approval check: ${truncateSignalLabel(expense.description)}`
            : `Expense logged: ${truncateSignalLabel(expense.description)}`,
      }
    },
  )

  const reputationEvents = ((reviewRows as ReviewSignalRow[] | null) ?? []).map(
    (review) => {
      const severity = getReviewSignalSeverity(review)

      return {
        id: `reputation-${review.id}`,
        type: 'reputation' as const,
        entity: severity === 'normal' ? 'Guest feedback' : 'Guest complaints',
        severity,
        timestamp: review.reviewed_at,
        label:
          severity === 'normal'
            ? `Review received: ${truncateSignalLabel(getReviewComment(review))}`
            : `Guest issue: ${truncateSignalLabel(getReviewComment(review))}`,
      }
    },
  )

  return sortEvents([
    ...maintenanceEvents,
    ...expenseEvents,
    ...reputationEvents,
  ])
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
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const priorityActions = buildPriorityActions(kpis, alerts)
  const criticalEventsCount = events.filter(
    (event) => event.severity === 'critical',
  ).length
  const warningEventsCount = events.filter(
    (event) => event.severity === 'warning',
  ).length
  const timelineEvents = sortEvents(events).slice(0, 10)
  const timelineGroups = groupEvents(timelineEvents)

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

        const [nextKpis, nextAlerts, nextEvents] = await Promise.all([
          getKpis(),
          getAlerts(),
          getEvents(),
        ])

        if (!isCancelled) {
          setKpis(nextKpis)
          setAlerts(nextAlerts)
          setEvents(nextEvents)
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

      {!isLoading && !errorMessage ? (
        <SurfaceCard
          title="Control strip"
          description="Unified operational signal count across maintenance, spend, and guest feedback."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-4">
              <p className="text-2xl font-semibold tracking-tight text-slate-950">
                {criticalEventsCount}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                Critical signals
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-4">
              <p className="text-2xl font-semibold tracking-tight text-slate-950">
                {warningEventsCount}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                Warning signals
              </p>
            </div>
          </div>
        </SurfaceCard>
      ) : null}

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
          title="Operational timeline"
          description="Latest events grouped by entity to surface active incidents and ongoing operational threads."
          className="h-full"
        >
          {isLoading ? (
            <p className="text-sm text-slate-600">Loading timeline...</p>
          ) : timelineGroups.length > 0 ? (
            <div className="space-y-5">
              {timelineGroups.map((group) => (
                <div key={group.id} className="space-y-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                      {group.type}
                    </span>
                    <p className="text-sm font-semibold text-slate-900">
                      {group.entity}
                    </p>
                    {group.isIncident ? (
                      <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-red-600">
                        Incident
                      </span>
                    ) : null}
                  </div>

                  <div className="relative space-y-3 pl-5">
                    <span className="absolute bottom-0 left-[7px] top-1 w-px bg-slate-200" />
                    {group.events.map((event) => (
                      <div key={event.id} className="relative">
                        <span className="absolute left-[-20px] top-2.5 h-3 w-3 rounded-full border-2 border-white bg-slate-300 shadow-sm" />
                        <div className="rounded-2xl bg-white/70 px-4 py-3">
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-slate-900">
                                {event.label}
                              </p>
                              <span
                                className={[
                                  'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
                                  getSeverityToneClasses(event.severity),
                                ].join(' ')}
                              >
                                {getSeverityLabel(event.severity)}
                              </span>
                            </div>
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              {formatActivityTime(event.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-7 text-slate-600">
              No operational timeline events recorded yet.
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
