import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type OperationItemType = 'ticket' | 'task' | 'intervention' | 'order'
type OperationItemStatus = 'open' | 'in_progress' | 'done'
type OperationItemPriority = 'low' | 'medium' | 'high' | 'critical'

type FilterValue<T extends string> = 'all' | T

interface OperationItem {
  id: string
  type: OperationItemType
  title: string
  status: OperationItemStatus
  priority: OperationItemPriority
  created_at: string
  location?: string | null
  notes?: string | null
}

interface ProfileRow {
  organization_id: string | null
}

interface OperationFormState {
  type: OperationItemType
  title: string
  priority: OperationItemPriority
  status: OperationItemStatus
  location: string
  notes: string
}

const typeLabels: Record<OperationItemType, string> = {
  ticket: 'Ticket',
  task: 'Task',
  intervention: 'Intervention',
  order: 'Order',
}

const statusLabels: Record<OperationItemStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  done: 'Done',
}

const priorityLabels: Record<OperationItemPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

const priorityRank: Record<OperationItemPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const statusRank: Record<OperationItemStatus, number> = {
  open: 0,
  in_progress: 1,
  done: 2,
}

const defaultFormState: OperationFormState = {
  type: 'ticket',
  title: '',
  priority: 'medium',
  status: 'open',
  location: '',
  notes: '',
}

function hasMissingOperationsSchema(code?: string) {
  return code === '42P01' || code === '42703' || code === 'PGRST204' || code === 'PGRST205'
}

function isOperationItemType(value: string | null): value is OperationItemType {
  return (
    value === 'ticket' ||
    value === 'task' ||
    value === 'intervention' ||
    value === 'order'
  )
}

function isOperationItemStatus(value: string | null): value is OperationItemStatus {
  return value === 'open' || value === 'in_progress' || value === 'done'
}

function isOperationItemPriority(value: string | null): value is OperationItemPriority {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'critical'
}

function sortItems(items: OperationItem[]) {
  return [...items].sort((left, right) => {
    const priorityDifference = priorityRank[left.priority] - priorityRank[right.priority]

    if (priorityDifference !== 0) {
      return priorityDifference
    }

    const statusDifference = statusRank[left.status] - statusRank[right.status]

    if (statusDifference !== 0) {
      return statusDifference
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  })
}

function getItemSurfaceClasses(priority: OperationItemPriority) {
  if (priority === 'critical') {
    return 'border-red-200 bg-red-50/30'
  }

  if (priority === 'high') {
    return 'border-amber-200 bg-amber-50/20'
  }

  return 'border-slate-200 bg-white/80'
}

function getPriorityBadgeClasses(priority: OperationItemPriority) {
  if (priority === 'critical') {
    return 'bg-red-50 text-red-700'
  }

  if (priority === 'high') {
    return 'bg-amber-50 text-amber-700'
  }

  return 'bg-slate-100 text-slate-600'
}

function getStatusBadgeClasses(status: OperationItemStatus) {
  if (status === 'open') {
    return 'bg-slate-900 text-white'
  }

  if (status === 'in_progress') {
    return 'bg-slate-100 text-slate-700'
  }

  return 'bg-emerald-50 text-emerald-700'
}

function formatCreatedAt(value: string) {
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

function formatOpenedAgo(value: string) {
  const createdAt = new Date(value)

  if (Number.isNaN(createdAt.getTime())) {
    return 'Opened recently'
  }

  const hours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)

  if (hours >= 24) {
    return `Opened ${Math.floor(hours / 24)}d ago`
  }

  if (hours >= 1) {
    return `Opened ${Math.floor(hours)}h ago`
  }

  return 'Opened <1h ago'
}

function matchesFilters(
  item: OperationItem,
  typeFilter: FilterValue<OperationItemType>,
  statusFilter: FilterValue<OperationItemStatus>,
  priorityFilter: FilterValue<OperationItemPriority>,
  searchQuery: string,
) {
  const normalizedQuery = searchQuery.trim().toLowerCase()

  if (typeFilter !== 'all' && item.type !== typeFilter) {
    return false
  }

  if (statusFilter !== 'all' && item.status !== statusFilter) {
    return false
  }

  if (priorityFilter !== 'all' && item.priority !== priorityFilter) {
    return false
  }

  if (!normalizedQuery) {
    return true
  }

  const haystack = [item.title, item.location ?? '', item.notes ?? '']
    .join(' ')
    .toLowerCase()

  return haystack.includes(normalizedQuery)
}

function getKpis(items: OperationItem[]) {
  return {
    openItems: items.filter((item) => item.status !== 'done').length,
    criticalItems: items.filter(
      (item) => item.priority === 'critical' && item.status !== 'done',
    ).length,
    inProgressItems: items.filter((item) => item.status === 'in_progress').length,
  }
}

async function getAuthenticatedContext() {
  if (!supabase) {
    throw new Error(
      'Supabase env missing. Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to load live operations data.',
    )
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  if (!session) {
    throw new Error('Sign in to view live operations control.')
  }

  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', session.user.id)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  const organizationId = (profileRow as ProfileRow | null)?.organization_id

  if (!organizationId) {
    throw new Error('Your profile is not linked to an organization.')
  }

  return {
    userId: session.user.id,
    organizationId,
  }
}

interface OperationsKpiCardProps {
  label: string
  value: number
}

function OperationsKpiCard({ label, value }: OperationsKpiCardProps) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-shell backdrop-blur">
      <div className="space-y-2">
        <p className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
          {value}
        </p>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
      </div>
    </div>
  )
}

