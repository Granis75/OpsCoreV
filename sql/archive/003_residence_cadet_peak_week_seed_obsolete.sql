begin;

insert into public.organizations (
  id,
  name,
  slug,
  legal_name,
  hotel_code,
  timezone,
  currency_code,
  city,
  country_code
)
values (
  '30000000-0000-4000-8000-000000000001',
  'Residence Cadet',
  'residence-cadet',
  'Residence Cadet SAS',
  'RESCADET',
  'Europe/Paris',
  'EUR',
  'Paris',
  'FR'
)
on conflict do nothing;

insert into public.vendor_categories (id, organization_id, name, description)
values (
  '30000000-0000-4000-8000-000000000101',
  '30000000-0000-4000-8000-000000000001',
  'Cleaning',
  'Laundry and room-support vendors.'
)
on conflict do nothing;

insert into public.vendor_categories (id, organization_id, name, description)
values (
  '30000000-0000-4000-8000-000000000102',
  '30000000-0000-4000-8000-000000000001',
  'Maintenance',
  'HVAC and plumbing support partners.'
)
on conflict do nothing;

insert into public.vendor_categories (id, organization_id, name, description)
values (
  '30000000-0000-4000-8000-000000000103',
  '30000000-0000-4000-8000-000000000001',
  'Security',
  'Access control and badge vendors.'
)
on conflict do nothing;

insert into public.vendor_categories (id, organization_id, name, description)
values (
  '30000000-0000-4000-8000-000000000104',
  '30000000-0000-4000-8000-000000000001',
  'Supplies',
  'Operational supplies and consumables.'
)
on conflict do nothing;

insert into public.vendor_categories (id, organization_id, name, description)
values (
  '30000000-0000-4000-8000-000000000105',
  '30000000-0000-4000-8000-000000000001',
  'Utilities',
  'Electrical and building equipment support.'
)
on conflict do nothing;

insert into public.expense_categories (
  id,
  organization_id,
  name,
  code,
  description,
  requires_receipt
)
values (
  '30000000-0000-4000-8000-000000000801',
  '30000000-0000-4000-8000-000000000001',
  'Maintenance',
  'MAINT',
  'Operational maintenance purchases and call-outs.',
  true
)
on conflict do nothing;

insert into public.expense_categories (
  id,
  organization_id,
  name,
  code,
  description,
  requires_receipt
)
values (
  '30000000-0000-4000-8000-000000000802',
  '30000000-0000-4000-8000-000000000001',
  'Emergency',
  'EMERG',
  'Urgent interventions required to keep rooms sellable.',
  true
)
on conflict do nothing;

insert into public.expense_categories (
  id,
  organization_id,
  name,
  code,
  description,
  requires_receipt
)
values (
  '30000000-0000-4000-8000-000000000803',
  '30000000-0000-4000-8000-000000000001',
  'Supplies',
  'SUPPL',
  'Consumables and room-support stock.',
  true
)
on conflict do nothing;

insert into public.expense_categories (
  id,
  organization_id,
  name,
  code,
  description,
  requires_receipt
)
values (
  '30000000-0000-4000-8000-000000000804',
  '30000000-0000-4000-8000-000000000001',
  'Staff',
  'STAFF',
  'Small operational reimbursements for staff handling incidents.',
  false
)
on conflict do nothing;

insert into public.review_sources (
  id,
  organization_id,
  name,
  source_type,
  base_url
)
values (
  '30000000-0000-4000-8000-000000001201',
  '30000000-0000-4000-8000-000000000001',
  'Booking.com',
  'ota',
  'https://www.booking.com'
)
on conflict do nothing;

insert into public.review_sources (
  id,
  organization_id,
  name,
  source_type,
  base_url
)
values (
  '30000000-0000-4000-8000-000000001202',
  '30000000-0000-4000-8000-000000000001',
  'Google',
  'search',
  'https://www.google.com/maps'
)
on conflict do nothing;

insert into public.review_sources (
  id,
  organization_id,
  name,
  source_type,
  base_url
)
values (
  '30000000-0000-4000-8000-000000001203',
  '30000000-0000-4000-8000-000000000001',
  'Guest survey',
  'survey',
  null
)
on conflict do nothing;

