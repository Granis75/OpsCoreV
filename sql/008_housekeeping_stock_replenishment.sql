begin;

-- Enum for stock movement types
do $$
begin
  create type public.housekeeping_stock_movement_type as enum (
    'adjustment',
    'replenishment',
    'consumption_correction'
  );
exception
  when duplicate_object then null;
end
$$;

-- Stock settings: 1:1 with housekeeping_items, opt-in per item
create table if not exists public.housekeeping_item_stock_settings (
  id               uuid        primary key default gen_random_uuid(),
  organization_id  uuid        not null references public.organizations (id) on delete cascade,
  item_id          uuid        not null references public.housekeeping_items (id) on delete cascade,
  stock_tracking_enabled boolean not null default false,
  current_stock    integer     not null default 0,
  minimum_stock    integer     not null default 0,
  target_stock     integer     not null default 0,
  incoming_stock   integer     not null default 0,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint housekeeping_item_stock_settings_item_unique unique (item_id),
  constraint housekeeping_item_stock_settings_nonnegative check (
    current_stock  >= 0
    and minimum_stock  >= 0
    and target_stock   >= 0
    and incoming_stock >= 0
  )
);

drop trigger if exists housekeeping_item_stock_settings_updated_at on public.housekeeping_item_stock_settings;
create trigger housekeeping_item_stock_settings_updated_at
  before update on public.housekeeping_item_stock_settings
  for each row
  execute function public.set_updated_at();

-- Stock movements: append-only audit trail
create table if not exists public.housekeeping_stock_movements (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations (id) on delete cascade,
  item_id         uuid        not null references public.housekeeping_items (id) on delete cascade,
  movement_type   public.housekeeping_stock_movement_type not null,
  quantity_delta  integer     not null,
  note            text,
  created_by      uuid        references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);

-- Indexes
create index if not exists housekeeping_item_stock_settings_org_idx
  on public.housekeeping_item_stock_settings (organization_id);

create index if not exists housekeeping_stock_movements_org_item_created_idx
  on public.housekeeping_stock_movements (organization_id, item_id, created_at desc);

create index if not exists housekeeping_stock_movements_org_created_idx
  on public.housekeeping_stock_movements (organization_id, created_at desc);

-- Row-level security
alter table public.housekeeping_item_stock_settings enable row level security;
alter table public.housekeeping_stock_movements      enable row level security;

-- Stock settings policies
drop policy if exists housekeeping_item_stock_settings_select_own_org on public.housekeeping_item_stock_settings;
create policy housekeeping_item_stock_settings_select_own_org
  on public.housekeeping_item_stock_settings for select to authenticated
  using (public.belongs_to_current_organization(organization_id));

drop policy if exists housekeeping_item_stock_settings_insert_own_org on public.housekeeping_item_stock_settings;
create policy housekeeping_item_stock_settings_insert_own_org
  on public.housekeeping_item_stock_settings for insert to authenticated
  with check (public.belongs_to_current_organization(organization_id));

drop policy if exists housekeeping_item_stock_settings_update_own_org on public.housekeeping_item_stock_settings;
create policy housekeeping_item_stock_settings_update_own_org
  on public.housekeeping_item_stock_settings for update to authenticated
  using  (public.belongs_to_current_organization(organization_id))
  with check (public.belongs_to_current_organization(organization_id));

-- Stock movements policies (insert + select; movements are immutable once recorded)
drop policy if exists housekeeping_stock_movements_select_own_org on public.housekeeping_stock_movements;
create policy housekeeping_stock_movements_select_own_org
  on public.housekeeping_stock_movements for select to authenticated
  using (public.belongs_to_current_organization(organization_id));

drop policy if exists housekeeping_stock_movements_insert_own_org on public.housekeeping_stock_movements;
create policy housekeeping_stock_movements_insert_own_org
  on public.housekeeping_stock_movements for insert to authenticated
  with check (public.belongs_to_current_organization(organization_id));

-- ============================================================
-- Atomic RPC: record_housekeeping_stock_movement
--
-- Performs in a single transaction:
--   1. Locks the target stock settings row (SELECT FOR UPDATE)
--   2. Computes new_stock = current_stock + quantity_delta
--   3. Rejects if new_stock < 0 with a clear error
--   4. Updates current_stock
--   5. Inserts the stock movement record
--   6. Returns the created movement row
--
-- Security model: SECURITY INVOKER — all table operations respect
-- the caller's RLS policies automatically. No manual org validation
-- is required; the FOR UPDATE lock will find nothing (→ exception)
-- if the item_id does not belong to the authenticated user's org.
-- ============================================================

