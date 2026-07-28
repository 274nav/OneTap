alter table public.users enable row level security;
alter table public.venues enable row level security;
alter table public.check_ins enable row level security;
alter table public.likes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;

-- users: visible to any authenticated user, except across a block (either direction); only the owner can write.
create policy users_select on public.users for select to authenticated
  using (
    id = auth.uid()
    or not exists (
      select 1 from public.blocks b
      where (b.blocker = auth.uid() and b.blocked = users.id)
         or (b.blocker = users.id and b.blocked = auth.uid())
    )
  );
create policy users_insert_self on public.users for insert to authenticated
  with check (id = auth.uid());
create policy users_update_self on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy users_delete_self on public.users for delete to authenticated
  using (id = auth.uid());

-- venues: readable by anyone signed in; only the service role (edge functions) can write.
create policy venues_select on public.venues for select to authenticated using (true);

-- check_ins: a user only ever sees their own row directly; venue_active_users() (security definer) is
-- the only path to seeing who else is checked in, so exact coordinates never leave the row owner.
create policy check_ins_select_self on public.check_ins for select to authenticated
  using (user_id = auth.uid());
create policy check_ins_insert_self on public.check_ins for insert to authenticated
  with check (user_id = auth.uid());
create policy check_ins_update_self on public.check_ins for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy check_ins_delete_self on public.check_ins for delete to authenticated
  using (user_id = auth.uid());

-- likes: visible to both parties; only the sender can create; transition rules enforced by trigger.
create policy likes_select on public.likes for select to authenticated
  using (auth.uid() = from_user or auth.uid() = to_user);
create policy likes_insert on public.likes for insert to authenticated
  with check (auth.uid() = from_user);
create policy likes_update on public.likes for update to authenticated
  using (auth.uid() = from_user or auth.uid() = to_user);

-- matches: visible to both parties; created only by the match trigger, deactivated (unmatch) by either party.
create policy matches_select on public.matches for select to authenticated
  using (auth.uid() = user1 or auth.uid() = user2);
create policy matches_update on public.matches for update to authenticated
  using (auth.uid() = user1 or auth.uid() = user2)
  with check (auth.uid() = user1 or auth.uid() = user2);

-- messages: each side sees a row until they personally delete it; only a match participant can send.
create policy messages_select on public.messages for select to authenticated
  using (
    (auth.uid() = sender_id and not deleted_by_sender)
    or (
      auth.uid() <> sender_id
      and not deleted_by_receiver
      and exists (
        select 1 from public.matches m
        where m.id = messages.match_id and (m.user1 = auth.uid() or m.user2 = auth.uid())
      )
    )
  );
create policy messages_insert on public.messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.active and (m.user1 = auth.uid() or m.user2 = auth.uid())
    )
  );
create policy messages_update on public.messages for update to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id and (m.user1 = auth.uid() or m.user2 = auth.uid())
    )
  );

-- reports: write-only from the reporter's point of view; no one browses reports made against them.
create policy reports_insert on public.reports for insert to authenticated
  with check (auth.uid() = reporter);
create policy reports_select_own on public.reports for select to authenticated
  using (auth.uid() = reporter);

-- blocks: fully owned by the blocker.
create policy blocks_select on public.blocks for select to authenticated
  using (auth.uid() = blocker);
create policy blocks_insert on public.blocks for insert to authenticated
  with check (auth.uid() = blocker);
create policy blocks_delete on public.blocks for delete to authenticated
  using (auth.uid() = blocker);

-- notifications: read-only to their owner from the client; rows are only ever inserted by triggers/functions.
create policy notifications_select on public.notifications for select to authenticated
  using (auth.uid() = user_id);
create policy notifications_update on public.notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- push_tokens: fully owned by the user who registered the device.
create policy push_tokens_all on public.push_tokens for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Prevent editing message content/history after the fact — only the two delete flags may ever change,
-- and each side may only set their own flag (and never un-delete).
create or replace function public.enforce_message_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.message <> old.message or new.sender_id <> old.sender_id or new.match_id <> old.match_id
     or new.sent_at <> old.sent_at then
    raise exception 'MESSAGE_IMMUTABLE';
  end if;
  if new.deleted_by_sender <> old.deleted_by_sender and auth.uid() <> old.sender_id then
    raise exception 'NOT_ALLOWED';
  end if;
  if new.deleted_by_receiver <> old.deleted_by_receiver and auth.uid() = old.sender_id then
    raise exception 'NOT_ALLOWED';
  end if;
  if old.deleted_by_sender and not new.deleted_by_sender then
    raise exception 'NOT_ALLOWED';
  end if;
  if old.deleted_by_receiver and not new.deleted_by_receiver then
    raise exception 'NOT_ALLOWED';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_message_immutability
  before update on public.messages
  for each row execute function public.enforce_message_immutability();
