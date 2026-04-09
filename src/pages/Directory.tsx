import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { VendorStatusBadge } from '../components/vendors/VendorStatusBadge'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { VendorStatus } from '../types/vendors'

type DirectoryTab = 'staff' | 'vendors'
type StaffEmploymentStatus = 'active' | 'on_leave' | 'inactive'
type CreateMode = 'staff' | 'vendor'

interface StaffRoleRow {
  id: string
  name: string
}

interface VendorCategoryRow {
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

interface VendorRecord {
  id: string
  name: string
  phone: string | null
  email: string | null
  status: VendorStatus
  vendor_category_id: string | null
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
  const [activeTab, setActiveTab] = useState<DirectoryTab>('staff')
  const [staff, setStaff] = useState<StaffRecord[]>([])
  const [vendors, setVendors] = useState<VendorRecord[]>([])
  const [staffRoleMap, setStaffRoleMap] = useState<Map<string, string>>(new Map())
  const [vendorCategoryMap, setVendorCategoryMap] = useState<Map<string, string>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [createMode, setCreateMode] = useState<CreateMode | null>(null)
  const [formState, setFormState] = useState<DirectoryFormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
        { data: vendorRows, error: vendorsError },
        { data: categoryRows, error: categoriesError },
      ] = await Promise.all([
        client
          .from('staff_directory')
          .select(
            'id, first_name, last_name, work_email, phone, employment_status, staff_role_id',
          )
          .order('last_name', { ascending: true }),
        client.from('staff_roles').select('id, name').order('name', { ascending: true }),
        client
          .from('vendors')
          .select('id, name, phone, email, status, vendor_category_id')
          .order('name', { ascending: true }),
        client
          .from('vendor_categories')
          .select('id, name')
          .order('name', { ascending: true }),
      ])

      if (staffError) {
        throw staffError
      }

      if (rolesError) {
        throw rolesError
      }

      if (vendorsError) {
        throw vendorsError
      }

      if (categoriesError) {
        throw categoriesError
      }

