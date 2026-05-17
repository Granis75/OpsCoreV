begin;

-- Insert demo housekeeping daily plan for today
insert into public.housekeeping_daily_plans (
  organization_id,
  service_date,
  cleaners_ordered,
  general_note
) 
select 
  organizations.id,
  current_date,
  3,
  'Today: VIP group arriving late afternoon. Ensure all premium units are ready early.'
from public.organizations
where organizations.slug = 'grand-horizon-paris'
on conflict (organization_id, service_date) do nothing;

-- Get the created plan ID for today
with today_plan as (
  select id, organization_id from public.housekeeping_daily_plans
  where service_date = current_date
  and organization_id = (select id from public.organizations where slug = 'grand-horizon-paris')
)

-- Insert demo entries
insert into public.housekeeping_entries (
  daily_plan_id,
  apartment_label,
  intervention_type,
  guests_count,
  double_beds_gl,
  single_beds_ls,
  baby_beds_litbb,
  reception_memo,
  priority,
  sort_order
)
select 
  today_plan.id,
  apartment.label,
  apartment.intervention_type,
  apartment.guests_count,
  apartment.gl,
  apartment.ls,
  apartment.bb,
  apartment.memo,
  apartment.priority,
  apartment.sort
from today_plan,
lateral (
  values
    ('101', 'departure'::public.housekeeping_intervention_type, 2, 1, 0, 0, 'Early arrival expected at 15:00'::text, 'early_arrival'::public.housekeeping_priority, 1),
    ('102', 'stayover_z'::public.housekeeping_intervention_type, 3, 1, 1, 0, 'Long stay guest - full linen change'::text, 'standard'::public.housekeeping_priority, 2),
    ('103', 'stayover_s'::public.housekeeping_intervention_type, 2, 0, 0, 0, 'Fresh towels requested'::text, 'standard'::public.housekeeping_priority, 3),
    ('104', 'departure'::public.housekeeping_intervention_type, 4, 1, 2, 1, 'Baby bed confirmed for next arrival'::text, 'standard'::public.housekeeping_priority, 4),
    ('201', 'stayover_z'::public.housekeeping_intervention_type, 1, 0, 1, 0, 'Business traveler, minimal requirements'::text, 'standard'::public.housekeeping_priority, 5),
    ('202', 'departure'::public.housekeeping_intervention_type, 3, 1, 1, 0, 'VIP arrival'::text, 'vip'::public.housekeeping_priority, 6),
    ('203', 'stayover_s'::public.housekeeping_intervention_type, 4, 1, 1, 0, 'Standard turnover'::text, 'standard'::public.housekeeping_priority, 7),
    ('204', 'departure'::public.housekeeping_intervention_type, 2, 1, 0, 0, 'Client requested early clean'::text, 'early_arrival'::public.housekeeping_priority, 8),
    ('301', 'stayover_z'::public.housekeeping_intervention_type, 5, 2, 1, 1, 'Family of 5 arriving, confirm baby bed setup'::text, 'vip'::public.housekeeping_priority, 9),
    ('302', 'stayover_s'::public.housekeeping_intervention_type, 1, 0, 0, 0, 'Quick turnover, towels only'::text, 'standard'::public.housekeeping_priority, 10),
    ('303', 'departure'::public.housekeeping_intervention_type, 3, 1, 1, 0, 'Standard'::text, 'standard'::public.housekeeping_priority, 11),
    ('304', 'stayover_z'::public.housekeeping_intervention_type, 2, 0, 2, 0, 'Twin beds, full change'::text, 'standard'::public.housekeeping_priority, 12)
) as apartment(label, intervention_type, guests_count, gl, ls, bb, memo, priority, sort)
on conflict do nothing;

-- Create or update housekeeping settings for the organization if they don't exist
insert into public.housekeeping_settings (
  organization_id,
  departure_minutes,
  stayover_z_minutes,
  stayover_s_minutes,
  productive_minutes_per_cleaner
)
select 
  organizations.id,
  45,
  35,
  0,
  360
from public.organizations
where organizations.slug = 'grand-horizon-paris'
on conflict (organization_id) do update
set 
  departure_minutes = 45,
  stayover_z_minutes = 35,
  stayover_s_minutes = 0,
  productive_minutes_per_cleaner = 360;

commit;
