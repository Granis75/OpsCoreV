export const housekeepingInterventionTypes = ['departure', 'stayover_z', 'stayover_s'] as const
export const housekeepingPriorities = ['standard', 'early_arrival', 'vip', 'urgent'] as const

export type HousekeepingInterventionType = (typeof housekeepingInterventionTypes)[number]
export type HousekeepingPriority = (typeof housekeepingPriorities)[number]

export const interventionTypeLabels: Record<HousekeepingInterventionType, string> = {
  departure: 'Departure',
  stayover_z: 'Stayover Z',
  stayover_s: 'Stayover S',
}

export const priorityLabels: Record<HousekeepingPriority, string> = {
  standard: 'Standard',
  early_arrival: 'Early arrival',
  vip: 'VIP',
  urgent: 'Urgent',
}

export interface LinenConsumption {
  largeSheets: number
  largeDuvetCovers: number
  smallSheets: number
  smallDuvetCovers: number
  pillowcases: number
  largeTowels: number
  smallTowels: number
  kitchenTowels: number
  bathMats: number
}

export interface HousekeepingEntry {
  id: string
  dailyPlanId: string
  apartmentLabel: string
  interventionType: HousekeepingInterventionType
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
  departureMinutes: number
  stayoverZMinutes: number
  stayoverSMinutes: number
  productiveMinutesPerCleaner: number
  createdAt: string
  updatedAt: string
}

export interface WorkloadCalculation {
  totalMinutes: number
  cleanersNeeded: number
}

export interface DailyPlanSummary {
  apartmentsScheduled: number
  departures: number
  stayoversZ: number
  stayoversS: number
  totalWorkloadMinutes: number
  cleanersNeeded: number
  cleanersOrdered: number
  staffingGap: number
  linens: LinenConsumption
}
