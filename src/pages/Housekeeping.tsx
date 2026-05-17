import { useEffect, useState } from 'react'
import { PageSection } from '../components/ui/PageSection'
import type { HousekeepingDailyPlan, HousekeepingEntry } from '../types/housekeeping'
import { getDailyPlan, getDailyPlanEntries, getHousekeepingSettings } from '../lib/housekeeping/data'
import { HousekeepingOverview } from '../components/housekeeping/HousekeepingOverview'
import { HousekeepingDailyPlanner } from '../components/housekeeping/HousekeepingDailyPlanner'
import { HousekeepingPrintSheet } from '../components/housekeeping/HousekeepingPrintSheet'
import { HousekeepingStaffing } from '../components/housekeeping/HousekeepingStaffing'
import { HousekeepingLinenForecast } from '../components/housekeeping/HousekeepingLinenForecast'
import { HousekeepingHistory } from '../components/housekeeping/HousekeepingHistory'
import type { HousekeepingSettings } from '../types/housekeeping'

type HousekeepingView = 'overview' | 'planner' | 'sheet' | 'staffing' | 'linen' | 'history'

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
  const [settings, setSettings] = useState<HousekeepingSettings | null>(null)
  const [isLoadingPlan, setIsLoadingPlan] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Load settings once on mount
  useEffect(() => {
    let isMounted = true

    async function loadSettings() {
      setIsLoadingSettings(true)
      setErrorMessage(null)

      try {
        const fetchedSettings = await getHousekeepingSettings()
        if (isMounted) {
          setSettings(fetchedSettings)
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load settings.',
          )
        }
      } finally {
        if (isMounted) {
          setIsLoadingSettings(false)
        }
      }
    }

    void loadSettings()

    return () => {
      isMounted = false
    }
  }, [])

  // Load daily plan and entries when date changes
  useEffect(() => {
    let isMounted = true

    async function loadDailyPlan() {
      setIsLoadingPlan(true)
      setErrorMessage(null)

      try {
        const fetchedPlan = await getDailyPlan(selectedDate)
        if (isMounted) {
          setDailyPlan(fetchedPlan)

          const fetchedEntries = await getDailyPlanEntries(fetchedPlan.id)
          if (isMounted) {
            setEntries(fetchedEntries)
          }
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

    if (settings) {
      void loadDailyPlan()
    }

    return () => {
      isMounted = false
    }
  }, [selectedDate, settings])

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate)
    setCurrentView('overview')
  }

  const handleEntriesUpdate = (newEntries: HousekeepingEntry[]) => {
    setEntries(newEntries)
  }

  const handlePlanUpdate = (updatedPlan: HousekeepingDailyPlan) => {
    setDailyPlan(updatedPlan)
  }

  if (isLoadingSettings) {
    return (
      <PageSection
        title="Housekeeping & Linen"
        description="Daily room servicing, printable housekeeping sheets, staffing needs, and linen forecasting in one operational workflow."
      >
        <div className="text-center py-12">
          <p className="text-sm text-slate-500">Loading settings...</p>
        </div>
      </PageSection>
    )
  }

  if (errorMessage && !settings) {
    return (
      <PageSection
        title="Housekeeping & Linen"
        description="Daily room servicing, printable housekeeping sheets, staffing needs, and linen forecasting in one operational workflow."
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
      description="Daily room servicing, printable housekeeping sheets, staffing needs, and linen forecasting in one operational workflow."
    >
      {/* Navigation tabs */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <nav className="flex gap-1" aria-label="Housekeeping views">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'planner', label: 'Daily Planner' },
            { id: 'sheet', label: 'Printable Sheet' },
            { id: 'staffing', label: 'Staffing' },
            { id: 'linen', label: 'Linen Forecast' },
            { id: 'history', label: 'History' },
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

      {/* Error message */}
      {errorMessage && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      {/* Content */}
      <div>
        {isLoadingPlan ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-500">Loading daily plan...</p>
          </div>
        ) : currentView === 'overview' && dailyPlan && settings ? (
          <HousekeepingOverview
            dailyPlan={dailyPlan}
            entries={entries}
            settings={settings}
            onOpenPlanner={() => setCurrentView('planner')}
            onPrintSheet={() => setCurrentView('sheet')}
          />
        ) : currentView === 'planner' && dailyPlan && settings ? (
          <HousekeepingDailyPlanner
            dailyPlan={dailyPlan}
            entries={entries}
            settings={settings}
            onEntriesUpdate={handleEntriesUpdate}
            onPlanUpdate={handlePlanUpdate}
          />
        ) : currentView === 'sheet' && dailyPlan && settings ? (
          <HousekeepingPrintSheet
            dailyPlan={dailyPlan}
            entries={entries}
          />
        ) : currentView === 'staffing' && dailyPlan && settings ? (
          <HousekeepingStaffing
            dailyPlan={dailyPlan}
            entries={entries}
            settings={settings}
            onPlanUpdate={handlePlanUpdate}
          />
        ) : currentView === 'linen' && dailyPlan && settings ? (
          <HousekeepingLinenForecast
            entries={entries}
          />
        ) : currentView === 'history' && settings ? (
          <HousekeepingHistory
            settings={settings}
            onSelectDate={handleDateChange}
          />
        ) : null}
      </div>
    </PageSection>
  )
}
