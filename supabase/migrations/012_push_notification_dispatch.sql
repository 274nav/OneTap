create extension if not exists pg_net with schema extensions;

-- Fires the send-push-notification edge function (see supabase/functions/send-push-notification)
-- for every new notification row. Auth is a shared secret, not a user JWT, since this is a
-- server-to-server call from Postgres itself.
--
-- NOTE: replace both the URL and the secret below with your own project's values before applying
-- this to a new project. The secret must match the WEBHOOK_SECRET you set on the edge function
-- (Supabase dashboard -> Edge Functions -> send-push-notification -> Secrets). See README.
-- The value actually deployed to this project's database is not committed here.
create or replace function public.notify_push_dispatch()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-onetap-webhook-secret', '<your-webhook-secret>'
    ),
    body := jsonb_build_object('record', row_to_json(new))
  );
  return new;
end;
$$;

revoke execute on function public.notify_push_dispatch() from public, anon, authenticated;

create trigger trg_notify_push_dispatch
  after insert on public.notifications
  for each row execute function public.notify_push_dispatch();
