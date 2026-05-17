begin;

-- Create enums for housekeeping module
do $$
begin
  create type public.housekeeping_intervention_type as enum (
    'departure',
    'stayover_z',
    'stayover_s'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.housekeeping_priority as enum (
    'standard',
    'early_arrival',
    'vip',
    'urgent'
  );
exception
  when duplicate_object then null;
end
$$;

-- Daily plans table
create table if not exists public.housekeeping_daily_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  service_date date not null,
  cleaners_ordered integer default 0,
  general_note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint housekeeping_daily_plans_cleaners_ordered_check check (cleaners_ordered >= 0),
  constraint housekeeping_daily_plans_unique_date unique (organization_id, service_date)
);

drop trigger if exists housekeeping_daily_plans_updated_at on public.housekeeping_daily_plans;
create trigger housekeeping_daily_plans_updated_at
  before update on public.housekeeping_daily_plans
  for each row
  execute function public.set_updated_at();

-- Housekeeping entries table
create table if not exists public.housekeeping_entries (
  id uuid primary key default gen_random_uuid(),
  daily_plan_id uuid not null references public.housekeeping_daily_plans (id) on delete cascade,
  apartment_label text not null,
  intervention_type public.housekeeping_intervention_type not null,
  guests_count integer default 0,
  double_beds_gl integer default 0,
  single_beds_ls integer default 0,
  baby_beds_litbb integer default 0,
  reception_memo text,
  priority public.housekeeping_priority default 'standard',
  sort_order integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint housekeeping_entries_guests_count_check check (guests_count >= 0),
  constraint housekeeping_entries_double_beds_check check (double_beds_gl >= 0),
  constraint housekeeping_entries_single_beds_check check (single_beds_ls >= 0),
  constraint housekeeping_entries_baby_beds_check check (baby_beds_litbb >= 0),
  constraint housekeeping_entries_unique_apartment_per_plan unique (daily_plan_id, apartment_label)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'housekeeping_entries_unique_apartment_per_plan'
      and conrelid = 'public.housekeeping_entries'::regclass
  ) then
    alter table public.housekeeping_entries
      add constraint housekeeping_entries_unique_apartment_per_plan unique (daily_plan_id, apartment_label);
  end if;
end
$$;

drop trigger if exists housekeeping_entries_updated_at on public.housekeeping_entries;
create trigger housekeeping_entries_updated_at
  before update on public.housekeeping_entries
  for each row
  execute function public.set_updated_at();

-- Housekeeping settings table
create table if not exists public.housekeeping_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  departure_minutes integer default 45,
  stayover_z_minutes integer default 35,
  stayover_s_minutes integer default 0,
  productive_minutes_per_cleaner integer default 360,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint housekeeping_settings_departure_minutes_check check (departure_minutes > 0),
  constraint housekeeping_settings_stayover_z_minutes_check check (stayover_z_minutes >= 0),
  constraint housekeeping_settings_stayover_s_minutes_check check (stayover_s_minutes >= 0),
  constraint housekeeping_settings_productive_minutes_check check (productive_minutes_per_cleaner > 0)
);

drop trigger if exists housekeeping_settings_updated_at on public.housekeeping_settings;
create trigger housekeeping_settings_updated_at
  before update on public.housekeeping_settings
  for each row
  execute function public.set_updated_at();

-- Create indexes for better query performance
create index if not exists housekeeping_daily_plans_org_date_idx
  on public.housekeeping_daily_plans (organization_id, service_date);

create index if not exists housekeeping_entries_daily_plan_idx
  on public.housekeeping_entries (daily_plan_id);

-- RLS Policies

-- Daily plans RLS
alter table public.housekeeping_daily_plans enable row level security;

drop policy if exists "Users can view their org's daily plans" on public.housekeeping_daily_plans;
drop policy if exists "Users can create daily plans in their org" on public.housekeeping_daily_plans;
drop policy if exists "Users can update their org's daily plans" on public.housekeeping_daily_plans;
drop policy if exists "Users can delete their org's daily plans" on public.housekeeping_daily_plans;