insert into public.vendors (
  id,
  organization_id,
  vendor_category_id,
  name,
  status,
  contact_name,
  phone,
  email,
  is_preferred,
  notes
)
values (
  '30000000-0000-4000-8000-000000001001',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000101',
  'AquaPure Laundry',
  'active',
  'Nadia Legrand',
  '+33 1 80 10 10 10',
  'ops@aquapure-laundry.fr',
  true,
  'Laundry top-up partner used during peak occupancy weeks.'
)
on conflict do nothing;

insert into public.vendors (
  id,
  organization_id,
  vendor_category_id,
  name,
  status,
  contact_name,
  phone,
  email,
  is_preferred,
  notes
)
values (
  '30000000-0000-4000-8000-000000001002',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000102',
  'ClimaTech Services',
  'active',
  'Marc Renaud',
  '+33 1 80 20 20 20',
  'dispatch@climatech-services.fr',
  true,
  'HVAC partner used for guestrooms, lobby vents, and fan units.'
)
on conflict do nothing;

insert into public.vendors (
  id,
  organization_id,
  vendor_category_id,
  name,
  status,
  contact_name,
  phone,
  email,
  is_preferred,
  notes
)
values (
  '30000000-0000-4000-8000-000000001003',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000102',
  'HydroSec Plomberie',
  'active',
  'Karim Bensaïd',
  '+33 1 80 31 44 52',
  'intervention@hydrosec-plomberie.fr',
  true,
  'Plumbing vendor handling leaks, pressure issues, and urgent guestroom calls.'
)
on conflict do nothing;

insert into public.vendors (
  id,
  organization_id,
  vendor_category_id,
  name,
  status,
  contact_name,
  phone,
  email,
  is_preferred,
  notes
)
values (
  '30000000-0000-4000-8000-000000001004',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000103',
  'Badge Access Pro',
  'active',
  'Sophie Lambert',
  '+33 1 80 41 77 19',
  'support@badgeaccesspro.fr',
  false,
  'Access badge and reader vendor for entry points and back-of-house doors.'
)
on conflict do nothing;

insert into public.vendors (
  id,
  organization_id,
  vendor_category_id,
  name,
  status,
  contact_name,
  phone,
  email,
  is_preferred,
  notes
)
values (
  '30000000-0000-4000-8000-000000001005',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000104',
  'Metro Consommables Paris',
  'active',
  'Julien Caron',
  '+33 1 80 52 21 08',
  'service@metro-consommables.fr',
  false,
  'Consumables supplier used for breakfast and amenity reorders.'
)
on conflict do nothing;

insert into public.vendors (
  id,
  organization_id,
  vendor_category_id,
  name,
  status,
  contact_name,
  phone,
  email,
  is_preferred,
  notes
)
values (
  '30000000-0000-4000-8000-000000001006',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000105',
  'Voltis Équipements',
  'active',
  'Claire Marty',
  '+33 1 80 63 19 40',
  'support@voltis-equipements.fr',
  false,
  'Building equipment partner covering electrical issues and lift follow-up.'
)
on conflict do nothing;

insert into public.maintenance_tickets (
  id,
  organization_id,
  vendor_id,
  title,
  description,
  location,
  status,
  priority,
  reported_at,
  due_at,
  created_at
)
values (
  '30000000-0000-4000-8000-000000004922',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000001003',
  'Fuite sous lavabo - chambre 304',
  'Water leak reported by guest before checkout. Floor remains wet after first intervention and the room cannot be released back to inventory.',
  'Room 304',
  'waiting_vendor',
  'critical',
  '2026-04-07 07:40:00+02',
  '2026-04-08 12:00:00+02',
  '2026-04-07 07:40:00+02'
)
on conflict do nothing;

insert into public.maintenance_tickets (
  id,
  organization_id,
  vendor_id,
  title,
  description,
  location,
  status,
  priority,
  reported_at,
  due_at,
  created_at
)
values (
  '30000000-0000-4000-8000-000000004923',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000001002',
  'Climatisation insuffisante - chambre 214',
  'Guest reports warm air only. Vendor contacted and technician expected before noon.',
  'Room 214',
  'in_progress',
  'high',
  '2026-04-08 08:05:00+02',
  '2026-04-09 12:00:00+02',
  '2026-04-08 08:05:00+02'
)
on conflict do nothing;

