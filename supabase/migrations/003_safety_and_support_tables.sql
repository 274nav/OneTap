create table public.blocks (
  blocker uuid not null references public.users(id) on delete cascade,
  blocked uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references public.users(id) on delete cascade,
  reported_user uuid not null references public.users(id) on delete cascade,
  reason public.report_reason not null,
  details text,
  created_at timestamptz not null default now(),
  check (reporter <> reported_user)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type public.notification_type not null,
  payload jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_unread_idx on public.notifications(user_id) where not read;

create table public.push_tokens (
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios','android','web')),
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);
