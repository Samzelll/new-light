# Voting Platform: Full Project Documentation

**Version 2.1** | Status: In development, mock data stage  
**Stack**: React, Redux Toolkit, Tailwind CSS, Supabase (PostgreSQL), Firebase Hosting  
**Companion files**: `docs/DATA_LAYER.md`, `docs/DESIGN_SYSTEM.md`, `supabase/migrations/001_voting_platform.sql`, `tailwind.config.js`, `src/styles/globals.css`

> **Current stage**: The app runs on a mock database: all data comes from a mock adapter inside `src/services/mock/`, nothing is sent to Supabase, and the tournament engine is not running (outcomes are simulated by seed data and a dev "time machine"). This is deliberate: it makes design and logic work faster. `001_voting_platform.sql` is the target schema and is not applied yet.

---

## Contents
1. What changed since v1
2. Overview
3. Philosophy and principles
4. Tech stack
5. Architecture
6. File structure
7. Navigation and UX model
8. Data model
9. File storage
10. Trust Score and levels
11. Tournament engine (standard contests)
12. Other contest types
13. Anti-fraud
14. Pages
15. Roles
16. Entry material format
17. Development plan
18. Migration path
19. Decisions log and open questions
20. Mock stage and the switch to Supabase

---

## 1. What changed since v1

| Area | v1 | v2 |
|---|---|---|
| **Group size** | 6, one winner per group | Always 4. Points per place, daily reshuffle |
| **Stages** | groups, then final | Group stage (4 to 6 days), optional Swiss (3 wins or 3 losses), playoff 1v1 |
| **Slots** | free-form | Accept all approved entries (32 to 256). Remainder 0 to 3 is solved by invitations, then lottery |
| **Check-in** | none | None (entry material is the participation). Withdraw until 1 hour before start |
| **Selection** | first come first served | Window, moderation, then everyone is in. Time of submission does not matter |
| **Results** | percentages after each stage | Hidden until the round closes (06:00 UTC). Live battles show percentages right after you vote |
| **Votes** | locked | Changeable until the round closes |
| **Trust Score** | level only | Level only for users. Number only for staff |
| **Navigation** | bottom nav, Feed filters | No bottom nav. Header tabs: Contests, Feed, Battles |
| **Design** | none | Global design system with tokens (see `DESIGN_SYSTEM.md`) |
| **Roles** | user, expert, moderator, admin | user, critic (future, verified), moderator, admin |
| **Data layer** | Supabase directly | Mock adapter now, Supabase adapter later, one service contract for both (`docs/DATA_LAYER.md`) |

---

## 2. Overview
A mobile-first platform for contests and polls. People explore entries, vote, follow results and build reputation. The feeling is "Pinterest with battles": fun, visual, quick, with details hidden until someone is really interested.
- Contests are created only by administrators. Users apply with their material and vote.
- Contest page shows a short description and quick rules; full rules are one tap away.
- Long-term monetisation: participant profiles with sponsor links, branded contests, expert/critic accounts with extended analytics.

---

## 3. Philosophy and principles
- **Fair voting**: Trust-weighted votes, IP collapse, anonymity, no voting in your own group.
- **Low barrier**: Application is a photo, a title and a short text.
- **Honest process**: Rules are shown upfront, selection never depends on speed (no race, no placeholder photos).
- **Transparent but not noisy**: Percentages only, never raw counts; results after the round.
- **Anonymity**: Who voted for whom is visible only to the voter (and staff).
- **Reputation grows**: Trust Score rises with consistent activity.
- **Minimal UI**: One primary action per screen, details behind one tap.
- **Language**: English across the entire UI, copy, rules, notifications, and codebase.
- The platform intentionally does not: let users create contests, show raw vote counts, reveal the Trust Score number, or reveal anyone's voting history to others.

---

## 4. Tech stack
- **Frontend**: React 18, Redux Toolkit, Next.js / React Router, Tailwind CSS (tokens in `globals.css`), Supabase JS.
- **Backend**: Supabase PostgreSQL, Auth (email OTP), Realtime, Storage, Edge Functions, pg_cron.
- **Hosting**: Firebase Hosting (CDN, HTTPS).
- **Future**: Self-hosted Supabase on a VPS, Vercel or custom hosting.

---

## 5. Architecture
Components and Redux never call Supabase (or the mock store) directly. Everything goes through `services/`, and both adapters return the same shapes.
- Business rules that must not be bypassed live in the database (RPC functions, RLS), not in the client.
- Voting goes through an Edge Function: it verifies the JWT, hashes the real IP with a secret salt, and calls `cast_vote()` with the service role. Users cannot call `cast_vote` themselves.

---

## 6. File structure
```
src/
  app/                     Pages and routes
    page.tsx               Contests / Feed / Battles
    contest/[id]/          Contest page (registration, active, finished)
    apply/[id]/            Entry form
    participant/[id]/      Participant page
    profile/               Profile page
    auth/                  Email OTP authentication
    onboarding/            3-step onboarding
    admin/                 Admin moderation, flags, users, logs
  components/              Design system components
  services/                Service contracts and adapters
    mock/                  In-memory store, seed fixtures, dev time machine
    supabase/              Supabase-js client implementation
```

---

## 7. Navigation and UX model
- **Header**: search/filter button (left), tabs (center), avatar (right). The avatar opens the side drawer. No bottom navigation.
- **Tabs**: Contests (catalog of contest cards), Feed (direct voting on groups of 4), Battles (live 1v1 and races).
- **Search + filter is one button**: Opens a bottom sheet: search field, category chips, status chips, sort (popular, for you, ending soon), "My subscriptions" chip.
- **Avatar opens the side drawer**: profile, my votes, my entries, favorites, rules and prizes, help. Admin/moderator tools appear only for those roles.
- **Hidden details pattern**: every screen shows the minimum. More information is one tap away: `i` button on battle (details sheet), "Show full rules and conditions" on contest page (rules sheet).

