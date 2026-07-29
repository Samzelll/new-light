# Opinion Net · Next.js + Supabase

Premium dark-mode web/PWA port of the Opinion Net contests platform with a focus on mobile UX, moderated feeds, and frictionless contest creation.

## Quick start

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure environment**
   - Create `.env.local` with:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your-project-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     ```
   - Optional: rename the storage bucket by supplying `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`; defaults to `contest-media`.
3. **Run the app**
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`. For production builds use `npm run build && npm start`.

## Supabase checklist

1. **Schema** – Run `supabase_schema.sql` in the SQL editor. It creates tables (`profiles`, `contests`, `entries`, `votes`), constraints, vote-count triggers, and RLS policies.
2. **Auth** – Enable Supabase Auth (email or magic link). Auth is mandatory for contest creation, entry uploads, and voting.
3. **Storage** – Create a public bucket named `contest-media` (or your custom name). Add a storage policy that allows authenticated users to upload/read within a folder prefixed by their `auth.uid()`.
4. **Roles** – Promote moderators by setting `profiles.role = 'admin'`; only admins can approve or reject feed listings.
5. **Realtime (optional)** – Enable replication on `entries` and `votes` tables if you plan to subscribe for live updates.

## Feature map

- **Shell** – Responsive app shell with sticky side navigation on desktop and bottom navigation on mobile (<900px).
- **Feed** (`/`) – Approved public contests with premium cards, badges, and curated messaging.
- **Search** (`/search`) – Public contests via partial match, private contests via exact match, visibility badges, and quick open actions.
- **Create** (`/create`) – Two-step wizard covering basics, visibility, feed request, approval toggles, and entry limits.
- **Contest detail** (`/contest/[id]`) – Contest overview, Supabase Storage media upload flow, entry previews, single-vote enforcement, and status feedback.
- **Profile** (`/profile`) – Handle editor, “my contests”, “my entries”, and moderation alerts (approved/rejected feed requests).
- **Admin** (`/admin`) – Moderation queue with creator context, approve/reject actions, and request counters.

## Data layer

- Redux Toolkit store with RTK Query (`contestsApi`) for Supabase CRUD.
- Endpoints cover feed, search, contest detail, personal contest/entry lists, profile updates, media uploads, voting, and moderation.
- Tag-based cache invalidation keeps feed, profile, and entry views in sync after mutations.

## PWA notes

- Manifest: `public/manifest.webmanifest`
- Icons: `public/icons/icon-192.svg`, `public/icons/icon-512.svg`
- Service worker: `public/sw.js` (install/activate cache management, cache-first strategy for GET requests)
- Client registration: `PwaRegister` provider (skips development mode to avoid Next.js HMR conflicts)

## Styling

- Dark palette (`#0b0d12` background, `#7ac7ff` accent) in `src/app/globals.css`.
- Compact shadowed cards, pill badges, responsive `card-grid row-2/row-3` utilities, and tactile button states.

## Testing ideas

- Authenticated user creates a public contest, requests feed placement, and confirms it appears in the admin queue.
- Upload an image or video entry; ensure Supabase Storage stores the asset and the preview renders.
- Vote on entries and verify `votes_count` updates via the trigger.
- Approve/reject contests from the admin panel and observe alerts populate in the profile view.
- Build production (`npm run build`) and test installability/offline caching (Chrome Lighthouse / iOS Safari).

## Deployment

- Supply the same environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional storage bucket) in hosting (Vercel, Netlify, etc.).
- Serve over HTTPS to unlock PWA install prompts.
- Monitor Supabase policies and storage bandwidth when opening contests to the public.# Opinion Net (React scaffold)

Next.js + Redux Toolkit + Supabase scaffold mirroring the core flows of the Flutter app.

## Setup
1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Install deps: `npm install`
3. Run dev: `npm run dev`

## Supabase schema (core tables)
- contests(id, title, description, visibility, feed_listing_status, creator_id, created_at)
- entries(id, contest_id, user_id, media_url, votes_count, created_at)
- votes(id, entry_id, user_id, created_at)
- profiles(id, username, role)

RLS examples (conceptual):
- Feed shows only `visibility=public` and `feed_listing_status=approved`.
- Private contests discoverable only by exact title.
- Only admin can change `feed_listing_status`.
- Creators can see their own contests; others see approved publics.

## App routes
- `/` – Feed (approved public contests)
- `/search` – Search (public partial match; private exact match)
- `/create` – Create contest (public/private, request feed)
- `/contest/[id]` – Contest details placeholder
- `/admin` – Pending feed moderation

## State/Data
- Redux Toolkit slice for filters.
- RTK Query for Supabase operations (get feed, search, create, moderate, entries, votes).

## Auth
- Supabase Auth обязателен для создания конкурсов, заявок и голосов.
- Ключи: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` в `.env.local`.

## Styling
- Minimal dark theme in `globals.css` (compact spacing).

Adjust and extend as needed (auth, storage uploads, entries/votes listings, profile).