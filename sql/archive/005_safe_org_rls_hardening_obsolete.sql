begin;

create or replace function public.get_linked_organization_id()
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

create or replace function public.get_safe_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.get_linked_organization_id(),
    '30000000-0000-4000-8000-000000000001'::uuid
  );
$$;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select public.get_safe_organization_id();
$$;

create or replace function public.belongs_to_current_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(target_organization_id = public.get_safe_organization_id(), false);
$$;

create or replace function public.debug_auth_context()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'auth_uid', auth.uid(),
    'org_id', public.get_linked_organization_id(),
    'safe_org_id', public.get_safe_organization_id()
  );
$$;

create or replace function public.ensure_profile_exists()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.profiles (id, organization_id, email)
  select
    u.id,
    '30000000-0000-4000-8000-000000000001'::uuid,
    u.email
  from auth.users as u
  where u.id = auth.uid()
  on conflict (id) do nothing;
end;
$$;

create or replace function public.link_user_to_demo_org()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  perform public.ensure_profile_exists();

  update public.profiles
  set
    organization_id = '30000000-0000-4000-8000-000000000001'::uuid,
    updated_at = now()
  where id = auth.uid();
end;
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, organization_id, email, first_name, last_name)
  values (
    new.id,
    '30000000-0000-4000-8000-000000000001'::uuid,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '')
  )
  on conflict (id) do update
  set
    organization_id = coalesce(public.profiles.organization_id, excluded.organization_id),
    email = excluded.email,
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.get_linked_organization_id() from public;
grant execute on function public.get_linked_organization_id() to authenticated;

revoke all on function public.get_safe_organization_id() from public;
grant execute on function public.get_safe_organization_id() to authenticated;

revoke all on function public.current_organization_id() from public;
grant execute on function public.current_organization_id() to authenticated;

revoke all on function public.belongs_to_current_organization(uuid) from public;
grant execute on function public.belongs_to_current_organization(uuid) to authenticated;

revoke all on function public.debug_auth_context() from public;
grant execute on function public.debug_auth_context() to authenticated;

revoke all on function public.ensure_profile_exists() from public;
grant execute on function public.ensure_profile_exists() to authenticated;

revoke all on function public.link_user_to_demo_org() from public;
grant execute on function public.link_user_to_demo_org() to authenticated;

drop policy if exists organizations_select_own on public.organizations;
create policy organizations_select_own
on public.organizations
for select
to authenticated
using (id = public.get_safe_organization_id());

drop policy if exists organizations_update_own on public.organizations;
create policy organizations_update_own
on public.organizations
for update
to authenticated
using (id = public.get_linked_organization_id())
with check (id = public.get_linked_organization_id());

drop policy if exists profiles_select_own_org on public.profiles;
create policy profiles_select_own_org
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or organization_id = public.get_safe_organization_id()
);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and coalesce(organization_id, public.get_safe_organization_id()) = public.get_safe_organization_id()
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'vendor_categories',
    'vendors',
    'vendor_interactions',
    'teams',
    'staff_roles',
    'staff_directory',
    'service_contacts',
    'emergency_protocols',
    'expense_categories',
    'cash_expenses',
    'maintenance_tickets',
    'ticket_updates',
    'review_sources',
    'reviews',
    'reputation_snapshots',
    'operation_items'
  ]
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_select_own_org',
      table_name
    );

    execute format(
      'create policy %I on public.%I for select to authenticated using (organization_id = public.get_safe_organization_id())',
      table_name || '_select_own_org',
      table_name
    );

    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_insert_own_org',
      table_name
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (organization_id = public.get_linked_organization_id())',
      table_name || '_insert_own_org',
      table_name
    );

    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_update_own_org',
      table_name
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (organization_id = public.get_linked_organization_id()) with check (organization_id = public.get_linked_organization_id())',
      table_name || '_update_own_org',
      table_name
    );

    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_delete_own_org',
      table_name
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (organization_id = public.get_linked_organization_id())',
      table_name || '_delete_own_org',
      table_name
    );
  end loop;
end
$$;

commit;
