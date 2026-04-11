import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type DashboardModule = 'maintenance' | 'expenses' | 'reputation' | 'operations'
type ActionModule = 'maintenance' | 'expenses' | 'operations'
type DashboardSeverity = 'critical' | 'warning' | 'normal'
type MaintenanceTicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_vendor'
  | 'resolved'
  | 'closed'
type OperationItemStatus = 'open' | 'in_progress' | 'blocked' | 'done'
type PriorityLevel = 'low' | 'medium' | 'high' | 'critical'
type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed'
type ReviewResponseStatus = 'pending' | 'published' | 'not_needed'

interface MaintenanceTicketRow {
  id: string
  title: string
  location: string
  status: MaintenanceTicketStatus
  priority: PriorityLevel
  reported_at: string
  due_at: string | null
}

interface MaintenanceTicketMetricRow {
  id: string
  status: MaintenanceTicketStatus
  priority: PriorityLevel
  due_at: string | null
}

interface ExpenseRow {
  id: string
  description: string
  amount: number | string
  status: ExpenseStatus
  created_at: string
}

interface ReviewRow {
  id: string
  title: string | null
  body: string | null
  rating: number | string
  reviewed_at: string
  response_status: ReviewResponseStatus
}

interface OperationRow {
  id: string
  type: 'ticket' | 'task' | 'intervention' | 'order'
  title: string
  status: OperationItemStatus
  priority: PriorityLevel
  created_at: string
  location: string | null
  notes: string | null
}

interface DirectorKpis {
  criticalIssues: number
  resolutionRate: number
  pendingSpend: number
  guestImpact: number
}

interface CriticalPathItem {
  id: string
  title: string
  context: string
  actionLabel: 'Open'
  href: string
  severity: DashboardSeverity
}

interface AttentionItem {
  id: string
  module: ActionModule
  description: string
  actionLabel: 'View' | 'Review' | 'Open'
  href: string
  severity: DashboardSeverity
  timestamp: string
}

interface ActivityItem {
  id: string
  module: DashboardModule
  label: string
  timestamp: string
  href: string
  severity: DashboardSeverity
}

interface DashboardData {
  criticalPath: CriticalPathItem[]
  attentionItems: AttentionItem[]
  recentActivity: ActivityItem[]
}

const moduleLabels: Record<DashboardModule, string> = {
  maintenance: 'Maintenance',
  expenses: 'Expenses',
  reputation: 'Reputation',
  operations: 'Operations',
}

const severityRank: Record<DashboardSeverity, number> = {
  critical: 0,
  warning: 1,
  normal: 2,
}

function buildHref(
  pathname: string,
  query: Record<string, string | null | undefined>,
) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      searchParams.set(key, value)
    }
  }

  const search = searchParams.toString()

  return search ? `${pathname}?${search}` : pathname
}

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

