import { Phone, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { VendorListRecord } from '../../types/vendors'
import { VendorStatusBadge } from './VendorStatusBadge'

interface VendorListItemProps {
  vendor: VendorListRecord
}

export function VendorListItem({ vendor }: VendorListItemProps) {
  return (
    <Link
      to={`/vendors/${vendor.id}`}
      className="block rounded-3xl border border-white/70 bg-white/80 p-5 shadow-shell transition-colors hover:border-slate-300"
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">
              {vendor.name}
            </h2>
            {vendor.isPreferred ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                <Star className="h-3.5 w-3.5 fill-current" />
                Preferred
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-6 text-slate-600">
            {vendor.category?.name ?? 'No category assigned'}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:min-w-[420px] xl:grid-cols-[auto_minmax(0,1fr)]">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Status
            </p>
            <VendorStatusBadge status={vendor.status} />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Phone
            </p>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <Phone className="h-4 w-4 text-slate-400" />
              <span>{vendor.phone ?? 'Not provided'}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
