import type { VendorInteractionRecord } from '../../types/vendors'
import { vendorInteractionTypeLabels } from '../../types/vendors'

interface VendorInteractionItemProps {
  interaction: VendorInteractionRecord
}

const interactionDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function VendorInteractionItem({
  interaction,
}: VendorInteractionItemProps) {
  return (
    <li className="surface-muted p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
              {vendorInteractionTypeLabels[interaction.interactionType]}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {interactionDateFormatter.format(new Date(interaction.interactionAt))}
            </span>
          </div>
          <p className="text-sm font-medium leading-6 text-slate-900">
            {interaction.summary}
          </p>
          {interaction.details ? (
            <p className="text-sm leading-6 text-slate-600">{interaction.details}</p>
          ) : null}
        </div>
      </div>
    </li>
  )
}
