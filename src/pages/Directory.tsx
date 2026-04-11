import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ActionDrawer } from '../components/ui/ActionDrawer'
import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type StaffEmploymentStatus = 'active' | 'on_leave' | 'inactive'
type OperationItemType = 'ticket' | 'task' | 'intervention' | 'order'
type OperationItemStatus = 'open' | 'in_progress' | 'blocked' | 'done'
type OperationItemPriority = 'low' | 'medium' | 'high' | 'critical'

interface StaffRoleRow {
  id: string
  name: string
}

interface StaffRoleRelation {
  name: string
}

interface TeamRelation {
  name: string
}

interface StaffRecord {
  id: string
  first_name: string
  last_name: string
  work_email: string | null
  phone: string | null
  employment_status: StaffEmploymentStatus
  team_id: string | null
  staff_role_id: string | null
}

interface StaffDetailRecord extends StaffRecord {
  staff_roles: StaffRoleRelation | StaffRoleRelation[] | null
  teams: TeamRelation | TeamRelation[] | null
}

interface StaffOperationItem {
  id: string
  type: OperationItemType
  title: string
  status: OperationItemStatus
  priority: OperationItemPriority
  created_at: string
  location: string | null
  notes: string | null
}

interface DirectoryFormState {
  name: string
  role: string
  phone: string
  email: string
}

const emptyForm: DirectoryFormState = {
  name: '',
  role: '',
  phone: '',
  email: '',
}

function buildStaffName(staff: Pick<StaffRecord, 'first_name' | 'last_name'>) {
  return `${staff.first_name} ${staff.last_name}`.trim()
}

function splitFullName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  const firstName = parts[0] ?? ''
  const lastName = parts.slice(1).join(' ')

  return {
    firstName,
    lastName: lastName || '',
  }
}

