import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type MaintenanceTicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_vendor'
  | 'resolved'
  | 'closed'

type PriorityLevel = 'low' | 'medium' | 'high' | 'critical'

type TicketSeverity = 'normal' | 'warning' | 'high' | 'critical'

interface MaintenanceTicketRecord {
  id: string
  title: string
  description: string
  location: string
  status: MaintenanceTicketStatus
  priority: PriorityLevel
  created_at: string
  due_at: string | null
}

const statusLabels: Record<MaintenanceTicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  waiting_vendor: 'Waiting vendor',
  resolved: 'Resolved',
  closed: 'Closed',
}

const priorityLabels: Record<PriorityLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

const severityRank: Record<TicketSeverity, number> = {
  critical: 0,
  high: 1,
  warning: 2,
  normal: 3,
}

const priorityRank: Record<PriorityLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function getHoursSinceCreated(ticket: MaintenanceTicketRecord) {
  const createdAt = new Date(ticket.created_at)
  const now = new Date()

  if (Number.isNaN(createdAt.getTime())) {
    return 0
  }

  return (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
}

function getTicketSeverity(ticket: MaintenanceTicketRecord): TicketSeverity {
  const hours = getHoursSinceCreated(ticket)

  if (hours > 24) return 'critical'
  if (hours > 6) return 'high'
  if (hours > 2) return 'warning'
  return 'normal'
}

function getSeverityClasses(severity: TicketSeverity) {
  if (severity === 'critical') {
    return 'border-red-200 bg-red-50/30'
  }

  if (severity === 'high') {
    return 'border-amber-200'
  }

  if (severity === 'warning') {
    return 'border-yellow-100'
  }

  return 'border-slate-200 bg-white/80'
}

function getAgingLabel(ticket: MaintenanceTicketRecord) {
  const hours = getHoursSinceCreated(ticket)

  if (hours >= 24) {
    return `Opened ${Math.floor(hours / 24)}d ago`
  }

  if (hours >= 1) {
    return `Opened ${Math.floor(hours)}h ago`
  }

  return 'Opened <1h ago'
}

function isTicketStuck(ticket: MaintenanceTicketRecord) {
  return ticket.status === 'open' && getHoursSinceCreated(ticket) > 6
}

function sortTickets(tickets: MaintenanceTicketRecord[]) {
  return [...tickets].sort((left, right) => {
    const severityDifference =
      severityRank[getTicketSeverity(left)] - severityRank[getTicketSeverity(right)]

    if (severityDifference !== 0) {
      return severityDifference
    }

    const priorityDifference = priorityRank[left.priority] - priorityRank[right.priority]

    if (priorityDifference !== 0) {
      return priorityDifference
    }

    return (
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    )
  })
}

function isPriorityLevel(value: string | null): value is PriorityLevel {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'critical'
}

function isMaintenanceTicketStatus(
  value: string | null,
): value is MaintenanceTicketStatus {
  return (
    value === 'open' ||
    value === 'in_progress' ||
    value === 'waiting_vendor' ||
    value === 'resolved' ||
    value === 'closed'
  )
}

interface MaintenanceKpiCardProps {
  label: string
  value: number
}

function MaintenanceKpiCard({ label, value }: MaintenanceKpiCardProps) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-shell backdrop-blur">
      <div className="space-y-2">
        <p className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
          {value}
        </p>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
      </div>
    </div>
  )
}

