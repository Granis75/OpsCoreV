import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { SurfaceCard } from '../ui/SurfaceCard'
import type {
  HousekeepingConfiguration,
  HousekeepingDailyPlan,
  HousekeepingEntry,
  HousekeepingPriority,
} from '../../types/housekeeping'
import { housekeepingPriorities, priorityLabels } from '../../types/housekeeping'
import {
  aggregateDailyItemConsumption,
  calculateWorkloadAndCleanersNeeded,
  countInterventionTypes,
  getInterventionTypeLabel,
} from '../../lib/housekeeping/calculations'
import {
  createEntry,
  updateDailyPlan,
  deleteEntry,
} from '../../lib/housekeeping/data'

interface HousekeepingDailyPlannerProps {
  dailyPlan: HousekeepingDailyPlan
  entries: HousekeepingEntry[]
  configuration: HousekeepingConfiguration
  onEntriesUpdate: (entries: HousekeepingEntry[]) => void
  onPlanUpdate: (plan: HousekeepingDailyPlan) => void
}

export function HousekeepingDailyPlanner({
  dailyPlan,
  entries,
  configuration,
  onEntriesUpdate,
  onPlanUpdate,
}: HousekeepingDailyPlannerProps) {
  const activeInterventionTypes = configuration.interventionTypes.filter((type) => type.active)
  const defaultInterventionTypeId = activeInterventionTypes[0]?.id ?? ''
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [editingPlan, setEditingPlan] = useState(dailyPlan)
  const [newEntry, setNewEntry] = useState<Partial<HousekeepingEntry>>({
    interventionTypeId: defaultInterventionTypeId,
    priority: 'standard',
    guestsCount: 1,
    doubleBedsGl: 0,
    singleBedsLs: 0,
    babyBedsLitbb: 0,
  })

  const workload = calculateWorkloadAndCleanersNeeded(
    entries,
    configuration.interventionTypes,
    configuration.settings.productiveMinutesPerCleaner,
  )
  const serviceCounts = countInterventionTypes(entries, configuration.interventionTypes)
  const itemConsumption = aggregateDailyItemConsumption(
    entries,
    configuration.items,
    configuration.consumptionRules,
  ).filter((item) => item.includeInForecast && item.quantity > 0)
  const staffingGap = editingPlan.cleanersOrdered - workload.cleanersNeeded

  const selectedNewTypeId = newEntry.interventionTypeId || defaultInterventionTypeId
  const canCreateEntries = activeInterventionTypes.length > 0

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => a.sortOrder - b.sortOrder || a.apartmentLabel.localeCompare(b.apartmentLabel)),
    [entries],
  )

  const handleAddEntry = async () => {
    const apartmentLabel = newEntry.apartmentLabel?.trim()
    if (!apartmentLabel || !selectedNewTypeId) {
      setErrorMessage('Apartment and service type are required.')
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const entryToCreate: Omit<HousekeepingEntry, 'id' | 'createdAt' | 'updatedAt'> = {
        dailyPlanId: dailyPlan.id,
        apartmentLabel,
        interventionTypeId: selectedNewTypeId,
        guestsCount: newEntry.guestsCount ?? 0,
        doubleBedsGl: newEntry.doubleBedsGl ?? 0,
        singleBedsLs: newEntry.singleBedsLs ?? 0,
        babyBedsLitbb: newEntry.babyBedsLitbb ?? 0,
        receptionMemo: newEntry.receptionMemo ?? null,
        priority: (newEntry.priority ?? 'standard') as HousekeepingPriority,
        sortOrder: entries.length,
      }

      const created = await createEntry(entryToCreate)
      onEntriesUpdate([...entries, created])
      setNewEntry({
        interventionTypeId: defaultInterventionTypeId,
        priority: 'standard',
        guestsCount: 1,
        doubleBedsGl: 0,
        singleBedsLs: 0,
        babyBedsLitbb: 0,
      })
      setIsCreating(false)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create entry.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    setIsSaving(true)
    setErrorMessage(null)

    try {
      await deleteEntry(entryId)
      onEntriesUpdate(entries.filter((entry) => entry.id !== entryId))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete entry.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveCleanersOrdered = async () => {
    if (editingPlan.cleanersOrdered === dailyPlan.cleanersOrdered) return

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const updated = await updateDailyPlan(editingPlan)
      onPlanUpdate(updated)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save cleaners ordered.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveGeneralNote = async () => {
    if (editingPlan.generalNote === dailyPlan.generalNote) return

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const updated = await updateDailyPlan(editingPlan)
      onPlanUpdate(updated)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save note.')
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
        title="Daily operational note"
        description="Information that should travel with the selected service date."
      >
        <textarea
          value={editingPlan.generalNote ?? ''}
          onChange={(event) =>
            setEditingPlan({ ...editingPlan, generalNote: event.target.value || null })
          }
          onBlur={handleSaveGeneralNote}
          placeholder="VIP arrivals, blocked rooms, special instructions..."
          rows={3}
          className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-slate-400"
        />
      </SurfaceCard>

      <SurfaceCard
        title="Daily housekeeping entries"
        description="Schedule room servicing against configured service types."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-3 py-3 text-left font-medium text-slate-600">Apartment</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Service type</th>
                <th className="px-3 py-3 text-center font-medium text-slate-600">Guests</th>
                <th className="px-3 py-3 text-center font-medium text-slate-600">GL</th>
                <th className="px-3 py-3 text-center font-medium text-slate-600">LS</th>
                <th className="px-3 py-3 text-center font-medium text-slate-600">LITBB</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Priority</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Memo</th>
                <th className="px-3 py-3 text-center font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-3 font-mono text-sm font-medium">{entry.apartmentLabel}</td>
                  <td className="px-3 py-3">
                    <span className="inline-block rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium">
                      {getInterventionTypeLabel(entry.interventionTypeId, configuration.interventionTypes)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">{entry.guestsCount}</td>
                  <td className="px-3 py-3 text-center">{entry.doubleBedsGl}</td>
                  <td className="px-3 py-3 text-center">{entry.singleBedsLs}</td>
                  <td className="px-3 py-3 text-center">{entry.babyBedsLitbb}</td>
                  <td className="px-3 py-3 text-xs">
                    <span className="inline-block rounded-lg bg-slate-100 px-2 py-1 font-medium text-slate-600">
                      {priorityLabels[entry.priority]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600 max-w-xs truncate">
                    {entry.receptionMemo ? entry.receptionMemo : '-'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry.id)}
                      disabled={isSaving}
                      className="inline-flex items-center justify-center text-red-600 hover:text-red-700 disabled:opacity-50"
                      title="Delete entry"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {entries.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">No entries created yet.</p>
            </div>
          )}
        </div>

        {isCreating && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <p className="mb-4 text-sm font-medium text-slate-900">Add new entry</p>
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
              <input
                type="text"
                value={newEntry.apartmentLabel ?? ''}
                onChange={(event) =>
                  setNewEntry({ ...newEntry, apartmentLabel: event.target.value })
                }
                placeholder="Apartment"
                className="field-input"
              />

              <select
                value={selectedNewTypeId}
                onChange={(event) =>
                  setNewEntry({ ...newEntry, interventionTypeId: event.target.value })
                }
                className="field-input"
              >
                {activeInterventionTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>

              {[
                ['guestsCount', 'Guests'],
                ['doubleBedsGl', 'GL'],
                ['singleBedsLs', 'LS'],
                ['babyBedsLitbb', 'LITBB'],
              ].map(([key, label]) => (
                <input
                  key={key}
                  type="number"
                  min="0"
                  value={(newEntry[key as keyof HousekeepingEntry] as number | undefined) ?? 0}
                  onChange={(event) =>
                    setNewEntry({ ...newEntry, [key]: parseInt(event.target.value, 10) || 0 })
                  }
                  placeholder={label}
                  className="field-input"
                />
              ))}

              <select
                value={newEntry.priority ?? 'standard'}
                onChange={(event) =>
                  setNewEntry({ ...newEntry, priority: event.target.value as HousekeepingPriority })
                }
                className="field-input"
              >
                {housekeepingPriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabels[priority]}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={newEntry.receptionMemo ?? ''}
                onChange={(event) =>
                  setNewEntry({ ...newEntry, receptionMemo: event.target.value || null })
                }
                placeholder="Reception memo"
                className="field-input lg:col-span-2"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddEntry}
                  disabled={isSaving || !canCreateEntries}
                  className="button-primary gap-1 flex-1"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="button-secondary gap-1 flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {!isCreating && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              disabled={!canCreateEntries}
              className="button-secondary gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Add entry
            </button>
            {!canCreateEntries ? (
              <p className="mt-3 text-sm text-amber-700">Create an active service type in Settings before adding entries.</p>
            ) : null}
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard
        title="Daily plan summary"
        description="Live calculation from configured service types and item rules."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-4">Summary</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Total interventions</span>
                <span className="font-mono font-medium">{entries.length}</span>
              </div>
              {serviceCounts.filter((service) => service.count > 0).map((service) => (
                <div key={service.interventionTypeId} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{service.label}</span>
                  <span className="font-mono font-medium">{service.count}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm border-t border-slate-200 pt-3">
                <span className="text-slate-600 font-medium">Total workload</span>
                <span className="font-mono font-semibold">{workload.totalMinutes} min</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-4">Staffing</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Cleaners needed</span>
                <span className="font-mono font-semibold text-lg">{workload.cleanersNeeded}</span>
              </div>

              <label className="flex flex-col gap-1 mt-4">
                <span className="text-xs font-medium text-slate-600">Cleaners ordered</span>
                <input
                  type="number"
                  min="0"
                  value={editingPlan.cleanersOrdered}
                  onChange={(event) =>
                    setEditingPlan({
                      ...editingPlan,
                      cleanersOrdered: parseInt(event.target.value, 10) || 0,
                    })
                  }
                  onBlur={handleSaveCleanersOrdered}
                  className="field-input"
                />
              </label>

              <div className="flex items-center justify-between text-sm pt-3 border-t border-slate-200">
                <span className="text-slate-600 font-medium">Staffing gap</span>
                <span className="font-mono font-semibold text-lg">
                  {staffingGap > 0 ? '+' : ''}{staffingGap}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-3">Items forecast</p>
          {itemConsumption.length === 0 ? (
            <p className="text-sm text-slate-500">No configured item consumption for this plan.</p>
          ) : (
            <div className="grid gap-2 grid-cols-2 md:grid-cols-3 text-xs">
              {itemConsumption.slice(0, 12).map((item) => (
                <div key={item.itemId} className="flex justify-between">
                  <span className="text-slate-600">{item.itemLabel}</span>
                  <span className="font-mono font-medium">{item.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SurfaceCard>
    </div>
  )
}
