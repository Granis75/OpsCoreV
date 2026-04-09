import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type DashboardModule = 'maintenance' | 'expenses' | 'reputation' | 'operations'
type DashboardSeverity = 'critical' | 'warning' | 'normal'
type MaintenanceTicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_vendor'
  | 'resolved'
  | 'closed'
type OperationItemStatus = 'open' | 'in_progress' | 'done'
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

interface TodaySignal {
  id: string
  module: DashboardModule
  label: string
  statusLabel: string
  ctaLabel: 'View' | 'Review' | 'Respond' | 'Open'
  href: string
  severity: DashboardSeverity
  timestamp: string
}

interface QueueItem {
  id: string
  label: string
  meta: string
  statusLabel: string
  severity: DashboardSeverity
  href: string
}

interface QueueBlockData {
  module: Extract<DashboardModule, 'maintenance' | 'expenses' | 'operations'>
  count: number
  href: string
  items: QueueItem[]
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
  todaySignals: TodaySignal[]
  queueBlocks: QueueBlockData[]
  recentActivity: ActivityItem[]
}

interface DashboardKpis {
  openTickets: number
  criticalTickets: number
  todayExpenses: number
  activeVendors: number
}

const moduleLabels: Record<DashboardModule, string> = {
  maintenance: 'Maintenance',
  expenses: 'Expenses',
  reputation: 'Reputation',
  operations: 'Operations',
}

const operationStatusLabels: Record<OperationItemStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  done: 'Done',
}

const maintenanceStatusLabels: Record<MaintenanceTicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  waiting_vendor: 'Waiting vendor',
  resolved: 'Resolved',
  closed: 'Closed',
}

const severityRank: Record<DashboardSeverity, number> = {
  critical: 0,
  warning: 1,
  normal: 2,
}

