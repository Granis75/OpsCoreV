import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { VendorListItem } from '../components/vendors/VendorListItem'
import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { getVendors } from '../lib/vendors'
import type { VendorListRecord, VendorStatus } from '../types/vendors'
import { vendorStatuses, vendorStatusLabels } from '../types/vendors'

export function Vendors() {
  const [vendors, setVendors] = useState<VendorListRecord[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | VendorStatus>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadVendors() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const records = await getVendors()

        if (!isCancelled) {
          setVendors(records)
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load vendors.',
          )
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadVendors()

    return () => {
      isCancelled = true
    }
  }, [])

  const normalizedSearch = search.trim().toLowerCase()
  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      vendor.name.toLowerCase().includes(normalizedSearch) ||
      vendor.category?.name.toLowerCase().includes(normalizedSearch) === true ||
      vendor.phone?.toLowerCase().includes(normalizedSearch) === true

    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <PageSection
      title="Vendors"
      description="Retrouver rapidement un prestataire, verifier son statut et ouvrir sa fiche avant un appel ou une escalation terrain."
    >
      <SurfaceCard
        title="Vendor directory"
        description="Recherche client-side et filtre rapide par statut pour scanner le repertoire fournisseurs sans bruit."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className="space-y-2">
            <span className="eyebrow-label">
              Search
            </span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 focus-within:border-slate-300 focus-within:bg-white focus-within:ring-1 focus-within:ring-slate-400">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by vendor, category or phone"
                className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </label>

          <label className="space-y-2">
            <span className="eyebrow-label">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'all' | VendorStatus)
              }
              className="field-input"
            >
              <option value="all">All statuses</option>
              {vendorStatuses.map((status) => (
                <option key={status} value={status}>
                  {vendorStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 text-sm text-slate-600">
          {filteredVendors.length} vendor{filteredVendors.length > 1 ? 's' : ''} visible
        </div>
      </SurfaceCard>

      {isLoading ? (
        <SurfaceCard
          title="Loading vendors"
          description="Fetching the latest vendor directory from Supabase."
        />
      ) : null}

      {!isLoading && errorMessage ? (
        <SurfaceCard title="Unable to load vendors" description={errorMessage} />
      ) : null}

      {!isLoading && !errorMessage && filteredVendors.length === 0 ? (
        <SurfaceCard
          title="No vendors found"
          description="Try another search term or reset the status filter."
        />
      ) : null}

      {!isLoading && !errorMessage && filteredVendors.length > 0 ? (
        <div className="space-y-3">
          {filteredVendors.map((vendor) => (
            <VendorListItem key={vendor.id} vendor={vendor} />
          ))}
        </div>
      ) : null}
    </PageSection>
  )
}
