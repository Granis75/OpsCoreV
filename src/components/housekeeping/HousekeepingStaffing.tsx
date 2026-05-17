import { useState } from 'react'
import { SurfaceCard } from '../ui/SurfaceCard'
import type {
  HousekeepingDailyPlan,
  HousekeepingEntry,
  HousekeepingSettings,
} from '../../types/housekeeping'
import { calculateWorkloadAndCleanersNeeded } from '../../lib/housekeeping/calculations'
import { updateDailyPlan } from '../../lib/housekeeping/data'

interface HousekeepingStaffingProps {
  dailyPlan: HousekeepingDailyPlan
  entries: HousekeepingEntry[]
  settings: HousekeepingSettings
  onPlanUpdate: (plan: HousekeepingDailyPlan) => void
}

function parseNonNegativeInteger(value: string, fallback = 0) {
  if (value.trim() === '') return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}

export function HousekeepingStaffing({
  dailyPlan,
  entries,
  settings,
  onPlanUpdate,
}: HousekeepingStaffingProps) {
  const [cleanersOrdered, setCleanersOrdered] = useState(dailyPlan.cleanersOrdered)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const workload = calculateWorkloadAndCleanersNeeded(
    entries,
    settings.departureMinutes,
    settings.stayoverZMinutes,
    settings.stayoverSMinutes,
    settings.productiveMinutesPerCleaner,
  )

  const cleanersNeeded = workload.cleanersNeeded
  const staffingGap = cleanersOrdered - cleanersNeeded

  const handleSave = async () => {
    if (cleanersOrdered === dailyPlan.cleanersOrdered) return

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const updated = await updateDailyPlan({
        ...dailyPlan,
        cleanersOrdered,
      })
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
        description="Calculate necessary cleaners based on today's workload."
      >
        <div className="grid gap-8 md:grid-cols-3">
          {/* Workload calculation */}
          <div>
            <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-4">
              Workload calculation
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Departure (min each)</span>
                <span className="font-mono">{settings.departureMinutes}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Stayover Z (min each)</span>
                <span className="font-mono">{settings.stayoverZMinutes}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Stayover S (min each)</span>
                <span className="font-mono">{settings.stayoverSMinutes}</span>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-slate-200 pt-3">
                <span className="text-slate-600 font-medium">Total workload minutes</span>
                <span className="font-mono font-semibold">{workload.totalMinutes}</span>
              </div>
            </div>
          </div>

          {/* Capacity */}
          <div>
            <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-4">
              Cleaner capacity
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Productive min/cleaner</span>
                <span className="font-mono">{settings.productiveMinutesPerCleaner}</span>
              </div>
              <div className="border-t border-slate-200 pt-3 mt-4">
                <p className="text-xs text-slate-500 mb-2">Formula</p>
                <p className="text-xs text-slate-600">
                  ⌈{workload.totalMinutes} ÷ {settings.productiveMinutesPerCleaner}⌉ = <span className="font-mono font-medium">{cleanersNeeded}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div>
            <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-4">
              Staffing summary
            </p>
            <div className="space-y-3">
              <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-600 font-medium mb-1">Cleaners needed</p>
                <p className="text-3xl font-serif font-bold text-blue-900">{cleanersNeeded}</p>
              </div>

              <div className="text-center p-4 rounded-lg bg-slate-100 border border-slate-200">
                <p className="text-xs text-slate-600 font-medium mb-1">Cleaners ordered</p>
                <input
                  type="number"
                  min="0"
                  value={cleanersOrdered}
                  onChange={(e) =>
                    setCleanersOrdered(parseNonNegativeInteger(e.target.value, 0))
                  }
                  className="w-full text-center text-3xl font-serif font-bold border-none bg-transparent outline-none"
                />
              </div>

              <div className="text-center p-4 rounded-lg"
                style={{
                  background: staffingGap < 0 ? '#fef2f2' : staffingGap > 0 ? '#f0fdf4' : '#f0f4f8',
                  border: `1px solid ${staffingGap < 0 ? '#fecaca' : staffingGap > 0 ? '#bbf7d0' : '#cbd5e1'}`,
                }}>
                <p className="text-xs font-medium mb-1"
                  style={{
                    color: staffingGap < 0 ? '#991b1b' : staffingGap > 0 ? '#15803d' : '#334155',
                  }}>
                  Staffing gap
                </p>
                <p className="text-3xl font-serif font-bold"
                  style={{
                    color: staffingGap < 0 ? '#7f1d1d' : staffingGap > 0 ? '#166534' : '#475569',
                  }}>
                  {staffingGap > 0 ? '+' : ''}{staffingGap}
                </p>
                <p className="text-xs mt-1"
                  style={{
                    color: staffingGap < 0 ? '#991b1b' : staffingGap > 0 ? '#15803d' : '#475569',
                  }}>
                  {staffingGap < 0
                    ? 'Understaffed'
                    : staffingGap > 0
                      ? 'Overstaffed'
                      : 'Aligned'}
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

      {/* Interpretation */}
      <SurfaceCard
        title="What this means"
        description="Understanding your staffing metrics."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="border-l-4 border-red-500 pl-4">
            <p className="text-sm font-medium text-slate-900 mb-1">Understaffed (negative gap)</p>
            <p className="text-sm text-slate-600">
              You have fewer cleaners than needed. Consider adjusting the plan or adding staff.
            </p>
          </div>
          <div className="border-l-4 border-slate-400 pl-4">
            <p className="text-sm font-medium text-slate-900 mb-1">Aligned (zero gap)</p>
            <p className="text-sm text-slate-600">
              Your staffing perfectly matches the workload. Optimal balance achieved.
            </p>
          </div>
          <div className="border-l-4 border-emerald-500 pl-4">
            <p className="text-sm font-medium text-slate-900 mb-1">Overstaffed (positive gap)</p>
            <p className="text-sm text-slate-600">
              You have more cleaners than needed. They may complete work early or support other tasks.
            </p>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}
