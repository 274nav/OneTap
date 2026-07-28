# OneTap

Meet the people around you. One tap is all it takes.

OneTap is a venue-based social app: check into a venue (pub, café, gym, university, event…),
browse who else is checked in, and send a like. A conversation only unlocks when a like is mutual —
no pressure to make the first move alone.

Built with **Expo (React Native)** — one codebase for iOS, Android, and a web preview — and
**Supabase** (Postgres, Auth, Realtime, Storage, Edge Functions) for the backend.

## Project structure

```
app/                      expo-router file-based routes
  (auth)/sign-in.tsx       Google / Apple sign-in
  (onboarding)/            Privacy explainer -> create profile
  (tabs)/                  Profile, Matches, Chats, Search, Map
  legal/                   Privacy Policy, Terms & Conditions
src/
  contexts/                Auth, CheckIn (geo verification), Notifications
  components/              Shared UI (Button, Card, Avatar, Chip, PlatformMap, ...)
  hooks/                   useNearbyVenues, useConversations, useSendLike
  lib/                     Supabase client, theme tokens, database types, billing seam
supabase/
  migrations/              SQL mirror of everything applied to the live Supabase project, in order
  functions/                Edge Function source (push notification dispatch)
```

## What's already set up for you

- **Supabase project "OneTap"** (eu-west-1) — all 11 tables, RLS on every table, PostGIS-backed
  geo check-in verification, pg_cron auto-checkout sweep, and a push-notification dispatch Edge
  Function are live. `supabase/migrations/*.sql` in this repo is a readable mirror of exactly what's
  applied — you don't need to re-run it unless you're standing up a fresh Supabase project.
- The whole app (every screen in the spec) is built, typechecks cleanly, and has been bundled and
  rendered in a live browser during development to catch real runtime bugs before hand-off.

## Getting it running

1. **Install dependencies**
   ```
   npm install
   ```

2. **Environment variables** — copy `.env.example` to `.env` and fill in:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://iowxbcijbkiwgibefmwy.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<Supabase dashboard -> Settings -> API -> anon/public key>
   ```
   (The anon key is safe to embed in the client — it's the public key, not a secret; every table it
   can touch is protected by Row Level Security.)

3. **Run it**
   ```
   npx expo start
   ```
   Scan the QR code with the **Expo Go** app on your phone (free, no build step) to try it on a real
   device — this is the easiest way to check the work. `npx expo start --web` gives a browser preview,
   though the Map tab falls back to a venue list there since Google Maps' native SDK has no web
   renderer.

## What you still need to provide

These are credentials only you can obtain (they require your own Google/Apple developer accounts) —
the app is fully wired to use them, it just needs the actual values:

| What | Where to get it | Goes in |
|---|---|---|
| Google Maps API key (iOS + Android) | [Google Cloud Console](https://console.cloud.google.com/) → enable "Maps SDK for iOS" / "Maps SDK for Android" | `app.json` → `ios.config.googleMapsApiKey`, `android.config.googleMaps.apiKey` (or set `IOS_GOOGLE_MAPS_API_KEY` / `ANDROID_GOOGLE_MAPS_API_KEY` as EAS secrets) |
| Google Places API key | Same Cloud project → enable "Places API (New)" | `.env` → `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` |
| Google OAuth client IDs | Cloud Console → "APIs & Services" → Credentials → OAuth client ID (one **iOS** type, one **Web** type) | `.env` → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |
| Apple Sign-In | Apple Developer account → enable "Sign in with Apple" capability for the app's bundle ID | Nothing to configure in code — `expo-apple-authentication` picks it up automatically once the capability is enabled in your EAS/Xcode build |
| Push notifications | An Expo/EAS account (`npx eas login`) — first native build auto-provisions a push credential | Nothing to configure in code |
| Supabase Auth providers | Supabase dashboard → Authentication → Providers → enable **Google** and **Apple**, paste in the same OAuth client details | Supabase dashboard only |
| `WEBHOOK_SECRET` (recommended, optional today) | Any random string | Supabase dashboard → Edge Functions → `send-push-notification` → Secrets. Until this is set, the push-dispatch endpoint accepts any request; setting it locks it down. |

Without these, the app runs and every screen works against the real database — you just won't get
real map tiles/places, real Google/Apple sign-in, or real push delivery until they're plugged in.

## Icons & branding

`assets/icon.png`, `splash.png`, `adaptive-icon.png`, `favicon.png`, and `notification-icon.png` are
currently **1×1 placeholder images** — just enough for the dev server to boot without erroring. Swap
these for real artwork (1024×1024 for `icon.png`, etc.) before submitting to the App Store / Play
Store.

## Premium billing

The Premium paywall screen (`app/(tabs)/profile/premium.tsx`) is fully built — plan comparison,
pricing, benefits — but the actual **Subscribe** button intentionally throws with a clear message
rather than silently granting Premium. Real subscriptions need App Store Connect / Play Console
products wired through something like [RevenueCat](https://www.revenuecat.com/), or native
StoreKit/Play Billing directly. The integration point is `src/lib/billing.ts` — `purchasePremium()`.

## Ads

The Free plan's "advertisements" are a labeled placeholder banner (`src/components/AdBanner.tsx`) on
the Search and Chats screens. Swap it for a real ad SDK (e.g.
[react-native-google-mobile-ads](https://docs.page/invertase/react-native-google-mobile-ads)) once you
have AdMob app/ad-unit IDs. The **8-likes-then-an-ad** gate itself is fully functional and enforced
server-side (`enforce_like_quota` in the migrations) — right now "Watch Ad" just resets the counter
immediately; wire in a real rewarded-ad callback before shipping.

## Database schema

10 core tables (`users`, `venues`, `check_ins`, `likes`, `matches`, `messages`, `reports`, `blocks`,
plus `notifications` and `push_tokens` to support in-app/push notifications) and one Premium-only
support table (`watched_users`). Every table has Row Level Security enabled; the interesting logic
(check-in radius verification, auto-checkout, mutual-like matching, free-tier quotas, block
enforcement) lives in Postgres functions and triggers so it's enforced no matter which client calls
the API. See `supabase/migrations/` for the full, commented SQL.
