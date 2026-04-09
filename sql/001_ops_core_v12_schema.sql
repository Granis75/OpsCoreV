begin;

create extension if not exists pgcrypto;

do $$
begin
  create type public.vendor_status as enum ('prospect', 'active', 'inactive', 'blocked');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.vendor_interaction_type as enum (
    'call',
    'email',
    'meeting',
    'site_visit',
    'incident',
    'quote',
    'invoice'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.staff_employment_status as enum ('active', 'on_leave', 'inactive');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.priority_level as enum ('low', 'medium', 'high', 'critical');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.emergency_protocol_status as enum ('active', 'archived');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.expense_status as enum (
    'draft',
    'submitted',
    'approved',
    'rejected',
    'reimbursed'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.payment_method as enum ('cash', 'company_card', 'bank_transfer');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.maintenance_ticket_status as enum (
    'open',
    'in_progress',
    'waiting_vendor',
    'resolved',
    'closed'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.ticket_update_type as enum (
    'note',
    'status_change',
    'assignment',
    'vendor_contacted',
    'resolution'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.review_source_type as enum (
    'ota',
    'search',
    'social',
    'direct',
    'survey'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.review_response_status as enum ('pending', 'published', 'not_needed');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.service_contact_type as enum (
    'vendor',
    'security',
    'utilities',
    'medical',
    'fire_safety',
    'operations'
  );
exception
  when duplicate_object then null;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  legal_name text,
  hotel_code text unique,
  timezone text not null default 'Europe/Paris',
  currency_code char(3) not null default 'EUR',
  city text,
  country_code char(2) not null default 'FR',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_check check (char_length(trim(name)) >= 2),
  constraint organizations_slug_check check (slug = lower(slug)),
  constraint organizations_currency_code_check check (currency_code = upper(currency_code)),
  constraint organizations_country_code_check check (country_code = upper(country_code))
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  email text,
  first_name text,
  last_name text,
  job_title text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_check check (email is null or position('@' in email) > 1)
);

create table if not exists public.vendor_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_categories_name_check check (char_length(trim(name)) >= 2),
  constraint vendor_categories_unique_name unique (organization_id, name)
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  vendor_category_id uuid references public.vendor_categories (id) on delete set null,
  name text not null,
  status public.vendor_status not null default 'active',
  contact_name text,
  phone text,
  email text,
  website text,
  contract_reference text,
  sla_notes text,
  is_preferred boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendors_name_check check (char_length(trim(name)) >= 2),
  constraint vendors_email_check check (email is null or position('@' in email) > 1),
  constraint vendors_unique_name unique (organization_id, name)
);

create table if not exists public.vendor_interactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  logged_by_profile_id uuid references public.profiles (id) on delete set null,
  interaction_type public.vendor_interaction_type not null,
  interaction_at timestamptz not null default now(),
  summary text not null,
  details text,
  next_action text,
  next_action_due_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_interactions_summary_check check (char_length(trim(summary)) >= 3)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_name_check check (char_length(trim(name)) >= 2),
  constraint teams_unique_name unique (organization_id, name),
  constraint teams_unique_code unique (organization_id, code)
);

create table if not exists public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  department text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_roles_name_check check (char_length(trim(name)) >= 2),
  constraint staff_roles_unique_name unique (organization_id, name)
);

create table if not exists public.staff_directory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  staff_role_id uuid references public.staff_roles (id) on delete set null,
  profile_id uuid unique references public.profiles (id) on delete set null,
  first_name text not null,
  last_name text not null,
  work_email text,
  phone text,
  employment_status public.staff_employment_status not null default 'active',
  hire_date date,
  is_emergency_responder boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_directory_first_name_check check (char_length(trim(first_name)) >= 1),
  constraint staff_directory_last_name_check check (char_length(trim(last_name)) >= 1),
  constraint staff_directory_work_email_check check (
    work_email is null or position('@' in work_email) > 1
  ),
  constraint staff_directory_unique_email unique (organization_id, work_email)
);

create table if not exists public.service_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  vendor_id uuid references public.vendors (id) on delete set null,
  contact_type public.service_contact_type not null default 'vendor',
  name text not null,
  role_title text,
  phone text not null,
  email text,
  availability_notes text,
  is_primary boolean not null default false,
  is_emergency boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_contacts_name_check check (char_length(trim(name)) >= 2),
  constraint service_contacts_phone_check check (char_length(trim(phone)) >= 2),
  constraint service_contacts_email_check check (email is null or position('@' in email) > 1)
);

create table if not exists public.emergency_protocols (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  service_contact_id uuid references public.service_contacts (id) on delete set null,
  title text not null,
  priority public.priority_level not null default 'high',
  status public.emergency_protocol_status not null default 'active',
  trigger_scenario text not null,
  instructions text not null,
  assembly_point text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint emergency_protocols_title_check check (char_length(trim(title)) >= 3),
  constraint emergency_protocols_unique_title unique (organization_id, title)
);

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text,
  description text,
  requires_receipt boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_categories_name_check check (char_length(trim(name)) >= 2),
  constraint expense_categories_unique_name unique (organization_id, name),
  constraint expense_categories_unique_code unique (organization_id, code)
);

