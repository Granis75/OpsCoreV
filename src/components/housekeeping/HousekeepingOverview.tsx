import { AlertCircle } from 'lucide-react'
import { SurfaceCard } from '../ui/SurfaceCard'
import type {
  HousekeepingDailyPlan,
  HousekeepingEntry,
  HousekeepingSettings,
} from '../../types/housekeeping'
import {
  aggregateDailyLinenConsumption,
  calculateWorkloadAndCleanersNeeded,
  countInterventionTypes,
  getTotalLinenUnits,
} from '../../lib/housekeeping/calculations'

interface HousekeepingOverviewProps {
  dailyPlan: HousekeepingDailyPlan
  entries: HousekeepingEntry[]
  settings: HousekeepingSettings
  onOpenPlanner: () => void
  onPrintSheet: () => void
}

export function HousekeepingOverview({
  dailyPlan,
  entries,
  settings,
  onOpenPlanner,
  onPrintSheet,
}: HousekeepingOverviewProps) {
  const interventionCounts = countInterventionTypes(entries)
  const workload = calculateWorkloadAndCleanersNeeded(
    entries,
    settings.departureMinutes,
    settings.stayoverZMinutes,
    settings.stayoverSMinutes,
    settings.productiveMinutesPerCleaner,
  )
  const linens = aggregateDailyLinenConsumption(entries)
  const totalLinenUnits = getTotalLinenUnits(linens)
  const staffingGap = dailyPlan.cleanersOrdered - workload.cleanersNeeded

  // Alerts
  const hasCleanerShortage = staffingGap < 0
  const noApartmentsScheduled = entries.length === 0
  const highLinenVolume = totalLinenUnits > 40 // Configurable threshold
  const hasMemos = entries.some((e) => e.receptionMemo)

  return (
    <div className="space-y-8">
      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        <button type="button" onClick={onOpenPlanner} className="button-primary gap-2">
          Open Daily Planner
        </button>
        <button type="button" onClick={onPrintSheet} className="button-secondary gap-2">
          Print Housekeeping Sheet
        </button>
      </div>

      {/* Alerts */}
      {(hasCleanerShortage || noApartmentsScheduled || highLinenVolume || hasMemos) && (
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
                Cleaner shortage detected for the selected date ({workload.cleanersNeeded} needed, {dailyPlan.cleanersOrdered} ordered).
              </p>
            </div>
          )}
          {highLinenVolume && (
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-700">
                High linen volume expected today ({totalLinenUnits} units).
              </p>
            </div>
          )}
          {hasMemos && (
            <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
              <p className="text-sm text-blue-700">
                Several apartments contain reception memos.
              </p>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Apartments scheduled" value={entries.length} />
        <KPICard label="Departures" value={interventionCounts.departure} />
        <KPICard label="Stayovers Z" value={interventionCounts.stayover_z} />
        <KPICard label="Stayovers S" value={interventionCounts.stayover_s} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Cleaners needed" value={workload.cleanersNeeded} />
        <KPICard label="Cleaners ordered" value={dailyPlan.cleanersOrdered} />
        <KPICard
          label="Staffing gap"
          value={staffingGap}
          variant={staffingGap < 0 ? 'negative' : staffingGap > 0 ? 'positive' : 'neutral'}
        />
        <KPICard label="Linen units" value={totalLinenUnits} />
      </div>

      {/* Workload split */}
      <SurfaceCard
        title="Workload breakdown"
        description="Distribution of cleaning interventions and total productive minutes."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-3">
              Interventions
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">Departures</span>
                <span className="font-mono font-medium">{interventionCounts.departure}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">Stayovers Z</span>
                <span className="font-mono font-medium">{interventionCounts.stayover_z}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">Stayovers S</span>
                <span className="font-mono font-medium">{interventionCounts.stayover_s}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-3">
              Workload
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">Total minutes</span>
                <span className="font-mono font-medium">{workload.totalMinutes}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">Per cleaner</span>
                <span className="font-mono font-medium">{settings.productiveMinutesPerCleaner}</span>
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200">
                <span className="text-slate-700 font-medium">Cleaners needed</span>
                <span className="font-mono font-semibold text-lg">
                  {workload.cleanersNeeded}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>

      {/* Linen summary */}
      <SurfaceCard
        title="Today's linen forecast"
        description="Expected linen consumption based on scheduled interventions."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {[
                ['Large sheets', linens.largeSheets],
                ['Large duvet covers', linens.largeDuvetCovers],
                ['Small sheets', linens.smallSheets],
                ['Small duvet covers', linens.smallDuvetCovers],
                ['Pillowcases', linens.pillowcases],
                ['Large towels', linens.largeTowels],
                ['Small towels', linens.smallTowels],
                ['Kitchen towels', linens.kitchenTowels],
                ['Bath mats', linens.bathMats],
              ].map(([label, count]) => (
                <tr key={label} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 text-slate-600">{label}</td>
                  <td className="py-2 text-right font-mono font-medium">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
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
