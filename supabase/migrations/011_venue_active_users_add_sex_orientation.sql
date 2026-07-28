-- Adds sex/orientation to venue_active_users so the Search screen's Male/Female/LGBTQ+ filters
-- actually have data to filter on (these fields are already public via users_public).
drop function public.venue_active_users(uuid);

create function public.venue_active_users(p_venue_id uuid)
returns table (
  user_id uuid, name text, age int, sex public.sex_type, orientation public.orientation_type,
  bio text, photo_url text, verified boolean, premium boolean, checked_in_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select u.id, u.name, date_part('year', age(current_date, u.dob))::int, u.sex, u.orientation,
         u.bio, u.photo_url, u.verified, u.premium, c.checked_in_at
  from public.check_ins c
  join public.users u on u.id = c.user_id
  where c.venue_id = p_venue_id
    and c.active
    and u.invisible_mode = false
    and u.id <> auth.uid()
    and not exists (
      select 1 from public.blocks b
      where (b.blocker = auth.uid() and b.blocked = u.id)
         or (b.blocker = u.id and b.blocked = auth.uid())
    );
$$;

revoke execute on function public.venue_active_users(uuid) from public, anon;
grant execute on function public.venue_active_users(uuid) to authenticated;