create table if not exists public.cash_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  expense_category_id uuid not null references public.expense_categories (id) on delete restrict,
  vendor_id uuid references public.vendors (id) on delete set null,
  staff_member_id uuid references public.staff_directory (id) on delete set null,
  recorded_by_profile_id uuid references public.profiles (id) on delete set null,
  status public.expense_status not null default 'submitted',
  payment_method public.payment_method not null default 'cash',
  expense_date date not null default current_date,
  amount numeric(12,2) not null,
  currency_code char(3) not null default 'EUR',
  description text not null,
  receipt_url text,
  notes text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cash_expenses_amount_check check (amount > 0),
  constraint cash_expenses_description_check check (char_length(trim(description)) >= 3),
  constraint cash_expenses_currency_code_check check (currency_code = upper(currency_code))
);

create table if not exists public.maintenance_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  vendor_id uuid references public.vendors (id) on delete set null,
  service_contact_id uuid references public.service_contacts (id) on delete set null,
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  assigned_staff_id uuid references public.staff_directory (id) on delete set null,
  title text not null,
  description text not null,
  location text not null,
  status public.maintenance_ticket_status not null default 'open',
  priority public.priority_level not null default 'medium',
  reported_at timestamptz not null default now(),
  due_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_tickets_title_check check (char_length(trim(title)) >= 3),
  constraint maintenance_tickets_description_check check (char_length(trim(description)) >= 3),
  constraint maintenance_tickets_location_check check (char_length(trim(location)) >= 2),
  constraint maintenance_tickets_resolved_after_reported check (
    resolved_at is null or resolved_at >= reported_at
  )
);

create table if not exists public.ticket_updates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  maintenance_ticket_id uuid not null references public.maintenance_tickets (id) on delete cascade,
  author_profile_id uuid references public.profiles (id) on delete set null,
  update_type public.ticket_update_type not null default 'note',
  previous_status public.maintenance_ticket_status,
  new_status public.maintenance_ticket_status,
  message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ticket_updates_message_check check (char_length(trim(message)) >= 3)
);

create table if not exists public.review_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  source_type public.review_source_type not null,
  base_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_sources_name_check check (char_length(trim(name)) >= 2),
  constraint review_sources_unique_name unique (organization_id, name)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  review_source_id uuid not null references public.review_sources (id) on delete restrict,
  external_review_id text,
  guest_name text,
  language_code text,
  rating numeric(2,1) not null,
  title text,
  body text,
  reviewed_at timestamptz not null,
  response_status public.review_response_status not null default 'pending',
  response_text text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_rating_check check (rating >= 1 and rating <= 5),
  constraint reviews_responded_after_reviewed check (
    responded_at is null or responded_at >= reviewed_at
  )
);

create table if not exists public.reputation_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  review_source_id uuid references public.review_sources (id) on delete set null,
  snapshot_date date not null,
  review_count integer not null default 0,
  average_rating numeric(3,2) not null default 0,
  pending_response_count integer not null default 0,
  response_rate numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reputation_snapshots_review_count_check check (review_count >= 0),
  constraint reputation_snapshots_average_rating_check check (
    average_rating >= 0 and average_rating <= 5
  ),
  constraint reputation_snapshots_pending_response_count_check check (
    pending_response_count >= 0
  ),
  constraint reputation_snapshots_response_rate_check check (
    response_rate >= 0 and response_rate <= 100
  )
);

create index if not exists profiles_organization_id_idx
  on public.profiles (organization_id);

create index if not exists vendor_categories_organization_id_idx
  on public.vendor_categories (organization_id);

create index if not exists vendors_organization_id_idx
  on public.vendors (organization_id);

create index if not exists vendors_vendor_category_id_idx
  on public.vendors (vendor_category_id);

create index if not exists vendor_interactions_organization_id_idx
  on public.vendor_interactions (organization_id);

create index if not exists vendor_interactions_vendor_id_idx
  on public.vendor_interactions (vendor_id);

create index if not exists teams_organization_id_idx
  on public.teams (organization_id);

create index if not exists staff_roles_organization_id_idx
  on public.staff_roles (organization_id);

create index if not exists staff_directory_organization_id_idx
  on public.staff_directory (organization_id);

create index if not exists staff_directory_team_id_idx
  on public.staff_directory (team_id);

create index if not exists staff_directory_staff_role_id_idx
  on public.staff_directory (staff_role_id);

create index if not exists service_contacts_organization_id_idx
  on public.service_contacts (organization_id);

create index if not exists service_contacts_vendor_id_idx
  on public.service_contacts (vendor_id);

create index if not exists emergency_protocols_organization_id_idx
  on public.emergency_protocols (organization_id);

create index if not exists emergency_protocols_service_contact_id_idx
  on public.emergency_protocols (service_contact_id);

