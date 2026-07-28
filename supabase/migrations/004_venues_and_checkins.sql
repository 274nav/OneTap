create table public.venues (
  id uuid primary key default gen_random_uuid(),
  google_place_id text unique not null,
  venue_name text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  category public.venue_category not null,
  geo geography(point, 4326) generated always as (
    st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
  ) stored,
  created_at timestamptz not null default now()
);

create index venues_geo_idx on public.venues using gist (geo);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  active boolean not null default true,
  last_verified_at timestamptz not null default now(),
  out_of_range_since timestamptz,
  auto_checked_out_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index one_active_checkin_per_user on public.check_ins(user_id) where active;
create index check_ins_venue_active_idx on public.check_ins(venue_id) where active;

comment on column public.check_ins.out_of_range_since is 'Set when a verification ping finds the user outside the venue radius; cleared when back in range. Auto-checkout fires 10 min after this is set.';

-- Check in: verifies the caller is within ~100m of the venue before creating an active check-in.
create or replace function public.attempt_check_in(p_venue_id uuid, p_lat double precision, p_lng double precision)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venue public.venues;
  v_distance double precision;
  v_checkin public.check_ins;
begin
  select * into v_venue from public.venues where id = p_venue_id;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'VENUE_NOT_FOUND');
  end if;

  v_distance := st_distance(v_venue.geo, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography);

  if v_distance > 100 then
    return jsonb_build_object('success', false, 'reason', 'OUT_OF_RANGE', 'distance_m', round(v_distance::numeric, 1));
  end if;

  -- checking into a new venue automatically checks the user out of any other active venue
  update public.check_ins
    set active = false, auto_checked_out_at = now()
    where user_id = auth.uid() and active = true and venue_id <> p_venue_id;

  insert into public.check_ins (user_id, venue_id, last_verified_at)
  values (auth.uid(), p_venue_id, now())
  on conflict (user_id) where active
    do update set venue_id = excluded.venue_id, checked_in_at = now(), last_verified_at = now(),
                  out_of_range_since = null, active = true
  returning * into v_checkin;

  return jsonb_build_object('success', true, 'check_in_id', v_checkin.id, 'distance_m', round(v_distance::numeric, 1));
end;
$$;

-- Periodic verification ping from the app while checked in.
create or replace function public.verify_check_in(p_lat double precision, p_lng double precision)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checkin public.check_ins;
  v_venue public.venues;
  v_distance double precision;
begin
  select * into v_checkin from public.check_ins where user_id = auth.uid() and active = true;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'NOT_CHECKED_IN');
  end if;

  select * into v_venue from public.venues where id = v_checkin.venue_id;
  v_distance := st_distance(v_venue.geo, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography);

  if v_distance <= 100 then
    update public.check_ins set last_verified_at = now(), out_of_range_since = null where id = v_checkin.id;
    return jsonb_build_object('success', true, 'in_range', true, 'distance_m', round(v_distance::numeric, 1));
  end if;

  update public.check_ins
    set last_verified_at = now(),
        out_of_range_since = coalesce(out_of_range_since, now())
    where id = v_checkin.id
    returning * into v_checkin;

  if v_checkin.out_of_range_since <= now() - interval '10 minutes' then
    update public.check_ins set active = false, auto_checked_out_at = now() where id = v_checkin.id;
    insert into public.notifications (user_id, type, payload)
      values (auth.uid(), 'checked_out', jsonb_build_object('venue_id', v_venue.id, 'venue_name', v_venue.venue_name));
    return jsonb_build_object('success', true, 'in_range', false, 'checked_out', true);
  end if;

  return jsonb_build_object('success', true, 'in_range', false, 'checked_out', false, 'distance_m', round(v_distance::numeric, 1));
end;
$$;

create or replace function public.check_out()
returns void
language sql
security definer
set search_path = public
as $$
  update public.check_ins set active = false, auto_checked_out_at = now()
  where user_id = auth.uid() and active = true;
$$;

-- Sweeps check-ins that have gone stale (no verification ping / location off) for 10+ minutes.
create or replace function public.auto_checkout_stale()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select c.id, c.user_id, c.venue_id, v.venue_name
    from public.check_ins c
    join public.venues v on v.id = c.venue_id
    where c.active
      and (
        (c.out_of_range_since is not null and c.out_of_range_since <= now() - interval '10 minutes')
        or c.last_verified_at <= now() - interval '10 minutes'
      )
  loop
    update public.check_ins set active = false, auto_checked_out_at = now() where id = r.id;
    insert into public.notifications (user_id, type, payload)
      values (r.user_id, 'checked_out', jsonb_build_object('venue_id', r.venue_id, 'venue_name', r.venue_name));
  end loop;
end;
$$;

select cron.schedule('auto-checkout-sweep', '* * * * *', $$select public.auto_checkout_stale();$$);

-- Users currently checked into a venue, respecting invisible mode and blocks. Never exposes coordinates.
-- (Superseded by migration 011, which adds sex/orientation to the return columns.)
create or replace function public.venue_active_users(p_venue_id uuid)
returns table (
  user_id uuid, name text, age int, bio text, photo_url text, verified boolean, premium boolean, checked_in_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select u.id, u.name, date_part('year', age(current_date, u.dob))::int, u.bio, u.photo_url, u.verified, u.premium, c.checked_in_at
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
