alter table if exists public.bookings
drop constraint if exists bookings_status_check;

alter table if exists public.bookings
add constraint bookings_status_check
check (status in ('pending', 'confirmed', 'booked', 'boarded', 'no_show', 'cancelled', 'expired'));