insert into public.maintenance_tickets (
  id,
  organization_id,
  vendor_id,
  title,
  description,
  location,
  status,
  priority,
  reported_at,
  due_at,
  created_at
)
values (
  '30000000-0000-4000-8000-000000004924',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000001004',
  'Serrure connectée instable - porte entrée nord',
  'Badge access failed twice during the morning shift and manual opening was required.',
  'North Entrance',
  'open',
  'high',
  '2026-04-09 06:55:00+02',
  '2026-04-09 15:00:00+02',
  '2026-04-09 06:55:00+02'
)
on conflict do nothing;

insert into public.maintenance_tickets (
  id,
  organization_id,
  vendor_id,
  title,
  description,
  location,
  status,
  priority,
  reported_at,
  due_at,
  created_at
)
values (
  '30000000-0000-4000-8000-000000004925',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000001001',
  'Stock linge insuffisant pour arrivées deluxe',
  'Housekeeping reports par level below requirement for the evening deluxe arrivals.',
  'Floors 5 and 6',
  'in_progress',
  'medium',
  '2026-04-08 14:10:00+02',
  '2026-04-09 16:00:00+02',
  '2026-04-08 14:10:00+02'
)
on conflict do nothing;

insert into public.maintenance_tickets (
  id,
  organization_id,
  title,
  description,
  location,
  status,
  priority,
  reported_at,
  due_at,
  created_at
)
values (
  '30000000-0000-4000-8000-000000004926',
  '30000000-0000-4000-8000-000000000001',
  'Panne machine café étage 2',
  'Machine no longer dispenses hot drinks. Engineering is handling it internally before deciding whether an external repair is needed.',
  'Level 2 pantry',
  'open',
  'low',
  '2026-04-09 09:25:00+02',
  '2026-04-10 09:00:00+02',
  '2026-04-09 09:25:00+02'
)
on conflict do nothing;

insert into public.maintenance_tickets (
  id,
  organization_id,
  vendor_id,
  title,
  description,
  location,
  status,
  priority,
  reported_at,
  due_at,
  created_at
)
values (
  '30000000-0000-4000-8000-000000004927',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000001003',
  'Débit faible eau chaude - chambre 118',
  'Guest mentions low hot water pressure during the morning shower and engineering needs access after checkout.',
  'Room 118',
  'open',
  'medium',
  '2026-04-09 10:15:00+02',
  '2026-04-10 13:00:00+02',
  '2026-04-09 10:15:00+02'
)
on conflict do nothing;

insert into public.maintenance_tickets (
  id,
  organization_id,
  vendor_id,
  title,
  description,
  location,
  status,
  priority,
  reported_at,
  due_at,
  created_at
)
values (
  '30000000-0000-4000-8000-000000004928',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000001002',
  'Remplacement filtres CVC zone lobby',
  'Preventive maintenance launched after visible dust buildup near the front desk vents.',
  'Lobby',
  'in_progress',
  'low',
  '2026-04-08 16:40:00+02',
  '2026-04-10 10:00:00+02',
  '2026-04-08 16:40:00+02'
)
on conflict do nothing;

insert into public.maintenance_tickets (
  id,
  organization_id,
  vendor_id,
  title,
  description,
  location,
  status,
  priority,
  reported_at,
  due_at,
  created_at
)
values (
  '30000000-0000-4000-8000-000000004929',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000001006',
  'Ascenseur B arrêté entre deux niveaux',
  'Incident was reported last night. Vendor restarted the unit temporarily, but a full inspection is still pending.',
  'Elevator B',
  'waiting_vendor',
  'critical',
  '2026-04-07 18:20:00+02',
  '2026-04-08 09:00:00+02',
  '2026-04-07 18:20:00+02'
)
on conflict do nothing;

insert into public.maintenance_tickets (
  id,
  organization_id,
  vendor_id,
  title,
  description,
  location,
  status,
  priority,
  reported_at,
  due_at,
  created_at
)
values (
  '30000000-0000-4000-8000-000000004930',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000001006',
  'Éclairage défaillant couloir 3e étage',
  'Three ceiling spots are out and the corridor is visibly dim after 22:00.',
  '3rd floor corridor',
  'open',
  'medium',
  '2026-04-09 07:50:00+02',
  '2026-04-10 11:00:00+02',
  '2026-04-09 07:50:00+02'
)
on conflict do nothing;

