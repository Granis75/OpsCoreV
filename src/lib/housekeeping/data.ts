import { supabase } from '../supabase'
import type {
  HousekeepingConfiguration,
  HousekeepingConsumptionRule,
  HousekeepingDailyPlan,
  HousekeepingEntry,
  HousekeepingInterventionType,
  HousekeepingItem,
  HousekeepingItemCategory,
  HousekeepingPriority,
  HousekeepingServiceCategory,
  HousekeepingSettings,
} from '../../types/housekeeping'

type ProfileOrganizationRecord = {
  organization_id: string | null
}

type HousekeepingEntryRecord = {
  id: string
  daily_plan_id: string
  intervention_type_id: string
  apartment_label: string
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
  productive_minutes_per_cleaner: number
  created_at: string
  updated_at: string
}

type HousekeepingInterventionTypeRecord = {
  id: string
  organization_id: string
  code: string
  label: string
  description: string | null
  service_category: HousekeepingServiceCategory | null
  workload_minutes: number
  sort_order: number
  active: boolean
  created_at: string
  updated_at: string
}

type HousekeepingItemRecord = {
  id: string
  organization_id: string
  code: string
  label: string
  unit_label: string | null
  category: HousekeepingItemCategory | null
  include_in_print: boolean
  include_in_forecast: boolean
  active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

type HousekeepingConsumptionRuleRecord = {
  id: string
  organization_id: string
  intervention_type_id: string
  item_id: string
  quantity_per_apartment: number | string
  quantity_per_guest: number | string
  quantity_per_gl: number | string
  quantity_per_ls: number | string
  quantity_per_litbb: number | string
  created_at: string
  updated_at: string
}

export type InterventionTypeInput = {
  code?: string
  label: string
  description?: string | null
  serviceCategory?: HousekeepingServiceCategory | null
  workloadMinutes: number
  sortOrder?: number
  active?: boolean
}

export type ItemInput = {
  code?: string
  label: string
  unitLabel?: string
  category?: HousekeepingItemCategory | null
  includeInPrint?: boolean
  includeInForecast?: boolean
  sortOrder?: number
  active?: boolean
}

export type ConsumptionRuleInput = {
  id?: string
  itemId: string
  quantityPerApartment: number
  quantityPerGuest: number
  quantityPerGl: number
  quantityPerLs: number
  quantityPerLitbb: number
}

const defaultInterventionTypes: InterventionTypeInput[] = [
  {
    code: 'departure',
    label: 'Departure',
    description: 'Full clean after guest departure.',
    serviceCategory: 'full_clean',
    workloadMinutes: 45,
    sortOrder: 10,
    active: true,
  },
  {
    code: 'stayover_z',
    label: 'Stayover Full Change',
    description: 'Stayover service with full linen change.',
    serviceCategory: 'full_clean',
    workloadMinutes: 35,
    sortOrder: 20,
    active: true,
  },
  {
    code: 'stayover_s',
    label: 'Stayover Towels Only',
    description: 'Stayover service focused on towels.',
    serviceCategory: 'towels_only',
    workloadMinutes: 0,
    sortOrder: 30,
    active: true,
  },
]

const defaultItems: ItemInput[] = [
  { code: 'large_sheet', label: 'Large sheet', category: 'bed_linen', sortOrder: 10 },
  { code: 'large_duvet_cover', label: 'Large duvet cover', category: 'bed_linen', sortOrder: 20 },
  { code: 'small_sheet', label: 'Small sheet', category: 'bed_linen', sortOrder: 30 },
  { code: 'small_duvet_cover', label: 'Small duvet cover', category: 'bed_linen', sortOrder: 40 },
  { code: 'pillowcase', label: 'Pillowcase', category: 'bed_linen', sortOrder: 50 },
  { code: 'large_towel', label: 'Large towel', category: 'towels', sortOrder: 60 },
  { code: 'small_towel', label: 'Small towel', category: 'towels', sortOrder: 70 },
  { code: 'kitchen_towel', label: 'Kitchen towel', category: 'kitchen', sortOrder: 80 },
  { code: 'bath_mat', label: 'Bath mat', category: 'bathroom', sortOrder: 90 },
]

const defaultRules = [
  ['departure', 'large_sheet', 0, 0, 1, 0, 0],
  ['departure', 'large_duvet_cover', 0, 0, 1, 0, 0],
  ['departure', 'small_sheet', 0, 0, 0, 1, 0],
  ['departure', 'small_duvet_cover', 0, 0, 0, 1, 0],
  ['departure', 'pillowcase', 0, 2, 0, 0, 0],
  ['departure', 'large_towel', 0, 1, 0, 0, 0],
  ['departure', 'small_towel', 0, 1, 0, 0, 0],
  ['departure', 'kitchen_towel', 1, 0, 0, 0, 0],
  ['departure', 'bath_mat', 1, 0, 0, 0, 0],
  ['stayover_z', 'large_sheet', 0, 0, 1, 0, 0],
  ['stayover_z', 'large_duvet_cover', 0, 0, 1, 0, 0],
  ['stayover_z', 'small_sheet', 0, 0, 0, 1, 0],
  ['stayover_z', 'small_duvet_cover', 0, 0, 0, 1, 0],
  ['stayover_z', 'pillowcase', 0, 2, 0, 0, 0],
  ['stayover_z', 'large_towel', 0, 1, 0, 0, 0],
  ['stayover_z', 'small_towel', 0, 1, 0, 0, 0],
  ['stayover_z', 'kitchen_towel', 1, 0, 0, 0, 0],
  ['stayover_z', 'bath_mat', 1, 0, 0, 0, 0],
  ['stayover_s', 'large_towel', 0, 1, 0, 0, 0],
  ['stayover_s', 'small_towel', 0, 1, 0, 0, 0],
] as const

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  return supabase
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
}

