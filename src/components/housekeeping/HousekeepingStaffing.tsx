import { useState } from 'react'
import { SurfaceCard } from '../ui/SurfaceCard'
import type {
  HousekeepingConfiguration,
  HousekeepingDailyPlan,
  HousekeepingEntry,
} from '../../types/housekeeping'
import {
  calculateWorkloadAndCleanersNeeded,
  countInterventionTypes,
} from '../../lib/housekeeping/calculations'
import { updateDailyPlan } from '../../lib/housekeeping/data'

interface HousekeepingStaffingProps {
  dailyPlan: HousekeepingDailyPlan
  entries: HousekeepingEntry[]
  configuration: HousekeepingConfiguration
  onPlanUpdate: (plan: HousekeepingDailyPlan) => void
}

export function HousekeepingStaffing({
  dailyPlan,
  entries,
  configuration,
  onPlanUpdate,
}: HousekeepingStaffingProps) {
  const [cleanersOrdered, setCleanersOrdered] = useState(dailyPlan.cleanersOrdered)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const serviceCounts = countInterventionTypes(entries, configuration.interventionTypes)
  const workload = calculateWorkloadAndCleanersNeeded(
    entries,
    configuration.interventionTypes,
    configuration.settings.productiveMinutesPerCleaner,
  )
  const staffingGap = cleanersOrdered - workload.cleanersNeeded

  const handleSave = async () => {
    if (cleanersOrdered === dailyPlan.cleanersOrdered) return

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const updated = await updateDailyPlan({ ...dailyPlan, cleanersOrdered })
      onPlanUpdate(updated)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      <SurfaceCard
        title="Cleaners requirement"
        description="Calculated from configured service minutes and cleaner capacity."
      >
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-4">
              Workload by service
            </p>
            <div className="space-y-3">
              {serviceCounts.filter((service) => service.count > 0).map((service) => (
                <div key={service.interventionTypeId} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-600">{service.label}</span>
                  <span className="font-mono">
                    {service.count} x {service.workloadMinutes}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm border-t border-slate-200 pt-3">
                <span className="text-slate-600 font-medium">Total workload minutes</span>
                <span className="font-mono font-semibold">{workload.totalMinutes}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-4">
              Cleaner capacity
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Productive min / cleaner</span>
                <span className="font-mono">{configuration.settings.productiveMinutesPerCleaner}</span>
              </div>
              <div className="border-t border-slate-200 pt-3 mt-4">
                <p className="text-xs text-slate-500 mb-2">Formula</p>
                <p className="text-xs text-slate-600">
                  ceil({workload.totalMinutes} / {configuration.settings.productiveMinutesPerCleaner}) ={' '}
                  <span className="font-mono font-medium">{workload.cleanersNeeded}</span>
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-4">
              Staffing summary
            </p>
            <div className="space-y-3">
              <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-600 font-medium mb-1">Cleaners needed</p>
                <p className="text-3xl font-serif font-bold text-blue-900">{workload.cleanersNeeded}</p>
              </div>

              <div className="text-center p-4 rounded-lg bg-slate-100 border border-slate-200">
                <p className="text-xs text-slate-600 font-medium mb-1">Cleaners ordered</p>
                <input
                  type="number"
                  min="0"
                  value={cleanersOrdered}
                  onChange={(event) => setCleanersOrdered(parseInt(event.target.value, 10) || 0)}
                  className="w-full text-center text-3xl font-serif font-bold border-none bg-transparent outline-none"
                />
              </div>

              <div className="text-center p-4 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-xs font-medium text-slate-600 mb-1">Staffing gap</p>
                <p className="text-3xl font-serif font-bold text-slate-900">
                  {staffingGap > 0 ? '+' : ''}{staffingGap}
                </p>
                <p className="text-xs mt-1 text-slate-500">
                  {staffingGap < 0 ? 'Understaffed' : staffingGap > 0 ? 'Extra capacity' : 'Aligned'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || cleanersOrdered === dailyPlan.cleanersOrdered}
                className="button-primary w-full"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}
