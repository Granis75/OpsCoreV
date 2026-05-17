begin;

do $$
begin
  create type public.housekeeping_service_category as enum (
    'full_clean',
    'partial_service',
    'towels_only',
    'inspection',
    'custom'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.housekeeping_item_category as enum (
    'bed_linen',
    'towels',
    'bathroom',
    'kitchen',
    'baby',
    'other'
  );
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.housekeeping_intervention_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  label text not null,
  description text,
  service_category public.housekeeping_service_category,
  workload_minutes integer not null default 0,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint housekeeping_intervention_types_code_unique unique (organization_id, code),
  constraint housekeeping_intervention_types_workload_check check (workload_minutes >= 0),
  constraint housekeeping_intervention_types_code_check check (code ~ '^[a-z0-9][a-z0-9_-]*$')
);

drop trigger if exists housekeeping_intervention_types_updated_at on public.housekeeping_intervention_types;
create trigger housekeeping_intervention_types_updated_at
  before update on public.housekeeping_intervention_types
  for each row
  execute function public.set_updated_at();

create table if not exists public.housekeeping_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  label text not null,
  unit_label text not null default 'units',
  category public.housekeeping_item_category,
  include_in_print boolean not null default true,
  include_in_forecast boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint housekeeping_items_code_unique unique (organization_id, code),
  constraint housekeeping_items_code_check check (code ~ '^[a-z0-9][a-z0-9_-]*$')
);

drop trigger if exists housekeeping_items_updated_at on public.housekeeping_items;
create trigger housekeeping_items_updated_at
  before update on public.housekeeping_items
  for each row
  execute function public.set_updated_at();

create table if not exists public.housekeeping_consumption_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  intervention_type_id uuid not null references public.housekeeping_intervention_types (id) on delete cascade,
  item_id uuid not null references public.housekeeping_items (id) on delete cascade,
  quantity_per_apartment numeric(10, 2) not null default 0,
  quantity_per_guest numeric(10, 2) not null default 0,
  quantity_per_gl numeric(10, 2) not null default 0,
  quantity_per_ls numeric(10, 2) not null default 0,
  quantity_per_litbb numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint housekeeping_consumption_rules_unique unique (intervention_type_id, item_id),
  constraint housekeeping_consumption_rules_org_match check (organization_id is not null),
  constraint housekeeping_consumption_rules_nonnegative check (
    quantity_per_apartment >= 0
    and quantity_per_guest >= 0
    and quantity_per_gl >= 0
    and quantity_per_ls >= 0
    and quantity_per_litbb >= 0
  )
);

drop trigger if exists housekeeping_consumption_rules_updated_at on public.housekeeping_consumption_rules;
create trigger housekeeping_consumption_rules_updated_at
  before update on public.housekeeping_consumption_rules
  for each row
  execute function public.set_updated_at();

alter table public.housekeeping_entries
  add column if not exists intervention_type_id uuid references public.housekeeping_intervention_types (id) on delete restrict;

alter table public.housekeeping_entries
  alter column intervention_type drop not null;

create index if not exists housekeeping_intervention_types_org_sort_idx
  on public.housekeeping_intervention_types (organization_id, active, sort_order);

create index if not exists housekeeping_items_org_sort_idx
  on public.housekeeping_items (organization_id, active, sort_order);

create index if not exists housekeeping_consumption_rules_org_idx
  on public.housekeeping_consumption_rules (organization_id);

create index if not exists housekeeping_consumption_rules_type_idx
  on public.housekeeping_consumption_rules (intervention_type_id);

create index if not exists housekeeping_entries_intervention_type_idx
  on public.housekeeping_entries (intervention_type_id);

-- Seed editable standard hospitality configuration for every existing organization.
insert into public.housekeeping_intervention_types (
  organization_id,
  code,
  label,
  description,
  service_category,
  workload_minutes,
  sort_order,
  active
)
select
  org.id,
  defaults.code,
  defaults.label,
  defaults.description,
  defaults.service_category::public.housekeeping_service_category,
  defaults.workload_minutes,
  defaults.sort_order,
  true
from public.organizations as org
cross join lateral (
  values
    ('departure', 'Departure', 'Full clean after guest departure.', 'full_clean', coalesce((select departure_minutes from public.housekeeping_settings where organization_id = org.id), 45), 10),
    ('stayover_z', 'Stayover Full Change', 'Stayover service with full linen change.', 'full_clean', coalesce((select stayover_z_minutes from public.housekeeping_settings where organization_id = org.id), 35), 20),
    ('stayover_s', 'Stayover Towels Only', 'Stayover service focused on towels.', 'towels_only', coalesce((select stayover_s_minutes from public.housekeeping_settings where organization_id = org.id), 0), 30)
) as defaults(code, label, description, service_category, workload_minutes, sort_order)
on conflict (organization_id, code) do nothing;

insert into public.housekeeping_items (
  organization_id,
  code,
  label,
  unit_label,
  category,
  include_in_print,
  include_in_forecast,
  sort_order,
  active
)
select
  org.id,
  defaults.code,
  defaults.label,
  'units',
  defaults.category::public.housekeeping_item_category,
  true,
  true,
  defaults.sort_order,
  true
