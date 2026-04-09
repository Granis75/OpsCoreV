begin;

do $$
begin
  create type public.operation_item_type as enum ('ticket', 'task', 'intervention', 'order');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.operation_item_status as enum ('open', 'in_progress', 'done');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.operation_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  type public.operation_item_type not null,
  title text not null,
  status public.operation_item_status not null default 'open',
  priority public.priority_level not null default 'medium',
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operation_items_title_check check (char_length(trim(title)) >= 3)
);

alter table if exists public.operation_items
  add column if not exists location text;

alter table if exists public.operation_items
  add column if not exists notes text;

create index if not exists operation_items_organization_id_idx
  on public.operation_items (organization_id);

create index if not exists operation_items_type_created_at_idx
  on public.operation_items (type, created_at desc);

create index if not exists operation_items_status_priority_idx
  on public.operation_items (status, priority);

drop trigger if exists set_operation_items_updated_at on public.operation_items;
create trigger set_operation_items_updated_at
before update on public.operation_items
for each row
execute function public.set_updated_at();

alter table public.operation_items enable row level security;

drop policy if exists operation_items_select_own_org on public.operation_items;
create policy operation_items_select_own_org
on public.operation_items
for select
to authenticated
using (public.belongs_to_current_organization(organization_id));

drop policy if exists operation_items_insert_own_org on public.operation_items;
create policy operation_items_insert_own_org
on public.operation_items
for insert
to authenticated
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists operation_items_update_own_org on public.operation_items;
create policy operation_items_update_own_org
on public.operation_items
for update
to authenticated
using (public.belongs_to_current_organization(organization_id))
with check (public.belongs_to_current_organization(organization_id));

drop policy if exists operation_items_delete_own_org on public.operation_items;
create policy operation_items_delete_own_org
on public.operation_items
for delete
to authenticated
using (public.belongs_to_current_organization(organization_id));

commit;
