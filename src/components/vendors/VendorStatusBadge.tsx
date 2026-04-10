import { vendorStatusLabels, type VendorStatus } from '../../types/vendors'

interface VendorStatusBadgeProps {
  status: VendorStatus
}

const statusClasses: Record<VendorStatus, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  prospect: 'border-amber-200 bg-amber-50 text-amber-700',
  inactive: 'border-slate-200 bg-slate-100 text-slate-700',
  blocked: 'border-red-200 bg-red-50 text-red-700',
}

export function VendorStatusBadge({ status }: VendorStatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        statusClasses[status],
      ].join(' ')}
    >
      {vendorStatusLabels[status]}
    </span>
  )
}
