import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

interface DashboardKpis {
  openTickets: number
  criticalTickets: number
  todayExpenses: number
  activeVendors: number
}

interface AlertItem {
  id: string
  type: 'maintenance' | 'expense' | 'reputation'
  message: string
  severity: 'critical' | 'warning'
  href: string
  state: string
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

function getDashboardUserLabel(email: string | null | undefined) {
  if (!email) {
    return 'there'
  }

  const [localPart] = email.split('@')
  const cleaned = localPart.replace(/[._-]+/g, ' ').trim()

  if (!cleaned) {
    return email
  }

  return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase())
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

function formatEventType(type: Event['type']) {
  if (type === 'maintenance') {
    return 'Maintenance'
  }

  if (type === 'expense') {
    return 'Expenses'
  }

  return 'Reputation'
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
    { count: negativeReviewsCount, error: negativeReviewsError },
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
    supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .lte('rating', 3),
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

  if (negativeReviewsError) {
    throw new Error(negativeReviewsError.message)
  }

  const alerts: AlertItem[] = []

  if ((criticalTicketsCount ?? 0) > 0) {
    const count = criticalTicketsCount ?? 0
    alerts.push({
      id: 'critical-tickets',
      type: 'maintenance',
      message: `${count} critical ${pluralize(count, 'ticket')}`,
      severity: 'critical',
      href: '/maintenance',
      state: 'Immediate',
    })
  }

  if ((overdueTicketsCount ?? 0) > 0) {
    const count = overdueTicketsCount ?? 0
    alerts.push({
      id: 'overdue-tickets',
      type: 'maintenance',
      message: `${count} overdue ${pluralize(count, 'ticket')}`,
      severity: 'warning',
      href: '/maintenance',
      state: 'No progress',
    })
  }

  if ((pendingExpensesCount ?? 0) > 0) {
    const count = pendingExpensesCount ?? 0
    alerts.push({
      id: 'pending-expenses',
      type: 'expense',
      message: `${count} ${pluralize(count, 'expense')} pending approval`,
      severity: 'warning',
      href: '/expenses',
      state: 'Awaiting approval',
    })
  }

  if ((negativeReviewsCount ?? 0) > 0) {
    const count = negativeReviewsCount ?? 0
    alerts.push({
      id: 'negative-reviews',
      type: 'reputation',
      message: `${count} negative ${pluralize(count, 'review')}`,
      severity: count > 1 ? 'critical' : 'warning',
      href: '/reputation',
      state: 'Guest follow-up',
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
    <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-shell backdrop-blur">
      <div className="space-y-2">
        <p className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
          {value}
        </p>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-700">{label}</p>
          <p className="text-xs leading-5 text-slate-500">{helper}</p>
        </div>
      </div>
    </div>
  )
}

export function Dashboard() {
  const [kpis, setKpis] = useState<DashboardKpis>(emptyKpis)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [userLabel, setUserLabel] = useState('there')
  const recentActivity = sortEvents(events).slice(0, 5)
  const criticalAttentionCount = alerts.filter(
    (alert) => alert.severity === 'critical',
  ).length
  const warningAttentionCount = alerts.filter(
    (alert) => alert.severity === 'warning',
  ).length

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

        if (!isCancelled) {
          setUserLabel(getDashboardUserLabel(session.user.email))
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
      helper: 'Active incidents across operations.',
    },
    {
      label: 'Critical tickets',
      value: isLoading ? '...' : String(kpis.criticalTickets),
      helper: 'Escalations needing immediate coordination.',
    },
    {
      label: 'Today expenses',
      value: isLoading ? '...' : formatCurrency(kpis.todayExpenses),
      helper: 'Spend recorded today across operations.',
    },
    {
      label: 'Active vendors',
      value: isLoading ? '...' : String(kpis.activeVendors),
      helper: 'Operational partners currently active.',
    },
  ]

  return (
    <PageSection
      title={`Good morning, ${userLabel}`}
      description="Here’s what needs your attention today."
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

      {errorMessage ? (
        <SurfaceCard
          title="Live data unavailable"
          description={errorMessage}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <SurfaceCard
          title="Requires attention"
          description={
            alerts.length > 0
              ? `${criticalAttentionCount} critical · ${warningAttentionCount} warning`
              : 'No active blockers across maintenance, expenses, or reputation.'
          }
          className="h-full"
        >
          {isLoading ? (
            <p className="text-sm text-slate-600">Loading action queue...</p>
          ) : alerts.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {alerts.map((alert) => (
                <Link
                  key={alert.id}
                  to={alert.href}
                  className="grid gap-2 py-3 transition-colors hover:bg-slate-50/80 md:grid-cols-[auto_minmax(0,1fr)_auto_auto] md:items-center"
                >
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                    {formatEventType(alert.type)}
                  </span>
                  <p className="text-sm font-medium text-slate-900">
                    {alert.message}
                  </p>
                  <span
                    className={[
                      'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
                      getSeverityToneClasses(alert.severity),
                    ].join(' ')}
                  >
                    {getSeverityLabel(alert.severity)}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {alert.state}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-7 text-slate-600">
              All operations under control
            </p>
          )}
        </SurfaceCard>

        <SurfaceCard
          title="Recent activity"
          description="Latest updates across maintenance, expenses, and guest feedback."
          className="h-full"
        >
          {isLoading ? (
            <p className="text-sm text-slate-600">Loading activity...</p>
          ) : recentActivity.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentActivity.map((event) => (
                <div
                  key={event.id}
                  className="grid gap-2 py-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"
                >
                  <div className="space-y-2">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                      {formatEventType(event.type)}
                    </span>
                    <span
                      className={[
                        'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
                        getSeverityToneClasses(event.severity),
                      ].join(' ')}
                    >
                      {getSeverityLabel(event.severity)}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {event.label}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {event.entity}
                    </p>
                  </div>

                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {formatActivityTime(event.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-7 text-slate-600">
              No recent operations activity recorded yet.
            </p>
          )}
        </SurfaceCard>
      </div>
    </PageSection>
  )
}
