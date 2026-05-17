import { supabase } from '../supabase'
import type {
  HousekeepingDailyPlan,
  HousekeepingEntry,
  HousekeepingInterventionType,
  HousekeepingPriority,
  HousekeepingSettings,
} from '../../types/housekeeping'

type ProfileOrganizationRecord = {
  organization_id: string | null
}

type HousekeepingEntryRecord = {
  id: string
  daily_plan_id: string
  apartment_label: string
  intervention_type: HousekeepingInterventionType
  guests_count: number
  double_beds_gl: number
  single_beds_ls: number
  baby_beds_litbb: number
  reception_memo: string | null
  priority: HousekeepingPriority
  sort_order: number
  created_at: string
  updated_at: string
}

type HousekeepingDailyPlanRecord = {
  id: string
  organization_id: string
  service_date: string
  cleaners_ordered: number
  general_note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

type HousekeepingSettingsRecord = {
  id: string
  organization_id: string
  departure_minutes: number
  stayover_z_minutes: number
  stayover_s_minutes: number
  productive_minutes_per_cleaner: number
  created_at: string
  updated_at: string
}

async function getCurrentOrganizationId(): Promise<{ organizationId: string; userId: string }> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    throw userError ?? new Error('You must be signed in to use housekeeping.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userData.user.id)
    .maybeSingle<ProfileOrganizationRecord>()

  if (profileError) {
    throw profileError
  }

  if (!profile?.organization_id) {
    throw new Error('Profile is not linked to an organization.')
  }

  return { organizationId: profile.organization_id, userId: userData.user.id }
}

/**
 * Fetch housekeeping settings for the current organization.
 * If settings don't exist, return defaults.
 */
export async function getHousekeepingSettings(): Promise<HousekeepingSettings> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  try {
    const { organizationId } = await getCurrentOrganizationId()

    const { data, error } = await supabase
      .from('housekeeping_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle<HousekeepingSettingsRecord>()

    if (error) {
      throw error
    }

    if (!data) {
      const now = new Date().toISOString()
      const defaults: HousekeepingSettings = {
        id: '',
        organizationId,
        departureMinutes: 45,
        stayoverZMinutes: 35,
        stayoverSMinutes: 0,
        productiveMinutesPerCleaner: 360,
        createdAt: now,
        updatedAt: now,
      }

      const { data: inserted, error: insertError } = await supabase
        .from('housekeeping_settings')
        .insert([
          {
            organization_id: organizationId,
            departure_minutes: 45,
            stayover_z_minutes: 35,
            stayover_s_minutes: 0,
            productive_minutes_per_cleaner: 360,
          },
        ])
        .select()
        .single()

      if (insertError || !inserted) {
        return defaults
      }

      return mapSettingsRecord(inserted)
    }

    return mapSettingsRecord(data)
  } catch (error) {
    console.error('Failed to fetch housekeeping settings:', error)
    throw error
  }
}

/**
 * Update housekeeping settings.
 */
export async function updateHousekeepingSettings(
  settings: Partial<HousekeepingSettings>,
): Promise<HousekeepingSettings> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  try {
    const { data, error } = await supabase
      .from('housekeeping_settings')
      .update({
        departure_minutes: settings.departureMinutes,
        stayover_z_minutes: settings.stayoverZMinutes,
        stayover_s_minutes: settings.stayoverSMinutes,
        productive_minutes_per_cleaner: settings.productiveMinutesPerCleaner,
      })
      .eq('id', settings.id)
      .select()
      .single()

    if (error || !data) {
      throw error || new Error('Failed to update settings')
    }

    return mapSettingsRecord(data)
  } catch (error) {
    console.error('Failed to update housekeeping settings:', error)
    throw error
  }
}

/**
 * Fetch daily plan for a specific date, or create one if it doesn't exist.
 */
export async function getDailyPlan(serviceDate: string): Promise<HousekeepingDailyPlan> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  try {
    const { organizationId, userId } = await getCurrentOrganizationId()

    const { data, error } = await supabase
      .from('housekeeping_daily_plans')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('service_date', serviceDate)
      .maybeSingle<HousekeepingDailyPlanRecord>()

    if (error) {
      throw error
    }

    if (!data) {
      const { data: created, error: createError } = await supabase
        .from('housekeeping_daily_plans')
        .insert([
          {
            organization_id: organizationId,
            service_date: serviceDate,
            cleaners_ordered: 0,
            created_by: userId,
          },
        ])
        .select()
        .single()

      if (createError || !created) {
        throw createError || new Error('Failed to create daily plan')
      }

      return mapDailyPlanRecord(created)
    }

    return mapDailyPlanRecord(data)
  } catch (error) {
    console.error('Failed to get daily plan:', error)
    throw error
  }
}

/**
 * Fetch all entries for a daily plan.
 */
export async function getDailyPlanEntries(
  dailyPlanId: string,
): Promise<HousekeepingEntry[]> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  try {
    const { data, error } = await supabase
      .from('housekeeping_entries')
      .select('*')
      .eq('daily_plan_id', dailyPlanId)
      .order('sort_order', { ascending: true })

    if (error) {
      throw error
    }

    return ((data ?? []) as HousekeepingEntryRecord[]).map(mapEntryRecord)
  } catch (error) {
    console.error('Failed to fetch entries:', error)
    throw error
  }
}