insert into public.maintenance_tickets (
  id,
  organization_id,
  vendor_id,
  title,
  description,
  location,
  status,
  priority,
  reported_at,
  due_at,
  created_at
)
values (
  '30000000-0000-4000-8000-000000004931',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000001002',
  'Bruit ventilation anormal - chambre 402',
  'Night staff moved the guest temporarily and engineering is investigating the fan unit.',
  'Room 402',
  'in_progress',
  'high',
  '2026-04-08 22:05:00+02',
  '2026-04-09 13:00:00+02',
  '2026-04-08 22:05:00+02'
)
on conflict do nothing;

insert into public.cash_expenses (
  id,
  organization_id,
  expense_category_id,
  vendor_id,
  status,
  payment_method,
  expense_date,
  amount,
  currency_code,
  description,
  notes,
  created_at
)
values (
  '30000000-0000-4000-8000-000000008301',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000802',
  '30000000-0000-4000-8000-000000001003',
  'submitted',
  'bank_transfer',
  '2026-04-08',
  450.00,
  'EUR',
  'Intervention plomberie urgence chambre 304',
  'Urgent intervention requested to release the room.',
  '2026-04-08 09:10:00+02'
)
on conflict do nothing;

insert into public.cash_expenses (
  id,
  organization_id,
  expense_category_id,
  vendor_id,
  status,
  payment_method,
  expense_date,
  amount,
  currency_code,
  description,
  notes,
  approved_at,
  created_at
)
values (
  '30000000-0000-4000-8000-000000008302',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000801',
  '30000000-0000-4000-8000-000000001002',
  'approved',
  'company_card',
  '2026-04-08',
  118.90,
  'EUR',
  'Achat pompe de relevage condensats climatisation',
  'Replacement part purchased to restore cooling in room 214.',
  '2026-04-08 11:35:00+02',
  '2026-04-08 10:40:00+02'
)
on conflict do nothing;

insert into public.cash_expenses (
  id,
  organization_id,
  expense_category_id,
  vendor_id,
  status,
  payment_method,
  expense_date,
  amount,
  currency_code,
  description,
  notes,
  created_at
)
values (
  '30000000-0000-4000-8000-000000008303',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000803',
  '30000000-0000-4000-8000-000000001001',
  'submitted',
  'bank_transfer',
  '2026-04-09',
  620.00,
  'EUR',
  'Commande linge complémentaire arrivées deluxe',
  'Additional linen order needed before the evening deluxe arrivals.',
  '2026-04-09 09:05:00+02'
)
on conflict do nothing;

insert into public.cash_expenses (
  id,
  organization_id,
  expense_category_id,
  status,
  payment_method,
  expense_date,
  amount,
  currency_code,
  description,
  notes,
  approved_at,
  created_at
)
values (
  '30000000-0000-4000-8000-000000008304',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000804',
  'reimbursed',
  'cash',
  '2026-04-09',
  34.50,
  'EUR',
  'Remboursement taxi guest déplacé suite bruit ventilation',
  'Taxi refunded after the guest was moved out of room 402.',
  '2026-04-09 00:40:00+02',
  '2026-04-09 00:20:00+02'
)
on conflict do nothing;

insert into public.cash_expenses (
  id,
  organization_id,
  expense_category_id,
  vendor_id,
  status,
  payment_method,
  expense_date,
  amount,
  currency_code,
  description,
  notes,
  approved_at,
  created_at
)
values (
  '30000000-0000-4000-8000-000000008305',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000801',
  '30000000-0000-4000-8000-000000001004',
  'approved',
  'company_card',
  '2026-04-09',
  86.00,
  'EUR',
  'Remplacement badge accès entrée nord',
  'Replacement badge stock used after repeated morning access failures.',
  '2026-04-09 09:10:00+02',
  '2026-04-09 08:50:00+02'
)
on conflict do nothing;

insert into public.cash_expenses (
  id,
  organization_id,
  expense_category_id,
  vendor_id,
  status,
  payment_method,
  expense_date,
  amount,
  currency_code,
  description,
  notes,
  created_at
)
values (
  '30000000-0000-4000-8000-000000008306',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000802',
  '30000000-0000-4000-8000-000000001006',
  'rejected',
  'bank_transfer',
  '2026-04-08',
  980.00,
  'EUR',
  'Diagnostic ascenseur B hors contrat',
  'Invoice challenged because the temporary restart did not resolve the lift issue.',
  '2026-04-08 10:15:00+02'
)
on conflict do nothing;

