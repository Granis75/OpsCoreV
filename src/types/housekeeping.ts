export const housekeepingPriorities = ['standard', 'early_arrival', 'vip', 'urgent'] as const

export type HousekeepingPriority = (typeof housekeepingPriorities)[number]

export type HousekeepingServiceCategory =
  | 'full_clean'
  | 'partial_service'
  | 'towels_only'
  | 'inspection'
  | 'custom'

export type HousekeepingItemCategory =
  | 'bed_linen'
  | 'towels'
  | 'bathroom'
  | 'kitchen'
  | 'baby'
  | 'other'

export const priorityLabels: Record<HousekeepingPriority, string> = {
  standard: 'Standard',
  early_arrival: 'Early arrival',
  vip: 'VIP',
  urgent: 'Urgent',
}

export const serviceCategoryLabels: Record<HousekeepingServiceCategory, string> = {
  full_clean: 'Full clean',
  partial_service: 'Partial service',
  towels_only: 'Towels only',
  inspection: 'Inspection',
  custom: 'Custom',
}

export const itemCategoryLabels: Record<HousekeepingItemCategory, string> = {
  bed_linen: 'Bed linen',
  towels: 'Towels',
  bathroom: 'Bathroom',
  kitchen: 'Kitchen',
  baby: 'Baby',
  other: 'Other',
}

export interface HousekeepingInterventionType {
  id: string
  organizationId: string
  code: string
  label: string
  description: string | null
  serviceCategory: HousekeepingServiceCategory | null
  workloadMinutes: number
  sortOrder: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface HousekeepingItem {
  id: string
  organizationId: string
  code: string
  label: string
  unitLabel: string
  category: HousekeepingItemCategory | null
  includeInPrint: boolean
  includeInForecast: boolean
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface HousekeepingConsumptionRule {
  id: string
  organizationId: string
  interventionTypeId: string
  itemId: string
  quantityPerApartment: number
  quantityPerGuest: number
  quantityPerGl: number
  quantityPerLs: number
  quantityPerLitbb: number
  createdAt: string
  updatedAt: string
}

export interface ItemConsumptionResult {
  itemId: string
  itemCode: string
  itemLabel: string
  quantity: number
  category: HousekeepingItemCategory | null
  unitLabel: string
  includeInPrint: boolean
  includeInForecast: boolean
  sortOrder: number
}

export type DailyConsumptionSummary = ItemConsumptionResult[]

export interface HousekeepingEntry {
  id: string
  dailyPlanId: string
  interventionTypeId: string
  apartmentLabel: string
  guestsCount: number
  doubleBedsGl: number
  singleBedsLs: number
  babyBedsLitbb: number
  receptionMemo: string | null
  priority: HousekeepingPriority
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface HousekeepingDailyPlan {
  id: string
  organizationId: string
  serviceDate: string
  cleanersOrdered: number
  generalNote: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface HousekeepingSettings {
  id: string
  organizationId: string
  productiveMinutesPerCleaner: number
  createdAt: string
  updatedAt: string
}

export interface HousekeepingConfiguration {
  settings: HousekeepingSettings
  interventionTypes: HousekeepingInterventionType[]
  items: HousekeepingItem[]
  consumptionRules: HousekeepingConsumptionRule[]
}

// ── Stock & Replenishment types ──────────────────────────────────────────────

export type HousekeepingStockMovementType =
  | 'adjustment'
  | 'replenishment'
  | 'consumption_correction'

export const stockMovementTypeLabels: Record<HousekeepingStockMovementType, string> = {
  adjustment: 'Adjustment',
  replenishment: 'Replenishment',
  consumption_correction: 'Consumption correction',
}

export interface HousekeepingItemStockSetting {
  id: string
  organizationId: string
  itemId: string
  stockTrackingEnabled: boolean
  currentStock: number
  minimumStock: number
  targetStock: number
  incomingStock: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface HousekeepingStockMovement {
  id: string
  organizationId: string
  itemId: string
  movementType: HousekeepingStockMovementType
  quantityDelta: number
  note: string | null
  createdBy: string | null
  createdAt: string
}

export type StockStatus = 'healthy' | 'low' | 'critical'

export const stockStatusLabels: Record<StockStatus, string> = {
  healthy: 'Healthy',
  low: 'Reorder soon',
  critical: 'Critical shortage',
}

export interface StockForecastRow {
  itemId: string
  itemLabel: string
  unitLabel: string
  category: HousekeepingItemCategory | null
  currentStock: number
  incomingStock: number
  forecastDemand: number
  projectedStock: number
  minimumStock: number
  targetStock: number
  suggestedReorder: number
  status: StockStatus
  stockSettingId: string
}

export interface StockOverviewSummary {
  trackedItems: number
  itemsAtRisk: number
  criticalShortages: number
  totalSuggestedReorderUnits: number
}

// ── Workload types ───────────────────────────────────────────────────────────

export interface WorkloadCalculation {
  totalMinutes: number
  cleanersNeeded: number
}

export interface ServiceCount {
  interventionTypeId: string
  code: string
  label: string
  count: number
  workloadMinutes: number
}

export interface DailyPlanSummary {
  apartmentsScheduled: number
  serviceCounts: ServiceCount[]
  totalWorkloadMinutes: number
  cleanersNeeded: number
  cleanersOrdered: number
  staffingGap: number
  itemConsumption: DailyConsumptionSummary
}
