-- Extensions
create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- Enums
create type public.sex_type as enum ('male','female','other');
create type public.orientation_type as enum ('straight','gay','lesbian','bisexual','pansexual','asexual','other');
create type public.like_status as enum ('pending','matched','rejected','withdrawn');
create type public.venue_category as enum ('pub','bar','restaurant','university','college','gym','shopping_centre','event_venue','cafe','airport');
create type public.report_reason as enum ('fake_profile','spam','harassment','inappropriate_content','underage','other');
create type public.notification_type as enum ('like_received','match_created','new_message','match_removed','checked_out','venue_alert');

-- Shared helper: keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
