alter table public.routes
  drop constraint if exists routes_status_check;

update public.routes
set status = case
  when status = 'active' then 'available'
  when status = 'inactive' then 'coming_soon'
  else status
end;

alter table public.routes
  alter column status set default 'available';

alter table public.routes
  add constraint routes_status_check
  check (status in ('available', 'coming_soon'));
