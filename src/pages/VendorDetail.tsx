import { useEffect, useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { VendorDetailCard } from '../components/vendors/VendorDetailCard'
import { VendorInteractionItem } from '../components/vendors/VendorInteractionItem'
import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { ActionDrawer } from '../components/ui/ActionDrawer'
import { getVendorById, getVendorInteractions } from '../lib/vendors'
import type { VendorDetailRecord, VendorInteractionRecord } from '../types/vendors'

export function VendorDetail() {
  const { id } = useParams<{ id: string }>()
  const [vendor, setVendor] = useState<VendorDetailRecord | null>(null)
  const [interactions, setInteractions] = useState<VendorInteractionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details')

  useEffect(() => {
    let isCancelled = false

    async function loadVendorDetail(vendorId: string) {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const [vendorRecord, interactionRecords] = await Promise.all([
          getVendorById(vendorId),
          getVendorInteractions(vendorId),
        ])

        if (!isCancelled) {
          setVendor(vendorRecord)
          setInteractions(interactionRecords)
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

  return (
    <PageSection title={vendor?.name ?? 'Vendor detail'} description="Manage contact information, interactions, and linked operations.">
      <div className="flex items-center justify-between">
        <Link
        to="/app/vendors"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
          <span>Back to directory</span>
      </Link>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="button-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New interaction
        </button>
        </div>

      <div className="mt-6 flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'details' ? 'border-b-2 border-slate-950 text-slate-950' : 'text-slate-500'}`}
        >
          Details & Spend
        </button>
        <button
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
              <SurfaceCard title="Operational context" description="Linked spend and active incidents.">
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-slate-100 pb-3">
                    <span className="text-sm text-slate-500">Total Spend (YTD)</span>
                    <span className="text-sm font-semibold text-slate-900">€12,450.00</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-3">
                    <span className="text-sm text-slate-500">Active Tickets</span>
                    <span className="text-sm font-semibold text-slate-900">3</span>
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
                <div className="space-y-4">
                  {interactions.map((interaction) => (
                    <VendorInteractionItem key={interaction.id} interaction={interaction} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">No interaction history found.</p>
              )}
            </SurfaceCard>
          )}
        </div>
      )}

      <ActionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Record Interaction"
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-2">
            <label className="eyebrow-label">Interaction Type</label>
            <select className="field-input w-full">
              <option>Email</option>
              <option>Call</option>
              <option>Meeting</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="eyebrow-label">Summary</label>
            <textarea className="field-input w-full min-h-[120px]" placeholder="Key notes from the discussion..." />
          </div>
          <button type="button" className="button-primary w-full">Save Interaction</button>
        </form>
      </ActionDrawer>
    </PageSection>
  )
}

