import { useEffect, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  RefreshCcw,
  ShieldCheck,
  Users2,
  type LucideIcon,
} from 'lucide-react'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type PriorityLevel = 'low' | 'medium' | 'high' | 'critical'
type OperationItemStatus = 'open' | 'in_progress' | 'blocked' | 'done'
type OperationItemType = 'ticket' | 'task' | 'intervention' | 'order'
type TeamLoadTone = 'low' | 'medium' | 'high'

interface TeamRow {
  id: string
  name: string
  code: string | null
  description: string | null
}

interface StaffRoleRow {
  id: string
  name: string
  department: string | null
  description: string | null
}

interface StaffRow {
  team_id: string | null
  staff_role_id: string | null
}

interface OperationItemRow {
  id: string
  type: OperationItemType
  title: string
  status: OperationItemStatus
  priority: PriorityLevel
  location: string | null
  notes: string | null
  created_at: string
}

interface MaintenanceTicketRow {
  team_id: string | null
  status: 'open' | 'in_progress'
}

interface TeamCard {
  id: string
  name: string
  code: string | null
  focus: string
  handoff: string
  staffCount: number
  openItemsCount: number
  inProgressItemsCount: number
  blockedItemsCount: number
  totalLoad: number
  loadTone: TeamLoadTone
}

interface RoleCard {
  id: string
  title: string
  scope: string
  responsibility: string
  assignedCount: number
}

interface CoordinationCard {
  id: string
  title: string
  type: OperationItemType
  status: OperationItemStatus
  priority: PriorityLevel
  note: string
  createdAt: string
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

const priorityLabels: Record<PriorityLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

const loadLabels: Record<TeamLoadTone, string> = {
  low: 'Low load',
  medium: 'Medium load',
  high: 'High load',
}

const loadClasses: Record<TeamLoadTone, string> = {
  low: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  medium: 'bg-amber-50 text-amber-600 ring-amber-100',
  high: 'bg-red-50 text-red-600 ring-red-100',
}

const statusClasses: Record<OperationItemStatus, string> = {
  open: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-amber-50 text-amber-700',
  blocked: 'bg-red-50 text-red-700',
  done: 'bg-emerald-50 text-emerald-700',
}

const priorityClasses: Record<PriorityLevel, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-slate-100 text-slate-600',
  high: 'bg-amber-50 text-amber-600',
  critical: 'bg-red-50 text-red-600',
}

const teamKeywords: Record<string, string[]> = {
  'front office': [
    'front office',
    'front desk',
    'reception',
    'guest',
    'arrival',
    'departure',
    'lobby',
  ],
  housekeeping: ['housekeeping', 'linen', 'laundry', 'floor', 'cleaning'],
  engineering: [
    'engineering',
    'maintenance',
    'technician',
    'hvac',
    'clim',
    'plumbing',
    'water',
    'elevator',
    'lift',
    'ventilation',
    'electrical',
    'badge',
    'access',
  ],
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <SurfaceCard
      title={title}
      description={description}
      className="border-slate-200 bg-white shadow-sm"
    >
      {children}
    </SurfaceCard>
  )
}

