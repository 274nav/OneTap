create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  dob date not null check (dob <= (current_date - interval '18 years')),
  sex public.sex_type not null,
  orientation public.orientation_type not null,
  bio text not null default '' check (char_length(bio) <= 200),
  photo_url text,
  verified boolean not null default false,
  premium boolean not null default false,
  premium_expires_at timestamptz,
  invisible_mode boolean not null default false,
  free_likes_used int not null default 0,
  privacy_accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is 'Profile data for an authenticated person. Age is derived from dob at query time, never stored.';
comment on column public.users.free_likes_used is 'Likes sent since the free-tier user last watched an ad; resets to 0 via record_ad_watch().';

create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Convenience view: exposes computed age without storing it (dob-based age changes over time)
create view public.users_public as
  select
    id, name,
    date_part('year', age(current_date, dob))::int as age,
    sex, orientation, bio, photo_url, verified, premium, invisible_mode, created_at
  from public.users;
