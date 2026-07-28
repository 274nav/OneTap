-- Fixes for findings from Supabase's security & performance advisors after the initial schema pass.

-- 1. view must respect the querying user's own RLS, not the creator's
drop view public.users_public;
create view public.users_public with (security_invoker = true) as
  select
    id, name,
    date_part('year', age(current_date, dob))::int as age,
    sex, orientation, bio, photo_url, verified, premium, invisible_mode, created_at
  from public.users;

-- 2. pin search_path on the one function that was missing it
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3. public buckets serve objects via their public URL without needing an RLS SELECT policy;
-- a blanket SELECT policy only adds the ability to *list/enumerate* every file, which we don't want.
drop policy profile_photos_read on storage.objects;

-- 4. trigger-only / internal functions should never be reachable as a direct RPC call
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.enforce_like_quota() from public, anon, authenticated;
revoke execute on function public.enforce_like_transition() from public, anon, authenticated;
revoke execute on function public.handle_like_match() from public, anon, authenticated;
revoke execute on function public.handle_match_removed() from public, anon, authenticated;
revoke execute on function public.enforce_message_limits() from public, anon, authenticated;
revoke execute on function public.handle_new_message() from public, anon, authenticated;
revoke execute on function public.enforce_message_immutability() from public, anon, authenticated;
revoke execute on function public.auto_checkout_stale() from public, anon, authenticated;

-- 5. the real RPCs are for signed-in users only, never anon
revoke execute on function public.attempt_check_in(uuid, double precision, double precision) from public, anon;
revoke execute on function public.verify_check_in(double precision, double precision) from public, anon;
revoke execute on function public.check_out() from public, anon;
revoke execute on function public.record_ad_watch() from public, anon;
revoke execute on function public.delete_own_account() from public, anon;
revoke execute on function public.venue_active_users(uuid) from public, anon;
grant execute on function public.attempt_check_in(uuid, double precision, double precision) to authenticated;
grant execute on function public.verify_check_in(double precision, double precision) to authenticated;
grant execute on function public.check_out() to authenticated;
grant execute on function public.record_ad_watch() to authenticated;
grant execute on function public.delete_own_account() to authenticated;
grant execute on function public.venue_active_users(uuid) to authenticated;

-- 6. cover the foreign keys the linter flagged
create index blocks_blocked_idx on public.blocks(blocked);
create index likes_to_user_idx on public.likes(to_user);
create index matches_user2_idx on public.matches(user2);
create index messages_sender_id_idx on public.messages(sender_id);
create index reports_reported_user_idx on public.reports(reported_user);
create index reports_reporter_idx on public.reports(reporter);

-- 7. rewrite RLS policies so auth.uid() is evaluated once per query, not once per row
drop policy users_select on public.users;
create policy users_select on public.users for select to authenticated
  using (
    id = (select auth.uid())
    or not exists (
      select 1 from public.blocks b
      where (b.blocker = (select auth.uid()) and b.blocked = users.id)
         or (b.blocker = users.id and b.blocked = (select auth.uid()))
    )
  );
drop policy users_insert_self on public.users;
create policy users_insert_self on public.users for insert to authenticated
  with check (id = (select auth.uid()));
drop policy users_update_self on public.users;
create policy users_update_self on public.users for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy users_delete_self on public.users;
create policy users_delete_self on public.users for delete to authenticated
  using (id = (select auth.uid()));

drop policy check_ins_select_self on public.check_ins;
create policy check_ins_select_self on public.check_ins for select to authenticated
  using (user_id = (select auth.uid()));
drop policy check_ins_insert_self on public.check_ins;
create policy check_ins_insert_self on public.check_ins for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy check_ins_update_self on public.check_ins;
create policy check_ins_update_self on public.check_ins for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy check_ins_delete_self on public.check_ins;
create policy check_ins_delete_self on public.check_ins for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy likes_select on public.likes;
create policy likes_select on public.likes for select to authenticated
  using ((select auth.uid()) = from_user or (select auth.uid()) = to_user);
drop policy likes_insert on public.likes;
create policy likes_insert on public.likes for insert to authenticated
  with check ((select auth.uid()) = from_user);
drop policy likes_update on public.likes;
create policy likes_update on public.likes for update to authenticated
  using ((select auth.uid()) = from_user or (select auth.uid()) = to_user);

drop policy matches_select on public.matches;
create policy matches_select on public.matches for select to authenticated
  using ((select auth.uid()) = user1 or (select auth.uid()) = user2);
drop policy matches_update on public.matches;
create policy matches_update on public.matches for update to authenticated
  using ((select auth.uid()) = user1 or (select auth.uid()) = user2)
  with check ((select auth.uid()) = user1 or (select auth.uid()) = user2);

drop policy messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (
    ((select auth.uid()) = sender_id and not deleted_by_sender)
    or (
      (select auth.uid()) <> sender_id
      and not deleted_by_receiver
      and exists (
        select 1 from public.matches m
        where m.id = messages.match_id and (m.user1 = (select auth.uid()) or m.user2 = (select auth.uid()))
      )
    )
  );
drop policy messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.active and (m.user1 = (select auth.uid()) or m.user2 = (select auth.uid()))
    )
  );
drop policy messages_update on public.messages;
create policy messages_update on public.messages for update to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id and (m.user1 = (select auth.uid()) or m.user2 = (select auth.uid()))
    )
  );

drop policy reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated
  with check ((select auth.uid()) = reporter);
drop policy reports_select_own on public.reports;
create policy reports_select_own on public.reports for select to authenticated
  using ((select auth.uid()) = reporter);

drop policy blocks_select on public.blocks;
create policy blocks_select on public.blocks for select to authenticated
  using ((select auth.uid()) = blocker);
drop policy blocks_insert on public.blocks;
create policy blocks_insert on public.blocks for insert to authenticated
  with check ((select auth.uid()) = blocker);
drop policy blocks_delete on public.blocks;
create policy blocks_delete on public.blocks for delete to authenticated
  using ((select auth.uid()) = blocker);

drop policy notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy push_tokens_all on public.push_tokens;
create policy push_tokens_all on public.push_tokens for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
