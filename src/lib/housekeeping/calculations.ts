import type {
  HousekeepingEntry,
  HousekeepingInterventionType,
  LinenConsumption,
  WorkloadCalculation,
} from '../../types/housekeeping'

/**
 * Calculate linen consumption for a single housekeeping entry
 * based on the intervention type and room/guest configuration.
 */
export function calculateEntryLinenConsumption(
  entry: HousekeepingEntry,
): LinenConsumption {
  const guestsCount = Math.max(0, entry.guestsCount)
  const doubleBedsGl = Math.max(0, entry.doubleBedsGl)
  const singleBedsLs = Math.max(0, entry.singleBedsLs)

  const consumption: LinenConsumption = {
    largeSheets: 0,
    largeDuvetCovers: 0,
    smallSheets: 0,
    smallDuvetCovers: 0,
    pillowcases: 0,
    largeTowels: 0,
    smallTowels: 0,
    kitchenTowels: 0,
    bathMats: 0,
  }

  if (entry.interventionType === 'departure' || entry.interventionType === 'stayover_z') {
    // Full linen changes
    consumption.largeSheets = doubleBedsGl
    consumption.largeDuvetCovers = doubleBedsGl
    consumption.smallSheets = singleBedsLs
    consumption.smallDuvetCovers = singleBedsLs

    consumption.pillowcases = guestsCount * 2
    consumption.largeTowels = guestsCount
    consumption.smallTowels = guestsCount

    consumption.kitchenTowels = 1
    consumption.bathMats = 1
  } else if (entry.interventionType === 'stayover_s') {
    // Towels only
    consumption.largeTowels = guestsCount
    consumption.smallTowels = guestsCount
  }

  return consumption
}

/**
 * Aggregate linen consumption across multiple entries.
 */
export function aggregateDailyLinenConsumption(
  entries: HousekeepingEntry[],
): LinenConsumption {
  const totals: LinenConsumption = {
    largeSheets: 0,
    largeDuvetCovers: 0,
    smallSheets: 0,
    smallDuvetCovers: 0,
    pillowcases: 0,
    largeTowels: 0,
    smallTowels: 0,
    kitchenTowels: 0,
    bathMats: 0,
  }

  for (const entry of entries) {
    const consumption = calculateEntryLinenConsumption(entry)

    totals.largeSheets += consumption.largeSheets
    totals.largeDuvetCovers += consumption.largeDuvetCovers
    totals.smallSheets += consumption.smallSheets
    totals.smallDuvetCovers += consumption.smallDuvetCovers
    totals.pillowcases += consumption.pillowcases
    totals.largeTowels += consumption.largeTowels
    totals.smallTowels += consumption.smallTowels
    totals.kitchenTowels += consumption.kitchenTowels
    totals.bathMats += consumption.bathMats
  }

  return totals
}

/**
 * Calculate workload minutes for a single entry.
 */
export function calculateEntryWorkloadMinutes(
  entry: HousekeepingEntry,
  workloadMinutes: Record<HousekeepingInterventionType, number>,
): number {
  return workloadMinutes[entry.interventionType] ?? 0
}

/**
 * Aggregate workload minutes across multiple entries.
 */
export function aggregateDailyWorkloadMinutes(
  entries: HousekeepingEntry[],
  workloadMinutes: Record<HousekeepingInterventionType, number>,
): number {
  let total = 0

  for (const entry of entries) {
    total += calculateEntryWorkloadMinutes(entry, workloadMinutes)
  }

  return total
}

/**
 * Calculate cleaners needed based on total workload minutes.
 */
export function calculateCleanersNeeded(
  totalMinutes: number,
  productiveMinutesPerCleaner: number,
): number {
  if (totalMinutes <= 0 || productiveMinutesPerCleaner <= 0) return 0
  return Math.ceil(totalMinutes / productiveMinutesPerCleaner)
}

/**
 * Calculate workload for all entries and return cleaners needed.
 */
export function calculateWorkloadAndCleanersNeeded(
  entries: HousekeepingEntry[],
  departureMinutes: number,
  stayoverZMinutes: number,
  stayoverSMinutes: number,
  productiveMinutesPerCleaner: number,
): WorkloadCalculation {
  const workloadMinutes = {
    departure: departureMinutes,
    stayover_z: stayoverZMinutes,
    stayover_s: stayoverSMinutes,
  }

  const totalMinutes = aggregateDailyWorkloadMinutes(entries, workloadMinutes)
  const cleanersNeeded = calculateCleanersNeeded(totalMinutes, productiveMinutesPerCleaner)

  return {
    totalMinutes,
    cleanersNeeded,
  }
}

/**
 * Count intervention types in entries.
 */
export function countInterventionTypes(entries: HousekeepingEntry[]) {
  const counts = {
    departure: 0,
    stayover_z: 0,
    stayover_s: 0,
  }

  for (const entry of entries) {
    counts[entry.interventionType]++
  }

  return counts
}

/**
 * Get total linen units count (sum of all items).
 */
export function getTotalLinenUnits(linen: LinenConsumption): number {
  return (
    linen.largeSheets +
    linen.largeDuvetCovers +
    linen.smallSheets +
    linen.smallDuvetCovers +
    linen.pillowcases +
    linen.largeTowels +
    linen.smallTowels +
    linen.kitchenTowels +
    linen.bathMats
  )
}