/**
 * Create a new housekeeping entry.
 */
export async function createEntry(
  entry: Omit<HousekeepingEntry, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<HousekeepingEntry> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  try {
    const { data, error } = await supabase
      .from('housekeeping_entries')
      .insert([
        {
          daily_plan_id: entry.dailyPlanId,
          apartment_label: entry.apartmentLabel,
          intervention_type: entry.interventionType,
          guests_count: entry.guestsCount,
          double_beds_gl: entry.doubleBedsGl,
          single_beds_ls: entry.singleBedsLs,
          baby_beds_litbb: entry.babyBedsLitbb,
          reception_memo: entry.receptionMemo,
          priority: entry.priority,
          sort_order: entry.sortOrder,
        },
      ])
      .select()
      .single()

    if (error || !data) {
      throw error || new Error('Failed to create entry')
    }

    return mapEntryRecord(data)
  } catch (error) {
    console.error('Failed to create entry:', error)
    throw error
  }
}

/**
 * Update an existing housekeeping entry.
 */
export async function updateEntry(entry: HousekeepingEntry): Promise<HousekeepingEntry> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  try {
    const { data, error } = await supabase
      .from('housekeeping_entries')
      .update({
        apartment_label: entry.apartmentLabel,
        intervention_type: entry.interventionType,
        guests_count: entry.guestsCount,
        double_beds_gl: entry.doubleBedsGl,
        single_beds_ls: entry.singleBedsLs,
        baby_beds_litbb: entry.babyBedsLitbb,
        reception_memo: entry.receptionMemo,
        priority: entry.priority,
        sort_order: entry.sortOrder,
      })
      .eq('id', entry.id)
      .select()
      .single()

    if (error || !data) {
      throw error || new Error('Failed to update entry')
    }

    return mapEntryRecord(data)
  } catch (error) {
    console.error('Failed to update entry:', error)
    throw error
  }
}

/**
 * Delete a housekeeping entry.
 */
export async function deleteEntry(entryId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  try {
    const { error } = await supabase
      .from('housekeeping_entries')
      .delete()
      .eq('id', entryId)

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Failed to delete entry:', error)
    throw error
  }
}

/**
 * Update daily plan.
 */
export async function updateDailyPlan(
  plan: HousekeepingDailyPlan,
): Promise<HousekeepingDailyPlan> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  try {
    const { data, error } = await supabase
      .from('housekeeping_daily_plans')
      .update({
        cleaners_ordered: plan.cleanersOrdered,
        general_note: plan.generalNote,
      })
      .eq('id', plan.id)
      .select()
      .single()

    if (error || !data) {
      throw error || new Error('Failed to update daily plan')
    }

    return mapDailyPlanRecord(data)
  } catch (error) {
    console.error('Failed to update daily plan:', error)
    throw error
  }
}

/**
 * Fetch daily plans for a date range (for history view).
 */
export async function getDailyPlanHistory(
  startDate: string,
  endDate: string,
): Promise<HousekeepingDailyPlan[]> {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  try {
    const { organizationId } = await getCurrentOrganizationId()

    const { data, error } = await supabase
      .from('housekeeping_daily_plans')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('service_date', startDate)
      .lte('service_date', endDate)
      .order('service_date', { ascending: false })

    if (error) {
      throw error
    }

    return (data ?? []).map(mapDailyPlanRecord)
  } catch (error) {
    console.error('Failed to fetch daily plan history:', error)
    throw error
  }
}

/**
 * Map database record to HousekeepingEntry type.
 */
function mapEntryRecord(record: HousekeepingEntryRecord): HousekeepingEntry {
  return {
    id: record.id,
    dailyPlanId: record.daily_plan_id,
    apartmentLabel: record.apartment_label,
    interventionType: record.intervention_type,
    guestsCount: record.guests_count,
    doubleBedsGl: record.double_beds_gl,
    singleBedsLs: record.single_beds_ls,
    babyBedsLitbb: record.baby_beds_litbb,
    receptionMemo: record.reception_memo,
    priority: record.priority,
    sortOrder: record.sort_order,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

/**
 * Map database record to HousekeepingDailyPlan type.
 */
function mapDailyPlanRecord(record: HousekeepingDailyPlanRecord): HousekeepingDailyPlan {
  return {
    id: record.id,
    organizationId: record.organization_id,
    serviceDate: record.service_date,
    cleanersOrdered: record.cleaners_ordered,
    generalNote: record.general_note,
    createdBy: record.created_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

/**
 * Map database record to HousekeepingSettings type.
 */
function mapSettingsRecord(record: HousekeepingSettingsRecord): HousekeepingSettings {
  return {
    id: record.id,
    organizationId: record.organization_id,
    departureMinutes: record.departure_minutes,
    stayoverZMinutes: record.stayover_z_minutes,
    stayoverSMinutes: record.stayover_s_minutes,
    productiveMinutesPerCleaner: record.productive_minutes_per_cleaner,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}
