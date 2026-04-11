import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { ActionDrawer } from '../components/ui/ActionDrawer'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type OperationItemType = 'ticket' | 'task' | 'intervention' | 'order'
type OperationItemStatus = 'open' | 'in_progress' | 'blocked' | 'done'
type OperationItemPriority = 'low' | 'medium' | 'high' | 'critical'

type FilterValue<T extends string> = 'all' | T

interface OperationItem {
  id: string
  created_by_profile_id: string | null
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
  assignedStaffId: string
  location: string
  notes: string
}

interface StaffOption {
  id: string
  first_name: string
  last_name: string
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
  blocked: 'Blocked',
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
  blocked: 0,
  open: 1,
  in_progress: 2,
  done: 3,
}

const defaultFormState: OperationFormState = {
  type: 'ticket',
  title: '',
  priority: 'medium',
  status: 'open',
  assignedStaffId: '',
  location: '',
  notes: '',
}

function buildStaffName(staff: StaffOption) {
  return `${staff.first_name} ${staff.last_name}`.trim()
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
  return (
    value === 'open' ||
    value === 'in_progress' ||
    value === 'blocked' ||
    value === 'done'
  )
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
    return 'bg-red-50 text-red-600'
  }

  if (priority === 'high') {
    return 'bg-amber-50 text-amber-600'
  }

  return 'bg-slate-100 text-slate-600'
}

function getStatusBadgeClasses(status: OperationItemStatus) {
  if (status === 'blocked') {
    return 'bg-red-50 text-red-700'
  }

  if (status === 'open') {
    return 'bg-slate-100 text-slate-700'
  }

  if (status === 'in_progress') {
    return 'bg-amber-50 text-amber-700'
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

  return [item.title, item.location ?? '', item.notes ?? '']
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery)
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
    throw new Error('Live operations data is unavailable right now.')
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

  const { data: profileRow, error: profileError } = await supabase!
    .from('profiles')
    .select('organization_id')
    .eq('id', session.user.id)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  const organizationId = (profileRow as ProfileRow | null)?.organization_id

  if (!organizationId) {
    throw new Error('Your workspace is not linked to an organization yet.')
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
    <div className="surface-panel p-5">
      <div className="space-y-2">
        <p className="text-3xl font-semibold tracking-tight text-slate-950">
          {value}
        </p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  )
}

interface OperationQueueItemProps {
  item: OperationItem
  assigneeLabel: string
  onOpen: (item: OperationItem) => void
}

function OperationQueueItem({ item, assigneeLabel, onOpen }: OperationQueueItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(item)
        }
      }}
      className={[
        'cursor-pointer rounded-lg border px-3.5 py-3 transition-all duration-150 hover:-translate-y-px',
        getItemSurfaceClasses(item.priority),
      ].join(' ')}
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-600">
              {typeLabels[item.type]}
            </span>
            <span
              className={[
                'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.2em]',
                getPriorityBadgeClasses(item.priority),
              ].join(' ')}
            >
              {priorityLabels[item.priority]}
            </span>
            <span
              className={[
                'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.2em]',
                getStatusBadgeClasses(item.status),
              ].join(' ')}
            >
              {statusLabels[item.status]}
            </span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold tracking-tight text-slate-950 md:text-base">
              {item.title}
            </h2>
            {item.location ? (
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                {item.location}
              </p>
            ) : null}
            {item.notes ? (
              <p className="text-sm text-slate-600">{item.notes}</p>
            ) : null}
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              Assigned: {assigneeLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          <div className="space-y-1 md:text-right">
            <p className="text-sm text-slate-600">{formatOpenedAgo(item.created_at)}</p>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
              {formatCreatedAt(item.created_at)}
            </p>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onOpen(item)
            }}
            className="button-pill min-h-8 px-3 py-1 text-[11px] uppercase tracking-[0.2em]"
          >
            Open
          </button>
        </div>
      </div>
    </div>
  )
}