export function Maintenance() {
  const [searchParams] = useSearchParams()
  const [tickets, setTickets] = useState<MaintenanceTicketRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadTickets() {
      if (!isSupabaseConfigured || !supabase) {
        if (!isCancelled) {
          setErrorMessage(
            'Supabase env missing. Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to load live maintenance data.',
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
            setErrorMessage('Sign in to view live maintenance control.')
            setIsLoading(false)
          }
          return
        }

        const { data, error } = await supabase
          .from('maintenance_tickets')
          .select('id, title, description, location, status, priority, created_at, due_at')
          .neq('status', 'resolved')
          .neq('status', 'closed')

        if (error) {
          throw error
        }

        if (!isCancelled) {
          setTickets((data as MaintenanceTicketRecord[] | null) ?? [])
        }
      } catch (error) {
        console.error('Unable to load maintenance tickets', error)

        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load maintenance control right now.',
          )
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadTickets()

    return () => {
      isCancelled = true
    }
  }, [])

  const sortedTickets = sortTickets(tickets)
  const priorityFilter = isPriorityLevel(searchParams.get('priority'))
    ? searchParams.get('priority')
    : null
  const statusFilter = isMaintenanceTicketStatus(searchParams.get('status'))
    ? searchParams.get('status')
    : null
  const searchQuery = searchParams.get('q')?.trim().toLowerCase() ?? ''
  const filteredTickets = sortedTickets.filter((ticket) => {
    if (priorityFilter && ticket.priority !== priorityFilter) {
      return false
    }

    if (statusFilter && ticket.status !== statusFilter) {
      return false
    }

    if (!searchQuery) {
      return true
    }

    return [ticket.title, ticket.location, ticket.description]
      .join(' ')
      .toLowerCase()
      .includes(searchQuery)
  })
  const openTicketsCount = sortedTickets.length
  const criticalTicketsCount = sortedTickets.filter(
    (ticket) => getTicketSeverity(ticket) === 'critical',
  ).length
  const stuckTicketsCount = sortedTickets.filter((ticket) => isTicketStuck(ticket)).length

  return (
    <PageSection
      title="Maintenance"
      description="Live control view for open incidents, aging tickets, and unresolved technical issues across the property."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MaintenanceKpiCard label="Open tickets" value={openTicketsCount} />
        <MaintenanceKpiCard label="Critical tickets" value={criticalTicketsCount} />
        <MaintenanceKpiCard label="Stuck tickets" value={stuckTicketsCount} />
      </div>

      {!isLoading && !errorMessage && (stuckTicketsCount > 0 || criticalTicketsCount > 0) ? (
        <SurfaceCard
          title="Operational alerts"
          description="High-signal maintenance issues requiring immediate coordination."
        >
          <div className="space-y-2">
            {criticalTicketsCount > 0 ? (
              <p className="text-sm font-medium text-red-600">
                ⚠️ {criticalTicketsCount} critical {criticalTicketsCount > 1 ? 'tickets require' : 'ticket requires'} immediate attention
              </p>
            ) : null}

            {stuckTicketsCount > 0 ? (
              <p className="text-sm font-medium text-amber-700">
                ⚠️ {stuckTicketsCount} {stuckTicketsCount > 1 ? 'tickets show' : 'ticket shows'} no progress
              </p>
            ) : null}
          </div>
        </SurfaceCard>
      ) : null}

      <SurfaceCard
        title="Operational queue"
        description="Tickets are sorted by operational severity, declared priority, and aging so the team sees what needs action first."
      >
        {isLoading ? (
          <p className="text-sm leading-7 text-slate-600">Loading maintenance control...</p>
        ) : null}

        {!isLoading && errorMessage ? (
          <p className="text-sm leading-7 text-slate-600">{errorMessage}</p>
        ) : null}

        {!isLoading && !errorMessage && tickets.length === 0 ? (
          <p className="text-sm leading-7 text-slate-600">All systems operational</p>
        ) : null}

        {!isLoading && !errorMessage && tickets.length > 0 && filteredTickets.length === 0 ? (
          <p className="text-sm leading-7 text-slate-600">No tickets match this view</p>
        ) : null}

        {!isLoading && !errorMessage && filteredTickets.length > 0 ? (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => {
              const severity = getTicketSeverity(ticket)

              return (
                <div
                  key={ticket.id}
                  className={[
                    'rounded-3xl border p-5 transition-colors',
                    getSeverityClasses(severity),
                  ].join(' ')}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                            {ticket.title}
                          </h2>
                          <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {statusLabels[ticket.status]}
                          </span>
                          <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {priorityLabels[ticket.priority]}
                          </span>
                        </div>

                        <p className="text-sm leading-6 text-slate-600">
                          {ticket.location}
                        </p>
                      </div>

                      <div className="text-sm font-medium text-slate-500">
                        {getAgingLabel(ticket)}
                      </div>
                    </div>

                    <p className="text-sm leading-7 text-slate-600">
                      {ticket.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {isTicketStuck(ticket) ? (
                        <span className="font-medium text-amber-700">
                          ⚠️ No progress detected
                        </span>
                      ) : null}

                      {ticket.due_at ? (
                        <span className="text-slate-500">
                          Due {new Date(ticket.due_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </SurfaceCard>
    </PageSection>
  )
}
