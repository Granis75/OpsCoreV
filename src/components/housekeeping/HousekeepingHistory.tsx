import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import { SurfaceCard } from '../ui/SurfaceCard'
import type {
  HousekeepingConfiguration,
  HousekeepingDailyPlan,
  HousekeepingEntry,
} from '../../types/housekeeping'
import { getDailyPlanEntries, getDailyPlanHistory } from '../../lib/housekeeping/data'
import {
  calculateWorkloadAndCleanersNeeded,
  countInterventionTypes,
} from '../../lib/housekeeping/calculations'

interface HousekeepingHistoryProps {
  configuration: HousekeepingConfiguration
  onSelectDate: (date: string) => void
}

function formatDateOnly(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function HousekeepingHistory({
  configuration,
  onSelectDate,
}: HousekeepingHistoryProps) {
  const [history, setHistory] = useState<HousekeepingDailyPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [daysBack, setDaysBack] = useState(30)

  useEffect(() => {
    let isMounted = true

    async function loadHistory() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - daysBack)

        const plans = await getDailyPlanHistory(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0],
        )

        if (isMounted) {
          setHistory(plans)
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load history.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadHistory()

    return () => {
      isMounted = false
    }
  }, [daysBack])

  return (
    <div className="space-y-8">
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      <SurfaceCard
        title="Daily plan history"
        description="Review past plans without relying on fixed service columns."
      >
        <div className="mb-6">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-600">Show last</span>
            <select
              value={daysBack}
              onChange={(event) => setDaysBack(parseInt(event.target.value, 10))}
              className="field-input w-40"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </label>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-500">Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" strokeWidth={1.5} />
            <p className="text-sm text-slate-500">No daily plans found in this period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Apartments</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Service summary</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Minutes</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Needed</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Ordered</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Gap</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((plan) => (
                  <HistoryRow
                    key={plan.id}
                    plan={plan}
                    configuration={configuration}
                    onViewPlan={onSelectDate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SurfaceCard>
    </div>
  )
}

interface HistoryRowProps {
  plan: HousekeepingDailyPlan
  configuration: HousekeepingConfiguration
  onViewPlan: (date: string) => void
}

function HistoryRow({ plan, configuration, onViewPlan }: HistoryRowProps) {
  const [entries, setEntries] = useState<HousekeepingEntry[]>([])
  const formattedDate = formatDateOnly(plan.serviceDate)

  useEffect(() => {
    let isMounted = true

    async function loadEntries() {
      try {
        const fetchedEntries = await getDailyPlanEntries(plan.id)
        if (isMounted) {
          setEntries(fetchedEntries)
        }
      } catch {
        // Keep history rows resilient if one plan cannot load its entries.
      }
    }

    void loadEntries()

    return () => {
      isMounted = false
    }
  }, [plan.id])

  const serviceCounts = countInterventionTypes(entries, configuration.interventionTypes)
    .filter((service) => service.count > 0)
  const workload = calculateWorkloadAndCleanersNeeded(
    entries,
    configuration.interventionTypes,
    configuration.settings.productiveMinutesPerCleaner,
  )
  const gap = plan.cleanersOrdered - workload.cleanersNeeded

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-3 font-mono font-medium">{formattedDate}</td>
      <td className="px-4 py-3 text-center">{entries.length}</td>
      <td className="px-4 py-3">
        {serviceCounts.length === 0 ? (
          <span className="text-xs text-slate-400">No entries</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {serviceCounts.map((service) => (
              <span key={service.interventionTypeId} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                {service.label}: {service.count}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-center font-mono font-medium">{workload.totalMinutes}</td>
      <td className="px-4 py-3 text-center font-mono font-medium">{workload.cleanersNeeded}</td>
      <td className="px-4 py-3 text-center font-mono font-medium">{plan.cleanersOrdered}</td>
      <td className="px-4 py-3 text-center">
        <span
          className={[
            'inline-block font-mono font-medium px-2 py-1 rounded',
            gap < 0
              ? 'bg-red-100 text-red-700'
              : gap > 0
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-700',
          ].join(' ')}
        >
          {gap > 0 ? '+' : ''}{gap}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <button
          type="button"
          onClick={() => onViewPlan(plan.serviceDate)}
          className="text-blue-600 hover:text-blue-700 text-xs font-medium"
        >
          View
        </button>
      </td>
    </tr>
  )
}