create index if not exists expense_categories_organization_id_idx
  on public.expense_categories (organization_id);

create index if not exists cash_expenses_organization_id_idx
  on public.cash_expenses (organization_id);

create index if not exists cash_expenses_expense_category_id_idx
  on public.cash_expenses (expense_category_id);

create index if not exists cash_expenses_vendor_id_idx
  on public.cash_expenses (vendor_id);

create index if not exists maintenance_tickets_organization_id_idx
  on public.maintenance_tickets (organization_id);

create index if not exists maintenance_tickets_team_id_idx
  on public.maintenance_tickets (team_id);

create index if not exists maintenance_tickets_vendor_id_idx
  on public.maintenance_tickets (vendor_id);

create index if not exists maintenance_tickets_assigned_staff_id_idx
  on public.maintenance_tickets (assigned_staff_id);

create index if not exists maintenance_tickets_status_priority_idx
  on public.maintenance_tickets (status, priority);

create index if not exists ticket_updates_organization_id_idx
  on public.ticket_updates (organization_id);

create index if not exists ticket_updates_maintenance_ticket_id_idx
  on public.ticket_updates (maintenance_ticket_id);

create index if not exists review_sources_organization_id_idx
  on public.review_sources (organization_id);

create index if not exists reviews_organization_id_idx
  on public.reviews (organization_id);

create index if not exists reviews_review_source_id_idx
  on public.reviews (review_source_id);

create unique index if not exists reviews_source_external_id_idx
  on public.reviews (review_source_id, external_review_id)
  where external_review_id is not null;

create index if not exists reputation_snapshots_organization_id_idx
  on public.reputation_snapshots (organization_id);

create unique index if not exists reputation_snapshots_source_date_idx
  on public.reputation_snapshots (organization_id, review_source_id, snapshot_date)
  where review_source_id is not null;

create unique index if not exists reputation_snapshots_overall_date_idx
  on public.reputation_snapshots (organization_id, snapshot_date)
  where review_source_id is null;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.profiles as p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1;
$$;

create or replace function public.belongs_to_current_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(target_organization_id = public.current_organization_id(), false);
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    updated_at = now();

  return new;
end;
$$;

insert into public.profiles (id, email, first_name, last_name)
select
  u.id,
  u.email,
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'first_name', '')), ''),
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'last_name', '')), '')
from auth.users as u
on conflict do nothing;

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_vendor_categories_updated_at on public.vendor_categories;
create trigger set_vendor_categories_updated_at
before update on public.vendor_categories
for each row
execute function public.set_updated_at();

drop trigger if exists set_vendors_updated_at on public.vendors;
create trigger set_vendors_updated_at
before update on public.vendors
for each row
execute function public.set_updated_at();

drop trigger if exists set_vendor_interactions_updated_at on public.vendor_interactions;
create trigger set_vendor_interactions_updated_at
before update on public.vendor_interactions
for each row
execute function public.set_updated_at();

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at
before update on public.teams
for each row
execute function public.set_updated_at();

drop trigger if exists set_staff_roles_updated_at on public.staff_roles;
create trigger set_staff_roles_updated_at
before update on public.staff_roles
for each row
execute function public.set_updated_at();

drop trigger if exists set_staff_directory_updated_at on public.staff_directory;
create trigger set_staff_directory_updated_at
before update on public.staff_directory
for each row
execute function public.set_updated_at();

drop trigger if exists set_service_contacts_updated_at on public.service_contacts;
create trigger set_service_contacts_updated_at
before update on public.service_contacts
for each row
execute function public.set_updated_at();

drop trigger if exists set_emergency_protocols_updated_at on public.emergency_protocols;
create trigger set_emergency_protocols_updated_at
before update on public.emergency_protocols
for each row
execute function public.set_updated_at();

drop trigger if exists set_expense_categories_updated_at on public.expense_categories;
create trigger set_expense_categories_updated_at
before update on public.expense_categories
for each row
execute function public.set_updated_at();

drop trigger if exists set_cash_expenses_updated_at on public.cash_expenses;
create trigger set_cash_expenses_updated_at
before update on public.cash_expenses
for each row
execute function public.set_updated_at();

drop trigger if exists set_maintenance_tickets_updated_at on public.maintenance_tickets;
create trigger set_maintenance_tickets_updated_at
before update on public.maintenance_tickets
for each row
execute function public.set_updated_at();

drop trigger if exists set_ticket_updates_updated_at on public.ticket_updates;
create trigger set_ticket_updates_updated_at
before update on public.ticket_updates
for each row
execute function public.set_updated_at();

drop trigger if exists set_review_sources_updated_at on public.review_sources;
create trigger set_review_sources_updated_at
before update on public.review_sources
for each row
execute function public.set_updated_at();

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at
before update on public.reviews
for each row
execute function public.set_updated_at();