---

## 8. Data model
- `profiles`, `user_trust`, `user_daily_log`
- `categories`, `contest_series`, `contests`
- `participants`, `entry_revisions`, `invitations`
- `contest_groups`, `group_members`, `votes`, `live_group_stats`, `eternal_votes`
- `user_priority`, `fraud_flags`, `engine_log`

### Entry statuses:
`pending`, `changes_requested`, `approved`, `rejected`, `withdrawn`, `cut`, `active`, `eliminated`, `disqualified`.

### Contest statuses:
`draft`, `registration`, `active`, `paused`, `completed`, `cancelled`.

---

## 9. File storage
- Avatars: `avatars/{user_id}/avatar.jpg` (Public, owner write, 2 MB max)
- Submissions: `submissions/{contest_id}/{participant_id}/photo_1..5.jpg` (Public after approval, participant write, 5 MB max per photo, up to 5 photos)
- Contests: `contests/{contest_id}/cover.jpg` (Public, admin write, 3 MB max)

---

## 10. Trust Score and levels
| Level | Score | Vote weight |
|---|---|---|
| **new** | below 2 | 1x |
| **regular** | 2 to below 6 | 2 to 5x |
| **trusted** | 6 to below 11 | 6 to 10x |
| **senior** | 11 to 20 | 11 to 20x |

- Users see only the level badge via `my_trust_level()`. The number is visible to staff in the admin panel.
- Score recalculated nightly: days active 30%, contests voted in 40%, vote diversity 30%, growth capped at +2 per day.

---

## 11. Tournament engine (standard contests)
1. **Lifecycle**: `draft -> registration -> [start 06:00 UTC] -> active (group stage -> Swiss -> playoff) -> completed`
2. **Registration and entries**: announced with dates; registration closes at least 24 hours before start (06:00 UTC). Title and >= 1 photo required.
3. **Who plays**: 32 to 256 approved entries. Groups always of 4. Remainder $N \bmod 4$ solved by invitations, then lottery.
4. **Group stage**: Each entry plays in exactly 1 group of 4 each day. Day 1 is random; Day 2+ pairs equals with equals (sorted by points). Formula:
   $$\text{points} = 3 \times \frac{n - \text{rank}}{n - 1}$$
   (4 entries: 3 / 2 / 1 / 0 points. Ties split average).
5. **Tie-breaks**: 1. Total points, 2. Buchholz, 3. Median Buchholz, 4. Average vote share, 5. Deterministic seed.
6. **Swiss stage**: When 32 or more advance. 1v1 duels with same win/loss record. 3 wins advance, 3 losses out.
7. **Playoff**: Standard seeded bracket (1 vs last, 2 vs second to last). Single elimination until winner.
8. **Daily cycle (06:00 UTC)**: `run_daily_cycle()` scheduled via pg_cron.

---

## 12. Other contest types
- **Battle**: Two entries, one live group, live percentages. Percentages visible right after voting.
- **Race**: Multiple entries in one live group, rankings update live after voting.
- **Eternal**: Hall of fame / continuous topic, no end date, updatable vote.

---

## 13. Anti-fraud
- **IP collapse**: Votes from same hashed IP for same candidate in group; from 11th vote weight drops to 0.1.
- **Fraud flags**:
  - `ip_cluster`: 30+ votes for one entry from < 5 IPs.
  - `new_account_burst`: 20+ accounts < 7 days old voting for one entry.
  - `speed_voting`: 5+ votes from one IP in 60 seconds.
- Staff review flags in admin panel; flags never disqualify automatically.

---

## 14. Pages
- `/`: Catalog of contest cards, direct feed stream, live battles.
- `/contest/:id`: Registration mode, active mode, finished mode.
- `/contest/:id/apply`: Entry submission form with up to 5 photos, title, description, links.
- `/participant/:id`: Full participant gallery, description, sponsor link, stage results.
- `/profile`: Avatar, level badge, stats (Votes, Entries, Wins), role tools, tabs (Entries, Votes, Following), Edit profile sheet.
- `/auth`: Email input, 6-digit code OTP verification (valid 10 minutes).
- `/onboarding`: 3-screen walkthrough.
- `/admin`: Contests, moderation queue with before/after diff, flags, users & roles, engine log.

---

## 15. Roles
- `user`: Vote, subscribe, apply, withdraw own entry.
- `critic`: Verified professional badge, future separate weighting.
- `moderator`: Moderate entries, review fraud flags, disqualify.
- `admin`: All rights: create contests, override stage plan, role management, live battles.

---

## 16. Entry material format
`participants.submission_data` (JSONB):
```json
{
  "photos": ["https://.../photo_1.jpg"],
  "description": "Short text",
  "social_links": { "instagram": "@handle", "website": "https://..." },
  "sponsor": { "name": "Brand", "url": "https://...", "product_name": "...", "buy_link": "https://..." },
  "tags": ["nails", "gel"]
}
```

---

## 19. Decisions Log
- **Language**: English is the official and exclusive language for the entire user interface, copywriting, system messages, rules, notifications, and codebase.
- **Tournament structure**: Groups always of 4; scoring formula $3 \times (n - \text{rank}) / (n - 1)$; daily reshuffle at 06:00 UTC.
- **Hidden results**: Voting results hidden during round; percentages revealed only after round closure or upon voting in live battles.

---

## 20. Mock stage and dev tools
- All data served by `src/services/mock/`.
- Dev tools: user switcher (`guest`, `user`, `entrant`, `moderator`, `admin`), `06:00 UTC` cycle advance simulation button, scenario picker.