insert into public.cash_expenses (
  id,
  organization_id,
  expense_category_id,
  vendor_id,
  status,
  payment_method,
  expense_date,
  amount,
  currency_code,
  description,
  notes,
  approved_at,
  created_at
)
values (
  '30000000-0000-4000-8000-000000008307',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000803',
  '30000000-0000-4000-8000-000000001005',
  'reimbursed',
  'company_card',
  '2026-04-09',
  214.00,
  'EUR',
  'Consommables petit-déjeuner réassort urgent',
  'Urgent breakfast restock during a near-full occupancy morning.',
  '2026-04-09 07:35:00+02',
  '2026-04-09 07:10:00+02'
)
on conflict do nothing;

insert into public.cash_expenses (
  id,
  organization_id,
  expense_category_id,
  vendor_id,
  status,
  payment_method,
  expense_date,
  amount,
  currency_code,
  description,
  notes,
  approved_at,
  created_at
)
values (
  '30000000-0000-4000-8000-000000008308',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000801',
  '30000000-0000-4000-8000-000000001002',
  'approved',
  'company_card',
  '2026-04-08',
  172.00,
  'EUR',
  'Filtres CVC zone lobby',
  'Replacement filters ordered after visible dust buildup near the front desk.',
  '2026-04-08 18:00:00+02',
  '2026-04-08 17:10:00+02'
)
on conflict do nothing;

insert into public.operation_items (
  id,
  organization_id,
  type,
  title,
  status,
  priority,
  location,
  notes,
  created_at
)
values (
  '30000000-0000-4000-8000-000000007001',
  '30000000-0000-4000-8000-000000000001',
  'task',
  'Relancer HydroSec pour devis définitif chambre 304',
  'open',
  'high',
  'Room 304',
  'Le devis provisoire bloque toujours la remise en vente de la chambre.',
  '2026-04-09 08:30:00+02'
)
on conflict do nothing;

insert into public.operation_items (
  id,
  organization_id,
  type,
  title,
  status,
  priority,
  location,
  notes,
  created_at
)
values (
  '30000000-0000-4000-8000-000000007002',
  '30000000-0000-4000-8000-000000000001',
  'order',
  'Réception linge complémentaire avant 16h',
  'in_progress',
  'high',
  'Service entrance',
  'Nécessaire pour absorber les arrivées deluxe de ce soir.',
  '2026-04-09 09:00:00+02'
)
on conflict do nothing;

insert into public.operation_items (
  id,
  organization_id,
  type,
  title,
  status,
  priority,
  location,
  notes,
  created_at
)
values (
  '30000000-0000-4000-8000-000000007003',
  '30000000-0000-4000-8000-000000000001',
  'intervention',
  'Coordonner accès technicien ClimaTech chambre 214',
  'open',
  'medium',
  'Room 214',
  'La réception doit prévenir le housekeeping avant l entrée en chambre.',
  '2026-04-09 09:20:00+02'
)
on conflict do nothing;

insert into public.operation_items (
  id,
  organization_id,
  type,
  title,
  status,
  priority,
  location,
  notes,
  created_at
)
values (
  '30000000-0000-4000-8000-000000007004',
  '30000000-0000-4000-8000-000000000001',
  'task',
  'Vérifier stock capsules café étage 2 après panne machine',
  'done',
  'low',
  'Level 2 pantry',
  'Machine de remplacement disponible au lobby.',
  '2026-04-09 10:05:00+02'
)
on conflict do nothing;

insert into public.operation_items (
  id,
  organization_id,
  type,
  title,
  status,
  priority,
  location,
  notes,
  created_at
)
values (
  '30000000-0000-4000-8000-000000007005',
  '30000000-0000-4000-8000-000000000001',
  'order',
  'Commander nouvelles cartes badges NFC',
  'open',
  'medium',
  null,
  'Stock critique à la réception avec seulement 12 cartes restantes.',
  '2026-04-09 10:25:00+02'
)
on conflict do nothing;