async function getCurrentOrganizationId(): Promise<{ organizationId: string; userId: string }> {
  const client = requireSupabase()
  const { data: userData, error: userError } = await client.auth.getUser()

  if (userError || !userData.user) {
    throw userError ?? new Error('You must be signed in to use housekeeping.')
  }

  const { data: profile, error: profileError } = await client
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

async function getOrCreateSettings(organizationId: string): Promise<HousekeepingSettings> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('housekeeping_settings')
    .select('id, organization_id, productive_minutes_per_cleaner, created_at, updated_at')
    .eq('organization_id', organizationId)
    .maybeSingle<HousekeepingSettingsRecord>()

  if (error) throw error
  if (data) return mapSettingsRecord(data)

  const { data: inserted, error: insertError } = await client
    .from('housekeeping_settings')
    .insert([{ organization_id: organizationId, productive_minutes_per_cleaner: 360 }])
    .select('id, organization_id, productive_minutes_per_cleaner, created_at, updated_at')
    .single<HousekeepingSettingsRecord>()

  if (insertError || !inserted) {
    throw insertError ?? new Error('Failed to create housekeeping settings.')
  }

  return mapSettingsRecord(inserted)
}

export async function initializeDefaultHousekeepingConfiguration(): Promise<HousekeepingConfiguration> {
  const client = requireSupabase()
  const { organizationId } = await getCurrentOrganizationId()

  await getOrCreateSettings(organizationId)

  const { error: interventionError } = await client
    .from('housekeeping_intervention_types')
    .upsert(
      defaultInterventionTypes.map((type) => ({
        organization_id: organizationId,
        code: type.code,
        label: type.label,
        description: type.description,
        service_category: type.serviceCategory,
        workload_minutes: type.workloadMinutes,
        sort_order: type.sortOrder,
        active: type.active,
      })),
      { onConflict: 'organization_id,code', ignoreDuplicates: true },
    )

  if (interventionError) throw interventionError

  const { error: itemError } = await client
    .from('housekeeping_items')
    .upsert(
      defaultItems.map((item) => ({
        organization_id: organizationId,
        code: item.code,
        label: item.label,
        unit_label: item.unitLabel ?? 'units',
        category: item.category,
        include_in_print: item.includeInPrint ?? true,
        include_in_forecast: item.includeInForecast ?? true,
        sort_order: item.sortOrder,
        active: item.active ?? true,
      })),
      { onConflict: 'organization_id,code', ignoreDuplicates: true },
    )

  if (itemError) throw itemError

  const [interventionTypes, items] = await Promise.all([
    getInterventionTypes(false),
    getHousekeepingItems(false),
  ])
  const interventionByCode = new Map(interventionTypes.map((type) => [type.code, type]))
  const itemByCode = new Map(items.map((item) => [item.code, item]))

  const ruleRows = defaultRules.flatMap(
    ([interventionCode, itemCode, perApartment, perGuest, perGl, perLs, perLitbb]) => {
      const intervention = interventionByCode.get(interventionCode)
      const item = itemByCode.get(itemCode)
      if (!intervention || !item) return []

      return [{
        organization_id: organizationId,
        intervention_type_id: intervention.id,
        item_id: item.id,
        quantity_per_apartment: perApartment,
        quantity_per_guest: perGuest,
        quantity_per_gl: perGl,
        quantity_per_ls: perLs,
        quantity_per_litbb: perLitbb,
      }]
    },
  )

  if (ruleRows.length > 0) {
    const { error: rulesError } = await client
      .from('housekeeping_consumption_rules')
      .upsert(ruleRows, { onConflict: 'intervention_type_id,item_id', ignoreDuplicates: true })

    if (rulesError) throw rulesError
  }

  return getHousekeepingConfiguration(false)
}