export function Operations() {
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState<OperationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<FilterValue<OperationItemType>>('all')
  const [statusFilter, setStatusFilter] = useState<FilterValue<OperationItemStatus>>('all')
  const [priorityFilter, setPriorityFilter] =
    useState<FilterValue<OperationItemPriority>>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formState, setFormState] = useState<OperationFormState>(defaultFormState)

  useEffect(() => {
    const nextTypeFilter = searchParams.get('type')
    const nextStatusFilter = searchParams.get('status')
    const nextPriorityFilter = searchParams.get('priority')
    const nextSearchQuery = searchParams.get('q')?.trim() ?? ''

    setTypeFilter(isOperationItemType(nextTypeFilter) ? nextTypeFilter : 'all')
    setStatusFilter(isOperationItemStatus(nextStatusFilter) ? nextStatusFilter : 'all')
    setPriorityFilter(
      isOperationItemPriority(nextPriorityFilter) ? nextPriorityFilter : 'all',
    )
    setSearchQuery(nextSearchQuery)
  }, [searchParams])

  useEffect(() => {
    let isCancelled = false

    async function loadOperations() {
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
        await getAuthenticatedContext()

        const { data, error } = await supabase
          .from('operation_items')
          .select('id, type, title, status, priority, created_at, location, notes')
          .order('created_at', { ascending: false })
          .limit(100)

        if (error) {
          if (hasMissingOperationsSchema(error.code)) {
            throw new Error(
              'Apply sql/002_operation_items.sql to enable the Operations workspace.',
            )
          }

          throw error
        }

        if (!isCancelled) {
          setItems((data as OperationItem[] | null) ?? [])
        }
      } catch (error) {
        console.error('Unable to load operations items', error)

        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load operations control right now.',
          )
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadOperations()

    return () => {
      isCancelled = true
    }
  }, [])

  const sortedItems = sortItems(items)
  const filteredItems = sortedItems.filter((item) =>
    matchesFilters(item, typeFilter, statusFilter, priorityFilter, searchQuery),
  )
  const kpis = getKpis(items)

  async function handleCreateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const title = formState.title.trim()

    if (!title) {
      setErrorMessage('Enter a title to create an operational item.')
      return
    }

    if (!supabase) {
      setErrorMessage(
        'Supabase env missing. Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to load live operations data.',
      )
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const context = await getAuthenticatedContext()

      const { data, error } = await supabase
        .from('operation_items')
        .insert({
          organization_id: context.organizationId,
          created_by_profile_id: context.userId,
          type: formState.type,
          title,
          status: formState.status,
          priority: formState.priority,
          location: formState.location.trim() || null,
          notes: formState.notes.trim() || null,
        })
        .select('id, type, title, status, priority, created_at, location, notes')
        .single()

      if (error) {
        if (hasMissingOperationsSchema(error.code)) {
          throw new Error(
            'Apply sql/002_operation_items.sql to enable the Operations workspace.',
          )
        }

        throw error
      }

      setItems((currentItems) => sortItems([data as OperationItem, ...currentItems]))
      setFormState(defaultFormState)
      setIsCreateOpen(false)
    } catch (error) {
      console.error('Unable to create operation item', error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create the operational item right now.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function openCreateModal() {
    setFormState(defaultFormState)
    setErrorMessage(null)
    setIsCreateOpen(true)
  }

  return (
    <PageSection
      title="Operations"
      description="Core operational workspace for tracking tickets, tasks, interventions, and orders in one clean queue."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <OperationsKpiCard label="Open items" value={isLoading ? 0 : kpis.openItems} />
        <OperationsKpiCard
          label="Critical items"
          value={isLoading ? 0 : kpis.criticalItems}
        />
        <OperationsKpiCard
          label="In progress"
          value={isLoading ? 0 : kpis.inProgressItems}
        />
      </div>

      <SurfaceCard
        title="Operational queue"
        description="Filter the live queue, keep unfinished work first, and log new operational activity as it happens."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 xl:items-center">
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as FilterValue<OperationItemType>)
                }
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              >
                <option value="all">All types</option>
                <option value="ticket">Tickets</option>
                <option value="task">Tasks</option>
                <option value="intervention">Interventions</option>
                <option value="order">Orders</option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as FilterValue<OperationItemStatus>)
                }
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(event.target.value as FilterValue<OperationItemPriority>)
                }
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              >
                <option value="all">All priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                placeholder="Search title, location, notes"
              />
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              New item
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm leading-7 text-slate-600">Loading operations...</p>
          ) : null}

          {!isLoading && errorMessage ? (
            <p className="text-sm leading-7 text-slate-600">{errorMessage}</p>
          ) : null}

          {!isLoading && !errorMessage && items.length === 0 ? (
            <p className="text-sm leading-7 text-slate-600">
              No operational items recorded
            </p>
          ) : null}

          {!isLoading && !errorMessage && items.length > 0 && filteredItems.length === 0 ? (
            <p className="text-sm leading-7 text-slate-600">
              No items match the current filters
            </p>
          ) : null}

          {!isLoading && !errorMessage && filteredItems.length > 0 ? (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={[
                    'rounded-3xl border p-5 transition-colors',
                    getItemSurfaceClasses(item.priority),
                  ].join(' ')}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                          {typeLabels[item.type]}
                        </span>
                        <span
                          className={[
                            'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em]',
                            getPriorityBadgeClasses(item.priority),
                          ].join(' ')}
                        >
                          {priorityLabels[item.priority]}
                        </span>
                        <span
                          className={[
                            'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                            getStatusBadgeClasses(item.status),
                          ].join(' ')}
                        >
                          {statusLabels[item.status]}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h2 className="text-base font-semibold tracking-tight text-slate-950">
                          {item.title}
                        </h2>
                        {item.location ? (
                          <p className="text-sm text-slate-600">{item.location}</p>
                        ) : null}
                        {item.notes ? (
                          <p className="text-sm leading-6 text-slate-500">{item.notes}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-slate-500 md:text-right">
                      <p className="font-medium text-slate-700">
                        {formatOpenedAgo(item.created_at)}
                      </p>
                      <p>{formatCreatedAt(item.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </SurfaceCard>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl">
            <SurfaceCard
              title="New operational item"
              description="Log a real operational activity with the minimum fields needed to track execution."
            >
              <form className="space-y-4" onSubmit={handleCreateItem}>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label
                      htmlFor="operation-type"
                      className="text-sm font-semibold text-slate-700"
                    >
                      Type
                    </label>
                    <select
                      id="operation-type"
                      value={formState.type}
                      onChange={(event) =>
                        setFormState((currentState) => ({
                          ...currentState,
                          type: event.target.value as OperationItemType,
                        }))
                      }
                      className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="ticket">Ticket</option>
                      <option value="task">Task</option>
                      <option value="intervention">Intervention</option>
                      <option value="order">Order</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="operation-priority"
                      className="text-sm font-semibold text-slate-700"
                    >
                      Priority
                    </label>
                    <select
                      id="operation-priority"
                      value={formState.priority}
                      onChange={(event) =>
                        setFormState((currentState) => ({
                          ...currentState,
                          priority: event.target.value as OperationItemPriority,
                        }))
                      }
                      className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="operation-status"
                      className="text-sm font-semibold text-slate-700"
                    >
                      Status
                    </label>
                    <select
                      id="operation-status"
                      value={formState.status}
                      onChange={(event) =>
                        setFormState((currentState) => ({
                          ...currentState,
                          status: event.target.value as OperationItemStatus,
                        }))
                      }
                      className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="operation-title"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Title
                  </label>
                  <input
                    id="operation-title"
                    type="text"
                    value={formState.title}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        title: event.target.value,
                      }))
                    }
                    className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                    placeholder="Room 214 AC follow-up"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="operation-location"
                      className="text-sm font-semibold text-slate-700"
                    >
                      Location
                    </label>
                    <input
                      id="operation-location"
                      type="text"
                      value={formState.location}
                      onChange={(event) =>
                        setFormState((currentState) => ({
                          ...currentState,
                          location: event.target.value,
                        }))
                      }
                      className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                      placeholder="Room 214"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="operation-notes"
                      className="text-sm font-semibold text-slate-700"
                    >
                      Notes
                    </label>
                    <input
                      id="operation-notes"
                      type="text"
                      value={formState.notes}
                      onChange={(event) =>
                        setFormState((currentState) => ({
                          ...currentState,
                          notes: event.target.value,
                        }))
                      }
                      className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                      placeholder="Waiting for vendor confirmation"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2 md:flex-row md:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Saving...' : 'Create item'}
                  </button>
                </div>
              </form>
            </SurfaceCard>
          </div>
        </div>
      ) : null}
    </PageSection>
  )
}
