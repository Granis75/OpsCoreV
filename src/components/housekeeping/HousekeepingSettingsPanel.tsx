import { useMemo, useState } from 'react'
import { Info, Plus, Save } from 'lucide-react'
import { SurfaceCard } from '../ui/SurfaceCard'
import type {
  HousekeepingConfiguration,
  HousekeepingConsumptionRule,
  HousekeepingInterventionType,
  HousekeepingItem,
  HousekeepingItemCategory,
  HousekeepingServiceCategory,
} from '../../types/housekeeping'
import {
  itemCategoryLabels,
  serviceCategoryLabels,
} from '../../types/housekeeping'
import {
  createHousekeepingItem,
  createInterventionType,
  saveConsumptionRules,
  updateHousekeepingItem,
  updateHousekeepingSettings,
  updateInterventionType,
} from '../../lib/housekeeping/data'

interface HousekeepingSettingsPanelProps {
  configuration: HousekeepingConfiguration
  onConfigurationUpdate: () => void
}

const serviceCategories: HousekeepingServiceCategory[] = [
  'full_clean',
  'partial_service',
  'towels_only',
  'inspection',
  'custom',
]

const itemCategories: HousekeepingItemCategory[] = [
  'bed_linen',
  'towels',
  'bathroom',
  'kitchen',
  'baby',
  'other',
]