function SectionKicker({
  icon: Icon,
  label,
}: {
  icon: LucideIcon
  label: string
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </div>
  )
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function getLoadTone(
  totalLoad: number,
  blockedItemsCount: number,
): TeamLoadTone {
  if (blockedItemsCount > 0 || totalLoad >= 6) {
    return 'high'
  }

  if (totalLoad >= 3) {
    return 'medium'
  }

  return 'low'
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

function getTeamHandoff({
  blockedItemsCount,
  inProgressItemsCount,
  openItemsCount,
}: {
  blockedItemsCount: number
  inProgressItemsCount: number
  openItemsCount: number
}) {
  if (blockedItemsCount > 0) {
    return `${pluralize(blockedItemsCount, 'blocked item')} waiting on an external dependency or decision.`
  }

  if (inProgressItemsCount > 0) {
    return `${pluralize(inProgressItemsCount, 'item')} moving through live coordination.`
  }

  if (openItemsCount > 0) {
    return `${pluralize(openItemsCount, 'open item')} waiting for allocation or confirmation.`
  }

  return 'No active operations — system stable.'
}

function getOperationTeamId(item: OperationItemRow, teams: TeamRow[]) {
  const source = normalizeText(
    [item.title, item.location ?? '', item.notes ?? ''].join(' '),
  )

  const matchedTeam = teams.find((team) => {
    const name = normalizeText(team.name)
    const keywords = [
      name,
      ...(team.code ? [normalizeText(team.code)] : []),
      ...(teamKeywords[name] ?? []),
    ]

    return keywords.some((keyword) => keyword && source.includes(keyword))
  })

  return matchedTeam?.id ?? null
}

export function TeamsPage() {
  const [teams, setTeams] = useState<TeamCard[]>([])
  const [roles, setRoles] = useState<RoleCard[]>([])
  const [coordinationItems, setCoordinationItems] = useState<CoordinationCard[]>(
    [],
  )
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured || !supabase) {
        setErrorMessage(
          'Supabase env missing. Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to load live team data.',
        )
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setErrorMessage(null)

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) throw sessionError
        if (!session) throw new Error('Sign in to view team coordination.')

        const [
          { data: teamRows, error: teamsError },
          { data: roleRows, error: rolesError },
          { data: staffRows, error: staffError },
          { data: operationRows, error: operationsError },
          { data: maintenanceRows, error: maintenanceError },
        ] = await Promise.all([
          supabase
            .from('teams')
            .select('id, name, code, description')
            .order('name', { ascending: true }),
          supabase
            .from('staff_roles')
            .select('id, name, department, description')
            .order('name', { ascending: true }),
          supabase
            .from('staff_directory')
            .select('team_id, staff_role_id')
            .in('employment_status', ['active', 'on_leave']),
          supabase
            .from('operation_items')
            .select('id, type, title, status, priority, location, notes, created_at')
            .in('status', ['open', 'in_progress', 'blocked'])
            .order('created_at', { ascending: false }),
          supabase
            .from('maintenance_tickets')
            .select('team_id, status')
            .in('status', ['open', 'in_progress']),
        ])

        if (teamsError) throw teamsError
        if (rolesError) throw rolesError
        if (staffError) throw staffError
        if (operationsError) throw operationsError
        if (maintenanceError) throw maintenanceError

        const nextTeams = (teamRows as TeamRow[] | null) ?? []
        const nextRoles = (roleRows as StaffRoleRow[] | null) ?? []
        const nextStaff = (staffRows as StaffRow[] | null) ?? []
        const nextOperations = (operationRows as OperationItemRow[] | null) ?? []
        const nextMaintenance =
          (maintenanceRows as MaintenanceTicketRow[] | null) ?? []

        const teamMetrics = new Map(
          nextTeams.map((team) => [
            team.id,
            {
              staffCount: 0,
              openItemsCount: 0,
              inProgressItemsCount: 0,
              blockedItemsCount: 0,
            },
          ]),
        )
        const roleCounts = new Map<string, number>()

        for (const staffMember of nextStaff) {
          if (staffMember.team_id && teamMetrics.has(staffMember.team_id)) {
            teamMetrics.get(staffMember.team_id)!.staffCount += 1
          }

          if (staffMember.staff_role_id) {
            roleCounts.set(
              staffMember.staff_role_id,
              (roleCounts.get(staffMember.staff_role_id) ?? 0) + 1,
            )
          }
        }

        for (const ticket of nextMaintenance) {
          if (!ticket.team_id || !teamMetrics.has(ticket.team_id)) {
            continue
          }

          if (ticket.status === 'open') {
            teamMetrics.get(ticket.team_id)!.openItemsCount += 1
          } else {
            teamMetrics.get(ticket.team_id)!.inProgressItemsCount += 1
          }
        }

        for (const item of nextOperations) {
          const teamId = getOperationTeamId(item, nextTeams)

          if (!teamId || !teamMetrics.has(teamId)) {
            continue
          }

          if (item.status === 'open') {
            teamMetrics.get(teamId)!.openItemsCount += 1
          } else if (item.status === 'in_progress') {
            teamMetrics.get(teamId)!.inProgressItemsCount += 1
          } else if (item.status === 'blocked') {
            teamMetrics.get(teamId)!.blockedItemsCount += 1
          }
        }

        setTeams(
          nextTeams.map((team) => {
            const metrics = teamMetrics.get(team.id) ?? {
              staffCount: 0,
              openItemsCount: 0,
              inProgressItemsCount: 0,
              blockedItemsCount: 0,
            }
            const totalLoad =
              metrics.openItemsCount +
              metrics.inProgressItemsCount +
              metrics.blockedItemsCount

            return {
              id: team.id,
              name: team.name,
              code: team.code,
              focus:
                team.description ??
                'Operational ownership is defined here and ready for live execution.',
              handoff: getTeamHandoff(metrics),
              staffCount: metrics.staffCount,
              openItemsCount: metrics.openItemsCount,
              inProgressItemsCount: metrics.inProgressItemsCount,
              blockedItemsCount: metrics.blockedItemsCount,
              totalLoad,
              loadTone: getLoadTone(totalLoad, metrics.blockedItemsCount),
            }
          }),
        )

        setRoles(
          nextRoles.map((role) => ({
            id: role.id,
            title: role.name,
            scope: role.department ?? 'Operations',
            responsibility:
              role.description ??
              'Role ownership is available and ready to support live execution.',
            assignedCount: roleCounts.get(role.id) ?? 0,
          })),
        )

        setCoordinationItems(
          nextOperations.slice(0, 6).map((item) => ({
            id: item.id,
            title: item.title,
            type: item.type,
            status: item.status,
            priority: item.priority,
            note:
              item.notes ??
              item.location ??
              'Coordination is active and waiting for the next operational update.',
            createdAt: item.created_at,
          })),
        )
      } catch (error) {
        console.error('Unable to load teams module', error)
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load team coordination right now.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
            Organization
          </p>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">
              Teams
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-500">
              A shared operating view of team structure, role ownership and the
              coordination paths that keep daily execution readable under
              pressure.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <SectionKicker
            icon={Users2}
            label={isLoading ? 'Loading teams' : `${teams.length} core teams`}
          />
          <SectionKicker
            icon={ShieldCheck}
            label={isLoading ? 'Loading roles' : `${roles.length} active roles`}
          />
          <SectionKicker
            icon={RefreshCcw}
            label={
              isLoading
                ? 'Syncing coordination'
                : `${coordinationItems.length} live coordination items`
            }
          />
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.95fr]">
        <SectionCard
          title="Teams"
          description="Core operating units, their live load and the handoffs shaping day-to-day execution."
        >
          {errorMessage ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 text-slate-400" />
                <p className="text-sm leading-6 text-slate-600">{errorMessage}</p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-sm leading-6 text-slate-500">
                Loading live team structure and workload.
              </p>
            </div>
          ) : teams.length > 0 ? (
            <div className="space-y-4">
              {teams.map((team) => (
                <article
                  key={team.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                        {team.name}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {[
                          team.code,
                          pluralize(team.staffCount, 'staff', 'staff'),
                          pluralize(team.totalLoad, 'active item'),
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {team.blockedItemsCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-red-100">
                          <span>●</span>
                          <span>{pluralize(team.blockedItemsCount, 'blocked item')}</span>
                        </span>
                      ) : null}
                      <span
                        className={[
                          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1',
                          loadClasses[team.loadTone],
                        ].join(' ')}
                      >
                        <span>●</span>
                        <span>{loadLabels[team.loadTone]}</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        Open items
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {team.openItemsCount}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        In progress
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {team.inProgressItemsCount}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        Blocked
                      </p>
                      <p
                        className={[
                          'mt-1 text-sm font-semibold',
                          team.blockedItemsCount > 0
                            ? 'text-red-600'
                            : 'text-slate-900',
                        ].join(' ')}
                      >
                        {team.blockedItemsCount}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        Focus
                      </p>
                      <p className="text-sm leading-6 text-slate-700">
                        {team.focus}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        Handoff rule
                      </p>
                      <p className="text-sm leading-6 text-slate-700">
                        {team.handoff}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-sm leading-6 text-slate-500">
                Team structure is ready and will appear here as soon as the first
                team is active in the workspace.
              </p>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Roles"
          description="Operational ownership kept intentionally narrow so teams can execute clearly without turning this workspace into HR software."
        >
          {errorMessage ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-sm leading-6 text-slate-500">
                Live role ownership is temporarily unavailable.
              </p>
            </div>
          ) : isLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-sm leading-6 text-slate-500">
                Loading role ownership and staffing coverage.
              </p>
            </div>
          ) : roles.length > 0 ? (
            <div className="space-y-3">
              {roles.map((role) => (
                <article
                  key={role.id}
                  className="rounded-3xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold tracking-tight text-slate-950">
                        {role.title}
                      </h3>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        {role.scope}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {pluralize(role.assignedCount, 'assigned', 'assigned')}
                      </span>
                      <ArrowRight className="mt-0.5 h-4 w-4 text-slate-300" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {role.responsibility}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-sm leading-6 text-slate-500">
                Role ownership will appear here once the first operational roles
                are active.
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Coordination"
        description="Recent coordination work pulled from live operation items so teams can align around what is moving now."
      >
        {errorMessage ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
            <p className="text-sm leading-6 text-slate-500">
              Recent coordination signals are unavailable right now.
            </p>
          </div>
        ) : isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
            <p className="text-sm leading-6 text-slate-500">
              Loading recent coordination activity.
            </p>
          </div>
        ) : coordinationItems.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {coordinationItems.map((item) => (
              <article
                key={item.id}
                className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        {typeLabels[item.type]}
                      </p>
                      <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                        {item.title}
                      </h3>
                    </div>
                    <Building2 className="h-4 w-4 text-slate-300" />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={[
                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                        statusClasses[item.status],
                      ].join(' ')}
                    >
                      {statusLabels[item.status]}
                    </span>
                    <span
                      className={[
                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                        priorityClasses[item.priority],
                      ].join(' ')}
                    >
                      {priorityLabels[item.priority]}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      Note
                    </p>
                    <p className="text-sm leading-6 text-slate-700">
                      {item.note}
                    </p>
                  </div>

                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    {formatCreatedAt(item.createdAt)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
            <p className="text-sm leading-6 text-slate-500">
              No active operations — system stable.
            </p>
          </div>
        )}
      </SectionCard>
    </section>
  )
}
