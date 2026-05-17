import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { SurfaceCard } from '../ui/SurfaceCard'
import type {
  HousekeepingDailyPlan,
  HousekeepingEntry,
  HousekeepingSettings,
  HousekeepingInterventionType,
  HousekeepingPriority,
} from '../../types/housekeeping'
import {
  housekeepingInterventionTypes,
  housekeepingPriorities,
  interventionTypeLabels,
  priorityLabels,
} from '../../types/housekeeping'
import {
  calculateWorkloadAndCleanersNeeded,
  aggregateDailyLinenConsumption,
  countInterventionTypes,
} from '../../lib/housekeeping/calculations'
import {
  createEntry,
  updateDailyPlan,
  deleteEntry,
} from '../../lib/housekeeping/data'

interface HousekeepingDailyPlannerProps {
  dailyPlan: HousekeepingDailyPlan
  entries: HousekeepingEntry[]
  settings: HousekeepingSettings
  onEntriesUpdate: (entries: HousekeepingEntry[]) => void
  onPlanUpdate: (plan: HousekeepingDailyPlan) => void
}

function parseNonNegativeInteger(value: string, fallback = 0) {
  if (value.trim() === '') return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}

export function HousekeepingDailyPlanner({
  dailyPlan,
  entries,
  settings,
  onEntriesUpdate,
  onPlanUpdate,
}: HousekeepingDailyPlannerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [editingPlan, setEditingPlan] = useState(dailyPlan)
  const [newEntry, setNewEntry] = useState<Partial<HousekeepingEntry>>({
    interventionType: 'departure',
    priority: 'standard',
    guestsCount: 1,
    doubleBedsGl: 0,
    singleBedsLs: 0,
    babyBedsLitbb: 0,
  })

  const workload = calculateWorkloadAndCleanersNeeded(
    entries,
    settings.departureMinutes,
    settings.stayoverZMinutes,
    settings.stayoverSMinutes,
    settings.productiveMinutesPerCleaner,
  )
  const interventionCounts = countInterventionTypes(entries)
  const linens = aggregateDailyLinenConsumption(entries)
  const staffingGap = editingPlan.cleanersOrdered - workload.cleanersNeeded

  const handleAddEntry = async () => {
    const apartmentLabel = newEntry.apartmentLabel?.trim()

    if (!apartmentLabel || !newEntry.interventionType) {
      setErrorMessage('Apartment and intervention type are required.')
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const entryToCreate: Omit<HousekeepingEntry, 'id' | 'createdAt' | 'updatedAt'> = {
        dailyPlanId: dailyPlan.id,
        apartmentLabel,
        interventionType: newEntry.interventionType as HousekeepingInterventionType,
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
        interventionType: 'departure',
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
      onEntriesUpdate(entries.filter((e) => e.id !== entryId))
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

      {/* General note */}
      <SurfaceCard
        title="Daily operational note"
        description="Add any important information for the housekeeping team."
      >
        <div className="space-y-3">
          <textarea
            value={editingPlan.generalNote ?? ''}
            onChange={(e) =>
              setEditingPlan({ ...editingPlan, generalNote: e.target.value || null })
            }
            onBlur={handleSaveGeneralNote}
            placeholder="e.g., VIP guests arriving late, special requests, etc."
            rows={3}
            className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-slate-400"
          />
        </div>
      </SurfaceCard>

      {/* Entries table */}
      <SurfaceCard
        title="Daily housekeeping entries"
        description="Create, edit, and delete room servicing entries for this date."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-3 py-3 text-left font-medium text-slate-600">Apartment</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Intervention</th>
                <th className="px-3 py-3 text-center font-medium text-slate-600">Guests</th>
                <th className="px-3 py-3 text-center font-medium text-slate-600">GL</th>
                <th className="px-3 py-3 text-center font-medium text-slate-600">LS</th>
                <th className="px-3 py-3 text-center font-medium text-slate-600">BB</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Priority</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Memo</th>
                <th className="px-3 py-3 text-center font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-3 font-mono text-sm font-medium">{entry.apartmentLabel}</td>
                  <td className="px-3 py-3">
                    <span className="inline-block rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium">
                      {interventionTypeLabels[entry.interventionType]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">{entry.guestsCount}</td>
                  <td className="px-3 py-3 text-center">{entry.doubleBedsGl}</td>
                  <td className="px-3 py-3 text-center">{entry.singleBedsLs}</td>
                  <td className="px-3 py-3 text-center">{entry.babyBedsLitbb}</td>
                  <td className="px-3 py-3 text-xs">
                    <span
                      className={[
                        'inline-block rounded-lg px-2 py-1 font-medium',
                        entry.priority === 'urgent'
                          ? 'bg-red-100 text-red-700'
                          : entry.priority === 'vip'
                            ? 'bg-amber-100 text-amber-700'
                            : entry.priority === 'early_arrival'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-600',
                      ].join(' ')}
                    >
                      {priorityLabels[entry.priority]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600 max-w-xs truncate">
                    {entry.receptionMemo ? entry.receptionMemo : '—'}
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

        {/* Add new entry form */}
        {isCreating && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <p className="mb-4 text-sm font-medium text-slate-900">Add new entry</p>
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
              <input
                type="text"
                value={newEntry.apartmentLabel ?? ''}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, apartmentLabel: e.target.value })
                }
                placeholder="Apt (e.g., 101)"
                className="field-input"
              />

              <select
                value={newEntry.interventionType ?? 'departure'}
                onChange={(e) =>
                  setNewEntry({
                    ...newEntry,
                    interventionType: e.target.value as HousekeepingInterventionType,
                  })
                }
                className="field-input"
              >
                {housekeepingInterventionTypes.map((type) => (
                  <option key={type} value={type}>
                    {interventionTypeLabels[type]}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="0"
                value={newEntry.guestsCount ?? 1}
                onChange={(e) =>
                  setNewEntry({
                    ...newEntry,
                    guestsCount: parseNonNegativeInteger(e.target.value, 0),
                  })
                }
                placeholder="Guests"
                className="field-input"
              />

              <input
                type="number"
                min="0"
                value={newEntry.doubleBedsGl ?? 0}
                onChange={(e) =>
                  setNewEntry({
                    ...newEntry,
                    doubleBedsGl: parseNonNegativeInteger(e.target.value, 0),
                  })
                }
                placeholder="GL"
                className="field-input"
              />

              <input
                type="number"
                min="0"
                value={newEntry.singleBedsLs ?? 0}
                onChange={(e) =>
                  setNewEntry({
                    ...newEntry,
                    singleBedsLs: parseNonNegativeInteger(e.target.value, 0),
                  })
                }
                placeholder="LS"
                className="field-input"
              />

              <input
                type="number"
                min="0"
                value={newEntry.babyBedsLitbb ?? 0}
                onChange={(e) =>
                  setNewEntry({
                    ...newEntry,
                    babyBedsLitbb: parseNonNegativeInteger(e.target.value, 0),
                  })
                }
                placeholder="BB"
                className="field-input"
              />

              <select
                value={newEntry.priority ?? 'standard'}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, priority: e.target.value as HousekeepingPriority })
                }
                className="field-input"
              >
                {housekeepingPriorities.map((p) => (
                  <option key={p} value={p}>
                    {priorityLabels[p]}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={newEntry.receptionMemo ?? ''}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, receptionMemo: e.target.value || null })
                }
                placeholder="Reception memo"
                className="field-input lg:col-span-2"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddEntry}
                  disabled={isSaving}
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
              className="button-secondary gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Add entry
            </button>
          </div>
        )}
      </SurfaceCard>

      {/* Summary panel */}
      <SurfaceCard
        title="Daily plan summary"
        description="Live calculation of workload and linen requirements."
      >
        <div className="grid gap-6 md:grid-cols-2">
          {/* Summary stats */}
          <div>
            <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-4">
              Summary
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Total interventions</span>
                <span className="font-mono font-medium">{entries.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Departures</span>
                <span className="font-mono font-medium">{interventionCounts.departure}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Stayover Z</span>
                <span className="font-mono font-medium">{interventionCounts.stayover_z}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Stayover S</span>
                <span className="font-mono font-medium">{interventionCounts.stayover_s}</span>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-slate-200 pt-3">
                <span className="text-slate-600 font-medium">Total workload</span>
                <span className="font-mono font-semibold">{workload.totalMinutes} min</span>
              </div>
            </div>
          </div>

          {/* Staffing */}
          <div>
            <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-4">
              Staffing
            </p>
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
                  onChange={(e) =>
                    setEditingPlan({
                      ...editingPlan,
                      cleanersOrdered: parseNonNegativeInteger(e.target.value, 0),
                    })
                  }
                  onBlur={handleSaveCleanersOrdered}
                  className="field-input"
                />
              </label>

              <div className="flex items-center justify-between text-sm pt-3 border-t border-slate-200">
                <span className="text-slate-600 font-medium">Staffing gap</span>
                <span
                  className={[
                    'font-mono font-semibold text-lg',
                    staffingGap < 0
                      ? 'text-red-600'
                      : staffingGap > 0
                        ? 'text-emerald-600'
                        : 'text-slate-600',
                  ].join(' ')}
                >
                  {staffingGap > 0 ? '+' : ''}{staffingGap}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Compact linen forecast */}
        <div className="mt-6 border-t border-slate-200 pt-6">
          <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-3">
            Linen forecast
          </p>
          <div className="grid gap-2 grid-cols-2 md:grid-cols-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Lg sheets</span>
              <span className="font-mono font-medium">{linens.largeSheets}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Lg duvets</span>
              <span className="font-mono font-medium">{linens.largeDuvetCovers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Sm sheets</span>
              <span className="font-mono font-medium">{linens.smallSheets}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Sm duvets</span>
              <span className="font-mono font-medium">{linens.smallDuvetCovers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Pillows</span>
              <span className="font-mono font-medium">{linens.pillowcases}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Towels (L)</span>
              <span className="font-mono font-medium">{linens.largeTowels}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Towels (S)</span>
              <span className="font-mono font-medium">{linens.smallTowels}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Kitchen</span>
              <span className="font-mono font-medium">{linens.kitchenTowels}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Bath mats</span>
              <span className="font-mono font-medium">{linens.bathMats}</span>
            </div>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}