create or replace function public.record_housekeeping_stock_movement(
  p_item_id        uuid,
  p_movement_type  public.housekeeping_stock_movement_type,
  p_quantity_delta integer,
  p_note           text default null
)
returns table (
  id              uuid,
  organization_id uuid,
  item_id         uuid,
  movement_type   public.housekeeping_stock_movement_type,
  quantity_delta  integer,
  note            text,
  created_by      uuid,
  created_at      timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_current_stock   integer;
  v_new_stock       integer;
  v_movement_id     uuid;
begin
  -- Lock the stock settings row for this item.
  -- RLS (security invoker) ensures only rows belonging to the
  -- authenticated user's organization are visible and lockable.
  select ss.current_stock, ss.organization_id
    into v_current_stock, v_organization_id
    from public.housekeeping_item_stock_settings ss
   where ss.item_id = p_item_id
     for update;

  if not found then
    raise exception
      'Stock settings not found for this item, or access denied. '
      'Enable stock tracking for the item before recording a movement.';
  end if;

  v_new_stock := v_current_stock + p_quantity_delta;

  if v_new_stock < 0 then
    raise exception
      'Movement rejected: applying delta (%) to current stock (%) would '
      'result in negative stock (%). '
      'Record a replenishment first or reduce the correction quantity.',
      p_quantity_delta, v_current_stock, v_new_stock
      using errcode = 'check_violation';
  end if;

  -- Update current_stock within the same transaction as the movement insert.
  update public.housekeeping_item_stock_settings
     set current_stock = v_new_stock
   where item_id = p_item_id;

  -- Insert the audit record.
  insert into public.housekeeping_stock_movements (
    organization_id, item_id, movement_type, quantity_delta, note, created_by
  )
  values (
    v_organization_id,
    p_item_id,
    p_movement_type,
    p_quantity_delta,
    p_note,
    auth.uid()
  )
  returning housekeeping_stock_movements.id into v_movement_id;

  -- Return the created movement so the client can update local state.
  return query
    select
      m.id,
      m.organization_id,
      m.item_id,
      m.movement_type,
      m.quantity_delta,
      m.note,
      m.created_by,
      m.created_at
    from public.housekeeping_stock_movements m
   where m.id = v_movement_id;
end;
$$;

-- Restrict to authenticated users only (revoke implicit public grant)
revoke execute
  on function public.record_housekeeping_stock_movement(
    uuid,
    public.housekeeping_stock_movement_type,
    integer,
    text
  )
  from public;

grant execute
  on function public.record_housekeeping_stock_movement(
    uuid,
    public.housekeeping_stock_movement_type,
    integer,
    text
  )
  to authenticated;

-- ============================================================
-- Demo seed data for grand-horizon-paris
--
-- Bath mat seeded at 8 units (below minimum of 15, and below
-- expected 7-day demand of ~9 units from the demo daily plan)
-- to demonstrate Critical Shortage status and suggested reorder.
--
-- Movement history is narratively consistent:
--   large_towel: +40 replenishment 2 days ago → then ~5 consumed → 60 now
--   small_towel: +30 replenishment 3 days ago → still at 55, +10 incoming
--   pillowcase:  -5 recount correction 1 day ago → now at 80
--   bath_mat:    +10 emergency top-up 4 days ago → heavy use → down to 8
-- ============================================================

insert into public.housekeeping_item_stock_settings (
  organization_id,
  item_id,
  stock_tracking_enabled,
  current_stock,
  minimum_stock,
  target_stock,
  incoming_stock
)
select
  item.organization_id,
  item.id,
  true,
  defaults.current_stock,
  defaults.minimum_stock,
  defaults.target_stock,
  defaults.incoming_stock
from (
  values
    ('large_towel'::text,  60, 30, 90,  0),
    ('small_towel'::text,  55, 30, 90, 10),
    ('pillowcase'::text,   80, 40, 120,  0),
    ('bath_mat'::text,      8, 15, 35,  0)
) as defaults(item_code, current_stock, minimum_stock, target_stock, incoming_stock)
join public.housekeeping_items as item
  on item.code = defaults.item_code
join public.organizations as org
  on org.id = item.organization_id
 and org.slug = 'grand-horizon-paris'
on conflict (item_id) do nothing;

insert into public.housekeeping_stock_movements (
  organization_id,
  item_id,
  movement_type,
  quantity_delta,
  note,
  created_at
)
select
  item.organization_id,
  item.id,
  mvt.movement_type::public.housekeeping_stock_movement_type,
  mvt.quantity_delta,
  mvt.note,
  now() - mvt.age_interval
from (
  values
    ('large_towel'::text, 'replenishment'::text,  40,  'Laundry delivery received',              interval '2 days'),
    ('small_towel'::text, 'replenishment'::text,  30,  'Laundry service return',                  interval '3 days'),
    ('pillowcase'::text,  'adjustment'::text,     -5,  'Inventory recount correction',            interval '1 day'),
    ('bath_mat'::text,    'replenishment'::text,  10,  'Emergency top-up — demand exceeds supply', interval '4 days')
) as mvt(item_code, movement_type, quantity_delta, note, age_interval)
join public.housekeeping_items as item
  on item.code = mvt.item_code
join public.organizations as org
  on org.id = item.organization_id
 and org.slug = 'grand-horizon-paris';

commit;
