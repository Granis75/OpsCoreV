import { useEffect, useState } from 'react'
import { PageSection } from '../components/ui/PageSection'
import type {
  HousekeepingConfiguration,
  HousekeepingDailyPlan,
  HousekeepingEntry,
} from '../types/housekeeping'
import {
  getDailyPlan,
  getDailyPlanEntries,
  getHousekeepingConfiguration,
} from '../lib/housekeeping/data'
import { HousekeepingOverview } from '../components/housekeeping/HousekeepingOverview'
import { HousekeepingDailyPlanner } from '../components/housekeeping/HousekeepingDailyPlanner'
import { HousekeepingPrintSheet } from '../components/housekeeping/HousekeepingPrintSheet'
import { HousekeepingStaffing } from '../components/housekeeping/HousekeepingStaffing'
import { HousekeepingLinenForecast } from '../components/housekeeping/HousekeepingLinenForecast'
import { HousekeepingHistory } from '../components/housekeeping/HousekeepingHistory'
import { HousekeepingSettingsPanel } from '../components/housekeeping/HousekeepingSettingsPanel'
import { HousekeepingStockReplenishment } from '../components/housekeeping/HousekeepingStockReplenishment'

type HousekeepingView =
  | 'overview'
  | 'planner'
  | 'sheet'
  | 'staffing'
  | 'linen'
  | 'stock'
  | 'history'
  | 'settings'

function todayDateInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function Housekeeping() {
  const [currentView, setCurrentView] = useState<HousekeepingView>('overview')
  const [selectedDate, setSelectedDate] = useState(todayDateInputValue)
  const [dailyPlan, setDailyPlan] = useState<HousekeepingDailyPlan | null>(null)
  const [entries, setEntries] = useState<HousekeepingEntry[]>([])
  const [configuration, setConfiguration] = useState<HousekeepingConfiguration | null>(null)
  const [isLoadingPlan, setIsLoadingPlan] = useState(false)
  const [isLoadingConfiguration, setIsLoadingConfiguration] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function refreshConfiguration() {
    const fetchedConfiguration = await getHousekeepingConfiguration()
    setConfiguration(fetchedConfiguration)
  }

  useEffect(() => {
    let isMounted = true

    async function loadConfiguration() {
      setIsLoadingConfiguration(true)
      setErrorMessage(null)

      try {
        const fetchedConfiguration = await getHousekeepingConfiguration()
        if (isMounted) {
          setConfiguration(fetchedConfiguration)
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load housekeeping configuration.',
          )
        }
      } finally {
        if (isMounted) {
          setIsLoadingConfiguration(false)
        }
      }
    }

    void loadConfiguration()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadDailyPlan() {
      setIsLoadingPlan(true)
      setErrorMessage(null)

      try {
        const fetchedPlan = await getDailyPlan(selectedDate)
        const fetchedEntries = await getDailyPlanEntries(fetchedPlan.id)

        if (isMounted) {
          setDailyPlan(fetchedPlan)
          setEntries(fetchedEntries)
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load daily plan.',
          )
        }
      } finally {
        if (isMounted) {
          setIsLoadingPlan(false)
        }
      }
    }

    if (configuration) {
      void loadDailyPlan()
    }

    return () => {
      isMounted = false
    }
  }, [selectedDate, configuration])

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate)
    setCurrentView('overview')
  }

  if (isLoadingConfiguration) {
    return (
      <PageSection
        title="Housekeeping & Linen"
        description="Configurable room servicing, staffing, print sheets, and linen forecasting for each OPS workspace."
      >
        <div className="text-center py-12">
          <p className="text-sm text-slate-500">Loading configuration...</p>
        </div>
      </PageSection>
    )
  }

  if (errorMessage && !configuration) {
    return (
      <PageSection
        title="Housekeeping & Linen"
        description="Configurable room servicing, staffing, print sheets, and linen forecasting for each OPS workspace."
      >
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-900">Error</p>
          <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
        </div>
      </PageSection>
    )
  }

  return (
    <PageSection
      title="Housekeeping & Linen"
      description="Configurable room servicing, staffing, print sheets, and linen forecasting for each OPS workspace."
    >
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <nav className="flex gap-1 flex-wrap" aria-label="Housekeeping views">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'planner', label: 'Daily Planner' },
            { id: 'sheet', label: 'Printable Sheet' },
            { id: 'staffing', label: 'Staffing' },
            { id: 'linen', label: 'Linen Forecast' },
            { id: 'stock', label: 'Stock & Replenishment' },
            { id: 'history', label: 'History' },
            { id: 'settings', label: 'Settings' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setCurrentView(id as HousekeepingView)}
              className={[
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                currentView === id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </nav>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Service Date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="field-input w-40"
          />
        </label>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      <div>
        {isLoadingPlan && currentView !== 'settings' ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-500">Loading daily plan...</p>
          </div>
        ) : currentView === 'overview' && dailyPlan && configuration ? (
          <HousekeepingOverview
            dailyPlan={dailyPlan}
            entries={entries}
            configuration={configuration}
            onOpenPlanner={() => setCurrentView('planner')}
            onPrintSheet={() => setCurrentView('sheet')}
          />
        ) : currentView === 'planner' && dailyPlan && configuration ? (
          <HousekeepingDailyPlanner
            dailyPlan={dailyPlan}
            entries={entries}
            configuration={configuration}
            onEntriesUpdate={setEntries}
            onPlanUpdate={setDailyPlan}
          />
        ) : currentView === 'sheet' && dailyPlan && configuration ? (
          <HousekeepingPrintSheet
            dailyPlan={dailyPlan}
            entries={entries}
            configuration={configuration}
          />
        ) : currentView === 'staffing' && dailyPlan && configuration ? (
          <HousekeepingStaffing
            dailyPlan={dailyPlan}
            entries={entries}
            configuration={configuration}
            onPlanUpdate={setDailyPlan}
          />
        ) : currentView === 'linen' && configuration ? (
          <HousekeepingLinenForecast
            entries={entries}
            configuration={configuration}
          />
        ) : currentView === 'stock' && configuration ? (
          <HousekeepingStockReplenishment
            configuration={configuration}
          />
        ) : currentView === 'history' && configuration ? (
          <HousekeepingHistory
            configuration={configuration}
            onSelectDate={handleDateChange}
          />
        ) : currentView === 'settings' && configuration ? (
          <HousekeepingSettingsPanel
            configuration={configuration}
            onConfigurationUpdate={() => void refreshConfiguration()}
          />
        ) : null}
      </div>
    </PageSection>
  )
}