      setStaff((staffRows as StaffRecord[] | null) ?? [])
      setVendors((vendorRows as VendorRecord[] | null) ?? [])
      setStaffRoleMap(
        new Map(
          ((roleRows as StaffRoleRow[] | null) ?? []).map((role) => [role.id, role.name]),
        ),
      )
      setVendorCategoryMap(
        new Map(
          ((categoryRows as VendorCategoryRow[] | null) ?? []).map((category) => [
            category.id,
            category.name,
          ]),
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

  async function getOrCreateVendorCategoryId(categoryName: string, organizationId: string) {
    const normalizedCategoryName = categoryName.trim()

    if (!normalizedCategoryName || !supabase) {
      return null
    }

    const { data: existingCategory, error: existingCategoryError } = await supabase
      .from('vendor_categories')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('name', normalizedCategoryName)
      .maybeSingle()

    if (existingCategoryError) {
      throw existingCategoryError
    }

    if (existingCategory?.id) {
      return existingCategory.id
    }

    const { data: insertedCategory, error: insertedCategoryError } = await supabase
      .from('vendor_categories')
      .insert({
        organization_id: organizationId,
        name: normalizedCategoryName,
      })
      .select('id')
      .single()

    if (insertedCategoryError) {
      throw insertedCategoryError
    }

    return insertedCategory.id
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

      if (createMode === 'staff') {
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
      } else {
        const vendorCategoryId = await getOrCreateVendorCategoryId(
          formState.role,
          organizationId,
        )

        const { error } = await client.from('vendors').insert({
          organization_id: organizationId,
          vendor_category_id: vendorCategoryId,
          name: formState.name.trim(),
          phone: formState.phone.trim() || null,
          email: formState.email.trim() || null,
          status: 'active',
        })

        if (error) {
          throw error
        }
      }

      setCreateMode(null)
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

  const visibleStaff = staff
  const visibleVendors = vendors

  return (
    <PageSection
      title="Directory"
      description="Shared operational directory for internal staff and external vendors, with lightweight creation and contact access."
    >
      <SurfaceCard
        title="Directory"
        description="Switch between staff and vendors to manage the people and partners involved in daily operations."
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-100 p-1">
            {(['staff', 'vendors'] as DirectoryTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={[
                  'rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors',
                  activeTab === tab
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-950',
                ].join(' ')}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setCreateMode(activeTab === 'staff' ? 'staff' : 'vendor')
              setFormError(null)
              setFormState(emptyForm)
            }}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {activeTab === 'staff' ? 'New staff member' : 'New vendor'}
          </button>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <p className="text-sm leading-7 text-slate-600">Loading directory...</p>
          ) : null}

          {!isLoading && errorMessage ? (
            <p className="text-sm leading-7 text-slate-600">{errorMessage}</p>
          ) : null}

          {!isLoading && !errorMessage && activeTab === 'staff' ? (
            visibleStaff.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {visibleStaff.map((member) => (
                  <Link
                    key={member.id}
                    to={`/app/directory/staff/${member.id}`}
                    className="grid gap-3 py-4 transition-colors hover:bg-slate-50/80 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-950">
                        {buildStaffName(member)}
                      </p>
                      <p className="text-sm text-slate-600">
                        {member.staff_role_id
                          ? staffRoleMap.get(member.staff_role_id) ?? 'Role not assigned'
                          : 'Role not assigned'}
                      </p>
                    </div>

                    <div className="space-y-1 text-sm text-slate-600">
                      <p>{member.phone ?? 'No phone recorded'}</p>
                      <p>{member.work_email ?? 'No email recorded'}</p>
                    </div>

                    <span
                      className={[
                        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize',
                        getStaffStatusClasses(member.employment_status),
                      ].join(' ')}
                    >
                      {getStaffStatusLabel(member.employment_status)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-slate-600">No staff recorded</p>
            )
          ) : null}

          {!isLoading && !errorMessage && activeTab === 'vendors' ? (
            visibleVendors.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {visibleVendors.map((vendor) => (
                  <Link
                    key={vendor.id}
                    to={`/app/vendors/${vendor.id}`}
                    className="grid gap-3 py-4 transition-colors hover:bg-slate-50/80 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-950">
                        {vendor.name}
                      </p>
                      <p className="text-sm text-slate-600">
                        {vendor.vendor_category_id
                          ? vendorCategoryMap.get(vendor.vendor_category_id) ?? 'No category assigned'
                          : 'No category assigned'}
                      </p>
                    </div>

                    <div className="space-y-1 text-sm text-slate-600">
                      <p>{vendor.phone ?? 'No phone recorded'}</p>
                      <p>{vendor.email ?? 'No email recorded'}</p>
                    </div>

                    <VendorStatusBadge status={vendor.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-slate-600">No vendors recorded</p>
            )
          ) : null}
        </div>
      </SurfaceCard>

      {createMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 px-5">
          <div className="w-full max-w-lg">
            <SurfaceCard
              title={createMode === 'staff' ? 'New staff member' : 'New vendor'}
              description={
                createMode === 'staff'
                  ? 'Add a staff contact with a lightweight operational profile.'
                  : 'Add a vendor contact with the minimum directory details.'
              }
              className="w-full"
            >
              <form className="space-y-4" onSubmit={handleCreate}>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Name
                  </span>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, name: event.target.value }))
                    }
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {createMode === 'staff' ? 'Role' : 'Category'}
                  </span>
                  <input
                    type="text"
                    value={formState.role}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, role: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Phone
                  </span>
                  <input
                    type="text"
                    value={formState.phone}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, phone: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Email
                  </span>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, email: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </label>

                {formError ? (
                  <p className="text-sm text-rose-600">{formError}</p>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateMode(null)
                      setFormError(null)
                      setFormState(emptyForm)
                    }}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
