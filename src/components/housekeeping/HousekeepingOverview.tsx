import { AlertCircle } from 'lucide-react'
import { SurfaceCard } from '../ui/SurfaceCard'
import type {
  HousekeepingConfiguration,
  HousekeepingDailyPlan,
  HousekeepingEntry,
} from '../../types/housekeeping'
import {
  aggregateDailyItemConsumption,
  calculateWorkloadAndCleanersNeeded,
  countInterventionTypes,
  getTotalItemUnits,
} from '../../lib/housekeeping/calculations'

interface HousekeepingOverviewProps {
  dailyPlan: HousekeepingDailyPlan
  entries: HousekeepingEntry[]
  configuration: HousekeepingConfiguration
  onOpenPlanner: () => void
  onPrintSheet: () => void
}

export function HousekeepingOverview({
  dailyPlan,
  entries,
  configuration,
  onOpenPlanner,
  onPrintSheet,
}: HousekeepingOverviewProps) {
  const serviceCounts = countInterventionTypes(entries, configuration.interventionTypes)
  const usedServiceCounts = serviceCounts.filter((service) => service.count > 0)
  const workload = calculateWorkloadAndCleanersNeeded(
    entries,
    configuration.interventionTypes,
    configuration.settings.productiveMinutesPerCleaner,
  )
  const itemConsumption = aggregateDailyItemConsumption(
    entries,
    configuration.items,
    configuration.consumptionRules,
  )
  const forecastItems = itemConsumption.filter((item) => item.includeInForecast && item.quantity > 0)
  const totalItemUnits = getTotalItemUnits(itemConsumption, 'forecast')
  const staffingGap = dailyPlan.cleanersOrdered - workload.cleanersNeeded
  const hasCleanerShortage = staffingGap < 0
  const noApartmentsScheduled = entries.length === 0
  const highItemVolume = totalItemUnits > 40
  const hasMemos = entries.some((entry) => entry.receptionMemo)

  return (
    <div className="space-y-8">
      <div className="flex gap-3 flex-wrap">
        <button type="button" onClick={onOpenPlanner} className="button-primary gap-2">
          Open Daily Planner
        </button>
        <button type="button" onClick={onPrintSheet} className="button-secondary gap-2">
          Print Housekeeping Sheet
        </button>
      </div>

      {(hasCleanerShortage || noApartmentsScheduled || highItemVolume || hasMemos) && (
        <div className="space-y-2">
          {noApartmentsScheduled && (
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-700">No apartments scheduled for this date.</p>
            </div>
          )}
          {hasCleanerShortage && (
            <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <p className="text-sm text-red-700">
                Cleaner shortage detected ({workload.cleanersNeeded} needed, {dailyPlan.cleanersOrdered} ordered).
              </p>
            </div>
          )}
          {highItemVolume && (
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-700">
                High tracked-item volume expected today ({totalItemUnits} units).
              </p>
            </div>
          )}
          {hasMemos && (
            <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
              <p className="text-sm text-blue-700">
                Some apartments contain reception memos.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Apartments scheduled" value={entries.length} />
        <KPICard label="Cleaners needed" value={workload.cleanersNeeded} />
        <KPICard label="Cleaners ordered" value={dailyPlan.cleanersOrdered} />
        <KPICard
          label="Staffing gap"
          value={staffingGap}
          variant={staffingGap < 0 ? 'negative' : staffingGap > 0 ? 'positive' : 'neutral'}
        />
      </div>

      <SurfaceCard
        title="Service breakdown"
        description="Configured service types scheduled for the selected date."
      >
        {usedServiceCounts.length === 0 ? (
          <p className="text-sm text-slate-500">No service types scheduled yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {usedServiceCounts.map((service) => (
              <div key={service.interventionTypeId} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-900">{service.label}</p>
                <p className="mt-2 font-serif text-3xl font-semibold text-slate-900">{service.count}</p>
                <p className="mt-1 text-xs text-slate-500">{service.workloadMinutes} min each</p>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SurfaceCard
          title="Workload"
          description="Total productive minutes from configured service types."
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700">Total minutes</span>
              <span className="font-mono font-medium">{workload.totalMinutes}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700">Productive min / cleaner</span>
              <span className="font-mono font-medium">{configuration.settings.productiveMinutesPerCleaner}</span>
            </div>
            <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200">
              <span className="text-slate-700 font-medium">Cleaners needed</span>
              <span className="font-mono font-semibold text-lg">{workload.cleanersNeeded}</span>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard
          title="Items forecast"
          description="Tracked items expected for the selected date."
        >
          {forecastItems.length === 0 ? (
            <p className="text-sm text-slate-500">No item consumption forecasted.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {forecastItems.slice(0, 10).map((item) => (
                    <tr key={item.itemId} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 text-slate-600">{item.itemLabel}</td>
                      <td className="py-2 text-right font-mono font-medium">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  )
}

interface KPICardProps {
  label: string
  value: string | number
  variant?: 'neutral' | 'negative' | 'positive'
}

function KPICard({ label, value, variant = 'neutral' }: KPICardProps) {
  const bgColor =
    variant === 'negative' ? 'bg-red-50' : variant === 'positive' ? 'bg-emerald-50' : 'bg-slate-50'
  const textColor =
    variant === 'negative'
      ? 'text-red-900'
      : variant === 'positive'
        ? 'text-emerald-900'
        : 'text-slate-900'

  return (
    <div className={`rounded-lg border border-slate-200 p-4 ${bgColor}`}>
      <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-2">
        {label}
      </p>
      <p className={`font-serif text-3xl font-semibold ${textColor}`}>{value}</p>
    </div>
  )
}
