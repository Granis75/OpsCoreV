import { useEffect, useState, type FormEvent } from 'react'
import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { ActionDrawer } from '../components/ui/ActionDrawer'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { VendorStatus } from '../types/vendors'

type StaffEmploymentStatus = 'active' | 'on_leave' | 'inactive'
interface StaffRoleRow {
  id: string
  name: string
}

interface StaffRecord {
  id: string
  first_name: string
  last_name: string
  work_email: string | null
  phone: string | null
  employment_status: StaffEmploymentStatus
  staff_role_id: string | null
}

interface DirectoryFormState {
  name: string
  role: string
  phone: string
  email: string
}

function buildStaffName(staff: StaffRecord) {
  return `${staff.first_name} ${staff.last_name}`.trim()
}

function splitFullName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  const firstName = parts[0] ?? ''
  const lastName = parts.slice(1).join(' ') || firstName

  return {
    firstName,
    lastName,
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

  const { data: profileRow, error: profileError } = await supabase
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

  return { client: supabase, organizationId }
}

const emptyForm: DirectoryFormState = {
  name: '',
  role: '',
  phone: '',
  email: '',
}

export function Directory() {
  if (!supabase) return null
  const db = supabase

  const [staff, setStaff] = useState<StaffRecord[]>([])
  const [staffRoleMap, setStaffRoleMap] = useState<Map<string, string>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [createMode, setCreateMode] = useState<boolean>(false)
  const [formState, setFormState] = useState<DirectoryFormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)

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
      const { client } = await getAuthenticatedContext()

      const [
        { data: staffRows, error: staffError },
        { data: roleRows, error: rolesError },
      ] = await Promise.all([
        client
          .from('staff_directory')
          .select(
            'id, first_name, last_name, work_email, phone, employment_status, staff_role_id',
          )
          .order('last_name', { ascending: true }),
        client.from('staff_roles').select('id, name').order('name', { ascending: true }),
      ])

      if (staffError) throw staffError
      if (rolesError) throw rolesError
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

    const { data: existingRole, error: existingRoleError } = await supabase
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

    const { data: insertedRole, error: insertedRoleError } = await supabase
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
      const { client, organizationId } = await getAuthenticatedContext()

        const { firstName, lastName } = splitFullName(formState.name)
        const staffRoleId = await getOrCreateStaffRoleId(formState.role, organizationId)

        const { error } = await client.from('staff_directory').insert({
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

  return (
    <PageSection
      title="Directory"
      description="Internal staff directory with operational profiles and active task tracking."
    >
      <SurfaceCard
        title="Staff"
        description="Manage the internal team involved in daily operations."
      >
        <div className="flex justify-end">
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

        <div className="mt-6 divide-y divide-slate-100">
          {!isLoading && !errorMessage ? (
            staff.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelectedStaffId(member.id)}
                className="grid w-full gap-3 rounded-2xl px-3 py-4 text-left transition-all hover:bg-slate-50 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-950">{buildStaffName(member)}</p>
                  <p className="text-sm text-slate-600">
                    {staffRoleMap.get(member.staff_role_id ?? '') ?? 'Role not assigned'}
                  </p>
        </div>
                <div className="text-sm text-slate-500">{member.work_email}</div>
                <span className={['rounded-full border px-2.5 py-1 text-xs font-semibold', getStaffStatusClasses(member.employment_status)].join(' ')}>
                  {getStaffStatusLabel(member.employment_status)}
                </span>
              </button>
            ))
          ) : null}
        </div>
      </SurfaceCard>

      <StaffDetailDrawer
        staffId={selectedStaffId}
        onClose={() => setSelectedStaffId(null)}
      />

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

                {formError ? (
                  <p className="text-sm text-rose-600">{formError}</p>
                ) : null}

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

function StaffDetailDrawer({ staffId, onClose }: { staffId: string | null; onClose: () => void }) {
  const [details, setDetails] = useState<any>(null)
  const [activeItems, setActiveItems] = useState<any[]>([])

  useEffect(() => {
    if (staffId && supabase) {
      const db = supabase
      db
        .from('staff_directory')
        .select('*, staff_roles(name)')
        .eq('id', staffId)
        .single()
        .then(({ data }) => setDetails(data))

      db
        .from('operation_items')
        .select('*')
        .eq('created_by_profile_id', staffId)
        .eq('status', 'open')
        .then(({ data }) => setActiveItems(data ?? []))
    }
  }, [staffId])

  return (
    <ActionDrawer isOpen={!!staffId} onClose={onClose} title="Staff Profile">
      {details ? (
        <div className="space-y-6">
          <div>
            <p className="eyebrow-label">Contact</p>
            <p className="text-sm font-medium">{details.first_name} {details.last_name}</p>
            <p className="text-sm text-slate-500">{details.work_email}</p>
          </div>
          <div>
            <p className="eyebrow-label">Active Operational Items</p>
            {activeItems.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {activeItems.map((item) => (
                  <li key={item.id} className="text-sm border-l-2 border-slate-200 pl-3 py-1 text-slate-700">
                    {item.title}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-500 mt-2 italic">No active items.</p>}
          </div>
        </div>
      ) : <p className="text-sm">Loading...</p>}
    </ActionDrawer>
  )
}

