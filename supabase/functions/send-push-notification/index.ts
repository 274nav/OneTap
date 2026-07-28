import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Invoked by a Postgres trigger (see supabase/migrations/012_push_notification_dispatch.sql)
// whenever a row is inserted into public.notifications. Not meant to be called by app clients
// directly -- auth is a shared secret set by the DB trigger, not a user JWT, hence verify_jwt=false
// at deploy time (`supabase functions deploy send-push-notification --no-verify-jwt`).
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface NotificationRecord {
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
}

const NOTIFICATION_COPY: Record<string, (payload: Record<string, unknown>) => { title: string; body: string }> = {
  like_received: () => ({ title: "OneTap", body: "Someone at your venue likes you ❤️" }),
  match_created: () => ({ title: "It's a match!", body: "You matched — start chatting now." }),
  new_message: () => ({ title: "New message", body: "You've got a new message." }),
  match_removed: () => ({ title: "Match removed", body: "A match was removed." }),
  checked_out: (p) => ({
    title: "Checked out",
    body: `You've been automatically checked out because you've left ${p?.venue_name ?? "the venue"}. Check back in when you return.`,
  }),
  venue_alert: () => ({ title: "Venue activity", body: "Someone you're watching just checked in." }),
};

Deno.serve(async (req) => {
  if (WEBHOOK_SECRET && req.headers.get("x-onetap-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }

  const { record } = (await req.json()) as { record?: NotificationRecord };
  if (!record) return new Response("no record", { status: 400 });

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: tokens } = await supabase.from("push_tokens").select("token").eq("user_id", record.user_id);
  if (!tokens || tokens.length === 0) return new Response("no tokens", { status: 200 });

  const copyFn = NOTIFICATION_COPY[record.type] ?? (() => ({ title: "OneTap", body: "You have a new notification." }));
  const { title, body } = copyFn(record.payload ?? {});

  const messages = tokens.map((t) => ({
    to: t.token,
    sound: "default",
    title,
    body,
    data: { type: record.type, payload: record.payload },
  }));

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });

  return new Response("ok", { status: 200 });
});
