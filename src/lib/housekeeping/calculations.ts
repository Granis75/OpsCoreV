import type {
  DailyConsumptionSummary,
  HousekeepingConsumptionRule,
  HousekeepingEntry,
  HousekeepingInterventionType,
  HousekeepingItem,
  HousekeepingItemStockSetting,
  ItemConsumptionResult,
  ServiceCount,
  StockForecastRow,
  StockOverviewSummary,
  StockStatus,
  WorkloadCalculation,
} from '../../types/housekeeping'

function sortBySortOrder<T extends { sortOrder: number; label?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return (a.label ?? '').localeCompare(b.label ?? '')
  })
}

function calculateRuleQuantity(entry: HousekeepingEntry, rule: HousekeepingConsumptionRule) {
  return (
    rule.quantityPerApartment +
    rule.quantityPerGuest * entry.guestsCount +
    rule.quantityPerGl * entry.doubleBedsGl +
    rule.quantityPerLs * entry.singleBedsLs +
    rule.quantityPerLitbb * entry.babyBedsLitbb
  )
}

export function calculateEntryItemConsumption(
  entry: HousekeepingEntry,
  items: HousekeepingItem[],
  rules: HousekeepingConsumptionRule[],
): DailyConsumptionSummary {
  const activeItems = sortBySortOrder(items.filter((item) => item.active))
  const rulesForType = rules.filter((rule) => rule.interventionTypeId === entry.interventionTypeId)

  return activeItems.map((item): ItemConsumptionResult => {
    const itemRules = rulesForType.filter((rule) => rule.itemId === item.id)
    const quantity = itemRules.reduce((sum, rule) => sum + calculateRuleQuantity(entry, rule), 0)

    return {
      itemId: item.id,
      itemCode: item.code,
      itemLabel: item.label,
      quantity,
      category: item.category,
      unitLabel: item.unitLabel,
      includeInPrint: item.includeInPrint,
      includeInForecast: item.includeInForecast,
      sortOrder: item.sortOrder,
    }
  })
}

export function aggregateDailyItemConsumption(
  entries: HousekeepingEntry[],
  items: HousekeepingItem[],
  rules: HousekeepingConsumptionRule[],
): DailyConsumptionSummary {
  const activeItems = sortBySortOrder(items.filter((item) => item.active))
  const totals = new Map<string, ItemConsumptionResult>()

  for (const item of activeItems) {
    totals.set(item.id, {
      itemId: item.id,
      itemCode: item.code,
      itemLabel: item.label,
      quantity: 0,
      category: item.category,
      unitLabel: item.unitLabel,
      includeInPrint: item.includeInPrint,
      includeInForecast: item.includeInForecast,
      sortOrder: item.sortOrder,
    })
  }

  for (const entry of entries) {
    for (const consumption of calculateEntryItemConsumption(entry, activeItems, rules)) {
      const current = totals.get(consumption.itemId)
      if (current) {
        current.quantity += consumption.quantity
      }
    }
  }

  return sortBySortOrder(Array.from(totals.values()).map((item) => ({ ...item, label: item.itemLabel })))
}

export function getTotalItemUnits(items: DailyConsumptionSummary, filter?: 'forecast' | 'print') {
  return items.reduce((sum, item) => {
    if (filter === 'forecast' && !item.includeInForecast) return sum
    if (filter === 'print' && !item.includeInPrint) return sum
    return sum + item.quantity
  }, 0)
}

export function calculateEntryWorkloadMinutes(
  entry: HousekeepingEntry,
  interventionTypes: HousekeepingInterventionType[],
): number {
  const interventionType = interventionTypes.find((type) => type.id === entry.interventionTypeId)
  return interventionType?.workloadMinutes ?? 0
}

export function aggregateDailyWorkloadMinutes(
  entries: HousekeepingEntry[],
  interventionTypes: HousekeepingInterventionType[],
): number {
  return entries.reduce(
    (total, entry) => total + calculateEntryWorkloadMinutes(entry, interventionTypes),
    0,
  )
}

