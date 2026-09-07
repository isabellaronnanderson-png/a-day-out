# A Day Out

A guide to the perfect day out — save places, tag them by when they fit into
a day, and generate a plan that keeps things close together, inside budget,
and ahead of anything closing soon.

Built with React + Vite, deployed on Vercel. Places are saved to
**browser local storage** — this app is single-device by design (see
*Upgrading persistence* below if you want it to sync across devices later).

## Features

- **Save places** to a personal collection, each tagged as breakfast,
  daytime activity, evening activity, dinner, or drinks, with a city,
  approximate cost, and notes.
- **Google Places search** when adding a place, so you get a real address and
  coordinates without typing them by hand (optional — you can also add a
  place manually).
- **Plan generator** — pick a city and day or evening, and it suggests a set
  of stops (day = breakfast + activity + optional drink after; evening =
  drinks + dinner + activity), favoring combinations that sit close together.
- **Budget bracket** — cap the plan's total estimated spend.
- **Closing soon** — give an exhibition an end date and it's flagged and
  prioritized in plans as the date approaches (within 3 weeks).
- **Favorites & "try new"** — mark places you loved, then generate a plan
  biased toward favorites, or toward things you haven't been to yet.

## Local development

```bash
npm install
```

You have two options for running it locally:

**Without a Google API key** — place search will silently skip results and
you can still add places manually (name, city, address typed by hand; no
coordinates, so proximity scoring is neutral instead of distance-based):

```bash
npm run dev
```

**With place search working** — you need the Vercel CLI, since `/api/places`
is a serverless function:

```bash
npm i -g vercel
cp .env.example .env   # then fill in GOOGLE_PLACES_API_KEY
vercel dev
```

## Setting up Google Places API

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Places API (New)**.
3. Create an API key (Credentials → Create Credentials → API key).
4. Since the key is only ever called from the serverless function
   (`api/places.js`), never from the browser, you can restrict it to your
   server's IPs or leave it unrestricted for a personal project — just don't
   put it in any client-side code or `VITE_`-prefixed env var.
5. Enable billing on the project. As of 2026 Google gives each Places API SKU
   its own free monthly allowance (10,000 calls/month on the Essentials-tier
   search this app uses), so a personal project will very likely stay free —
   but Google still requires billing to be enabled to unlock the free tier.

## The header

The header is 4 full-bleed color fields, side by side. Click any field or
drag a photo onto it to fill that slot — it replaces the color with your
photo. Click the × that appears on hover to clear it back to the default
color. Photos are stored in the browser's IndexedDB (same approach as place
photos — see below) and persist across visits, so you can change the header
whenever you like without touching any code. Nothing here needs a build or
a redeploy; it's editable live in the running app.

## Opening hours, editing, and photos

- **Opening hours** — when you add a place via the Google Places search, its
  hours come along automatically and the plan generator uses them: a place
  is excluded from a suggested plan only when its hours clearly show it's
  closed at that slot's typical time (breakfast ~9am, day activity ~2pm,
  drinks ~6pm, dinner ~8pm, night activity ~10pm), based on today's day of
  week. Places without hours data (added manually) are never penalized —
  missing data is treated as "unknown," not "closed." Cards also show a
  quick "open now / closed now" hint when hours are available.
- **Editing** — every card has an "edit" button that reopens the same form
  pre-filled, so you can retag a place, fix a typo, or add photos without
  starting over.
- **Photos** — each place can have its own small gallery, added from the
  form. Photos are stored in the browser's IndexedDB (not localStorage,
  which is too small for real images) and resized/compressed client-side
  before saving. Click a thumbnail on a card to view it full-size.

## Notes on place search accuracy

Google's Text Search API infers location from the requesting server's IP
address when no explicit bias is given — since `api/places.js` runs on
Vercel's US infrastructure, searches would otherwise skew American
regardless of what city you type. The function now includes a small
city → coordinates lookup and passes an explicit `locationBias` circle
(40km radius) around the typed city to Google, so results stay local.

