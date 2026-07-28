-- Venue facts (name/coords/category from Google Places) are public, non-sensitive data, so any
-- signed-in user can register a venue the app discovers nearby. The unique google_place_id constraint
-- prevents duplicates; there's deliberately no update/delete policy since venues don't change client-side.
create policy venues_insert on public.venues for insert to authenticated
  with check (true);