export async function getHousekeepingConfiguration(
  initializeIfEmpty = true,
): Promise<HousekeepingConfiguration> {
  const { organizationId } = await getCurrentOrganizationId()
  const [settings, interventionTypes, items, consumptionRules] = await Promise.all([
    getOrCreateSettings(organizationId),
    getInterventionTypes(false),
    getHousekeepingItems(false),
    getConsumptionRules(),
  ])

  if (initializeIfEmpty && (interventionTypes.length === 0 || items.length === 0)) {
    return initializeDefaultHousekeepingConfiguration()
  }

  return {
    settings,
    interventionTypes,
    items,
    consumptionRules,
  }
}

export async function updateHousekeepingSettings(
  settings: Partial<HousekeepingSettings>,
): Promise<HousekeepingSettings> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('housekeeping_settings')
    .update({
      productive_minutes_per_cleaner: settings.productiveMinutesPerCleaner,
    })
    .eq('id', settings.id)
    .select('id, organization_id, productive_minutes_per_cleaner, created_at, updated_at')
    .single<HousekeepingSettingsRecord>()

  if (error || !data) {
    throw error || new Error('Failed to update settings')
  }

  return mapSettingsRecord(data)
}

export async function getInterventionTypes(activeOnly = true): Promise<HousekeepingInterventionType[]> {
  const client = requireSupabase()
  const { organizationId } = await getCurrentOrganizationId()
  let query = client
    .from('housekeeping_intervention_types')
    .select('*')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true })

  if (activeOnly) query = query.eq('active', true)

  const { data, error } = await query
  if (error) throw error

  return ((data ?? []) as HousekeepingInterventionTypeRecord[]).map(mapInterventionTypeRecord)
}

export async function createInterventionType(input: InterventionTypeInput) {
  const client = requireSupabase()
  const { organizationId } = await getCurrentOrganizationId()
  const code = input.code?.trim() ? slugify(input.code) : slugify(input.label)

  const { data, error } = await client
    .from('housekeeping_intervention_types')
    .insert([{
      organization_id: organizationId,
      code,
      label: input.label.trim(),
      description: input.description?.trim() || null,
      service_category: input.serviceCategory ?? 'custom',
      workload_minutes: input.workloadMinutes,
      sort_order: input.sortOrder ?? 100,
      active: input.active ?? true,
    }])
    .select()
    .single<HousekeepingInterventionTypeRecord>()

  if (error || !data) throw error || new Error('Failed to create intervention type.')
  return mapInterventionTypeRecord(data)
}

export async function updateInterventionType(
  type: HousekeepingInterventionType,
): Promise<HousekeepingInterventionType> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('housekeeping_intervention_types')
    .update({
      label: type.label.trim(),
      description: type.description?.trim() || null,
      service_category: type.serviceCategory,
      workload_minutes: type.workloadMinutes,
      sort_order: type.sortOrder,
      active: type.active,
    })
    .eq('id', type.id)
    .select()
    .single<HousekeepingInterventionTypeRecord>()

  if (error || !data) throw error || new Error('Failed to update intervention type.')
  return mapInterventionTypeRecord(data)
}

export async function getHousekeepingItems(activeOnly = true): Promise<HousekeepingItem[]> {
  const client = requireSupabase()
  const { organizationId } = await getCurrentOrganizationId()
  let query = client
    .from('housekeeping_items')
    .select('*')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true })

  if (activeOnly) query = query.eq('active', true)

  const { data, error } = await query
  if (error) throw error

  return ((data ?? []) as HousekeepingItemRecord[]).map(mapItemRecord)
}

export async function createHousekeepingItem(input: ItemInput) {
  const client = requireSupabase()
  const { organizationId } = await getCurrentOrganizationId()
  const code = input.code?.trim() ? slugify(input.code) : slugify(input.label)

  const { data, error } = await client
    .from('housekeeping_items')
    .insert([{
      organization_id: organizationId,
      code,
      label: input.label.trim(),
      unit_label: input.unitLabel?.trim() || 'units',
      category: input.category ?? 'other',
      include_in_print: input.includeInPrint ?? true,
      include_in_forecast: input.includeInForecast ?? true,
      sort_order: input.sortOrder ?? 100,
      active: input.active ?? true,
    }])
    .select()
    .single<HousekeepingItemRecord>()

  if (error || !data) throw error || new Error('Failed to create item.')
  return mapItemRecord(data)
}

