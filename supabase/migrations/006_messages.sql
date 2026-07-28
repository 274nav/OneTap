create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 2000),
  sent_at timestamptz not null default now(),
  deleted_by_sender boolean not null default false,
  deleted_by_receiver boolean not null default false
);

create index messages_match_idx on public.messages(match_id, sent_at);

-- Free tier: 10 messages per person per conversation, 3 active conversations at a time.
create or replace function public.enforce_message_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_premium boolean;
  v_match public.matches;
  v_other uuid;
  v_sent_in_match int;
  v_active_conversations int;
begin
  select premium into v_premium from public.users where id = new.sender_id;
  if v_premium then
    return new;
  end if;

  select * into v_match from public.matches where id = new.match_id;
  if not found or not v_match.active then
    raise exception 'MATCH_NOT_ACTIVE';
  end if;

  v_other := case when v_match.user1 = new.sender_id then v_match.user2 else v_match.user1 end;

  if exists (
    select 1 from public.blocks
    where (blocker = new.sender_id and blocked = v_other)
       or (blocker = v_other and blocked = new.sender_id)
  ) then
    raise exception 'BLOCKED';
  end if;

  select count(*) into v_sent_in_match from public.messages
    where match_id = new.match_id and sender_id = new.sender_id;
  if v_sent_in_match >= 10 then
    raise exception 'MESSAGE_LIMIT_REACHED';
  end if;

  select count(distinct m.id) into v_active_conversations
    from public.matches m
    where m.active
      and (m.user1 = new.sender_id or m.user2 = new.sender_id)
      and (
        m.id = new.match_id
        or exists (select 1 from public.messages msg where msg.match_id = m.id and msg.sender_id = new.sender_id)
      );

  if v_active_conversations > 3 then
    raise exception 'CONVERSATION_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_message_limits
  before insert on public.messages
  for each row execute function public.enforce_message_limits();

create or replace function public.handle_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
  v_other uuid;
begin
  select * into v_match from public.matches where id = new.match_id;
  v_other := case when v_match.user1 = new.sender_id then v_match.user2 else v_match.user1 end;

  insert into public.notifications (user_id, type, payload)
    values (v_other, 'new_message', jsonb_build_object('match_id', new.match_id, 'from_user', new.sender_id));

  return new;
end;
$$;

create trigger trg_handle_new_message
  after insert on public.messages
  for each row execute function public.handle_new_message();