export function Operations() {
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState<OperationItem[]>([])
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<FilterValue<OperationItemType>>('all')
  const [statusFilter, setStatusFilter] = useState<FilterValue<OperationItemStatus>>('all')
  const [priorityFilter, setPriorityFilter] =
    useState<FilterValue<OperationItemPriority>>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
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
          setErrorMessage('Live operations data is unavailable right now.')
          setIsLoading(false)
        }
        return
      }

      setIsLoading(true)
      setErrorMessage(null)

      try {
        await getAuthenticatedContext()

        const [
          { data: operationRows, error: operationsError },
          { data: staffRows, error: staffError },
        ] = await Promise.all([
          supabase!
            .from('operation_items')
            .select(
              'id, created_by_profile_id, type, title, status, priority, created_at, location, notes',
            )
            .order('created_at', { ascending: false })
            .limit(100),
          supabase!
            .from('staff_directory')
            .select('id, first_name, last_name')
            .in('employment_status', ['active', 'on_leave'])
            .order('last_name', { ascending: true }),
        ])

        if (operationsError) {
          if (hasMissingOperationsSchema(operationsError.code)) {
            if (!isCancelled) {
              setItems([])
            }
            return
          }

          throw operationsError
        }

        if (staffError) {
          throw staffError
        }

        if (!isCancelled) {
          setItems((operationRows as OperationItem[] | null) ?? [])
          setStaffOptions((staffRows as StaffOption[] | null) ?? [])
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
  const staffNameMap = new Map(
    staffOptions.map((staffMember) => [staffMember.id, buildStaffName(staffMember)]),
  )

  async function handleSaveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const title = formState.title.trim()

    if (!title) {
      setErrorMessage('Enter a title to save this operational item.')
      return
    }

    if (!supabase) {
      setErrorMessage('Live operations data is unavailable right now.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const context = await getAuthenticatedContext()
      const nextAssignedStaffId = formState.assignedStaffId || context.userId
      const payload = {
        type: formState.type,
        title,
        status: formState.status,
        priority: formState.priority,
        created_by_profile_id: nextAssignedStaffId,
        location: formState.location.trim() || null,
        notes: formState.notes.trim() || null,
      }

      const query = editingItemId
        ? supabase!.from('operation_items').update(payload).eq('id', editingItemId)
        : supabase!.from('operation_items').insert({
            organization_id: context.organizationId,
            ...payload,
          })

      const { data, error } = await query
        .select(
          'id, created_by_profile_id, type, title, status, priority, created_at, location, notes',
        )
        .single()

      if (error) {
        if (hasMissingOperationsSchema(error.code)) {
          throw new Error('Unable to save this item right now.')
        }

        throw error
      }

      setItems((currentItems) => {
        const nextItem = data as OperationItem

        if (editingItemId) {
          return sortItems(
            currentItems.map((item) => (item.id === editingItemId ? nextItem : item)),
          )
        }

        return sortItems([nextItem, ...currentItems])
      })

      closeModal()
    } catch (error) {
      console.error('Unable to save operation item', error)
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save this item right now.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function closeModal() {
    setFormState(defaultFormState)
    setEditingItemId(null)
    setIsCreateOpen(false)
  }

  function openCreateModal() {
    setFormState(defaultFormState)
    setEditingItemId(null)
    setErrorMessage(null)
    setIsCreateOpen(true)
  }

  function openEditModal(item: OperationItem) {
    setFormState({
      type: item.type,
      title: item.title,
      priority: item.priority,
      status: item.status,
      assignedStaffId: item.created_by_profile_id ?? '',
      location: item.location ?? '',
      notes: item.notes ?? '',
    })
    setEditingItemId(item.id)
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
        description="Track live operational work, keep execution visible, and update items without leaving the queue."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 xl:items-center">
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as FilterValue<OperationItemType>)
                }
                className="field-input"
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
                className="field-input"
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(event.target.value as FilterValue<OperationItemPriority>)
                }
                className="field-input"
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
                className="field-input"
                placeholder="Search title, location, notes"
              />
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="button-primary min-h-11"
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
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-5 py-5">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold tracking-tight text-slate-950">
                    No operational items recorded
                  </h2>
                  <p className="text-sm text-slate-600">
                    Start by creating a ticket, task, intervention or order.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="button-primary min-h-10 px-4 py-2.5"
                >
                  New item
                </button>
              </div>
            </div>
          ) : null}

          {!isLoading && !errorMessage && items.length > 0 && filteredItems.length === 0 ? (
            <p className="text-sm leading-7 text-slate-600">
              No items match the current filters
            </p>
          ) : null}

          {!isLoading && !errorMessage && filteredItems.length > 0 ? (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <OperationQueueItem
                  key={item.id}
                  item={item}
                  assigneeLabel={
                    staffNameMap.get(item.created_by_profile_id ?? '') ?? 'Unassigned'
                  }
                  onOpen={openEditModal}
                />
              ))}
            </div>
          ) : null}
        </div>
      </SurfaceCard>

      <ActionDrawer
        isOpen={isCreateOpen}
        onClose={closeModal}
              title={editingItemId ? 'Edit operational item' : 'New operational item'}
            >
        <form className="space-y-6" onSubmit={handleSaveItem}>
          <div className="grid gap-4">
                  <div className="space-y-2">
              <label htmlFor="operation-type" className="eyebrow-label">
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
                className="field-input w-full"
                    >
                      <option value="ticket">Ticket</option>
                      <option value="task">Task</option>
                      <option value="intervention">Intervention</option>
                      <option value="order">Order</option>
                    </select>
                  </div>

                  <div className="space-y-2">
              <label htmlFor="operation-priority" className="eyebrow-label">
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
                className="field-input w-full"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div className="space-y-2">
              <label htmlFor="operation-status" className="eyebrow-label">
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
                className="field-input w-full"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                  <div className="space-y-2">
              <label htmlFor="operation-assignee" className="eyebrow-label">
                Assign to
              </label>
              <select
                      id="operation-assignee"
                      value={formState.assignedStaffId}
                      onChange={(event) =>
                        setFormState((currentState) => ({
                          ...currentState,
                          assignedStaffId: event.target.value,
                        }))
                      }
                className="field-input w-full"
                    >
                      <option value="">No assignee</option>
                      {staffOptions.map((staffMember) => (
                        <option key={staffMember.id} value={staffMember.id}>
                          {buildStaffName(staffMember)}
                        </option>
                      ))}
                    </select>
                  </div>
                <div className="space-y-2">
              <label htmlFor="operation-title" className="eyebrow-label">
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
                className="field-input w-full"
                    placeholder="Room 214 AC follow-up"
                  />
                </div>

            <div className="space-y-2">
              <label htmlFor="operation-location" className="eyebrow-label">
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
                className="field-input w-full"
                      placeholder="Room 214"
                    />
                  </div>

                  <div className="space-y-2">
              <label htmlFor="operation-notes" className="eyebrow-label">
                Notes
              </label>
              <textarea
                      id="operation-notes"
                      value={formState.notes}
                      onChange={(event) =>
                        setFormState((currentState) => ({
                          ...currentState,
                          notes: event.target.value,
                        }))
                      }
                className="field-input w-full min-h-[100px]"
                placeholder="Waiting for vendor confirmation..."
                    />
                  </div>
                </div>

          <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isSubmitting}
              className="button-primary min-h-11 w-full"
                  >
                    {isSubmitting
                      ? 'Saving...'
                      : editingItemId
                        ? 'Save changes'
                        : 'Create item'}
                  </button>
            <button
              type="button"
              onClick={closeModal}
              className="button-secondary min-h-11 w-full"
            >
              Cancel
            </button>
        </div>
        </form>
      </ActionDrawer>
    </PageSection>
  )
}