export async function updateHousekeepingItem(item: HousekeepingItem): Promise<HousekeepingItem> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('housekeeping_items')
    .update({
      label: item.label.trim(),
      unit_label: item.unitLabel.trim() || 'units',
      category: item.category,
      include_in_print: item.includeInPrint,
      include_in_forecast: item.includeInForecast,
      sort_order: item.sortOrder,
      active: item.active,
    })
    .eq('id', item.id)
    .select()
    .single<HousekeepingItemRecord>()

  if (error || !data) throw error || new Error('Failed to update item.')
  return mapItemRecord(data)
}

export async function getConsumptionRules(): Promise<HousekeepingConsumptionRule[]> {
  const client = requireSupabase()
  const { organizationId } = await getCurrentOrganizationId()
  const { data, error } = await client
    .from('housekeeping_consumption_rules')
    .select('*')
    .eq('organization_id', organizationId)

  if (error) throw error

  return ((data ?? []) as HousekeepingConsumptionRuleRecord[]).map(mapConsumptionRuleRecord)
}

export async function saveConsumptionRules(
  interventionTypeId: string,
  rules: ConsumptionRuleInput[],
): Promise<HousekeepingConsumptionRule[]> {
  const client = requireSupabase()
  const { organizationId } = await getCurrentOrganizationId()
  const rows = rules.map((rule) => ({
    organization_id: organizationId,
    intervention_type_id: interventionTypeId,
    item_id: rule.itemId,
    quantity_per_apartment: rule.quantityPerApartment,
    quantity_per_guest: rule.quantityPerGuest,
    quantity_per_gl: rule.quantityPerGl,
    quantity_per_ls: rule.quantityPerLs,
    quantity_per_litbb: rule.quantityPerLitbb,
  }))

  const { data, error } = await client
    .from('housekeeping_consumption_rules')
    .upsert(rows, { onConflict: 'intervention_type_id,item_id' })
    .select()

  if (error) throw error

  return ((data ?? []) as HousekeepingConsumptionRuleRecord[]).map(mapConsumptionRuleRecord)
}

export async function getDailyPlan(serviceDate: string): Promise<HousekeepingDailyPlan> {
  const client = requireSupabase()
  const { organizationId, userId } = await getCurrentOrganizationId()

  const { data, error } = await client
    .from('housekeeping_daily_plans')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('service_date', serviceDate)
    .maybeSingle<HousekeepingDailyPlanRecord>()

  if (error) throw error

  if (!data) {
    const { data: created, error: createError } = await client
      .from('housekeeping_daily_plans')
      .insert([{
        organization_id: organizationId,
        service_date: serviceDate,
        cleaners_ordered: 0,
        created_by: userId,
      }])
      .select()
      .single<HousekeepingDailyPlanRecord>()

    if (createError || !created) {
      throw createError || new Error('Failed to create daily plan')
    }

    return mapDailyPlanRecord(created)
  }

  return mapDailyPlanRecord(data)
}

export async function getDailyPlanEntries(
  dailyPlanId: string,
): Promise<HousekeepingEntry[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('housekeeping_entries')
    .select('id, daily_plan_id, intervention_type_id, apartment_label, guests_count, double_beds_gl, single_beds_ls, baby_beds_litbb, reception_memo, priority, sort_order, created_at, updated_at')
    .eq('daily_plan_id', dailyPlanId)
    .order('sort_order', { ascending: true })

  if (error) throw error

  return ((data ?? []) as HousekeepingEntryRecord[]).map(mapEntryRecord)
}

export async function createEntry(
  entry: Omit<HousekeepingEntry, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<HousekeepingEntry> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('housekeeping_entries')
    .insert([{
      daily_plan_id: entry.dailyPlanId,
      intervention_type_id: entry.interventionTypeId,
      apartment_label: entry.apartmentLabel.trim(),
      guests_count: entry.guestsCount,
      double_beds_gl: entry.doubleBedsGl,
      single_beds_ls: entry.singleBedsLs,
      baby_beds_litbb: entry.babyBedsLitbb,
      reception_memo: entry.receptionMemo,
      priority: entry.priority,
      sort_order: entry.sortOrder,
    }])
    .select('id, daily_plan_id, intervention_type_id, apartment_label, guests_count, double_beds_gl, single_beds_ls, baby_beds_litbb, reception_memo, priority, sort_order, created_at, updated_at')
    .single<HousekeepingEntryRecord>()

  if (error || !data) throw error || new Error('Failed to create entry')

  return mapEntryRecord(data)
}

