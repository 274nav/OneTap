-- Premium feature: "Notify me when a selected user checks into the same venue."
create table public.watched_users (
  watcher_id uuid not null references public.users(id) on delete cascade,
  watched_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (watcher_id, watched_id),
  check (watcher_id <> watched_id)
);

alter table public.watched_users enable row level security;

create policy watched_users_all on public.watched_users for all to authenticated
  using ((select auth.uid()) = watcher_id) with check ((select auth.uid()) = watcher_id);

create or replace function public.enforce_watch_is_premium()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.users where id = new.watcher_id and premium) then
    raise exception 'PREMIUM_REQUIRED';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_watch_is_premium
  before insert on public.watched_users
  for each row execute function public.enforce_watch_is_premium();

revoke execute on function public.enforce_watch_is_premium() from public, anon, authenticated;

-- Notifies premium watchers when someone they're watching checks into a venue.
create or replace function public.handle_watched_checkin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venue_name text;
begin
  select venue_name into v_venue_name from public.venues where id = new.venue_id;

  insert into public.notifications (user_id, type, payload)
  select w.watcher_id, 'venue_alert',
         jsonb_build_object('watched_user', new.user_id, 'venue_id', new.venue_id, 'venue_name', v_venue_name)
  from public.watched_users w
  join public.users watcher on watcher.id = w.watcher_id
  where w.watched_id = new.user_id
    and watcher.premium
    and not exists (
      select 1 from public.blocks b
      where (b.blocker = w.watcher_id and b.blocked = new.user_id)
         or (b.blocker = new.user_id and b.blocked = w.watcher_id)
    );

  return new;
end;
$$;

create trigger trg_handle_watched_checkin
  after insert on public.check_ins
  for each row execute function public.handle_watched_checkin();

revoke execute on function public.handle_watched_checkin() from public, anon, authenticated;
