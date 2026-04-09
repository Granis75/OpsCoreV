export const vendorStatuses = ['prospect', 'active', 'inactive', 'blocked'] as const

export type VendorStatus = (typeof vendorStatuses)[number]

export const vendorInteractionTypes = [
  'call',
  'email',
  'meeting',
  'site_visit',
  'incident',
  'quote',
  'invoice',
] as const

export type VendorInteractionType = (typeof vendorInteractionTypes)[number]

export const vendorStatusLabels: Record<VendorStatus, string> = {
  prospect: 'Prospect',
  active: 'Active',
  inactive: 'Inactive',
  blocked: 'Blocked',
}

export const vendorInteractionTypeLabels: Record<VendorInteractionType, string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  site_visit: 'Site visit',
  incident: 'Incident',
  quote: 'Quote',
  invoice: 'Invoice',
}

export interface VendorCategory {
  id: string
  name: string
  description: string | null
}

export interface VendorListRecord {
  id: string
  name: string
  status: VendorStatus
  phone: string | null
  isPreferred: boolean
  category: VendorCategory | null
}

export interface VendorDetailRecord extends VendorListRecord {
  contactName: string | null
  email: string | null
  notes: string | null
}

export interface VendorInteractionRecord {
  id: string
  interactionType: VendorInteractionType
  interactionAt: string
  summary: string
  details: string | null
}