export async function updateEntry(entry: HousekeepingEntry): Promise<HousekeepingEntry> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('housekeeping_entries')
    .update({
      apartment_label: entry.apartmentLabel.trim(),
      intervention_type_id: entry.interventionTypeId,
      guests_count: entry.guestsCount,
      double_beds_gl: entry.doubleBedsGl,
      single_beds_ls: entry.singleBedsLs,
      baby_beds_litbb: entry.babyBedsLitbb,
      reception_memo: entry.receptionMemo,
      priority: entry.priority,
      sort_order: entry.sortOrder,
    })
    .eq('id', entry.id)
    .select('id, daily_plan_id, intervention_type_id, apartment_label, guests_count, double_beds_gl, single_beds_ls, baby_beds_litbb, reception_memo, priority, sort_order, created_at, updated_at')
    .single<HousekeepingEntryRecord>()

  if (error || !data) throw error || new Error('Failed to update entry')

  return mapEntryRecord(data)
}

export async function deleteEntry(entryId: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client
    .from('housekeeping_entries')
    .delete()
    .eq('id', entryId)

  if (error) throw error
}

export async function updateDailyPlan(
  plan: HousekeepingDailyPlan,
): Promise<HousekeepingDailyPlan> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('housekeeping_daily_plans')
    .update({
      cleaners_ordered: plan.cleanersOrdered,
      general_note: plan.generalNote,
    })
    .eq('id', plan.id)
    .select()
    .single<HousekeepingDailyPlanRecord>()

  if (error || !data) throw error || new Error('Failed to update daily plan')

  return mapDailyPlanRecord(data)
}

export async function getDailyPlanHistory(
  startDate: string,
  endDate: string,
): Promise<HousekeepingDailyPlan[]> {
  const client = requireSupabase()
  const { organizationId } = await getCurrentOrganizationId()
  const { data, error } = await client
    .from('housekeeping_daily_plans')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('service_date', startDate)
    .lte('service_date', endDate)
    .order('service_date', { ascending: false })

  if (error) throw error

  return ((data ?? []) as HousekeepingDailyPlanRecord[]).map(mapDailyPlanRecord)
}

function parseQuantity(value: number | string) {
  return typeof value === 'number' ? value : Number(value)
}

function mapEntryRecord(record: HousekeepingEntryRecord): HousekeepingEntry {
  return {
    id: record.id,
    dailyPlanId: record.daily_plan_id,
    interventionTypeId: record.intervention_type_id,
    apartmentLabel: record.apartment_label,
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

function mapSettingsRecord(record: HousekeepingSettingsRecord): HousekeepingSettings {
  return {
    id: record.id,
    organizationId: record.organization_id,
    productiveMinutesPerCleaner: record.productive_minutes_per_cleaner,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

function mapInterventionTypeRecord(
  record: HousekeepingInterventionTypeRecord,
): HousekeepingInterventionType {
  return {
    id: record.id,
    organizationId: record.organization_id,
    code: record.code,
    label: record.label,
    description: record.description,
    serviceCategory: record.service_category,
    workloadMinutes: record.workload_minutes,
    sortOrder: record.sort_order,
    active: record.active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

function mapItemRecord(record: HousekeepingItemRecord): HousekeepingItem {
  return {
    id: record.id,
    organizationId: record.organization_id,
    code: record.code,
    label: record.label,
    unitLabel: record.unit_label ?? 'units',
    category: record.category,
    includeInPrint: record.include_in_print,
    includeInForecast: record.include_in_forecast,
    active: record.active,
    sortOrder: record.sort_order,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

function mapConsumptionRuleRecord(
  record: HousekeepingConsumptionRuleRecord,
): HousekeepingConsumptionRule {
  return {
    id: record.id,
    organizationId: record.organization_id,
    interventionTypeId: record.intervention_type_id,
    itemId: record.item_id,
    quantityPerApartment: parseQuantity(record.quantity_per_apartment),
    quantityPerGuest: parseQuantity(record.quantity_per_guest),
    quantityPerGl: parseQuantity(record.quantity_per_gl),
    quantityPerLs: parseQuantity(record.quantity_per_ls),
    quantityPerLitbb: parseQuantity(record.quantity_per_litbb),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}