function truncateText(value: string, maxLength = 88) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1)}…`
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function formatTimestamp(value: string) {
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercentage(value: number) {
  return `${Math.round(value)}%`
}

function getExpenseAmount(expense: ExpenseRow) {
  return Number(expense.amount ?? 0)
}

function getReviewComment(review: ReviewRow) {
  return review.body ?? review.title ?? 'Guest feedback recorded'
}

function isNegativeReview(review: ReviewRow) {
  return Number(review.rating ?? 0) <= 3
}

function isOverdueTicket(ticket: Pick<MaintenanceTicketRow, 'due_at' | 'status'>) {
  if (!ticket.due_at || ticket.status === 'resolved' || ticket.status === 'closed') {
    return false
  }

  const dueAt = new Date(ticket.due_at)

  return !Number.isNaN(dueAt.getTime()) && dueAt.getTime() < Date.now()
}

function isBlockingTicket(ticket: MaintenanceTicketRow | MaintenanceTicketMetricRow) {
  return (
    ticket.status !== 'resolved' &&
    ticket.status !== 'closed' &&
    (ticket.priority === 'critical' || isOverdueTicket(ticket))
  )
}

function getMaintenanceSeverity(ticket: MaintenanceTicketRow): DashboardSeverity {
  if (ticket.priority === 'critical') {
    return 'critical'
  }

  if (isOverdueTicket(ticket)) {
    return 'warning'
  }

  return 'normal'
}

function getExpenseSeverity(expense: ExpenseRow): DashboardSeverity {
  if (expense.status === 'submitted' && getExpenseAmount(expense) > 200) {
    return 'critical'
  }

  if (expense.status === 'submitted') {
    return 'warning'
  }

  return 'normal'
}

function getReviewSeverity(review: ReviewRow): DashboardSeverity {
  const rating = Number(review.rating ?? 0)

  if (rating <= 2 && review.response_status === 'pending') {
    return 'critical'
  }

  if (rating <= 3 || review.response_status === 'pending') {
    return 'warning'
  }

  return 'normal'
}

function getOperationSeverity(item: OperationRow): DashboardSeverity {
  if (item.status === 'blocked' || (item.priority === 'critical' && item.status !== 'done')) {
    return 'critical'
  }

  if (
    item.status !== 'done' &&
    (item.priority === 'high' || item.status === 'open')
  ) {
    return 'warning'
  }

  return 'normal'
}

function sortBySeverityAndTime<T extends { severity: DashboardSeverity; timestamp: string }>(
  items: T[],
) {
  return [...items].sort((left, right) => {
    const severityDifference = severityRank[left.severity] - severityRank[right.severity]

    if (severityDifference !== 0) {
      return severityDifference
    }

    return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
  })
}

function sortRecentActivity(items: ActivityItem[]) {
  return [...items].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  )
}

function getToneClasses(severity: DashboardSeverity) {
  if (severity === 'critical') {
    return 'bg-red-50 text-red-600'
  }

  if (severity === 'warning') {
    return 'bg-amber-50 text-amber-600'
  }

  return 'bg-slate-100 text-slate-600'
}

function getSeverityLabel(severity: DashboardSeverity) {
  if (severity === 'critical') {
    return 'Critical'
  }

  if (severity === 'warning') {
    return 'Warning'
  }

  return 'Normal'
}

function getLinkedComplaintCount(ticket: MaintenanceTicketRow, reviews: ReviewRow[]) {
  const normalizedTicket = normalizeText(`${ticket.title} ${ticket.location}`)
  const roomMatches = normalizedTicket.match(/\b\d{3,4}\b/g) ?? []

  return reviews.filter((review) => {
    if (!isNegativeReview(review)) {
      return false
    }

    const reviewText = normalizeText(`${review.title ?? ''} ${getReviewComment(review)}`)

    if (roomMatches.some((room) => reviewText.includes(room))) {
      return true
    }

    const fallbackKeywords = [
      'clim',
      'ventilation',
      'ascenseur',
      'eau',
      'humidite',
      'badge',
      'serrure',
      'linge',
      'eclairage',
    ]

    return fallbackKeywords.some(
      (keyword) => normalizedTicket.includes(keyword) && reviewText.includes(keyword),
    )
  }).length
}

async function getKpis(): Promise<DirectorKpis> {
  if (!supabase) {
    throw new Error('Supabase client is not configured.')
  }

  const [
    { data: blockingRows, error: blockingError },
    { count: resolvedCount, error: resolvedError },
    { count: totalCount, error: totalError },
    { data: pendingExpenseRows, error: pendingSpendError },
    { count: guestImpactCount, error: guestImpactError },
  ] = await Promise.all([
    supabase!.from('maintenance_tickets')
      .select('id, status, priority, due_at')
      .neq('status', 'resolved')
      .neq('status', 'closed'),
    supabase!.from('maintenance_tickets')
      .select('id', { count: 'exact', head: true })
      .in('status', ['resolved', 'closed']),
    supabase!.from('maintenance_tickets').select('id', { count: 'exact', head: true }),
    supabase!.from('cash_expenses').select('amount').eq('status', 'submitted'),
    supabase!.from('reviews')
      .select('id', { count: 'exact', head: true })
      .lte('rating', 3),
  ])

  if (blockingError) {
    throw new Error(blockingError.message)
  }

  if (resolvedError) {
    throw new Error(resolvedError.message)
  }

  if (totalError) {
    throw new Error(totalError.message)
  }

  if (pendingSpendError) {
    throw new Error(pendingSpendError.message)
  }

  if (guestImpactError) {
    throw new Error(guestImpactError.message)
  }

  const criticalIssues = ((blockingRows as MaintenanceTicketMetricRow[] | null) ?? []).filter(
    (ticket) => isBlockingTicket(ticket),
  ).length

  const totalTickets = totalCount ?? 0
  const resolvedTickets = resolvedCount ?? 0
  const resolutionRate = totalTickets === 0 ? 100 : (resolvedTickets / totalTickets) * 100

  const pendingSpend = ((pendingExpenseRows as Array<{ amount: number | string | null }> | null) ?? []).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  )

  return {
    criticalIssues,
    resolutionRate,
    pendingSpend,
    guestImpact: guestImpactCount ?? 0,
  }
}

function getCriticalPath(
  maintenanceRows: MaintenanceTicketRow[],
  reviewRows: ReviewRow[],
): CriticalPathItem[] {
  const blockingTickets = maintenanceRows
    .filter((ticket) => isBlockingTicket(ticket))
    .sort((left, right) => {
      const leftComplaints = getLinkedComplaintCount(left, reviewRows)
      const rightComplaints = getLinkedComplaintCount(right, reviewRows)

      if (left.priority !== right.priority) {
        return left.priority === 'critical' ? -1 : 1
      }

      if (rightComplaints !== leftComplaints) {
        return rightComplaints - leftComplaints
      }

      return new Date(left.reported_at).getTime() - new Date(right.reported_at).getTime()
    })

  return blockingTickets.slice(0, 3).map((ticket) => {
    const linkedComplaints = getLinkedComplaintCount(ticket, reviewRows)
    const contextParts = [ticket.location]

    if (linkedComplaints > 0) {
      contextParts.push(
        `${linkedComplaints} linked ${linkedComplaints === 1 ? 'complaint' : 'complaints'}`,
      )
    } else if (isOverdueTicket(ticket)) {
      contextParts.push('Overdue')
    } else {
      contextParts.push('Critical issue')
    }

    return {
      id: `critical-path-${ticket.id}`,
      title: truncateText(ticket.title, 68),
      context: contextParts.join(' · '),
      actionLabel: 'Open',
      href: buildHref('/app/maintenance', {
        q: ticket.title,
        priority: ticket.priority === 'critical' ? 'critical' : undefined,
      }),
      severity: ticket.priority === 'critical' || linkedComplaints > 0 ? 'critical' : 'warning',
    }
  })
}

function getAttentionItems(
  maintenanceRows: MaintenanceTicketRow[],
  expenseRows: ExpenseRow[],
  operationRows: OperationRow[],
  criticalPath: CriticalPathItem[],
): AttentionItem[] {
  const criticalPathIds = new Set(
    criticalPath.map((item) => item.id.replace('critical-path-', '')),
  )

  const maintenanceItems = maintenanceRows
    .filter(
      (ticket) =>
        !criticalPathIds.has(ticket.id) &&
        ticket.status !== 'resolved' &&
        ticket.status !== 'closed' &&
        (ticket.priority === 'high' || ticket.status === 'in_progress'),
    )
    .map<AttentionItem>((ticket) => ({
      id: `attention-maintenance-${ticket.id}`,
      module: 'maintenance',
      description: truncateText(`${ticket.title} · ${ticket.location}`, 78),
      actionLabel: 'View',
      href: buildHref('/app/maintenance', { q: ticket.title }),
      severity: getMaintenanceSeverity(ticket) === 'normal' ? 'warning' : getMaintenanceSeverity(ticket),
      timestamp: ticket.reported_at,
    }))

  const expenseItems = expenseRows
    .filter((expense) => expense.status === 'submitted')
    .map<AttentionItem>((expense) => ({
      id: `attention-expense-${expense.id}`,
      module: 'expenses',
      description: truncateText(
        `${formatCurrency(getExpenseAmount(expense))} · ${expense.description}`,
        78,
      ),
      actionLabel: 'Review',
      href: buildHref('/app/expenses', {
        q: expense.description,
        status: 'submitted',
      }),
      severity: getExpenseSeverity(expense),
      timestamp: expense.created_at,
    }))

  const operationItems = operationRows
    .filter(
      (item) =>
        item.status !== 'done' &&
        (item.priority === 'high' || item.status === 'open'),
    )
    .map<AttentionItem>((item) => ({
      id: `attention-operations-${item.id}`,
      module: 'operations',
      description: truncateText(item.title, 78),
      actionLabel: 'Open',
      href: buildHref('/app/operations', {
        q: item.title,
        type: item.type,
        priority: item.priority,
      }),
      severity: getOperationSeverity(item),
      timestamp: item.created_at,
    }))

  return sortBySeverityAndTime([
    ...maintenanceItems,
    ...expenseItems,
    ...operationItems,
  ]).slice(0, 5)
}

function getRecentActivity(
  maintenanceRows: MaintenanceTicketRow[],
  expenseRows: ExpenseRow[],
  reviewRows: ReviewRow[],
  operationRows: OperationRow[],
  excludedIds: Set<string>,
) {
  const maintenanceActivity = maintenanceRows
    .filter((ticket) => !excludedIds.has(`maintenance-${ticket.id}`))
    .map<ActivityItem>((ticket) => ({
      id: `maintenance-${ticket.id}`,
      module: 'maintenance',
      label: truncateText(ticket.title, 72),
      timestamp: ticket.reported_at,
      href: buildHref('/app/maintenance', { q: ticket.title }),
      severity: getMaintenanceSeverity(ticket),
    }))

  const expenseActivity = expenseRows
    .filter((expense) => !excludedIds.has(`expenses-${expense.id}`))
    .map<ActivityItem>((expense) => ({
      id: `expenses-${expense.id}`,
      module: 'expenses',
      label: truncateText(expense.description, 72),
      timestamp: expense.created_at,
      href: buildHref('/app/expenses', { q: expense.description }),
      severity: getExpenseSeverity(expense),
    }))

  const reviewActivity = reviewRows
    .filter((review) => !excludedIds.has(`reputation-${review.id}`))
    .map<ActivityItem>((review) => ({
      id: `reputation-${review.id}`,
      module: 'reputation',
      label: truncateText(getReviewComment(review), 72),
      timestamp: review.reviewed_at,
      href: buildHref('/app/reputation', { q: getReviewComment(review) }),
      severity: getReviewSeverity(review),
    }))

  const operationsActivity = operationRows
    .filter((item) => !excludedIds.has(`operations-${item.id}`))
    .map<ActivityItem>((item) => ({
      id: `operations-${item.id}`,
      module: 'operations',
      label: truncateText(item.title, 72),
      timestamp: item.created_at,
      href: buildHref('/app/operations', { q: item.title }),
      severity: getOperationSeverity(item),
    }))

  return sortRecentActivity([
    ...maintenanceActivity,
    ...expenseActivity,
    ...reviewActivity,
    ...operationsActivity,
  ]).slice(0, 6)
}

async function getDashboardData(): Promise<DashboardData> {
  if (!supabase) {
    throw new Error('Supabase client is not configured.')
  }

  const [
    { data: maintenanceRows, error: maintenanceError },
    { data: expenseRows, error: expenseError },
    { data: reviewRows, error: reviewError },
    { data: operationRows, error: operationError },
  ] = await Promise.all([
    supabase!.from('maintenance_tickets')
      .select('id, title, location, status, priority, reported_at, due_at')
      .order('reported_at', { ascending: false })
      .limit(18),
    supabase!.from('cash_expenses')
      .select('id, description, amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(18),
    supabase!.from('reviews')
      .select('id, title, body, rating, reviewed_at, response_status')
      .order('reviewed_at', { ascending: false })
      .limit(18),
    supabase!.from('operation_items')
      .select('id, type, title, status, priority, created_at, location, notes')
      .order('created_at', { ascending: false })
      .limit(18),
  ])

  if (maintenanceError) {
    throw new Error(maintenanceError.message)
  }

  if (expenseError) {
    throw new Error(expenseError.message)
  }

  if (reviewError) {
    throw new Error(reviewError.message)
  }

  if (operationError) {
    throw new Error(operationError.message)
  }

  const nextMaintenanceRows = (maintenanceRows as MaintenanceTicketRow[] | null) ?? []
  const nextExpenseRows = (expenseRows as ExpenseRow[] | null) ?? []
  const nextReviewRows = (reviewRows as ReviewRow[] | null) ?? []
  const nextOperationRows = (operationRows as OperationRow[] | null) ?? []

  const criticalPath = getCriticalPath(nextMaintenanceRows, nextReviewRows)
  const attentionItems = getAttentionItems(
    nextMaintenanceRows,
    nextExpenseRows,
    nextOperationRows,
    criticalPath,
  )

  const excludedIds = new Set<string>([
    ...criticalPath.map((item) => `maintenance-${item.id.replace('critical-path-', '')}`),
    ...attentionItems.map((item) => {
      if (item.module === 'maintenance') {
        return item.id.replace('attention-', '')
      }

      if (item.module === 'expenses') {
        return item.id.replace('attention-', '')
      }

      return item.id.replace('attention-', '')
    }),
  ])

  return {
    criticalPath,
    attentionItems,
    recentActivity: getRecentActivity(
      nextMaintenanceRows,
      nextExpenseRows,
      nextReviewRows,
      nextOperationRows,
      excludedIds,
    ),
  }
}

interface KpiCardProps {
  label: string
  value: string
  helper: string
  href: string
}

function KpiCard({ label, value, helper, href }: KpiCardProps) {
  return (
    <Link
      to={href}
      className="surface-panel interactive-lift p-4"
    >
      <div className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <p className="text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
            {label}
          </p>
        </div>
        <div>
          <p className="text-sm leading-6 text-slate-500">{helper}</p>
        </div>
      </div>
    </Link>
  )
}

interface CriticalPathRowProps {
  item: CriticalPathItem
}

function CriticalPathRow({ item }: CriticalPathRowProps) {
  return (
    <Link
      to={item.href}
      className="group grid gap-2 rounded-2xl border border-slate-200/70 bg-white/50 px-3.5 py-3 transition-all duration-150 hover:-translate-y-px hover:bg-white hover:shadow-sm md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
        <p className="truncate text-[11px] uppercase tracking-[0.24em] text-slate-400">
          {item.context}
        </p>
      </div>
      <span
        className={[
          'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.2em]',
          getToneClasses(item.severity),
        ].join(' ')}
      >
        {getSeverityLabel(item.severity)}
      </span>
      <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500 transition-colors group-hover:text-slate-950">
        {item.actionLabel}
      </span>
    </Link>
  )
}

interface AttentionRowProps {
  item: AttentionItem
}

function AttentionRow({ item }: AttentionRowProps) {
  return (
    <Link
      to={item.href}
      className="group grid gap-2 rounded-2xl border border-slate-200/70 bg-white/50 px-3.5 py-3 transition-all duration-150 hover:-translate-y-px hover:bg-white hover:shadow-sm md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"
    >
      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-600">
        {moduleLabels[item.module]}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{item.description}</p>
      </div>
      <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500 transition-colors group-hover:text-slate-950">
        {item.actionLabel}
      </span>
    </Link>
  )
}

interface ActivityRowProps {
  item: ActivityItem
}

function ActivityRow({ item }: ActivityRowProps) {
  return (
    <Link
      to={item.href}
      className="group grid gap-2 rounded-2xl border border-slate-200/70 bg-white/50 px-3.5 py-3 transition-all duration-150 hover:-translate-y-px hover:bg-white hover:shadow-sm md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"
    >
      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-600">
        {moduleLabels[item.module]}
      </span>
      <p className="truncate text-sm font-medium text-slate-900">{item.label}</p>
      <span className="text-[11px] uppercase tracking-[0.24em] text-slate-400 transition-colors group-hover:text-slate-700">
        {formatTimestamp(item.timestamp)}
      </span>
    </Link>
  )
}

export function Dashboard() {
  const [kpis, setKpis] = useState<DirectorKpis>({
    criticalIssues: 0,
    resolutionRate: 0,
    pendingSpend: 0,
    guestImpact: 0,
  })
  const [criticalPath, setCriticalPath] = useState<CriticalPathItem[]>([])
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [userLabel, setUserLabel] = useState('there')

  useEffect(() => {
    let isCancelled = false

    async function loadDashboard() {
      if (!isSupabaseConfigured || !supabase) {
        if (!isCancelled) {
          setErrorMessage('Open a module once live data is connected.')
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
            setErrorMessage('Sign in to open the operational workspace.')
            setIsLoading(false)
          }
          return
        }

        if (!isCancelled) {
          setUserLabel(getDashboardUserLabel(session.user.email))
        }

        const [nextKpis, data] = await Promise.all([getKpis(), getDashboardData()])

        if (!isCancelled) {
          setKpis(nextKpis)
          setCriticalPath(data.criticalPath)
          setAttentionItems(data.attentionItems)
          setRecentActivity(data.recentActivity)
        }
      } catch (error) {
        console.error('Unable to load dashboard data', error)

        if (!isCancelled) {
          setErrorMessage(
            'Open the relevant module to continue working while the dashboard reconnects.',
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
      label: 'Blocked Rooms',
      value: String(kpis.criticalIssues),
      helper: 'Blocking rooms and access',
      href: buildHref('/app/maintenance', { priority: 'critical', status: 'open' }),
    },
    {
      label: 'Resolution Rate',
      value: formatPercentage(kpis.resolutionRate),
      helper: 'Resolved + closed tickets',
      href: '/app/maintenance',
    },
    {
      label: 'Pending Spend',
      value: formatCurrency(kpis.pendingSpend),
      helper: 'Awaiting approval',
      href: buildHref('/app/expenses', { status: 'submitted' }),
    },
    {
      label: 'Guest Impact',
      value: String(kpis.guestImpact),
      helper: 'Negative reviews to follow up',
      href: buildHref('/app/reputation', { rating: 'low' }),
    },
  ]

  return (
    <PageSection
      title={`Good morning, ${userLabel}`}
      description="Here’s what needs your attention today."
    >
      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <KpiCard
            key={card.label}
            label={card.label}
            value={isLoading ? '...' : card.value}
            helper={card.helper}
            href={card.href}
          />
        ))}
      </div>

      {errorMessage ? (
        <SurfaceCard
          title="Dashboard unavailable"
          description={errorMessage}
        >
          <div className="grid gap-2 md:grid-cols-3">
            <Link
              to="/app/maintenance"
              className="rounded-2xl border border-slate-100 px-3.5 py-2.5 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50/80"
            >
              Open Maintenance
            </Link>
            <Link
              to="/app/expenses"
              className="rounded-2xl border border-slate-100 px-3.5 py-2.5 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50/80"
            >
              Open Expenses
            </Link>
            <Link
              to="/app/operations"
              className="rounded-2xl border border-slate-100 px-3.5 py-2.5 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50/80"
            >
              Open Operations
            </Link>
          </div>
        </SurfaceCard>
      ) : (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="space-y-3">
            <SurfaceCard
              title="Critical path"
              description="Blocking issues with the clearest operational impact."
            >
              {isLoading ? (
                <p className="text-sm text-slate-600">Loading blocking issues...</p>
              ) : criticalPath.length > 0 ? (
                <div className="space-y-2">
                  {criticalPath.map((item) => (
                    <CriticalPathRow key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <Link
                  to="/app/maintenance"
                  className="block rounded-2xl border border-dashed border-slate-200 px-3.5 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50/80"
                >
                  No blocking issues right now. Open Maintenance.
                </Link>
              )}
            </SurfaceCard>

            <SurfaceCard
              title="Urgent Actions"
              description="Unified list across maintenance, spend, and execution."
            >
              {isLoading ? (
                <p className="text-sm text-slate-600">Loading priorities...</p>
              ) : attentionItems.length > 0 ? (
                <div className="space-y-2">
                  {attentionItems.map((item) => (
                    <AttentionRow key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <Link
                  to="/app/operations"
                  className="block rounded-2xl border border-dashed border-slate-200 px-3.5 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50/80"
                >
                  No additional actions queued. Open Operations.
                </Link>
              )}
            </SurfaceCard>
          </div>

          <SurfaceCard
            title="Recent activity"
            description="Latest movement across incidents, spend, feedback, and execution."
            className="h-full"
          >
            {isLoading ? (
              <p className="text-sm text-slate-600">Loading recent activity...</p>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-2">
                {recentActivity.map((item) => (
                  <ActivityRow key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <Link
                to="/app/operations"
                className="block rounded-2xl border border-dashed border-slate-200 px-3.5 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50/80"
              >
                No recent activity yet. Open Operations to start logging work.
              </Link>
            )}
          </SurfaceCard>
        </div>
      )}
    </PageSection>
  )
}