drop trigger if exists set_reputation_snapshots_updated_at on public.reputation_snapshots;
create trigger set_reputation_snapshots_updated_at
before update on public.reputation_snapshots
for each row
execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.vendor_categories enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_interactions enable row level security;
alter table public.teams enable row level security;
alter table public.staff_roles enable row level security;
alter table public.staff_directory enable row level security;
alter table public.service_contacts enable row level security;
alter table public.emergency_protocols enable row level security;
alter table public.expense_categories enable row level security;
alter table public.cash_expenses enable row level security;
alter table public.maintenance_tickets enable row level security;
alter table public.ticket_updates enable row level security;
alter table public.review_sources enable row level security;
alter table public.reviews enable row level security;
alter table public.reputation_snapshots enable row level security;

drop policy if exists organizations_select_own on public.organizations;
create policy organizations_select_own
on public.organizations
for select
to authenticated
using (id = public.current_organization_id());

drop policy if exists organizations_update_own on public.organizations;
create policy organizations_update_own
on public.organizations
for update
to authenticated
using (id = public.current_organization_id())
with check (id = public.current_organization_id());

drop policy if exists profiles_select_own_org on public.profiles;
create policy profiles_select_own_org
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or organization_id = public.current_organization_id()
);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and (
    (public.current_organization_id() is null and organization_id is null)
    or organization_id = public.current_organization_id()
  )
);

