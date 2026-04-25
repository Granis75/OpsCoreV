import { vendorStatusLabels, type VendorStatus } from '../../types/vendors'

interface VendorStatusBadgeProps {
  status: VendorStatus
}

const statusClasses: Record<VendorStatus, string> = {
  active:   'border-emerald-300 text-emerald-600',
  prospect: 'border-amber-300  text-amber-600',
  inactive: 'border-slate-300  text-slate-500',
  blocked:  'border-red-300    text-red-600',
}

export function VendorStatusBadge({ status }: VendorStatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded border font-mono text-[9px] uppercase tracking-[0.14em] px-2 py-0.5',
        statusClasses[status],
      ].join(' ')}
    >
      {vendorStatusLabels[status]}
    </span>
  )
}