function getStaffStatusClasses(status: StaffEmploymentStatus) {
  if (status === 'active') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (status === 'on_leave') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function getStaffStatusLabel(status: StaffEmploymentStatus) {
  return status.replace(/_/g, ' ')
}

function getOperationStatusClasses(status: StaffOperationItem['status']) {
  if (status === 'blocked') {
    return 'bg-red-50 text-red-700'
  }

  if (status === 'in_progress') {
    return 'bg-amber-50 text-amber-700'
  }

  if (status === 'done') {
    return 'bg-emerald-50 text-emerald-700'
  }

  return 'bg-slate-100 text-slate-700'
}

function getOperationPriorityClasses(priority: StaffOperationItem['priority']) {
  if (priority === 'critical') {
    return 'bg-red-50 text-red-600'
  }

  if (priority === 'high') {
    return 'bg-amber-50 text-amber-600'
  }

  return 'bg-slate-100 text-slate-600'
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

function getRoleName(role: StaffRoleRelation | StaffRoleRelation[] | null) {
  if (Array.isArray(role)) {
    return role[0]?.name ?? null
  }

  return role?.name ?? null
}

function getTeamName(team: TeamRelation | TeamRelation[] | null) {
  if (Array.isArray(team)) {
    return team[0]?.name ?? null
  }

  return team?.name ?? null
}

function buildOperationsHref(item: StaffOperationItem) {
  const searchParams = new URLSearchParams()
  searchParams.set('q', item.title)
  searchParams.set('type', item.type)

  return `/app/operations?${searchParams.toString()}`
}

async function getAuthenticatedContext() {
  if (!supabase) {
    throw new Error(
      'Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the root .env.local file.',
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
    throw new Error('Sign in to access the directory.')
  }

  const { data: profileRow, error: profileError } = await supabase!
    .from('profiles')
    .select('organization_id')
    .eq('id', session.user.id)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  const organizationId = profileRow?.organization_id

  if (!organizationId) {
    throw new Error('No organization is linked to this user profile.')
  }

  return { organizationId }
}

export function Directory() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [staff, setStaff] = useState<StaffRecord[]>([])
  const [staffRoleMap, setStaffRoleMap] = useState<Map<string, string>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [createMode, setCreateMode] = useState(false)
  const [formState, setFormState] = useState<DirectoryFormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedStaffId = searchParams.get('staff')
  const roleFilterId = searchParams.get('role')
  const visibleStaff = roleFilterId
    ? staff.filter((member) => member.staff_role_id === roleFilterId)
    : staff
  const activeRoleFilter = roleFilterId ? staffRoleMap.get(roleFilterId) ?? null : null

  async function loadDirectory() {
    if (!isSupabaseConfigured) {
      setErrorMessage(
        'Supabase env missing. Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to load live directory data.',
      )
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      await getAuthenticatedContext()

      const [
        { data: staffRows, error: staffError },
        { data: roleRows, error: rolesError },
      ] = await Promise.all([
        supabase!
          .from('staff_directory')
          .select(
            'id, first_name, last_name, work_email, phone, employment_status, team_id, staff_role_id',
          )
          .order('last_name', { ascending: true }),
        supabase!.from('staff_roles').select('id, name').order('name', { ascending: true }),
      ])

      if (staffError) {
        throw staffError
      }

      if (rolesError) {
        throw rolesError
      }

      setStaff((staffRows as StaffRecord[] | null) ?? [])
      setStaffRoleMap(
        new Map(
          ((roleRows as StaffRoleRow[] | null) ?? []).map((role) => [role.id, role.name]),
        ),
      )
    } catch (error) {
      console.error('Unable to load directory', error)
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load the directory.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadDirectory()
  }, [])

  async function getOrCreateStaffRoleId(roleName: string, organizationId: string) {
    const normalizedRoleName = roleName.trim()

    if (!normalizedRoleName || !supabase) {
      return null
    }

    const { data: existingRole, error: existingRoleError } = await supabase!
      .from('staff_roles')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('name', normalizedRoleName)
      .maybeSingle()

    if (existingRoleError) {
      throw existingRoleError
    }

    if (existingRole?.id) {
      return existingRole.id
    }

    const { data: insertedRole, error: insertedRoleError } = await supabase!
      .from('staff_roles')
      .insert({
        organization_id: organizationId,
        name: normalizedRoleName,
      })
      .select('id')
      .single()

    if (insertedRoleError) {
      throw insertedRoleError
    }

    return insertedRole.id
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!createMode) {
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    try {
      const { organizationId } = await getAuthenticatedContext()
      const { firstName, lastName } = splitFullName(formState.name)

      if (!firstName) {
        throw new Error('Enter a name to create a staff profile.')
      }

      const staffRoleId = await getOrCreateStaffRoleId(formState.role, organizationId)
      const { error } = await supabase!.from('staff_directory').insert({
        organization_id: organizationId,
        first_name: firstName,
        last_name: lastName,
        staff_role_id: staffRoleId,
        work_email: formState.email.trim() || null,
        phone: formState.phone.trim() || null,
        employment_status: 'active',
      })

      if (error) {
        throw error
      }

      setCreateMode(false)
      setFormState(emptyForm)
      await loadDirectory()
    } catch (error) {
      console.error('Unable to create directory record', error)
      setFormError(
        error instanceof Error ? error.message : 'Unable to save this directory record.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function openStaffDetail(staffId: string) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('staff', staffId)
    setSearchParams(nextParams)
  }

  function clearRoleFilter() {
    if (!roleFilterId) {
      return
    }

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('role')
    setSearchParams(nextParams)
  }

  function closeStaffDetail() {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('staff')
    setSearchParams(nextParams)
  }

  return (
    <PageSection
      title="Directory"
      description="Internal staff directory with operational profiles and active task tracking."
    >
      <SurfaceCard
        title="Staff"
        description="Manage the internal team involved in daily operations."
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {isLoading
              ? 'Loading staff...'
              : `${visibleStaff.length} staff profile${visibleStaff.length === 1 ? '' : 's'}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {activeRoleFilter ? (
              <button
                type="button"
                onClick={clearRoleFilter}
                className="button-secondary"
              >
                Clear role: {activeRoleFilter}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setCreateMode(true)
                setFormError(null)
                setFormState(emptyForm)
              }}
              className="button-primary"
            >
              New staff member
            </button>
          </div>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <p className="text-sm leading-7 text-slate-600">Loading directory...</p>
          ) : null}

          {!isLoading && errorMessage ? (
            <p className="text-sm leading-7 text-slate-600">{errorMessage}</p>
          ) : null}

          {!isLoading && !errorMessage && visibleStaff.length === 0 ? (
            <p className="text-sm leading-7 text-slate-600">
              {activeRoleFilter
                ? 'No staff profiles match this role yet.'
                : 'No staff profiles are available yet.'}
            </p>
          ) : null}

          {!isLoading && !errorMessage && visibleStaff.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {visibleStaff.map((member) => {
                const roleName =
                  staffRoleMap.get(member.staff_role_id ?? '') ?? 'Role not assigned'

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => openStaffDetail(member.id)}
                    className="grid w-full gap-3 rounded-lg px-3 py-4 text-left transition-all hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-950">
                        {buildStaffName(member)}
                      </p>
                      <p className="text-sm text-slate-600">{roleName}</p>
                    </div>
                    <div className="text-sm text-slate-500">
                      {member.work_email ?? 'No email provided'}
                    </div>
                    <div className="text-sm text-slate-500">
                      {member.phone ?? 'No phone provided'}
                    </div>
                    <span
                      className={[
                        'justify-self-start rounded-full border px-2.5 py-1 text-xs font-semibold capitalize md:justify-self-end',
                        getStaffStatusClasses(member.employment_status),
                      ].join(' ')}
                    >
                      {getStaffStatusLabel(member.employment_status)}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      </SurfaceCard>

      <StaffDetailDrawer staffId={selectedStaffId} onClose={closeStaffDetail} />

      {createMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 px-5">
          <div className="w-full max-w-lg">
            <SurfaceCard
              title="New staff member"
              description="Add a staff contact with a lightweight operational profile."
              className="w-full"
            >
              <form className="space-y-4" onSubmit={handleCreate}>
                <label className="block space-y-2">
                  <span className="eyebrow-label">Name</span>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, name: event.target.value }))
                    }
                    required
                    className="field-input"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="eyebrow-label">Role</span>
                  <input
                    type="text"
                    value={formState.role}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, role: event.target.value }))
                    }
                    className="field-input"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="eyebrow-label">Phone</span>
                  <input
                    type="text"
                    value={formState.phone}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, phone: event.target.value }))
                    }
                    className="field-input"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="eyebrow-label">Email</span>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, email: event.target.value }))
                    }
                    className="field-input"
                  />
                </label>

                {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateMode(false)
                      setFormError(null)
                      setFormState(emptyForm)
                    }}
                    className="button-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="button-primary"
                  >
                    {isSubmitting ? 'Saving...' : 'Create'}
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

function StaffDetailDrawer({
  staffId,
  onClose,
}: {
  staffId: string | null
  onClose: () => void
}) {
  const [details, setDetails] = useState<StaffDetailRecord | null>(null)
  const [activeItems, setActiveItems] = useState<StaffOperationItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadStaffDetail(selectedStaffId: string) {
      if (!supabase) {
        if (!isCancelled) {
          setErrorMessage('Live staff details are unavailable right now.')
          setIsLoading(false)
        }
        return
      }

      setIsLoading(true)
      setErrorMessage(null)

      try {
        const [
          { data: staffRecord, error: staffError },
          { data: operationRows, error: operationsError },
        ] = await Promise.all([
          supabase!
            .from('staff_directory')
            .select(
              'id, first_name, last_name, work_email, phone, employment_status, team_id, staff_role_id, staff_roles(name), teams(name)',
            )
            .eq('id', selectedStaffId)
            .maybeSingle(),
          supabase!
            .from('operation_items')
            .select('id, type, title, status, priority, created_at, location, notes')
            .eq('created_by_profile_id', selectedStaffId)
            .in('status', ['open', 'in_progress', 'blocked'])
            .order('created_at', { ascending: false }),
        ])

        if (staffError) {
          throw staffError
        }

        if (operationsError) {
          throw operationsError
        }

        if (!isCancelled) {
          setDetails((staffRecord as StaffDetailRecord | null) ?? null)
          setActiveItems((operationRows as StaffOperationItem[] | null) ?? [])
        }
      } catch (error) {
        console.error('Unable to load staff detail', error)

        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load this staff profile.',
          )
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    if (!staffId) {
      setDetails(null)
      setActiveItems([])
      setErrorMessage(null)
      setIsLoading(false)
      return
    }

    void loadStaffDetail(staffId)

    return () => {
      isCancelled = true
    }
  }, [staffId])

  const title = details ? buildStaffName(details) : 'Staff profile'
  const roleName = getRoleName(details?.staff_roles ?? null)
  const teamName = getTeamName(details?.teams ?? null)

  return (
    <ActionDrawer isOpen={Boolean(staffId)} onClose={onClose} title={title}>
      {isLoading ? <p className="text-sm text-slate-600">Loading staff profile...</p> : null}

      {!isLoading && errorMessage ? (
        <p className="text-sm text-slate-600">{errorMessage}</p>
      ) : null}

      {!isLoading && !errorMessage && !details ? (
        <p className="text-sm text-slate-600">This staff profile is unavailable.</p>
      ) : null}

      {!isLoading && !errorMessage && details ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="eyebrow-label">Role</p>
              <p className="text-sm font-medium text-slate-900">
                {roleName ?? 'Role not assigned'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="eyebrow-label">Availability</p>
              <span
                className={[
                  'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize',
                  getStaffStatusClasses(details.employment_status),
                ].join(' ')}
              >
                {getStaffStatusLabel(details.employment_status)}
              </span>
            </div>
            <div className="space-y-1">
              <p className="eyebrow-label">Team</p>
              <p className="text-sm font-medium text-slate-900">
                {teamName ?? 'No team assigned'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="eyebrow-label">Email</p>
              {details.work_email ? (
                <a
                  href={`mailto:${details.work_email}`}
                  className="text-sm font-medium text-slate-900 hover:text-slate-700"
                >
                  {details.work_email}
                </a>
              ) : (
                <p className="text-sm text-slate-500">No email provided</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="eyebrow-label">Phone</p>
              {details.phone ? (
                <a
                  href={`tel:${details.phone}`}
                  className="text-sm font-medium text-slate-900 hover:text-slate-700"
                >
                  {details.phone}
                </a>
              ) : (
                <p className="text-sm text-slate-500">No phone provided</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow-label">Active operational items</p>
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                {activeItems.length}
              </span>
            </div>

            {activeItems.length > 0 ? (
              <div className="space-y-2">
                {activeItems.map((item) => (
                  <Link
                    key={item.id}
                    to={buildOperationsHref(item)}
                    onClick={onClose}
                    className="block rounded-lg border border-slate-200 px-3 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">
                        {item.type}
                      </span>
                      <span
                        className={[
                          'rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.18em]',
                          getOperationStatusClasses(item.status),
                        ].join(' ')}
                      >
                        {item.status.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={[
                          'rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.18em]',
                          getOperationPriorityClasses(item.priority),
                        ].join(' ')}
                      >
                        {item.priority}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {[item.location, formatCreatedAt(item.created_at)].filter(Boolean).join(' - ')}
                    </p>
                    {item.notes ? (
                      <p className="mt-2 text-sm text-slate-600">{item.notes}</p>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-slate-500">No active items.</p>
            )}
          </div>
        </div>
      ) : null}
    </ActionDrawer>
  )
}