drop policy if exists vendor_categories_select_own_org on public.vendor_categories;
create policy vendor_categories_select_own_org
on public.vendor_categories
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists vendor_categories_insert_own_org on public.vendor_categories;
create policy vendor_categories_insert_own_org
on public.vendor_categories
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists vendor_categories_update_own_org on public.vendor_categories;
create policy vendor_categories_update_own_org
on public.vendor_categories
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists vendor_categories_delete_own_org on public.vendor_categories;
create policy vendor_categories_delete_own_org
on public.vendor_categories
for delete
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists vendors_select_own_org on public.vendors;
create policy vendors_select_own_org
on public.vendors
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists vendors_insert_own_org on public.vendors;
create policy vendors_insert_own_org
on public.vendors
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists vendors_update_own_org on public.vendors;
create policy vendors_update_own_org
on public.vendors
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists vendors_delete_own_org on public.vendors;
create policy vendors_delete_own_org
on public.vendors
for delete
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists vendor_interactions_select_own_org on public.vendor_interactions;
create policy vendor_interactions_select_own_org
on public.vendor_interactions
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists vendor_interactions_insert_own_org on public.vendor_interactions;
create policy vendor_interactions_insert_own_org
on public.vendor_interactions
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists vendor_interactions_update_own_org on public.vendor_interactions;
create policy vendor_interactions_update_own_org
on public.vendor_interactions
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists vendor_interactions_delete_own_org on public.vendor_interactions;
create policy vendor_interactions_delete_own_org
on public.vendor_interactions
for delete
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists teams_select_own_org on public.teams;
create policy teams_select_own_org
on public.teams
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists teams_insert_own_org on public.teams;
create policy teams_insert_own_org
on public.teams
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists teams_update_own_org on public.teams;
create policy teams_update_own_org
on public.teams
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists teams_delete_own_org on public.teams;
create policy teams_delete_own_org
on public.teams
for delete
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists staff_roles_select_own_org on public.staff_roles;
create policy staff_roles_select_own_org
on public.staff_roles
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists staff_roles_insert_own_org on public.staff_roles;
create policy staff_roles_insert_own_org
on public.staff_roles
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists staff_roles_update_own_org on public.staff_roles;
create policy staff_roles_update_own_org
on public.staff_roles
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists staff_roles_delete_own_org on public.staff_roles;
create policy staff_roles_delete_own_org
on public.staff_roles
for delete
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists staff_directory_select_own_org on public.staff_directory;
create policy staff_directory_select_own_org
on public.staff_directory
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists staff_directory_insert_own_org on public.staff_directory;
create policy staff_directory_insert_own_org
on public.staff_directory
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists staff_directory_update_own_org on public.staff_directory;
create policy staff_directory_update_own_org
on public.staff_directory
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists staff_directory_delete_own_org on public.staff_directory;
create policy staff_directory_delete_own_org
on public.staff_directory
for delete
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists service_contacts_select_own_org on public.service_contacts;
create policy service_contacts_select_own_org
on public.service_contacts
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists service_contacts_insert_own_org on public.service_contacts;
create policy service_contacts_insert_own_org
on public.service_contacts
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists service_contacts_update_own_org on public.service_contacts;
create policy service_contacts_update_own_org
on public.service_contacts
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists service_contacts_delete_own_org on public.service_contacts;
create policy service_contacts_delete_own_org
on public.service_contacts
for delete
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists emergency_protocols_select_own_org on public.emergency_protocols;
create policy emergency_protocols_select_own_org
on public.emergency_protocols
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists emergency_protocols_insert_own_org on public.emergency_protocols;
create policy emergency_protocols_insert_own_org
on public.emergency_protocols
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists emergency_protocols_update_own_org on public.emergency_protocols;
create policy emergency_protocols_update_own_org
on public.emergency_protocols
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists emergency_protocols_delete_own_org on public.emergency_protocols;
create policy emergency_protocols_delete_own_org
on public.emergency_protocols
for delete
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists expense_categories_select_own_org on public.expense_categories;
create policy expense_categories_select_own_org
on public.expense_categories
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists expense_categories_insert_own_org on public.expense_categories;
create policy expense_categories_insert_own_org
on public.expense_categories
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists expense_categories_update_own_org on public.expense_categories;
create policy expense_categories_update_own_org
on public.expense_categories
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists expense_categories_delete_own_org on public.expense_categories;
create policy expense_categories_delete_own_org
on public.expense_categories
for delete
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists cash_expenses_select_own_org on public.cash_expenses;
create policy cash_expenses_select_own_org
on public.cash_expenses
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists cash_expenses_insert_own_org on public.cash_expenses;
create policy cash_expenses_insert_own_org
on public.cash_expenses
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists cash_expenses_update_own_org on public.cash_expenses;
create policy cash_expenses_update_own_org
on public.cash_expenses
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists cash_expenses_delete_own_org on public.cash_expenses;
create policy cash_expenses_delete_own_org
on public.cash_expenses
for delete
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists maintenance_tickets_select_own_org on public.maintenance_tickets;
create policy maintenance_tickets_select_own_org
on public.maintenance_tickets
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists maintenance_tickets_insert_own_org on public.maintenance_tickets;
create policy maintenance_tickets_insert_own_org
on public.maintenance_tickets
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists maintenance_tickets_update_own_org on public.maintenance_tickets;
create policy maintenance_tickets_update_own_org
on public.maintenance_tickets
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists maintenance_tickets_delete_own_org on public.maintenance_tickets;
create policy maintenance_tickets_delete_own_org
on public.maintenance_tickets
for delete
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists ticket_updates_select_own_org on public.ticket_updates;
create policy ticket_updates_select_own_org
on public.ticket_updates
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists ticket_updates_insert_own_org on public.ticket_updates;
create policy ticket_updates_insert_own_org
on public.ticket_updates
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists ticket_updates_update_own_org on public.ticket_updates;
create policy ticket_updates_update_own_org
on public.ticket_updates
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists ticket_updates_delete_own_org on public.ticket_updates;
create policy ticket_updates_delete_own_org
on public.ticket_updates
for delete
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists review_sources_select_own_org on public.review_sources;
create policy review_sources_select_own_org
on public.review_sources
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists review_sources_insert_own_org on public.review_sources;
create policy review_sources_insert_own_org
on public.review_sources
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists review_sources_update_own_org on public.review_sources;
create policy review_sources_update_own_org
on public.review_sources
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists review_sources_delete_own_org on public.review_sources;
create policy review_sources_delete_own_org
on public.review_sources
for delete
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists reviews_select_own_org on public.reviews;
create policy reviews_select_own_org
on public.reviews
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists reviews_insert_own_org on public.reviews;
create policy reviews_insert_own_org
on public.reviews
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists reviews_update_own_org on public.reviews;
create policy reviews_update_own_org
on public.reviews
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists reviews_delete_own_org on public.reviews;
create policy reviews_delete_own_org
on public.reviews
for delete
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists reputation_snapshots_select_own_org on public.reputation_snapshots;
create policy reputation_snapshots_select_own_org
on public.reputation_snapshots
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists reputation_snapshots_insert_own_org on public.reputation_snapshots;
create policy reputation_snapshots_insert_own_org
on public.reputation_snapshots
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists reputation_snapshots_update_own_org on public.reputation_snapshots;
create policy reputation_snapshots_update_own_org
on public.reputation_snapshots
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists reputation_snapshots_delete_own_org on public.reputation_snapshots;
create policy reputation_snapshots_delete_own_org
on public.reputation_snapshots
for delete
to authenticated
using (public.belongs_to_current_organization(organization_id));

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
  '10000000-0000-4000-8000-000000000001',
  'Grand Horizon Paris',
  'grand-horizon-paris',
  'Grand Horizon Paris SAS',
  'GHPAR',
  'Europe/Paris',
  'EUR',
  'Paris',
  'FR'
)
on conflict do nothing;

insert into public.vendor_categories (id, organization_id, name, description)
values (
  '10000000-0000-4000-8000-000000000101',
  '10000000-0000-4000-8000-000000000001',
  'Laundry',
  'External laundry and linen providers.'
)
on conflict do nothing;

insert into public.vendor_categories (id, organization_id, name, description)
values (
  '10000000-0000-4000-8000-000000000102',
  '10000000-0000-4000-8000-000000000001',
  'HVAC',
  'Heating, ventilation and air conditioning vendors.'
)
on conflict do nothing;

insert into public.vendor_categories (id, organization_id, name, description)
values (
  '10000000-0000-4000-8000-000000000103',
  '10000000-0000-4000-8000-000000000001',
  'Food Supply',
  'Operational food and beverage supply partners.'
)
on conflict do nothing;