drop policy if exists housekeeping_daily_plans_select_own_org on public.housekeeping_daily_plans;
create policy housekeeping_daily_plans_select_own_org
on public.housekeeping_daily_plans
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists housekeeping_daily_plans_insert_own_org on public.housekeeping_daily_plans;
create policy housekeeping_daily_plans_insert_own_org
on public.housekeeping_daily_plans
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists housekeeping_daily_plans_update_own_org on public.housekeeping_daily_plans;
create policy housekeeping_daily_plans_update_own_org
on public.housekeeping_daily_plans
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists housekeeping_daily_plans_delete_own_org on public.housekeeping_daily_plans;
create policy housekeeping_daily_plans_delete_own_org
on public.housekeeping_daily_plans
for delete
to authenticated
using (public.belongs_to_current_organization(organization_id));

-- Entries RLS
alter table public.housekeeping_entries enable row level security;

drop policy if exists "Users can view entries in their org's daily plans" on public.housekeeping_entries;
drop policy if exists "Users can create entries in their org's daily plans" on public.housekeeping_entries;
drop policy if exists "Users can update entries in their org's daily plans" on public.housekeeping_entries;
drop policy if exists "Users can delete entries in their org's daily plans" on public.housekeeping_entries;

drop policy if exists housekeeping_entries_select_own_org on public.housekeeping_entries;
create policy housekeeping_entries_select_own_org
on public.housekeeping_entries
for select
to authenticated
using (
  exists (
    select 1
    from public.housekeeping_daily_plans as plan
    where plan.id = housekeeping_entries.daily_plan_id
      and public.belongs_to_current_organization(plan.organization_id)
  )
);

drop policy if exists housekeeping_entries_insert_own_org on public.housekeeping_entries;
create policy housekeeping_entries_insert_own_org
on public.housekeeping_entries
for insert
to authenticated
with check (
  exists (
    select 1
    from public.housekeeping_daily_plans as plan
    where plan.id = housekeeping_entries.daily_plan_id
      and public.belongs_to_current_organization(plan.organization_id)
  )
);

drop policy if exists housekeeping_entries_update_own_org on public.housekeeping_entries;
create policy housekeeping_entries_update_own_org
on public.housekeeping_entries
for update
to authenticated
using (
  exists (
    select 1
    from public.housekeeping_daily_plans as plan
    where plan.id = housekeeping_entries.daily_plan_id
      and public.belongs_to_current_organization(plan.organization_id)
  )
)
with check (
  exists (
    select 1
    from public.housekeeping_daily_plans as plan
    where plan.id = housekeeping_entries.daily_plan_id
      and public.belongs_to_current_organization(plan.organization_id)
  )
);

drop policy if exists housekeeping_entries_delete_own_org on public.housekeeping_entries;
create policy housekeeping_entries_delete_own_org
on public.housekeeping_entries
for delete
to authenticated
using (
  exists (
    select 1
    from public.housekeeping_daily_plans as plan
    where plan.id = housekeeping_entries.daily_plan_id
      and public.belongs_to_current_organization(plan.organization_id)
  )
);

-- Settings RLS
alter table public.housekeeping_settings enable row level security;

drop policy if exists "Users can view their org's settings" on public.housekeeping_settings;
drop policy if exists "Users can create settings for their org" on public.housekeeping_settings;
drop policy if exists "Users can update their org's settings" on public.housekeeping_settings;

drop policy if exists housekeeping_settings_select_own_org on public.housekeeping_settings;
create policy housekeeping_settings_select_own_org
on public.housekeeping_settings
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists housekeeping_settings_insert_own_org on public.housekeeping_settings;
create policy housekeeping_settings_insert_own_org
on public.housekeeping_settings
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists housekeeping_settings_update_own_org on public.housekeeping_settings;
create policy housekeeping_settings_update_own_org
on public.housekeeping_settings
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

commit;