export function HousekeepingSettingsPanel({
  configuration,
  onConfigurationUpdate,
}: HousekeepingSettingsPanelProps) {
  const [productiveMinutes, setProductiveMinutes] = useState(configuration.settings.productiveMinutesPerCleaner)
  const [selectedInterventionTypeId, setSelectedInterventionTypeId] = useState(
    configuration.interventionTypes[0]?.id ?? '',
  )
  const [newIntervention, setNewIntervention] = useState({
    label: '',
    description: '',
    workloadMinutes: 0,
    serviceCategory: 'custom' as HousekeepingServiceCategory,
  })
  const [newItem, setNewItem] = useState({
    label: '',
    unitLabel: 'units',
    category: 'other' as HousekeepingItemCategory,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const selectedInterventionType =
    configuration.interventionTypes.find((type) => type.id === selectedInterventionTypeId) ??
    configuration.interventionTypes[0]
  const selectedRules = useMemo(
    () => new Map(
      configuration.consumptionRules
        .filter((rule) => rule.interventionTypeId === selectedInterventionType?.id)
        .map((rule) => [rule.itemId, rule]),
    ),
    [configuration.consumptionRules, selectedInterventionType?.id],
  )
  const [draftRules, setDraftRules] = useState<Record<string, ConsumptionRuleDraft>>({})

  function getRuleDraft(itemId: string): ConsumptionRuleDraft {
    const draft = draftRules[itemId]
    if (draft) return draft

    const existing = selectedRules.get(itemId)
    return {
      itemId,
      quantityPerApartment: existing?.quantityPerApartment ?? 0,
      quantityPerGuest: existing?.quantityPerGuest ?? 0,
      quantityPerGl: existing?.quantityPerGl ?? 0,
      quantityPerLs: existing?.quantityPerLs ?? 0,
      quantityPerLitbb: existing?.quantityPerLitbb ?? 0,
    }
  }

  async function performSave(action: () => Promise<void>, successMessage: string) {
    setIsSaving(true)
    setErrorMessage(null)
    setMessage(null)

    try {
      await action()
      await onConfigurationUpdate()
      setMessage(successMessage)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save settings.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveCapacity = () => performSave(
    async () => {
      await updateHousekeepingSettings({
        ...configuration.settings,
        productiveMinutesPerCleaner: productiveMinutes,
      })
    },
    'Cleaner capacity saved.',
  )

  const handleCreateIntervention = () => performSave(
    async () => {
      if (!newIntervention.label.trim()) throw new Error('Service type label is required.')
      await createInterventionType({
        label: newIntervention.label,
        description: newIntervention.description,
        serviceCategory: newIntervention.serviceCategory,
        workloadMinutes: newIntervention.workloadMinutes,
        sortOrder: (configuration.interventionTypes.length + 1) * 10,
        active: true,
      })
      setNewIntervention({
        label: '',
        description: '',
        workloadMinutes: 0,
        serviceCategory: 'custom',
      })
    },
    'Service type created.',
  )

  const handleCreateItem = () => performSave(
    async () => {
      if (!newItem.label.trim()) throw new Error('Item label is required.')
      await createHousekeepingItem({
        label: newItem.label,
        unitLabel: newItem.unitLabel,
        category: newItem.category,
        sortOrder: (configuration.items.length + 1) * 10,
        includeInPrint: true,
        includeInForecast: true,
        active: true,
      })
      setNewItem({ label: '', unitLabel: 'units', category: 'other' })
    },
    'Item created.',
  )

  const handleSaveRules = () => performSave(
    async () => {
      if (!selectedInterventionType) throw new Error('Select a service type first.')
      await saveConsumptionRules(
        selectedInterventionType.id,
        configuration.items.map((item) => getRuleDraft(item.id)),
      )
      setDraftRules({})
    },
    'Consumption rules saved.',
  )

  return (
    <div className="space-y-8">
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">{message}</p>
        </div>
      )}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      <SurfaceCard
        title="Staffing capacity"
        description="Define how many productive minutes one cleaner represents."
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Productive minutes per cleaner</span>
            <span className="max-w-md text-xs leading-5 text-slate-500">
              Daily working time effectively available for room servicing. Example: 360 = 6 productive hours.
            </span>
            <input
              type="number"
              min="1"
              placeholder="360"
              value={productiveMinutes}
              onChange={(event) => setProductiveMinutes(parseInt(event.target.value, 10) || 0)}
              className="field-input w-72"
            />
          </label>
          <button
            type="button"
            onClick={handleSaveCapacity}
            disabled={isSaving || productiveMinutes === configuration.settings.productiveMinutesPerCleaner}
            className="button-primary gap-2"
          >
            <Save className="h-3.5 w-3.5" />
            Save capacity
          </button>
        </div>
      </SurfaceCard>

      <SurfaceCard
        title="Intervention types"
        description="Define the service types used by your team and the standard workload attached to each one."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-3 py-3 text-left font-medium text-slate-600">Label</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Category</th>
                <th className="px-3 py-3 text-center font-medium text-slate-600">
                  <span className="inline-flex items-center justify-center gap-1">
                    Minutes
                    <InfoHint text="Estimated workload in minutes for one apartment serviced under this intervention type." />
                  </span>
                </th>
                <th className="px-3 py-3 text-center font-medium text-slate-600">Active</th>
                <th className="px-3 py-3 text-center font-medium text-slate-600">Save</th>
              </tr>
            </thead>
            <tbody>
              {configuration.interventionTypes.map((type) => (
                <InterventionTypeRow
                  key={type.id}
                  type={type}
                  disabled={isSaving}
                  onSave={(updated) => performSave(async () => {
                    await updateInterventionType(updated)
                  }, 'Service type saved.')}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <p className="mb-3 text-sm font-medium text-slate-900">Create service type</p>
          <div className="grid gap-3 md:grid-cols-5">
            <input
              value={newIntervention.label}
              onChange={(event) => setNewIntervention({ ...newIntervention, label: event.target.value })}
              placeholder="Label"
              className="field-input"
            />
            <select
              value={newIntervention.serviceCategory}
              onChange={(event) => setNewIntervention({
                ...newIntervention,
                serviceCategory: event.target.value as HousekeepingServiceCategory,
              })}
              className="field-input"
            >
              {serviceCategories.map((category) => (
                <option key={category} value={category}>{serviceCategoryLabels[category]}</option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              value={newIntervention.workloadMinutes}
              onChange={(event) => setNewIntervention({
                ...newIntervention,
                workloadMinutes: parseInt(event.target.value, 10) || 0,
              })}
              placeholder="Minutes"
              title="Estimated workload in minutes for one apartment serviced under this intervention type."
              className="field-input"
            />
            <input
              value={newIntervention.description}
              onChange={(event) => setNewIntervention({ ...newIntervention, description: event.target.value })}
              placeholder="Description"
              className="field-input"
            />
            <button
              type="button"
              onClick={handleCreateIntervention}
              disabled={isSaving}
              className="button-secondary gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard
        title="Items catalog"
        description="Create the items your team wants OPS to forecast and, when relevant, print on the daily preparation sheet."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-3 py-3 text-left font-medium text-slate-600">Label</th>
                <th className="px-3 py-3 text-left font-medium text-slate-600">Category</th>
                <th className="px-3 py-3 text-center font-medium text-slate-600">Show on printable sheet</th>
                <th className="px-3 py-3 text-center font-medium text-slate-600">Include in forecast</th>
                <th className="px-3 py-3 text-center font-medium text-slate-600">Active</th>
                <th className="px-3 py-3 text-center font-medium text-slate-600">Save</th>
              </tr>
            </thead>
            <tbody>
              {configuration.items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  disabled={isSaving}
                  onSave={(updated) => performSave(async () => {
                    await updateHousekeepingItem(updated)
                  }, 'Item saved.')}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <p className="mb-3 text-sm font-medium text-slate-900">Create item</p>
          <div className="grid gap-3 md:grid-cols-4">
            <input
              value={newItem.label}
              onChange={(event) => setNewItem({ ...newItem, label: event.target.value })}
              placeholder="e.g. Bathrobe, Pillowcase, Sofa bed sheet"
              className="field-input"
            />
            <input
              value={newItem.unitLabel}
              onChange={(event) => setNewItem({ ...newItem, unitLabel: event.target.value })}
              placeholder="Unit label"
              className="field-input"
            />
            <select
              value={newItem.category}
              onChange={(event) => setNewItem({ ...newItem, category: event.target.value as HousekeepingItemCategory })}
              className="field-input"
            >
              {itemCategories.map((category) => (
                <option key={category} value={category}>{itemCategoryLabels[category]}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleCreateItem}
              disabled={isSaving}
              className="button-secondary gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard
        title="Consumption rules"
        description="Define item quantities consumed by each service type."
      >
        {configuration.interventionTypes.length === 0 || configuration.items.length === 0 ? (
          <p className="text-sm text-slate-500">Create at least one service type and one item before configuring rules.</p>
        ) : (
          <div className="space-y-5">
            <p className="max-w-3xl text-xs leading-5 text-slate-500">
              Define how many units of each item are consumed for this service type. Example: entering 1 under GL means 1 unit is consumed for each double bed.
            </p>

            <label className="flex max-w-sm flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Service type</span>
              <select
                value={selectedInterventionType?.id ?? ''}
                onChange={(event) => {
                  setSelectedInterventionTypeId(event.target.value)
                  setDraftRules({})
                }}
                className="field-input"
              >
                {configuration.interventionTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </label>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-3 text-left font-medium text-slate-600">Item</th>
                    <RuleHeader label="Apartment" hint="Quantity consumed once per serviced apartment." />
                    <RuleHeader label="Guest" hint="Quantity consumed per guest in the apartment." />
                    <RuleHeader label="GL" hint="Quantity consumed per double bed / grand lit." />
                    <RuleHeader label="LS" hint="Quantity consumed per single bed / lit simple." />
                    <RuleHeader label="BB" hint="Quantity consumed per baby bed." />
                  </tr>
                </thead>
                <tbody>
                  {configuration.items.filter((item) => item.active).map((item) => {
                    const draft = getRuleDraft(item.id)
                    return (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="px-3 py-3 font-medium text-slate-900">{item.label}</td>
                        {[
                          'quantityPerApartment',
                          'quantityPerGuest',
                          'quantityPerGl',
                          'quantityPerLs',
                          'quantityPerLitbb',
                        ].map((field) => (
                          <td key={field} className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.25"
                              value={draft[field as keyof ConsumptionRuleDraft] as number}
                              onChange={(event) => {
                                const value = Number(event.target.value)
                                setDraftRules({
                                  ...draftRules,
                                  [item.id]: {
                                    ...draft,
                                    [field]: Number.isFinite(value) ? value : 0,
                                  },
                                })
                              }}
                              className="field-input min-h-9 text-center"
                            />
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleSaveRules}
              disabled={isSaving || !selectedInterventionType}
              className="button-primary gap-2"
            >
              <Save className="h-3.5 w-3.5" />
              Save rules
            </button>
          </div>
        )}
      </SurfaceCard>
    </div>
  )
}

type ConsumptionRuleDraft = Omit<HousekeepingConsumptionRule, 'id' | 'organizationId' | 'interventionTypeId' | 'createdAt' | 'updatedAt'>

function InterventionTypeRow({
  type,
  disabled,
  onSave,
}: {
  type: HousekeepingInterventionType
  disabled: boolean
  onSave: (type: HousekeepingInterventionType) => void
}) {
  const [draft, setDraft] = useState(type)

  return (
    <tr className="border-b border-slate-100">
      <td className="px-3 py-3">
        <input
          value={draft.label}
          onChange={(event) => setDraft({ ...draft, label: event.target.value })}
          placeholder="Service type name"
          className="field-input min-h-9"
        />
      </td>
      <td className="px-3 py-3">
        <select
          value={draft.serviceCategory ?? 'custom'}
          onChange={(event) => setDraft({ ...draft, serviceCategory: event.target.value as HousekeepingServiceCategory })}
          className="field-input min-h-9"
        >
          {serviceCategories.map((category) => (
            <option key={category} value={category}>{serviceCategoryLabels[category]}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <input
          type="number"
          min="0"
          value={draft.workloadMinutes}
          onChange={(event) => setDraft({ ...draft, workloadMinutes: parseInt(event.target.value, 10) || 0 })}
          title="Estimated workload in minutes for one apartment serviced under this intervention type."
          className="field-input min-h-9 text-center"
        />
      </td>
      <td className="px-3 py-3 text-center">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
          className="h-4 w-4"
        />
      </td>
      <td className="px-3 py-3 text-center">
        <button type="button" onClick={() => onSave(draft)} disabled={disabled} className="button-pill">
          Save
        </button>
      </td>
    </tr>
  )
}

function ItemRow({
  item,
  disabled,
  onSave,
}: {
  item: HousekeepingItem
  disabled: boolean
  onSave: (item: HousekeepingItem) => void
}) {
  const [draft, setDraft] = useState(item)

  return (
    <tr className="border-b border-slate-100">
      <td className="px-3 py-3">
        <input
          value={draft.label}
          onChange={(event) => setDraft({ ...draft, label: event.target.value })}
          placeholder="e.g. Bathrobe, Pillowcase, Sofa bed sheet"
          className="field-input min-h-9"
        />
      </td>
      <td className="px-3 py-3">
        <select
          value={draft.category ?? 'other'}
          onChange={(event) => setDraft({ ...draft, category: event.target.value as HousekeepingItemCategory })}
          className="field-input min-h-9"
        >
          {itemCategories.map((category) => (
            <option key={category} value={category}>{itemCategoryLabels[category]}</option>
          ))}
        </select>
      </td>
      {[
        ['includeInPrint', draft.includeInPrint],
        ['includeInForecast', draft.includeInForecast],
        ['active', draft.active],
      ].map(([field, checked]) => (
        <td key={field as string} className="px-3 py-3 text-center">
          <input
            type="checkbox"
            checked={checked as boolean}
            onChange={(event) => setDraft({ ...draft, [field as string]: event.target.checked })}
            className="h-4 w-4"
          />
        </td>
      ))}
      <td className="px-3 py-3 text-center">
        <button type="button" onClick={() => onSave(draft)} disabled={disabled} className="button-pill">
          Save
        </button>
      </td>
    </tr>
  )
}

function RuleHeader({ label, hint }: { label: string; hint: string }) {
  return (
    <th className="px-3 py-3 text-center font-medium text-slate-600">
      <span className="inline-flex items-center justify-center gap-1">
        {label}
        <InfoHint text={hint} />
      </span>
    </th>
  )
}

function InfoHint({ text }: { text: string }) {
  return (
    <span
      tabIndex={0}
      title={text}
      aria-label={text}
      className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 outline-none transition-colors hover:text-slate-700 focus:text-slate-700"
    >
      <Info className="h-3.5 w-3.5" strokeWidth={1.8} />
    </span>
  )
}
