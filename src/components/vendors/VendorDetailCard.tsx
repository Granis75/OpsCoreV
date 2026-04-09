import { Mail, Phone, Star, UserRound } from 'lucide-react'
import type { VendorDetailRecord } from '../../types/vendors'
import { VendorStatusBadge } from './VendorStatusBadge'

interface VendorDetailCardProps {
  vendor: VendorDetailRecord
}

export function VendorDetailCard({ vendor }: VendorDetailCardProps) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-shell">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <VendorStatusBadge status={vendor.status} />
          {vendor.isPreferred ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
              <Star className="h-3.5 w-3.5 fill-current" />
              Preferred vendor
            </span>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Category
            </p>
            <p className="text-sm font-medium text-slate-900">
              {vendor.category?.name ?? 'No category assigned'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Contact
            </p>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-900">
              <UserRound className="h-4 w-4 text-slate-400" />
              <span>{vendor.contactName ?? 'Not provided'}</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Phone
            </p>
            {vendor.phone ? (
              <a
                href={`tel:${vendor.phone}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-900 hover:text-slate-700"
              >
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{vendor.phone}</span>
              </a>
            ) : (
              <p className="text-sm font-medium text-slate-900">Not provided</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Email
            </p>
            {vendor.email ? (
              <a
                href={`mailto:${vendor.email}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-900 hover:text-slate-700"
              >
                <Mail className="h-4 w-4 text-slate-400" />
                <span>{vendor.email}</span>
              </a>
            ) : (
              <p className="text-sm font-medium text-slate-900">Not provided</p>
            )}
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Internal notes
          </p>
          <p className="text-sm leading-7 text-slate-700">
            {vendor.notes ?? 'No internal notes recorded for this vendor.'}
          </p>
        </div>
      </div>
    </div>
  )
}