This lookup covers common cities but isn't exhaustive — if you search in a
city that isn't in `CITY_COORDS` (in `api/places.js`), it'll fall back to
the old text-based "in {city}" phrasing only, which can occasionally drift.
Add more cities to that list as you need them; each entry is just
`cityname: [latitude, longitude]`.

## Deploying

1. Push this repo to GitHub.
2. Import it into [Vercel](https://vercel.com/new). It auto-detects Vite and
   the `api/` folder as serverless functions — no config needed.
3. In the Vercel project settings, add environment variables:
   `GOOGLE_PLACES_API_KEY` = your key, plus `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` (see "Cloud storage, login, and backup" below —
   required for login/sync to work on the deployed site).
4. Deploy, then go back to Supabase's Auth settings and set the Site URL to
   your new Vercel URL (see below) so confirmation emails link back correctly.

## Cloud storage, login, and backup

The app is now gated behind email/password login (Supabase Auth), and your
places sync to a Supabase table so they follow you across devices —
localStorage stays as a fast local cache, but the cloud is the source of
truth once you're signed in.

**One-time setup, before this works:**

1. **Run the schema.** In your Supabase project's SQL Editor, run the
   contents of `supabase/schema.sql` in this repo. It creates a
   `day_out_places` table (named specifically for this app, since you're
   reusing a Supabase project shared with other projects) with row-level
   security so each account only ever sees its own rows.
2. **Set the Site URL.** In Supabase → Authentication → URL Configuration,
   set the Site URL to your actual deployed URL (e.g.
   `https://your-app.vercel.app`) once you know it. This is what the
   confirmation-email link points back to — if it's left as `localhost`,
   the link in the confirmation email won't return to your live site.
3. **Add environment variables.** Locally, a `.env` file with your
   credentials is already included (see `.env.example` for the format).
   In Vercel's project settings, add the same two variables:
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The anon/publishable
   key is safe to expose client-side — it's designed for this, and access
   control happens via the row-level security policies in the schema, not
   by keeping this key secret.

**How sign-up works:** creating an account shows a dedicated "check your
email" screen rather than logging you straight in — Supabase requires
clicking the confirmation link first (unless you've turned that off in
your project's Auth settings), then you come back and sign in normally.

**First login on a device that already had local data:** anything sitting
in localStorage that isn't in the cloud yet gets pushed up automatically,
rather than overwritten — see `syncOnLogin` in `src/lib/cloudSync.js` if
you want the exact logic.

**Backup / restore:** the "Backup" button in the header can export all your
places as a JSON file, or restore from a previously exported one (this
replaces your current data, with a confirmation prompt first, and re-syncs
the restored set to the cloud). Note that this backs up place *data*
(names, notes, tags, etc.) — not the header photos or per-place photo
galleries, since those are larger binary images stored in IndexedDB rather
than the lightweight JSON this export is meant for.

## Project structure

```
src/
  lib/
    storage.js        localStorage cache for places
    cloudSync.js       Supabase sync (mapping, fetch/upsert/delete, first-login merge)
    supabaseClient.js  Supabase client setup
    geo.js             haversine distance helper
    planGenerator.js   the day-plan suggestion algorithm
    placesApi.js        client for /api/places
    categories.js       category labels + stamp colors
  components/
    AuthScreen.jsx        sign in / sign up
    CheckEmailScreen.jsx  post-signup confirmation screen
    BackupMenu.jsx         download/restore JSON backup
    AccountBadge.jsx       avatar + sign out
    PlaceCard.jsx        the "ticket stub" place display
    PlaceForm.jsx         add-place modal with Places search
    CategoryStamp.jsx     small category badge
  pages/
    SavedPlacesTab.jsx
    PlanTab.jsx
supabase/
  schema.sql          run this in the Supabase SQL Editor once
api/
  places.js            serverless proxy to Google Places API (New)
```
