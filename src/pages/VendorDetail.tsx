import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { VendorDetailCard } from '../components/vendors/VendorDetailCard'
import { VendorInteractionItem } from '../components/vendors/VendorInteractionItem'
import { ActionDrawer } from '../components/ui/ActionDrawer'
import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import {
  createVendorInteraction,
  deleteVendorById,
  getVendorById,
  getVendorCategories,
  getVendorInteractions,
  updateVendorById,
} from '../lib/vendors'
import {
  vendorStatuses,
  vendorStatusLabels,
  type VendorCategory,
  type VendorDetailRecord,
  type VendorInteractionRecord,
  type VendorInteractionType,
  type VendorStatus,
} from '../types/vendors'

type InteractionKind = 'note' | 'meeting' | 'call'

interface VendorEditState {
  name: string
  status: VendorStatus
  contactName: string
  phone: string
  email: string
  notes: string
  isPreferred: boolean
  vendorCategoryId: string
}

interface InteractionFormState {
  kind: InteractionKind
  summary: string
  details: string
}

const interactionKindLabels: Record<InteractionKind, string> = {
  note: 'Note',
  meeting: 'Meeting',
  call: 'Call',
}

const interactionKindToType: Record<InteractionKind, VendorInteractionType> = {
  note: 'email',
  meeting: 'meeting',
  call: 'call',
}

function createVendorEditState(vendor: VendorDetailRecord | null): VendorEditState {
  return {
    name: vendor?.name ?? '',
    status: vendor?.status ?? 'prospect',
    contactName: vendor?.contactName ?? '',
    phone: vendor?.phone ?? '',
    email: vendor?.email ?? '',
    notes: vendor?.notes ?? '',
    isPreferred: vendor?.isPreferred ?? false,
    vendorCategoryId: vendor?.category?.id ?? '',
  }
}

function formatInteractionDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'No recent interaction'
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function VendorDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [vendor, setVendor] = useState<VendorDetailRecord | null>(null)
  const [interactions, setInteractions] = useState<VendorInteractionRecord[]>([])
  const [categories, setCategories] = useState<VendorCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details')
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
  const [isInteractionDrawerOpen, setIsInteractionDrawerOpen] = useState(false)
  const [isSavingVendor, setIsSavingVendor] = useState(false)
  const [isDeletingVendor, setIsDeletingVendor] = useState(false)
  const [isSavingInteraction, setIsSavingInteraction] = useState(false)
  const [editState, setEditState] = useState<VendorEditState>(createVendorEditState(null))
  const [interactionState, setInteractionState] = useState<InteractionFormState>({
    kind: 'note',
    summary: '',
    details: '',
  })

  const latestInteraction = interactions[0] ?? null

  useEffect(() => {
    let isCancelled = false

    async function loadVendorDetail(vendorId: string) {
      setIsLoading(true)
      setErrorMessage(null)
      setActionErrorMessage(null)

      try {
        const [vendorRecord, interactionRecords, categoryRecords] = await Promise.all([
          getVendorById(vendorId),
          getVendorInteractions(vendorId),
          getVendorCategories(),
        ])

        if (!isCancelled) {
          setVendor(vendorRecord)
          setInteractions(interactionRecords)
          setCategories(categoryRecords)
          setEditState(createVendorEditState(vendorRecord))
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load vendor details.',
          )
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    if (!id) {
      setVendor(null)
      setInteractions([])
      setErrorMessage('Vendor identifier is missing.')
      setIsLoading(false)
      return
    }

    void loadVendorDetail(id)

    return () => {
      isCancelled = true
    }
  }, [id])

  useEffect(() => {
    setEditState(createVendorEditState(vendor))
  }, [vendor])

  function openEditDrawer() {
    setEditState(createVendorEditState(vendor))
    setActionErrorMessage(null)
    setIsEditDrawerOpen(true)
  }

  function openInteractionDrawer(kind: InteractionKind) {
    setInteractionState({
      kind,
      summary: '',
      details: '',
    })
    setActionErrorMessage(null)
    setIsInteractionDrawerOpen(true)
  }

  async function handleSaveVendor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!id || !vendor) {
      return
    }

    const nextName = editState.name.trim()

    if (!nextName) {
      setActionErrorMessage('Vendor name is required.')
      return
    }

    setIsSavingVendor(true)
    setActionErrorMessage(null)

    try {
      const updatedVendor = await updateVendorById(id, {
        name: nextName,
        status: editState.status,
        contactName: editState.contactName,
        phone: editState.phone,
        email: editState.email,
        notes: editState.notes,
        isPreferred: editState.isPreferred,
        vendorCategoryId: editState.vendorCategoryId,
      })

      if (!updatedVendor) {
        throw new Error('Vendor is unavailable.')
      }

      setVendor(updatedVendor)
      setIsEditDrawerOpen(false)
    } catch (error) {
      setActionErrorMessage(
        error instanceof Error ? error.message : 'Unable to save vendor changes.',
      )
    } finally {
      setIsSavingVendor(false)
    }
  }

  async function handleDeleteVendor() {
    if (!id || !vendor) {
      return
    }

    const shouldDelete = window.confirm(
      `Delete ${vendor.name}? This cannot be undone.`,
    )

    if (!shouldDelete) {
      return
    }

    setIsDeletingVendor(true)
    setActionErrorMessage(null)

    try {
      await deleteVendorById(id)
      navigate('/app/vendors', { replace: true })
    } catch (error) {
      setActionErrorMessage(
        error instanceof Error ? error.message : 'Unable to delete this vendor.',
      )
    } finally {
      setIsDeletingVendor(false)
    }
  }

  async function handleCreateInteraction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!id) {
      return
    }

    const summary = interactionState.summary.trim()
    const details = interactionState.details.trim()

    if (!summary) {
      setActionErrorMessage('Interaction summary is required.')
      return
    }

    setIsSavingInteraction(true)
    setActionErrorMessage(null)

    try {
      const createdInteraction = await createVendorInteraction(id, {
        interactionType: interactionKindToType[interactionState.kind],
        summary,
        details,
      })

      setInteractions((currentInteractions) => [createdInteraction, ...currentInteractions])
      setActiveTab('history')
      setIsInteractionDrawerOpen(false)
    } catch (error) {
      setActionErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save this interaction right now.',
      )
    } finally {
      setIsSavingInteraction(false)
    }
  }

  return (
    <PageSection
      title={vendor?.name ?? 'Vendor detail'}
      description="Manage contact information, interactions, and linked operations."
    >
      <div className="flex items-center justify-between">
        <Link
          to="/app/vendors"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to vendors</span>
        </Link>
        {vendor ? (
          <div className="flex flex-wrap items-center gap-2">
            {vendor.phone ? (
              <a href={`tel:${vendor.phone}`} className="button-secondary">
                Call vendor
              </a>
            ) : null}
            {vendor.email ? (
              <a href={`mailto:${vendor.email}`} className="button-primary">
                Email vendor
              </a>
            ) : null}
            <button
              type="button"
              onClick={openEditDrawer}
              className="button-secondary"
            >
              Edit vendor
            </button>
            <button
              type="button"
              onClick={() => openInteractionDrawer('note')}
              className="button-secondary"
            >
              Add note
            </button>
            <button
              type="button"
              onClick={() => openInteractionDrawer('meeting')}
              className="button-secondary"
            >
              Log meeting
            </button>
            <button
              type="button"
              onClick={() => openInteractionDrawer('call')}
              className="button-secondary"
            >
              Log call
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteVendor()}
              disabled={isDeletingVendor}
              className="button-secondary text-rose-700 hover:text-rose-800"
            >
              {isDeletingVendor ? 'Deleting...' : 'Delete vendor'}
            </button>
          </div>
        ) : null}
      </div>

      {actionErrorMessage ? (
        <p className="mt-3 text-sm text-rose-600">{actionErrorMessage}</p>
      ) : null}

      <div className="mt-6 flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'details' ? 'border-b-2 border-slate-950 text-slate-950' : 'text-slate-500'}`}
        >
          Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'history' ? 'border-b-2 border-slate-950 text-slate-950' : 'text-slate-500'}`}
        >
          Interaction History
        </button>
      </div>

      {isLoading ? (
        <div className="mt-6 text-sm text-slate-500">Loading vendor data...</div>
      ) : errorMessage ? (
        <SurfaceCard title="Unable to load vendor" description={errorMessage} />
      ) : !vendor ? (
        <SurfaceCard
          title="Vendor not found"
          description="This vendor is unavailable or you do not have access to it."
        />
      ) : (
        <div className="mt-6">
          {activeTab === 'details' ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <VendorDetailCard vendor={vendor} />
              <SurfaceCard
                title="Interaction summary"
                description="Latest touchpoints already recorded for this vendor."
              >
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-slate-100 pb-3">
                    <span className="text-sm text-slate-500">Recorded interactions</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {interactions.length}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-3">
                    <span className="text-sm text-slate-500">Latest touchpoint</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {latestInteraction
                        ? formatInteractionDate(latestInteraction.interactionAt)
                        : 'No interactions'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-slate-500">Latest summary</span>
                    <p className="text-sm leading-6 text-slate-700">
                      {latestInteraction?.summary ?? 'No interaction history recorded yet.'}
                    </p>
                  </div>
                </div>
              </SurfaceCard>
            </div>
          ) : (
            <SurfaceCard
              title="Interaction log"
              description="Chronological history of all vendor communication."
            >
              {interactions.length > 0 ? (
                <ul className="space-y-4">
                  {interactions.map((interaction) => (
                    <VendorInteractionItem key={interaction.id} interaction={interaction} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600">No interaction history found.</p>
              )}
            </SurfaceCard>
          )}
        </div>
      )}

      <ActionDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        title="Edit vendor"
      >
        {vendor ? (
          <form className="space-y-4" onSubmit={handleSaveVendor}>
            <div className="space-y-2">
              <label htmlFor="vendor-name" className="eyebrow-label">
                Vendor name
              </label>
              <input
                id="vendor-name"
                type="text"
                value={editState.name}
                onChange={(event) =>
                  setEditState((currentState) => ({
                    ...currentState,
                    name: event.target.value,
                  }))
                }
                className="field-input"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="vendor-status" className="eyebrow-label">
                  Status
                </label>
                <select
                  id="vendor-status"
                  value={editState.status}
                  onChange={(event) =>
                    setEditState((currentState) => ({
                      ...currentState,
                      status: event.target.value as VendorStatus,
                    }))
                  }
                  className="field-input"
                >
                  {vendorStatuses.map((status) => (
                    <option key={status} value={status}>
                      {vendorStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="vendor-category" className="eyebrow-label">
                  Category
                </label>
                <select
                  id="vendor-category"
                  value={editState.vendorCategoryId}
                  onChange={(event) =>
                    setEditState((currentState) => ({
                      ...currentState,
                      vendorCategoryId: event.target.value,
                    }))
                  }
                  className="field-input"
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="vendor-contact" className="eyebrow-label">
                  Contact
                </label>
                <input
                  id="vendor-contact"
                  type="text"
                  value={editState.contactName}
                  onChange={(event) =>
                    setEditState((currentState) => ({
                      ...currentState,
                      contactName: event.target.value,
                    }))
                  }
                  className="field-input"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="vendor-phone" className="eyebrow-label">
                  Phone
                </label>
                <input
                  id="vendor-phone"
                  type="text"
                  value={editState.phone}
                  onChange={(event) =>
                    setEditState((currentState) => ({
                      ...currentState,
                      phone: event.target.value,
                    }))
                  }
                  className="field-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="vendor-email" className="eyebrow-label">
                Email
              </label>
              <input
                id="vendor-email"
                type="email"
                value={editState.email}
                onChange={(event) =>
                  setEditState((currentState) => ({
                    ...currentState,
                    email: event.target.value,
                  }))
                }
                className="field-input"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="vendor-notes" className="eyebrow-label">
                Notes
              </label>
              <textarea
                id="vendor-notes"
                value={editState.notes}
                onChange={(event) =>
                  setEditState((currentState) => ({
                    ...currentState,
                    notes: event.target.value,
                  }))
                }
                className="field-input min-h-[110px]"
              />
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={editState.isPreferred}
                onChange={(event) =>
                  setEditState((currentState) => ({
                    ...currentState,
                    isPreferred: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              Preferred vendor
            </label>

            {actionErrorMessage ? (
              <p className="text-sm text-rose-600">{actionErrorMessage}</p>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="submit"
                disabled={isSavingVendor}
                className="button-primary justify-center"
              >
                {isSavingVendor ? 'Saving...' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditDrawerOpen(false)}
                className="button-secondary justify-center"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </ActionDrawer>

      <ActionDrawer
        isOpen={isInteractionDrawerOpen}
        onClose={() => setIsInteractionDrawerOpen(false)}
        title={`Add ${interactionKindLabels[interactionState.kind].toLowerCase()}`}
      >
        <form className="space-y-4" onSubmit={handleCreateInteraction}>
          <div className="space-y-2">
            <label htmlFor="interaction-kind" className="eyebrow-label">
              Interaction type
            </label>
            <select
              id="interaction-kind"
              value={interactionState.kind}
              onChange={(event) =>
                setInteractionState((currentState) => ({
                  ...currentState,
                  kind: event.target.value as InteractionKind,
                }))
              }
              className="field-input"
            >
              <option value="note">Note</option>
              <option value="meeting">Meeting</option>
              <option value="call">Call</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="interaction-summary" className="eyebrow-label">
              Summary
            </label>
            <input
              id="interaction-summary"
              type="text"
              value={interactionState.summary}
              onChange={(event) =>
                setInteractionState((currentState) => ({
                  ...currentState,
                  summary: event.target.value,
                }))
              }
              className="field-input"
              placeholder="Followed up on pending invoice"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="interaction-details" className="eyebrow-label">
              Details
            </label>
            <textarea
              id="interaction-details"
              value={interactionState.details}
              onChange={(event) =>
                setInteractionState((currentState) => ({
                  ...currentState,
                  details: event.target.value,
                }))
              }
              className="field-input min-h-[110px]"
              placeholder="Key notes, next steps, and owners"
            />
          </div>

          {actionErrorMessage ? (
            <p className="text-sm text-rose-600">{actionErrorMessage}</p>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="submit"
              disabled={isSavingInteraction}
              className="button-primary justify-center"
            >
              {isSavingInteraction ? 'Saving...' : 'Save interaction'}
            </button>
            <button
              type="button"
              onClick={() => setIsInteractionDrawerOpen(false)}
              className="button-secondary justify-center"
            >
              Cancel
            </button>
          </div>
        </form>
      </ActionDrawer>
    </PageSection>
  )
}
