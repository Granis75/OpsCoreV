import { supabase } from './supabase'
import type {
  VendorCategory,
  VendorDetailRecord,
  VendorInteractionRecord,
  VendorInteractionType,
  VendorListRecord,
  VendorStatus,
} from '../types/vendors'

interface VendorCategoryRow {
  id: string
  name: string
  description: string | null
}

interface VendorRow {
  id: string
  name: string
  status: VendorStatus
  contact_name: string | null
  phone: string | null
  email: string | null
  notes: string | null
  is_preferred: boolean
  vendor_category_id: string | null
}

interface VendorInteractionRow {
  id: string
  interaction_type: VendorInteractionType
  interaction_at: string
  summary: string
  details: string | null
}

interface VendorWriteRow {
  id: string
  name: string
  status: VendorStatus
  contact_name: string | null
  phone: string | null
  email: string | null
  notes: string | null
  is_preferred: boolean
  vendor_category_id: string | null
}

async function getSupabaseClient() {
  if (!supabase) {
    throw new Error(
      'Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the root .env.local file.',
    )
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    throw new Error(error.message)
  }

  if (!session) {
    throw new Error(
      'No active Supabase session. Vendors data requires an authenticated user.',
    )
  }

  return supabase
}

function mapCategory(row: VendorCategoryRow): VendorCategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
  }
}

function buildCategoryMap(rows: VendorCategoryRow[] | null) {
  return new Map((rows ?? []).map((row) => [row.id, mapCategory(row)]))
}

function mapVendorListRecord(
  row: VendorRow,
  categoryMap: Map<string, VendorCategory>,
): VendorListRecord {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    phone: row.phone,
    isPreferred: row.is_preferred,
    category: row.vendor_category_id ? categoryMap.get(row.vendor_category_id) ?? null : null,
  }
}

export async function getVendors(): Promise<VendorListRecord[]> {
  const client = await getSupabaseClient()

  const [{ data: vendors, error: vendorsError }, { data: categories, error: categoriesError }] =
    await Promise.all([
      client
        .from('vendors')
        .select('id, name, status, phone, is_preferred, vendor_category_id')
        .order('name', { ascending: true }),
      client.from('vendor_categories').select('id, name, description').order('name', {
        ascending: true,
      }),
    ])

  if (vendorsError) {
    throw new Error(vendorsError.message)
  }

  if (categoriesError) {
    throw new Error(categoriesError.message)
  }

  const categoryMap = buildCategoryMap(categories as VendorCategoryRow[] | null)

  return ((vendors as VendorRow[] | null) ?? []).map((vendor) =>
    mapVendorListRecord(vendor, categoryMap),
  )
}

export async function getVendorById(id: string): Promise<VendorDetailRecord | null> {
  const client = await getSupabaseClient()

  const { data, error } = await client
    .from('vendors')
    .select(
      'id, name, status, contact_name, phone, email, notes, is_preferred, vendor_category_id',
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  let category: VendorCategory | null = null

  if (data.vendor_category_id) {
    const { data: categoryRow, error: categoryError } = await client
      .from('vendor_categories')
      .select('id, name, description')
      .eq('id', data.vendor_category_id)
      .maybeSingle()

    if (categoryError) {
      throw new Error(categoryError.message)
    }

    category = categoryRow ? mapCategory(categoryRow as VendorCategoryRow) : null
  }

  const row = data as VendorRow

  return {
    id: row.id,
    name: row.name,
    status: row.status,
    phone: row.phone,
    isPreferred: row.is_preferred,
    category,
    contactName: row.contact_name,
    email: row.email,
    notes: row.notes,
  }
}

export async function getVendorInteractions(
  vendorId: string,
): Promise<VendorInteractionRecord[]> {
  const client = await getSupabaseClient()

  const { data, error } = await client
    .from('vendor_interactions')
    .select('id, interaction_type, interaction_at, summary, details')
    .eq('vendor_id', vendorId)
    .order('interaction_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return ((data as VendorInteractionRow[] | null) ?? []).map((row) => ({
    id: row.id,
    interactionType: row.interaction_type,
    interactionAt: row.interaction_at,
    summary: row.summary,
    details: row.details,
  }))
}

export async function getVendorCategories(): Promise<VendorCategory[]> {
  const client = await getSupabaseClient()

  const { data, error } = await client
    .from('vendor_categories')
    .select('id, name, description')
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return ((data as VendorCategoryRow[] | null) ?? []).map((row) => mapCategory(row))
}

export async function updateVendorById(
  id: string,
  payload: {
    name: string
    status: VendorStatus
    contactName: string
    phone: string
    email: string
    notes: string
    isPreferred: boolean
    vendorCategoryId: string
  },
): Promise<VendorDetailRecord | null> {
  const client = await getSupabaseClient()

  const { data, error } = await client
    .from('vendors')
    .update({
      name: payload.name.trim(),
      status: payload.status,
      contact_name: payload.contactName.trim() || null,
      phone: payload.phone.trim() || null,
      email: payload.email.trim() || null,
      notes: payload.notes.trim() || null,
      is_preferred: payload.isPreferred,
      vendor_category_id: payload.vendorCategoryId || null,
    })
    .eq('id', id)
    .select(
      'id, name, status, contact_name, phone, email, notes, is_preferred, vendor_category_id',
    )
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  const vendorRow = data as VendorWriteRow
  let category: VendorCategory | null = null

  if (vendorRow.vendor_category_id) {
    const { data: categoryRow, error: categoryError } = await client
      .from('vendor_categories')
      .select('id, name, description')
      .eq('id', vendorRow.vendor_category_id)
      .maybeSingle()

    if (categoryError) {
      throw new Error(categoryError.message)
    }

    category = categoryRow ? mapCategory(categoryRow as VendorCategoryRow) : null
  }

  return {
    id: vendorRow.id,
    name: vendorRow.name,
    status: vendorRow.status,
    phone: vendorRow.phone,
    isPreferred: vendorRow.is_preferred,
    category,
    contactName: vendorRow.contact_name,
    email: vendorRow.email,
    notes: vendorRow.notes,
  }
}

export async function deleteVendorById(id: string): Promise<void> {
  const client = await getSupabaseClient()

  const { error } = await client.from('vendors').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function createVendorInteraction(
  vendorId: string,
  payload: {
    interactionType: VendorInteractionType
    summary: string
    details: string
  },
): Promise<VendorInteractionRecord> {
  const client = await getSupabaseClient()

  const { data, error } = await client
    .from('vendor_interactions')
    .insert({
      vendor_id: vendorId,
      interaction_type: payload.interactionType,
      summary: payload.summary.trim(),
      details: payload.details.trim() || null,
      interaction_at: new Date().toISOString(),
    })
    .select('id, interaction_type, interaction_at, summary, details')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const interaction = data as VendorInteractionRow

  return {
    id: interaction.id,
    interactionType: interaction.interaction_type,
    interactionAt: interaction.interaction_at,
    summary: interaction.summary,
    details: interaction.details,
  }
}
