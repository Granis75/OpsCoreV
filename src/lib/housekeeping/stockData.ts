import { supabase } from '../supabase'
import type {
  HousekeepingDailyPlan,
  HousekeepingEntry,
  HousekeepingItemStockSetting,
  HousekeepingPriority,
  HousekeepingStockMovement,
  HousekeepingStockMovementType,
} from '../../types/housekeeping'

// ── DB record shapes ──────────────────────────────────────────────────────────

type StockSettingRecord = {
  id: string
  organization_id: string
  item_id: string
  stock_tracking_enabled: boolean
  current_stock: number
  minimum_stock: number
  target_stock: number
  incoming_stock: number
  notes: string | null
  created_at: string
  updated_at: string
}

type StockMovementRecord = {
  id: string
  organization_id: string
  item_id: string
  movement_type: HousekeepingStockMovementType
  quantity_delta: number
  note: string | null
  created_by: string | null
  created_at: string
}

type DailyPlanRecord = {
  id: string
  organization_id: string
  service_date: string
  cleaners_ordered: number
  general_note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

type EntryRecord = {
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function requireSupabase() {
  if (!supabase) throw new Error('Supabase not configured')
  return supabase
}

async function getCurrentOrganizationId(): Promise<{ organizationId: string; userId: string }> {
  const client = requireSupabase()
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError || !userData.user) {
    throw userError ?? new Error('You must be signed in.')
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('organization_id')
    .eq('id', userData.user.id)
    .maybeSingle<{ organization_id: string | null }>()

  if (profileError) throw profileError
  if (!profile?.organization_id) throw new Error('Profile is not linked to an organization.')

  return { organizationId: profile.organization_id, userId: userData.user.id }
}

// ── Mapping functions ─────────────────────────────────────────────────────────

function mapStockSettingRecord(r: StockSettingRecord): HousekeepingItemStockSetting {
  return {
    id: r.id,
    organizationId: r.organization_id,
    itemId: r.item_id,
    stockTrackingEnabled: r.stock_tracking_enabled,
    currentStock: r.current_stock,
    minimumStock: r.minimum_stock,
    targetStock: r.target_stock,
    incomingStock: r.incoming_stock,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function mapStockMovementRecord(r: StockMovementRecord): HousekeepingStockMovement {
  return {
    id: r.id,
    organizationId: r.organization_id,
    itemId: r.item_id,
    movementType: r.movement_type,
    quantityDelta: r.quantity_delta,
    note: r.note,
    createdBy: r.created_by,
    createdAt: r.created_at,
  }
}

function mapDailyPlanRecord(r: DailyPlanRecord): HousekeepingDailyPlan {
  return {
    id: r.id,
    organizationId: r.organization_id,
    serviceDate: r.service_date,
    cleanersOrdered: r.cleaners_ordered,
    generalNote: r.general_note,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function mapEntryRecord(r: EntryRecord): HousekeepingEntry {
  return {
    id: r.id,
    dailyPlanId: r.daily_plan_id,
    interventionTypeId: r.intervention_type_id,
    apartmentLabel: r.apartment_label,
    guestsCount: r.guests_count,
    doubleBedsGl: r.double_beds_gl,
    singleBedsLs: r.single_beds_ls,
    babyBedsLitbb: r.baby_beds_litbb,
    receptionMemo: r.reception_memo,
    priority: r.priority,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getItemStockSettings(): Promise<HousekeepingItemStockSetting[]> {
  const client = requireSupabase()
  const { organizationId } = await getCurrentOrganizationId()

  const { data, error } = await client
    .from('housekeeping_item_stock_settings')
    .select('*')
    .eq('organization_id', organizationId)

  if (error) throw error
  return ((data ?? []) as StockSettingRecord[]).map(mapStockSettingRecord)
}

export type StockSettingInput = {
  itemId: string
  stockTrackingEnabled: boolean
  currentStock: number
  minimumStock: number
  targetStock: number
  incomingStock: number
  notes?: string | null
}

export async function upsertItemStockSetting(
  input: StockSettingInput,
): Promise<HousekeepingItemStockSetting> {
  const client = requireSupabase()
  const { organizationId } = await getCurrentOrganizationId()

  const { data, error } = await client
    .from('housekeeping_item_stock_settings')
    .upsert(
      {
        organization_id: organizationId,
        item_id: input.itemId,
        stock_tracking_enabled: input.stockTrackingEnabled,
        current_stock: input.currentStock,
        minimum_stock: input.minimumStock,
        target_stock: input.targetStock,
        incoming_stock: input.incomingStock,
        notes: input.notes?.trim() || null,
      },
      { onConflict: 'item_id' },
    )
    .select()
    .single<StockSettingRecord>()

  if (error || !data) throw error ?? new Error('Failed to save stock setting.')
  return mapStockSettingRecord(data)
}

export type StockMovementInput = {
  itemId: string
  movementType: HousekeepingStockMovementType
  quantityDelta: number
  note?: string | null
}

export async function createStockMovement(
  input: StockMovementInput,
): Promise<HousekeepingStockMovement> {
  const client = requireSupabase()

  // Single atomic RPC call: locks the stock settings row, validates that
  // new_stock >= 0, updates current_stock, and inserts the movement record
  // — all within one Postgres transaction.
  const { data, error } = await client
    .rpc('record_housekeeping_stock_movement', {
      p_item_id: input.itemId,
      p_movement_type: input.movementType,
      p_quantity_delta: input.quantityDelta,
      p_note: input.note?.trim() || null,
    })
    .single<StockMovementRecord>()

  if (error) throw error
  if (!data) throw new Error('Failed to record stock movement.')

  return mapStockMovementRecord(data)
}

export async function getRecentStockMovements(limit = 20): Promise<HousekeepingStockMovement[]> {
  const client = requireSupabase()
  const { organizationId } = await getCurrentOrganizationId()

  const { data, error } = await client
    .from('housekeeping_stock_movements')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return ((data ?? []) as StockMovementRecord[]).map(mapStockMovementRecord)
}

export interface DailyPlanWithEntries {
  plan: HousekeepingDailyPlan
  entries: HousekeepingEntry[]
}

export async function getDailyPlansWithEntriesInRange(
  startDate: string,
  endDate: string,
): Promise<DailyPlanWithEntries[]> {
  const client = requireSupabase()
  const { organizationId } = await getCurrentOrganizationId()

  const { data: plans, error: plansError } = await client
    .from('housekeeping_daily_plans')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('service_date', startDate)
    .lte('service_date', endDate)
    .order('service_date', { ascending: true })

  if (plansError) throw plansError
  if (!plans || plans.length === 0) return []

  const planIds = (plans as DailyPlanRecord[]).map((p) => p.id)

  const { data: entries, error: entriesError } = await client
    .from('housekeeping_entries')
    .select(
      'id, daily_plan_id, intervention_type_id, apartment_label, guests_count, double_beds_gl, single_beds_ls, baby_beds_litbb, reception_memo, priority, sort_order, created_at, updated_at',
    )
    .in('daily_plan_id', planIds)

  if (entriesError) throw entriesError

  const entriesByPlanId = new Map<string, HousekeepingEntry[]>()
  for (const entry of (entries ?? []) as EntryRecord[]) {
    const mapped = mapEntryRecord(entry)
    const list = entriesByPlanId.get(entry.daily_plan_id) ?? []
    list.push(mapped)
    entriesByPlanId.set(entry.daily_plan_id, list)
  }

  return (plans as DailyPlanRecord[]).map((plan) => ({
    plan: mapDailyPlanRecord(plan),
    entries: entriesByPlanId.get(plan.id) ?? [],
  }))
}