const operationPriorityRank: Record<PriorityLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const operationStatusRank: Record<OperationItemStatus, number> = {
  open: 0,
  in_progress: 1,
  done: 2,
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

function getTodayDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function truncateText(value: string, maxLength = 88) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1)}…`
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

function getExpenseAmount(expense: ExpenseRow) {
  return Number(expense.amount ?? 0)
}

function isFlaggedExpense(expense: ExpenseRow) {
  return getExpenseAmount(expense) > 200
}

function getReviewComment(review: ReviewRow) {
  return review.body ?? review.title ?? 'Guest feedback recorded'
}

function getMaintenanceSeverity(ticket: MaintenanceTicketRow): DashboardSeverity {
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

function getExpenseSeverity(expense: ExpenseRow): DashboardSeverity {
  if (expense.status === 'submitted' && isFlaggedExpense(expense)) {
    return 'critical'
  }

  if (expense.status === 'submitted' || isFlaggedExpense(expense)) {
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
  if (item.priority === 'critical' && item.status !== 'done') {
    return 'critical'
  }

  if (
    (item.priority === 'high' || item.status === 'open') &&
    item.status !== 'done'
  ) {
    return 'warning'
  }

  return 'normal'
}

function sortSignals(items: TodaySignal[]) {
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

function sortOperationRows(items: OperationRow[]) {
  return [...items].sort((left, right) => {
    const priorityDifference =
      operationPriorityRank[left.priority] - operationPriorityRank[right.priority]

    if (priorityDifference !== 0) {
      return priorityDifference
    }

    const statusDifference =
      operationStatusRank[left.status] - operationStatusRank[right.status]

    if (statusDifference !== 0) {
      return statusDifference
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  })
}

function sortMaintenanceRows(items: MaintenanceTicketRow[]) {
  return [...items].sort((left, right) => {
    const severityDifference =
      severityRank[getMaintenanceSeverity(left)] -
      severityRank[getMaintenanceSeverity(right)]

    if (severityDifference !== 0) {
      return severityDifference
    }

    return new Date(right.reported_at).getTime() - new Date(left.reported_at).getTime()
  })
}

function sortExpenseRows(items: ExpenseRow[]) {
  return [...items].sort((left, right) => {
    const severityDifference =
      severityRank[getExpenseSeverity(left)] - severityRank[getExpenseSeverity(right)]

    if (severityDifference !== 0) {
      return severityDifference
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  })
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

async function getKpis(): Promise<DashboardKpis> {
  if (!supabase) {
    throw new Error('Supabase client is not configured.')
  }

  const today = getTodayDateString()

  const [
    { count: openTicketsCount, error: openTicketsError },
    { count: criticalTicketsCount, error: criticalTicketsError },
    { data: todayExpenseRows, error: todayExpensesError },
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
      .neq('status', 'resolved')
      .neq('status', 'closed'),
    supabase.from('cash_expenses').select('amount').eq('expense_date', today),
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

  return {
    openTickets: openTicketsCount ?? 0,
    criticalTickets: criticalTicketsCount ?? 0,
    todayExpenses: ((todayExpenseRows as Array<{ amount: number | string | null }> | null) ?? []).reduce(
      (sum, row) => sum + Number(row.amount ?? 0),
      0,
    ),
    activeVendors: activeVendorsCount ?? 0,
  }
}

function getTodaySignals(
  maintenanceRows: MaintenanceTicketRow[],
  expenseRows: ExpenseRow[],
  reviewRows: ReviewRow[],
  operationRows: OperationRow[],
) {
  const maintenanceSignals = maintenanceRows
    .filter((ticket) => getMaintenanceSeverity(ticket) !== 'normal')
    .map<TodaySignal>((ticket) => ({
      id: `maintenance-${ticket.id}`,
      module: 'maintenance',
      label: truncateText(ticket.title),
      statusLabel:
        getMaintenanceSeverity(ticket) === 'critical' ? 'Critical' : 'Overdue',
      ctaLabel: 'View',
      href: buildHref('/app/maintenance', {
        q: ticket.title,
        priority: ticket.priority === 'critical' ? 'critical' : undefined,
      }),
      severity: getMaintenanceSeverity(ticket),
      timestamp: ticket.reported_at,
    }))

  const expenseSignals = expenseRows
    .filter((expense) => getExpenseSeverity(expense) !== 'normal')
    .map<TodaySignal>((expense) => ({
      id: `expense-${expense.id}`,
      module: 'expenses',
      label: truncateText(expense.description),
      statusLabel:
        expense.status === 'submitted' ? 'Pending approval' : 'Requires approval',
      ctaLabel: 'Review',
      href: buildHref('/app/expenses', {
        q: expense.description,
        status: expense.status === 'submitted' ? 'submitted' : undefined,
        flagged: isFlaggedExpense(expense) ? 'true' : undefined,
      }),
      severity: getExpenseSeverity(expense),
      timestamp: expense.created_at,
    }))

  const reputationSignals = reviewRows
    .filter((review) => getReviewSeverity(review) !== 'normal')
    .map<TodaySignal>((review) => ({
      id: `reputation-${review.id}`,
      module: 'reputation',
      label: truncateText(getReviewComment(review)),
      statusLabel:
        review.response_status === 'pending' ? 'Needs response' : 'Needs attention',
      ctaLabel: 'Respond',
      href: buildHref('/app/reputation', {
        filter: 'negative',
        q: getReviewComment(review),
      }),
      severity: getReviewSeverity(review),
      timestamp: review.reviewed_at,
    }))

  const operationSignals = operationRows
    .filter((item) => getOperationSeverity(item) !== 'normal')
    .map<TodaySignal>((item) => ({
      id: `operations-${item.id}`,
      module: 'operations',
      label: truncateText(item.title),
      statusLabel: operationStatusLabels[item.status],
      ctaLabel: 'Open',
      href: buildHref('/app/operations', {
        q: item.title,
        type: item.type,
        priority: item.priority,
        status: item.status,
      }),
      severity: getOperationSeverity(item),
      timestamp: item.created_at,
    }))

  return sortSignals([
    ...maintenanceSignals,
    ...expenseSignals,
    ...reputationSignals,
    ...operationSignals,
  ]).slice(0, 5)
}

function getQueueBlocks(
  maintenanceRows: MaintenanceTicketRow[],
  expenseRows: ExpenseRow[],
  operationRows: OperationRow[],
): QueueBlockData[] {
  const maintenanceQueue = sortMaintenanceRows(
    maintenanceRows.filter(
      (ticket) => ticket.status !== 'resolved' && ticket.status !== 'closed',
    ),
  )

  const expenseQueue = sortExpenseRows(
    expenseRows.filter(
      (expense) => expense.status === 'submitted' || isFlaggedExpense(expense),
    ),
  )

  const operationsQueue = sortOperationRows(
    operationRows.filter((item) => item.status !== 'done'),
  )

  return [
    {
      module: 'maintenance',
      count: maintenanceQueue.length,
      href: '/app/maintenance',
      items: maintenanceQueue.slice(0, 3).map((ticket) => ({
        id: ticket.id,
        label: truncateText(ticket.title, 64),
        meta: ticket.location,
        statusLabel: maintenanceStatusLabels[ticket.status],
        severity: getMaintenanceSeverity(ticket),
        href: buildHref('/app/maintenance', { q: ticket.title }),
      })),
    },
    {
      module: 'expenses',
      count: expenseQueue.length,
      href: '/app/expenses',
      items: expenseQueue.slice(0, 3).map((expense) => ({
        id: expense.id,
        label: truncateText(expense.description, 64),
        meta: expense.status === 'submitted' ? 'Pending approval' : 'Requires approval',
        statusLabel: expense.status.replace(/_/g, ' '),
        severity: getExpenseSeverity(expense),
        href: buildHref('/app/expenses', {
          q: expense.description,
          status: expense.status === 'submitted' ? 'submitted' : undefined,
          flagged: isFlaggedExpense(expense) ? 'true' : undefined,
        }),
      })),
    },
    {
      module: 'operations',
      count: operationsQueue.length,
      href: '/app/operations',
      items: operationsQueue.slice(0, 3).map((item) => ({
        id: item.id,
        label: truncateText(item.title, 64),
        meta: item.location ?? moduleLabels.operations,
        statusLabel: operationStatusLabels[item.status],
        severity: getOperationSeverity(item),
        href: buildHref('/app/operations', {
          q: item.title,
          type: item.type,
          priority: item.priority,
        }),
      })),
    },
  ]
}

function getRecentActivity(
  maintenanceRows: MaintenanceTicketRow[],
  expenseRows: ExpenseRow[],
  reviewRows: ReviewRow[],
  operationRows: OperationRow[],
) {
  const maintenanceActivity = maintenanceRows.map<ActivityItem>((ticket) => ({
    id: `maintenance-${ticket.id}`,
    module: 'maintenance',
    label: truncateText(ticket.title),
    timestamp: ticket.reported_at,
    href: buildHref('/app/maintenance', { q: ticket.title }),
    severity: getMaintenanceSeverity(ticket),
  }))

  const expenseActivity = expenseRows.map<ActivityItem>((expense) => ({
    id: `expenses-${expense.id}`,
    module: 'expenses',
    label: truncateText(expense.description),
    timestamp: expense.created_at,
    href: buildHref('/app/expenses', { q: expense.description }),
    severity: getExpenseSeverity(expense),
  }))

  const reputationActivity = reviewRows.map<ActivityItem>((review) => ({
    id: `reputation-${review.id}`,
    module: 'reputation',
    label: truncateText(getReviewComment(review)),
    timestamp: review.reviewed_at,
    href: buildHref('/app/reputation', { q: getReviewComment(review) }),
    severity: getReviewSeverity(review),
  }))

  const operationsActivity = operationRows.map<ActivityItem>((item) => ({
    id: `operations-${item.id}`,
    module: 'operations',
    label: truncateText(item.title),
    timestamp: item.created_at,
    href: buildHref('/app/operations', { q: item.title }),
    severity: getOperationSeverity(item),
  }))

  return sortRecentActivity([
    ...maintenanceActivity,
    ...expenseActivity,
    ...reputationActivity,
    ...operationsActivity,
  ]).slice(0, 8)
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
    supabase
      .from('maintenance_tickets')
      .select('id, title, location, status, priority, reported_at, due_at')
      .order('reported_at', { ascending: false })
      .limit(12),
    supabase
      .from('cash_expenses')
      .select('id, description, amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('reviews')
      .select('id, title, body, rating, reviewed_at, response_status')
      .order('reviewed_at', { ascending: false })
      .limit(12),
    supabase
      .from('operation_items')
      .select('id, type, title, status, priority, created_at, location, notes')
      .order('created_at', { ascending: false })
      .limit(12),
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

  return {
    todaySignals: getTodaySignals(
      nextMaintenanceRows,
      nextExpenseRows,
      nextReviewRows,
      nextOperationRows,
    ),
    queueBlocks: getQueueBlocks(
      nextMaintenanceRows,
      nextExpenseRows,
      nextOperationRows,
    ),
    recentActivity: getRecentActivity(
      nextMaintenanceRows,
      nextExpenseRows,
      nextReviewRows,
      nextOperationRows,
    ),
  }
}

interface TodaySignalRowProps {
  signal: TodaySignal
}

function TodaySignalRow({ signal }: TodaySignalRowProps) {
  return (
    <Link
      to={signal.href}
      className="group grid gap-3 rounded-2xl border border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50/80 md:grid-cols-[auto_minmax(0,1fr)_auto_auto] md:items-center"
    >
      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-600">
        {moduleLabels[signal.module]}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{signal.label}</p>
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
          {formatTimestamp(signal.timestamp)}
        </p>
      </div>
      <span
        className={[
          'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.2em]',
          getToneClasses(signal.severity),
        ].join(' ')}
      >
        {signal.statusLabel}
      </span>
      <span className="text-sm text-slate-600 transition-colors group-hover:text-slate-950">
        {signal.ctaLabel}
      </span>
    </Link>
  )
}

interface QueueBlockProps {
  block: QueueBlockData
}

function QueueBlock({ block }: QueueBlockProps) {
  return (
    <SurfaceCard
      title={moduleLabels[block.module]}
      description={`${block.count} active ${block.count === 1 ? 'item' : 'items'}`}
      className="h-full"
    >
      <div className="space-y-3">
        {block.items.length > 0 ? (
          <div className="space-y-2">
            {block.items.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50/80"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {item.label}
                  </p>
                  <p className="truncate text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    {item.meta}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={[
                      'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.2em]',
                      getToneClasses(item.severity),
                    ].join(' ')}
                  >
                    {item.statusLabel}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Link
            to={block.href}
            className="block rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-600 transition-colors hover:bg-slate-50/80"
          >
            No active items. Open {moduleLabels[block.module]}.
          </Link>
        )}

        <Link
          to={block.href}
          className="inline-flex items-center text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950"
        >
          Open full list
        </Link>
      </div>
    </SurfaceCard>
  )
}

interface ActivityRowProps {
  item: ActivityItem
}

function ActivityRow({ item }: ActivityRowProps) {
  return (
    <Link
      to={item.href}
      className="group grid gap-2 rounded-2xl border border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50/80 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-600">
          {moduleLabels[item.module]}
        </span>
        <span
          className={[
            'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.2em]',
            getToneClasses(item.severity),
          ].join(' ')}
        >
          {item.severity}
        </span>
      </div>

      <p className="truncate text-sm font-medium text-slate-900">{item.label}</p>

      <span className="text-[11px] uppercase tracking-[0.24em] text-slate-400 transition-colors group-hover:text-slate-700">
        {formatTimestamp(item.timestamp)}
      </span>
    </Link>
  )
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
      className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-shell backdrop-blur transition-colors hover:bg-slate-50/80"
    >
      <div className="space-y-1.5">
        <p className="text-3xl font-semibold tracking-tight text-slate-950">
          {value}
        </p>
        <div className="space-y-1">
          <p className="text-sm text-slate-600">{label}</p>
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
            {helper}
          </p>
        </div>
      </div>
    </Link>
  )
}

export function Dashboard() {
  const [kpis, setKpis] = useState<DashboardKpis>({
    openTickets: 0,
    criticalTickets: 0,
    todayExpenses: 0,
    activeVendors: 0,
  })
  const [todaySignals, setTodaySignals] = useState<TodaySignal[]>([])
  const [queueBlocks, setQueueBlocks] = useState<QueueBlockData[]>([])
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
          setTodaySignals(data.todaySignals)
          setQueueBlocks(data.queueBlocks)
          setRecentActivity(data.recentActivity)
        }
      } catch (error) {
        console.error('Unable to load dashboard data', error)

        if (!isCancelled) {
          setErrorMessage('Open the relevant module to continue working while the dashboard reconnects.')
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
      value: String(kpis.openTickets),
      helper: 'Open maintenance queue',
      href: '/app/maintenance',
    },
    {
      label: 'Critical tickets',
      value: String(kpis.criticalTickets),
      helper: 'Immediate maintenance issues',
      href: buildHref('/app/maintenance', { priority: 'critical' }),
    },
    {
      label: 'Today spend',
      value: formatCurrency(kpis.todayExpenses),
      helper: 'Open expense control',
      href: '/app/expenses',
    },
    {
      label: 'Active vendors',
      value: String(kpis.activeVendors),
      helper: 'Open vendor directory',
      href: '/app/vendors',
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
            value={isLoading ? '...' : card.value}
            helper={card.helper}
            href={card.href}
          />
        ))}
      </div>

      <SurfaceCard
        title="Requires attention"
        description="Top operational items to review right now across maintenance, expenses, reputation, and operations."
      >
        {isLoading ? (
          <p className="text-sm leading-7 text-slate-600">Loading today’s signals...</p>
        ) : errorMessage ? (
          <div className="space-y-3">
            <p className="text-sm leading-7 text-slate-600">{errorMessage}</p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/app/maintenance"
                className="text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950"
              >
                Open Maintenance
              </Link>
              <Link
                to="/app/expenses"
                className="text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950"
              >
                Open Expenses
              </Link>
              <Link
                to="/app/operations"
                className="text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950"
              >
                Open Operations
              </Link>
            </div>
          </div>
        ) : todaySignals.length > 0 ? (
          <div className="space-y-2">
            {todaySignals.map((signal) => (
              <TodaySignalRow key={signal.id} signal={signal} />
            ))}
          </div>
        ) : (
          <Link
            to="/app/operations"
            className="block rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-600 transition-colors hover:bg-slate-50/80"
          >
            No urgent items right now. Open Operations to review the full workspace.
          </Link>
        )}
      </SurfaceCard>

      <div className="grid gap-4 xl:grid-cols-3">
        {queueBlocks.map((block) => (
          <QueueBlock key={block.module} block={block} />
        ))}
      </div>

      <SurfaceCard
        title="Recent activity"
        description="Latest updates across the control layer, ordered by recency."
      >
        {isLoading ? (
          <p className="text-sm leading-7 text-slate-600">Loading recent activity...</p>
        ) : errorMessage ? (
          <p className="text-sm leading-7 text-slate-600">
            Open a module to continue reviewing live work.
          </p>
        ) : recentActivity.length > 0 ? (
          <div className="space-y-2">
            {recentActivity.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Link
            to="/app/operations"
            className="block rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-600 transition-colors hover:bg-slate-50/80"
          >
            No recent activity yet. Open Operations to start logging work.
          </Link>
        )}
      </SurfaceCard>
    </PageSection>
  )
}