export function calculateCleanersNeeded(
  totalMinutes: number,
  productiveMinutesPerCleaner: number,
): number {
  if (totalMinutes <= 0 || productiveMinutesPerCleaner <= 0) return 0
  return Math.ceil(totalMinutes / productiveMinutesPerCleaner)
}

export function calculateWorkloadAndCleanersNeeded(
  entries: HousekeepingEntry[],
  interventionTypes: HousekeepingInterventionType[],
  productiveMinutesPerCleaner: number,
): WorkloadCalculation {
  const totalMinutes = aggregateDailyWorkloadMinutes(entries, interventionTypes)
  const cleanersNeeded = calculateCleanersNeeded(totalMinutes, productiveMinutesPerCleaner)

  return {
    totalMinutes,
    cleanersNeeded,
  }
}

export function countInterventionTypes(
  entries: HousekeepingEntry[],
  interventionTypes: HousekeepingInterventionType[],
): ServiceCount[] {
  const counts = new Map<string, number>()

  for (const entry of entries) {
    counts.set(entry.interventionTypeId, (counts.get(entry.interventionTypeId) ?? 0) + 1)
  }

  return sortBySortOrder(interventionTypes).map((type) => ({
    interventionTypeId: type.id,
    code: type.code,
    label: type.label,
    count: counts.get(type.id) ?? 0,
    workloadMinutes: type.workloadMinutes,
  }))
}

// ── Stock & Replenishment calculations ───────────────────────────────────────

export function calculateProjectedStock(
  currentStock: number,
  incomingStock: number,
  forecastDemand: number,
): number {
  return currentStock + incomingStock - forecastDemand
}

export function calculateSuggestedReorder(projectedStock: number, targetStock: number): number {
  return Math.max(0, targetStock - projectedStock)
}

export function deriveStockStatus(projectedStock: number, minimumStock: number): StockStatus {
  if (projectedStock < 0) return 'critical'
  if (projectedStock < minimumStock) return 'low'
  return 'healthy'
}

export function buildStockForecastRows(
  stockSettings: HousekeepingItemStockSetting[],
  items: HousekeepingItem[],
  forecastConsumption: DailyConsumptionSummary,
): StockForecastRow[] {
  return stockSettings
    .filter((setting) => setting.stockTrackingEnabled)
    .flatMap((setting): StockForecastRow[] => {
      const item = items.find((i) => i.id === setting.itemId)
      if (!item) return []

      const consumed = forecastConsumption.find((c) => c.itemId === setting.itemId)
      const forecastDemand = consumed?.quantity ?? 0
      const projectedStock = calculateProjectedStock(
        setting.currentStock,
        setting.incomingStock,
        forecastDemand,
      )

      return [{
        itemId: item.id,
        itemLabel: item.label,
        unitLabel: item.unitLabel,
        category: item.category,
        currentStock: setting.currentStock,
        incomingStock: setting.incomingStock,
        forecastDemand,
        projectedStock,
        minimumStock: setting.minimumStock,
        targetStock: setting.targetStock,
        suggestedReorder: calculateSuggestedReorder(projectedStock, setting.targetStock),
        status: deriveStockStatus(projectedStock, setting.minimumStock),
        stockSettingId: setting.id,
      }]
    })
}

export function computeStockOverviewSummary(rows: StockForecastRow[]): StockOverviewSummary {
  return {
    trackedItems: rows.length,
    itemsAtRisk: rows.filter((r) => r.status === 'low' || r.status === 'critical').length,
    criticalShortages: rows.filter((r) => r.status === 'critical').length,
    totalSuggestedReorderUnits: rows.reduce((sum, r) => sum + r.suggestedReorder, 0),
  }
}

// ── Intervention type label helper ───────────────────────────────────────────

export function getInterventionTypeLabel(
  interventionTypeId: string,
  interventionTypes: HousekeepingInterventionType[],
) {
  return interventionTypes.find((type) => type.id === interventionTypeId)?.label ?? 'Service'
}