insert into public.teams (id, organization_id, name, code, description)
values (
  '10000000-0000-4000-8000-000000000201',
  '10000000-0000-4000-8000-000000000001',
  'Front Office',
  'FO',
  'Guest arrival, departures and lobby operations.'
)
on conflict do nothing;

insert into public.teams (id, organization_id, name, code, description)
values (
  '10000000-0000-4000-8000-000000000202',
  '10000000-0000-4000-8000-000000000001',
  'Housekeeping',
  null,
  'Room readiness and linen rotation.'
)
on conflict do nothing;

insert into public.teams (id, organization_id, name, code, description)
values (
  '10000000-0000-4000-8000-000000000203',
  '10000000-0000-4000-8000-000000000001',
  'Engineering',
  null,
  'Technical maintenance and preventive actions.'
)
on conflict do nothing;

insert into public.staff_roles (id, organization_id, name, department, description)
values (
  '10000000-0000-4000-8000-000000000301',
  '10000000-0000-4000-8000-000000000001',
  'Duty Manager',
  'Operations',
  'Shift lead for guest and ops escalations.'
)
on conflict do nothing;

insert into public.staff_roles (id, organization_id, name, department, description)
values (
  '10000000-0000-4000-8000-000000000302',
  '10000000-0000-4000-8000-000000000001',
  'Chief Engineer',
  'Engineering',
  'Owner of maintenance backlog and vendors.'
)
on conflict do nothing;

insert into public.staff_roles (id, organization_id, name, department, description)
values (
  '10000000-0000-4000-8000-000000000303',
  '10000000-0000-4000-8000-000000000001',
  'Housekeeping Supervisor',
  'Housekeeping',
  'Daily rooms quality and urgent service coordination.'
)
on conflict do nothing;

insert into public.staff_directory (
  id,
  organization_id,
  team_id,
  staff_role_id,
  first_name,
  last_name,
  work_email,
  phone,
  employment_status,
  hire_date,
  is_emergency_responder
)
values (
  '10000000-0000-4000-8000-000000000401',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000201',
  '10000000-0000-4000-8000-000000000301',
  'Claire',
  'Martin',
  'claire.martin@grandhorizon.test',
  '+33 6 11 22 33 44',
  'active',
  '2022-03-14',
  true
)
on conflict do nothing;

insert into public.staff_directory (
  id,
  organization_id,
  team_id,
  staff_role_id,
  first_name,
  last_name,
  work_email,
  phone,
  employment_status,
  hire_date,
  is_emergency_responder
)
values (
  '10000000-0000-4000-8000-000000000402',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000203',
  '10000000-0000-4000-8000-000000000302',
  'Youssef',
  'Bernard',
  'youssef.bernard@grandhorizon.test',
  '+33 6 22 33 44 55',
  'active',
  '2021-09-01',
  true
)
on conflict do nothing;

insert into public.staff_directory (
  id,
  organization_id,
  team_id,
  staff_role_id,
  first_name,
  last_name,
  work_email,
  phone,
  employment_status,
  hire_date,
  is_emergency_responder
)
values (
  '10000000-0000-4000-8000-000000000403',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000202',
  '10000000-0000-4000-8000-000000000303',
  'Sofia',
  'Dubois',
  'sofia.dubois@grandhorizon.test',
  '+33 6 33 44 55 66',
  'active',
  '2023-01-09',
  false
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
  contract_reference,
  is_preferred,
  notes
)
values (
  '10000000-0000-4000-8000-000000000501',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000101',
  'AquaPure Laundry',
  'active',
  'Nadia Legrand',
  '+33 1 80 10 10 10',
  'ops@aquapure.test',
  'LIN-2026-01',
  true,
  'Daily pickup before 09:00.'
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
  contract_reference,
  is_preferred,
  notes
)
values (
  '10000000-0000-4000-8000-000000000502',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000102',
  'ClimaTech Services',
  'active',
  'Marc Renaud',
  '+33 1 80 20 20 20',
  'support@climatech.test',
  'HVAC-2026-04',
  true,
  'Emergency intervention in less than 4 hours.'
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
  contract_reference,
  is_preferred,
  notes
)
values (
  '10000000-0000-4000-8000-000000000503',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000103',
  'Metro Fresh Supply',
  'active',
  'Julie Caron',
  '+33 1 80 30 30 30',
  'dispatch@metrofresh.test',
  'FNB-2026-11',
  false,
  'Backup produce supplier for breakfast service.'
)
on conflict do nothing;

insert into public.service_contacts (
  id,
  organization_id,
  vendor_id,
  contact_type,
  name,
  role_title,
  phone,
  email,
  availability_notes,
  is_primary,
  is_emergency
)
values (
  '10000000-0000-4000-8000-000000000601',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000501',
  'vendor',
  'Nadia Legrand',
  'Dispatch Lead',
  '+33 1 80 10 10 10',
  'ops@aquapure.test',
  'Available Monday to Saturday from 06:00 to 18:00.',
  true,
  false
)
on conflict do nothing;

