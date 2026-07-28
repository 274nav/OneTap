create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user1 uuid not null references public.users(id) on delete cascade,
  user2 uuid not null references public.users(id) on delete cascade,
  matched_at timestamptz not null default now(),
  active boolean not null default true,
  check (user1 <> user2),
  unique (user1, user2)
);

create table public.likes (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.users(id) on delete cascade,
  to_user uuid not null references public.users(id) on delete cascade,
  status public.like_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_user <> to_user),
  unique (from_user, to_user)
);

create trigger trg_likes_updated_at
  before update on public.likes
  for each row execute function public.set_updated_at();

comment on column public.users.free_likes_used is 'Free-tier likes sent since the last ad watch; blocked at 8 until record_ad_watch() resets it. Premium users are unlimited.';

-- Free-tier "8 likes then an ad" gate + blocked-user guard, enforced regardless of client.
create or replace function public.enforce_like_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_premium boolean;
  v_used int;
begin
  if exists (
    select 1 from public.blocks
    where (blocker = new.from_user and blocked = new.to_user)
       or (blocker = new.to_user and blocked = new.from_user)
  ) then
    raise exception 'BLOCKED';
  end if;

  select premium, free_likes_used into v_premium, v_used from public.users where id = new.from_user;

  if not v_premium then
    if v_used >= 8 then
      raise exception 'AD_REQUIRED';
    end if;
    update public.users set free_likes_used = free_likes_used + 1 where id = new.from_user;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_like_quota
  before insert on public.likes
  for each row execute function public.enforce_like_quota();

-- Resets a free user's like counter after they watch a rewarded ad.
create or replace function public.record_ad_watch()
returns void
language sql
security definer
set search_path = public
as $$
  update public.users set free_likes_used = 0 where id = auth.uid();
$$;

-- Only the liker may withdraw (-> withdrawn); only the recipient may reject (-> rejected).
create or replace function public.enforce_like_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if new.status = 'withdrawn' and auth.uid() <> old.from_user then
    raise exception 'NOT_ALLOWED';
  end if;
  if new.status = 'rejected' and auth.uid() <> old.to_user then
    raise exception 'NOT_ALLOWED';
  end if;
  if new.status not in ('withdrawn','rejected','matched') then
    raise exception 'INVALID_TRANSITION';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_like_transition
  before update on public.likes
  for each row execute function public.enforce_like_transition();

-- Mutual pending likes become a match; notifies both sides. One-sided likes notify the recipient.
create or replace function public.handle_like_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reciprocal public.likes;
  v_u1 uuid;
  v_u2 uuid;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  select * into v_reciprocal from public.likes
    where from_user = new.to_user and to_user = new.from_user and status = 'pending';

  if found then
    update public.likes set status = 'matched' where id = new.id;
    update public.likes set status = 'matched' where id = v_reciprocal.id;

    v_u1 := least(new.from_user, new.to_user);
    v_u2 := greatest(new.from_user, new.to_user);

    insert into public.matches (user1, user2) values (v_u1, v_u2)
      on conflict (user1, user2) do update set active = true, matched_at = now();

    insert into public.notifications (user_id, type, payload) values
      (new.from_user, 'match_created', jsonb_build_object('other_user', new.to_user)),
      (new.to_user, 'match_created', jsonb_build_object('other_user', new.from_user));
  else
    insert into public.notifications (user_id, type, payload)
      values (new.to_user, 'like_received', jsonb_build_object('from_user', new.from_user));
  end if;

  return new;
end;
$$;

create trigger trg_handle_like_match
  after insert on public.likes
  for each row execute function public.handle_like_match();

-- Removing a match (from the Matches/Chats screens) notifies the other party.
create or replace function public.handle_match_removed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.active = false and old.active = true then
    insert into public.notifications (user_id, type, payload) values
      (new.user1, 'match_removed', jsonb_build_object('other_user', new.user2)),
      (new.user2, 'match_removed', jsonb_build_object('other_user', new.user1));
  end if;
  return new;
end;
$$;

create trigger trg_handle_match_removed
  after update on public.matches
  for each row execute function public.handle_match_removed();
