import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { VendorDetailCard } from '../components/vendors/VendorDetailCard'
import { VendorInteractionItem } from '../components/vendors/VendorInteractionItem'
import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { getVendorById, getVendorInteractions } from '../lib/vendors'
import type { VendorDetailRecord, VendorInteractionRecord } from '../types/vendors'

export function VendorDetail() {
  const { id } = useParams<{ id: string }>()
  const [vendor, setVendor] = useState<VendorDetailRecord | null>(null)
  const [interactions, setInteractions] = useState<VendorInteractionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  const pageTitle = vendor?.name ?? 'Vendor detail'
  const pageDescription = vendor
    ? 'Contact details, current status and recent interactions for this vendor.'
    : 'Open a vendor to check contact details and recent interactions before reaching out.'

  return (
    <PageSection title={pageTitle} description={pageDescription}>
      <Link
        to="/vendors"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to vendor directory</span>
      </Link>

      {isLoading ? (
        <SurfaceCard
          title="Loading vendor"
          description="Fetching vendor details and recent interactions from Supabase."
        />
      ) : null}

      {!isLoading && errorMessage ? (
        <SurfaceCard title="Unable to load vendor" description={errorMessage} />
      ) : null}

      {!isLoading && !errorMessage && !vendor ? (
        <SurfaceCard
          title="Vendor not found"
          description="This vendor is unavailable or you do not have access to it."
        />
      ) : null}

      {!isLoading && !errorMessage && vendor ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <VendorDetailCard vendor={vendor} />

          <SurfaceCard
            title="Recent interactions"
            description="Latest calls, emails and follow-ups recorded for this vendor."
          >
            {interactions.length > 0 ? (
              <ul className="space-y-3">
                {interactions.map((interaction) => (
                  <VendorInteractionItem
                    key={interaction.id}
                    interaction={interaction}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-7 text-slate-600">
                No interactions recorded for this vendor yet.
              </p>
            )}
          </SurfaceCard>
        </div>
      ) : null}
    </PageSection>
  )
}