insert into public.operation_items (
  id,
  organization_id,
  type,
  title,
  status,
  priority,
  location,
  notes,
  created_at
)
values (
  '30000000-0000-4000-8000-000000007006',
  '30000000-0000-4000-8000-000000000001',
  'task',
  'Valider remboursement guest chambre 402',
  'in_progress',
  'medium',
  'Room 402',
  'Client relogé une nuit après le bruit de ventilation.',
  '2026-04-09 10:40:00+02'
)
on conflict do nothing;

insert into public.operation_items (
  id,
  organization_id,
  type,
  title,
  status,
  priority,
  location,
  notes,
  created_at
)
values (
  '30000000-0000-4000-8000-000000007007',
  '30000000-0000-4000-8000-000000000001',
  'task',
  'Informer équipe soir sur indisponibilité ascenseur B',
  'open',
  'high',
  'Front desk',
  'Consigne à intégrer dans la passation avant 15h pour les arrivées avec bagages.',
  '2026-04-09 11:00:00+02'
)
on conflict do nothing;

insert into public.operation_items (
  id,
  organization_id,
  type,
  title,
  status,
  priority,
  location,
  notes,
  created_at
)
values (
  '30000000-0000-4000-8000-000000007008',
  '30000000-0000-4000-8000-000000000001',
  'intervention',
  'Inspection eau chaude chambre 118 après checkout',
  'open',
  'medium',
  'Room 118',
  'Accès chambre disponible à partir de 12h15 après départ client.',
  '2026-04-09 11:10:00+02'
)
on conflict do nothing;

insert into public.reviews (
  id,
  organization_id,
  review_source_id,
  external_review_id,
  guest_name,
  language_code,
  rating,
  title,
  body,
  reviewed_at,
  response_status
)
values (
  '30000000-0000-4000-8000-000000006001',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000001201',
  'REV-6001',
  'Martin D.',
  'fr',
  2.0,
  'Humidity issue in room 304',
  'La chambre 304 sentait l’humidité et le problème n’était pas réglé à l’arrivée.',
  '2026-04-09 08:45:00+02',
  'pending'
)
on conflict do nothing;

insert into public.reviews (
  id,
  organization_id,
  review_source_id,
  external_review_id,
  guest_name,
  language_code,
  rating,
  title,
  body,
  reviewed_at,
  response_status
)
values (
  '30000000-0000-4000-8000-000000006002',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000001202',
  'REV-6002',
  'Claire R.',
  'fr',
  5.0,
  'Fast reception support',
  'Problème d’accès au parking résolu en moins de 10 minutes par le staff de réception, très réactif.',
  '2026-04-09 09:30:00+02',
  'not_needed'
)
on conflict do nothing;

insert into public.reviews (
  id,
  organization_id,
  review_source_id,
  external_review_id,
  guest_name,
  language_code,
  rating,
  title,
  body,
  reviewed_at,
  response_status
)
values (
  '30000000-0000-4000-8000-000000006003',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000001203',
  'REV-6003',
  'Julien P.',
  'fr',
  3.0,
  'Late breakfast restock',
  'Petit-déjeuner presque vide à 9h15, réassort tardif mais équipe agréable.',
  '2026-04-09 09:50:00+02',
  'pending'
)
on conflict do nothing;

insert into public.reviews (
  id,
  organization_id,
  review_source_id,
  external_review_id,
  guest_name,
  language_code,
  rating,
  title,
  body,
  reviewed_at,
  response_status
)
values (
  '30000000-0000-4000-8000-000000006004',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000001201',
  'REV-6004',
  'Sophie L.',
  'fr',
  2.0,
  'Room 214 stayed warm overnight',
  'La climatisation de la chambre 214 ne refroidissait pas correctement pendant la nuit.',
  '2026-04-09 10:05:00+02',
  'pending'
)
on conflict do nothing;

insert into public.reviews (
  id,
  organization_id,
  review_source_id,
  external_review_id,
  guest_name,
  language_code,
  rating,
  title,
  body,
  reviewed_at,
  response_status
)
values (
  '30000000-0000-4000-8000-000000006005',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000001202',
  'REV-6005',
  'Nora B.',
  'fr',
  4.0,
  'Staff handled the ventilation issue well',
  'Très bon accueil et personnel disponible malgré un souci de bruit de ventilation rapidement pris en charge.',
  '2026-04-09 10:40:00+02',
  'not_needed'
)
on conflict do nothing;

commit;