insert into public.service_contacts (
  id,
  organization_id,
  vendor_id,
  contact_type,
  name,
  role_title,
  phone,
  email,
  availability_notes,
  is_primary,
  is_emergency
)
values (
  '10000000-0000-4000-8000-000000000602',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000502',
  'vendor',
  'Marc Renaud',
  'Emergency Hotline',
  '+33 1 80 20 20 20',
  'support@climatech.test',
  '24/7 hotline for HVAC outages.',
  true,
  true
)
on conflict do nothing;

insert into public.service_contacts (
  id,
  organization_id,
  vendor_id,
  contact_type,
  name,
  role_title,
  phone,
  email,
  availability_notes,
  is_primary,
  is_emergency
)
values (
  '10000000-0000-4000-8000-000000000603',
  '10000000-0000-4000-8000-000000000001',
  null,
  'fire_safety',
  'Paris Fire Station 7',
  'Emergency Dispatch',
  '18',
  null,
  'Use for fire, smoke or evacuation incidents only.',
  true,
  true
)
on conflict do nothing;

insert into public.vendor_interactions (
  id,
  organization_id,
  vendor_id,
  interaction_type,
  interaction_at,
  summary,
  details,
  next_action,
  next_action_due_at
)
values (
  '10000000-0000-4000-8000-000000001501',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000502',
  'call',
  '2026-04-07 08:30:00+02',
  'Escalation for room 214 air conditioning failure.',
  'Vendor confirmed technician arrival before noon.',
  'Check resolution after intervention',
  '2026-04-07'
)
on conflict do nothing;

insert into public.vendor_interactions (
  id,
  organization_id,
  vendor_id,
  interaction_type,
  interaction_at,
  summary,
  details,
  next_action,
  next_action_due_at
)
values (
  '10000000-0000-4000-8000-000000001502',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000501',
  'email',
  '2026-04-08 15:10:00+02',
  'Weekly linen shortage review.',
  'Provider requested revised occupancy forecast for the weekend.',
  'Send updated occupancy forecast',
  '2026-04-09'
)
on conflict do nothing;

insert into public.emergency_protocols (
  id,
  organization_id,
  service_contact_id,
  title,
  priority,
  status,
  trigger_scenario,
  instructions,
  assembly_point
)
values (
  '10000000-0000-4000-8000-000000000701',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000602',
  'Major water leak',
  'critical',
  'active',
  'Burst pipe, uncontrolled leak or flooding risk in guest or service areas.',
  'Secure the area, isolate water supply if possible, relocate guests, notify engineering, log photos, then call the emergency HVAC and plumbing vendor.',
  'Service entrance parking zone'
)
on conflict do nothing;

insert into public.emergency_protocols (
  id,
  organization_id,
  service_contact_id,
  title,
  priority,
  status,
  trigger_scenario,
  instructions,
  assembly_point
)
values (
  '10000000-0000-4000-8000-000000000702',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000603',
  'Elevator guest entrapment',
  'critical',
  'active',
  'Guest blocked in elevator cabin or elevator stops between floors.',
  'Keep voice contact, prevent forced opening, call fire safety dispatch, alert duty manager and keep one staff member on site until release.',
  'Main lobby reception desk'
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
  '10000000-0000-4000-8000-000000000801',
  '10000000-0000-4000-8000-000000000001',
  'Guest Compensation',
  'GUEST_COMP',
  'Taxi, amenities or gestures for service recovery.',
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
  '10000000-0000-4000-8000-000000000802',
  '10000000-0000-4000-8000-000000000001',
  'Urgent Purchase',
  'URGENT_BUY',
  'Immediate local purchase to restore operations.',
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
  '10000000-0000-4000-8000-000000000803',
  '10000000-0000-4000-8000-000000000001',
  'Petty Cash Ops',
  'PETTY_CASH',
  'Small recurring cash expenses for ops continuity.',
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
  '10000000-0000-4000-8000-000000001201',
  '10000000-0000-4000-8000-000000000001',
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
  '10000000-0000-4000-8000-000000001202',
  '10000000-0000-4000-8000-000000000001',
  'Google',
  'search',
  'https://www.google.com/maps'
)
on conflict do nothing;

insert into public.cash_expenses (
  id,
  organization_id,
  expense_category_id,
  vendor_id,
  staff_member_id,
  status,
  payment_method,
  expense_date,
  amount,
  currency_code,
  description,
  notes,
  approved_at
)
values (
  '10000000-0000-4000-8000-000000000901',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000801',
  null,
  '10000000-0000-4000-8000-000000000401',
  'approved',
  'cash',
  '2026-04-07',
  34.50,
  'EUR',
  'Taxi reimbursement for relocated guest after room AC failure.',
  'Approved by duty manager during night shift.',
  '2026-04-07 23:10:00+02'
)
on conflict do nothing;