from public.organizations as org
cross join lateral (
  values
    ('large_sheet', 'Large sheet', 'bed_linen', 10),
    ('large_duvet_cover', 'Large duvet cover', 'bed_linen', 20),
    ('small_sheet', 'Small sheet', 'bed_linen', 30),
    ('small_duvet_cover', 'Small duvet cover', 'bed_linen', 40),
    ('pillowcase', 'Pillowcase', 'bed_linen', 50),
    ('large_towel', 'Large towel', 'towels', 60),
    ('small_towel', 'Small towel', 'towels', 70),
    ('kitchen_towel', 'Kitchen towel', 'kitchen', 80),
    ('bath_mat', 'Bath mat', 'bathroom', 90)
) as defaults(code, label, category, sort_order)
on conflict (organization_id, code) do nothing;

with rule_defaults as (
  select *
  from (
    values
      ('departure', 'large_sheet', 0, 0, 1, 0, 0),
      ('departure', 'large_duvet_cover', 0, 0, 1, 0, 0),
      ('departure', 'small_sheet', 0, 0, 0, 1, 0),
      ('departure', 'small_duvet_cover', 0, 0, 0, 1, 0),
      ('departure', 'pillowcase', 0, 2, 0, 0, 0),
      ('departure', 'large_towel', 0, 1, 0, 0, 0),
      ('departure', 'small_towel', 0, 1, 0, 0, 0),
      ('departure', 'kitchen_towel', 1, 0, 0, 0, 0),
      ('departure', 'bath_mat', 1, 0, 0, 0, 0),
      ('stayover_z', 'large_sheet', 0, 0, 1, 0, 0),
      ('stayover_z', 'large_duvet_cover', 0, 0, 1, 0, 0),
      ('stayover_z', 'small_sheet', 0, 0, 0, 1, 0),
      ('stayover_z', 'small_duvet_cover', 0, 0, 0, 1, 0),
      ('stayover_z', 'pillowcase', 0, 2, 0, 0, 0),
      ('stayover_z', 'large_towel', 0, 1, 0, 0, 0),
      ('stayover_z', 'small_towel', 0, 1, 0, 0, 0),
      ('stayover_z', 'kitchen_towel', 1, 0, 0, 0, 0),
      ('stayover_z', 'bath_mat', 1, 0, 0, 0, 0),
      ('stayover_s', 'large_towel', 0, 1, 0, 0, 0),
      ('stayover_s', 'small_towel', 0, 1, 0, 0, 0)
  ) as rules(intervention_code, item_code, per_apartment, per_guest, per_gl, per_ls, per_litbb)
)
insert into public.housekeeping_consumption_rules (
  organization_id,
  intervention_type_id,
  item_id,
  quantity_per_apartment,
  quantity_per_guest,
  quantity_per_gl,
  quantity_per_ls,
  quantity_per_litbb
)
select
  intervention.organization_id,
  intervention.id,
  item.id,
  rule_defaults.per_apartment,
  rule_defaults.per_guest,
  rule_defaults.per_gl,
  rule_defaults.per_ls,
  rule_defaults.per_litbb
from rule_defaults
join public.housekeeping_intervention_types as intervention
  on intervention.code = rule_defaults.intervention_code
join public.housekeeping_items as item
  on item.organization_id = intervention.organization_id
  and item.code = rule_defaults.item_code
on conflict (intervention_type_id, item_id) do nothing;

update public.housekeeping_entries as entry
set intervention_type_id = intervention.id
from public.housekeeping_daily_plans as plan,
     public.housekeeping_intervention_types as intervention
where entry.daily_plan_id = plan.id
  and intervention.organization_id = plan.organization_id
  and intervention.code = entry.intervention_type::text
  and entry.intervention_type_id is null
  and entry.intervention_type is not null;

alter table public.housekeeping_entries
  alter column intervention_type_id set not null;

alter table public.housekeeping_intervention_types enable row level security;
alter table public.housekeeping_items enable row level security;
alter table public.housekeeping_consumption_rules enable row level security;

drop policy if exists housekeeping_intervention_types_select_own_org on public.housekeeping_intervention_types;
create policy housekeeping_intervention_types_select_own_org
on public.housekeeping_intervention_types
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists housekeeping_intervention_types_insert_own_org on public.housekeeping_intervention_types;
create policy housekeeping_intervention_types_insert_own_org
on public.housekeeping_intervention_types
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists housekeeping_intervention_types_update_own_org on public.housekeeping_intervention_types;
create policy housekeeping_intervention_types_update_own_org
on public.housekeeping_intervention_types
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists housekeeping_items_select_own_org on public.housekeeping_items;
create policy housekeeping_items_select_own_org
on public.housekeeping_items
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists housekeeping_items_insert_own_org on public.housekeeping_items;
create policy housekeeping_items_insert_own_org
on public.housekeeping_items
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists housekeeping_items_update_own_org on public.housekeeping_items;
create policy housekeeping_items_update_own_org
on public.housekeeping_items
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists housekeeping_consumption_rules_select_own_org on public.housekeeping_consumption_rules;
create policy housekeeping_consumption_rules_select_own_org
on public.housekeeping_consumption_rules
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists housekeeping_consumption_rules_insert_own_org on public.housekeeping_consumption_rules;
create policy housekeeping_consumption_rules_insert_own_org
on public.housekeeping_consumption_rules
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists housekeeping_consumption_rules_update_own_org on public.housekeeping_consumption_rules;
create policy housekeeping_consumption_rules_update_own_org
on public.housekeeping_consumption_rules
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

commit;
