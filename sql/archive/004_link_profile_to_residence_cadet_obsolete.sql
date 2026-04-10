begin;

update public.profiles
set
  organization_id = '30000000-0000-4000-8000-000000000001',
  updated_at = now()
where email = 'kindestway.co@gmail.com';

commit;