insert into public.cash_expenses (
  id,
  organization_id,
  expense_category_id,
  vendor_id,
  staff_member_id,
  status,
  payment_method,
  expense_date,
  amount,
  currency_code,
  description,
  notes,
  approved_at
)
values (
  '10000000-0000-4000-8000-000000000902',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000802',
  '10000000-0000-4000-8000-000000000502',
  '10000000-0000-4000-8000-000000000402',
  'submitted',
  'company_card',
  '2026-04-08',
  118.90,
  'EUR',
  'Emergency spare condensate pump purchased during HVAC intervention.',
  'Receipt pending upload from engineering.',
  null
)
on conflict do nothing;

insert into public.maintenance_tickets (
  id,
  organization_id,
  team_id,
  vendor_id,
  service_contact_id,
  assigned_staff_id,
  title,
  description,
  location,
  status,
  priority,
  reported_at,
  due_at,
  resolved_at
)
values (
  '10000000-0000-4000-8000-000000001001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000203',
  '10000000-0000-4000-8000-000000000502',
  '10000000-0000-4000-8000-000000000602',
  '10000000-0000-4000-8000-000000000402',
  'Room 214 AC not cooling',
  'Guest reported warm air and water drip from indoor unit. Immediate comfort impact.',
  'Room 214',
  'resolved',
  'high',
  '2026-04-07 07:55:00+02',
  '2026-04-07 12:00:00+02',
  '2026-04-07 11:40:00+02'
)
on conflict do nothing;

insert into public.maintenance_tickets (
  id,
  organization_id,
  team_id,
  vendor_id,
  service_contact_id,
  assigned_staff_id,
  title,
  description,
  location,
  status,
  priority,
  reported_at,
  due_at,
  resolved_at
)
values (
  '10000000-0000-4000-8000-000000001002',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000202',
  '10000000-0000-4000-8000-000000000501',
  '10000000-0000-4000-8000-000000000601',
  '10000000-0000-4000-8000-000000000403',
  'Linen shortage for deluxe floor',
  'Par level below requirement for expected arrivals on the deluxe floor.',
  'Floors 5 and 6',
  'in_progress',
  'medium',
  '2026-04-08 14:15:00+02',
  '2026-04-09 10:00:00+02',
  null
)
on conflict do nothing;

insert into public.ticket_updates (
  id,
  organization_id,
  maintenance_ticket_id,
  update_type,
  previous_status,
  new_status,
  message
)
values (
  '10000000-0000-4000-8000-000000001101',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000001001',
  'vendor_contacted',
  'open',
  'waiting_vendor',
  'ClimaTech confirmed dispatch and technician ETA before 12:00.'
)
on conflict do nothing;

insert into public.ticket_updates (
  id,
  organization_id,
  maintenance_ticket_id,
  update_type,
  previous_status,
  new_status,
  message
)
values (
  '10000000-0000-4000-8000-000000001102',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000001001',
  'resolution',
  'in_progress',
  'resolved',
  'Condensate pump replaced, room tested for 20 minutes and returned to service.'
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
  response_status,
  response_text,
  responded_at
)
values (
  '10000000-0000-4000-8000-000000001301',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000001201',
  'BK-2026-00041',
  'Elena P.',
  'en',
  4.0,
  'Good stay, slow AC fix',
  'Friendly staff and clean room. Air conditioning issue was solved, but not immediately.',
  '2026-04-08 09:20:00+02',
  'published',
  'Thank you for the feedback. We have reinforced our escalation flow for technical incidents.',
  '2026-04-08 11:45:00+02'
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
  response_status,
  response_text,
  responded_at
)
values (
  '10000000-0000-4000-8000-000000001302',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000001202',
  'GOOG-2026-00418',
  'Marc L.',
  'fr',
  5.0,
  'Equipe reactive',
  'Reception tres reactive et intervention technique efficace.',
  '2026-04-09 08:05:00+02',
  'pending',
  null,
  null
)
on conflict do nothing;

insert into public.reputation_snapshots (
  id,
  organization_id,
  review_source_id,
  snapshot_date,
  review_count,
  average_rating,
  pending_response_count,
  response_rate
)
values (
  '10000000-0000-4000-8000-000000001401',
  '10000000-0000-4000-8000-000000000001',
  null,
  '2026-04-09',
  128,
  4.36,
  5,
  96.10
)
on conflict do nothing;

insert into public.reputation_snapshots (
  id,
  organization_id,
  review_source_id,
  snapshot_date,
  review_count,
  average_rating,
  pending_response_count,
  response_rate
)
values (
  '10000000-0000-4000-8000-000000001402',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000001201',
  '2026-04-09',
  74,
  4.42,
  1,
  98.65
)
on conflict do nothing;

insert into public.reputation_snapshots (
  id,
  organization_id,
  review_source_id,
  snapshot_date,
  review_count,
  average_rating,
  pending_response_count,
  response_rate
)
values (
  '10000000-0000-4000-8000-000000001403',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000001202',
  '2026-04-09',
  54,
  4.28,
  4,
  92.60
)
on conflict do nothing;

commit;
