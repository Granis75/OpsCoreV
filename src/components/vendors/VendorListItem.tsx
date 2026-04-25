import { Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { VendorListRecord } from '../../types/vendors'
import { VendorStatusBadge } from './VendorStatusBadge'

interface VendorListItemProps {
  vendor: VendorListRecord
}

export function VendorListItem({ vendor }: VendorListItemProps) {
  return (
    <Link
      to={`/app/vendors/${vendor.id}`}
      className="surface-panel interactive-lift block p-5"
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-serif text-base font-medium tracking-tight text-slate-900">
              {vendor.name}
            </h2>
            {vendor.isPreferred ? (
              <span className="inline-flex items-center rounded border border-accent px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-accent">
                Preferred
              </span>
            ) : null}
          </div>
          <p className="text-sm text-slate-500">
            {vendor.category?.name ?? 'No category assigned'}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:min-w-[380px] xl:grid-cols-[auto_minmax(0,1fr)]">
          <div className="space-y-1.5">
            <p className="eyebrow-label">Status</p>
            <VendorStatusBadge status={vendor.status} />
          </div>

          <div className="space-y-1.5">
            <p className="eyebrow-label">Phone</p>
            <div className="inline-flex items-center gap-2 text-sm text-slate-700">
              <Phone className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.5} />
              <span>{vendor.phone ?? 'Not provided'}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
