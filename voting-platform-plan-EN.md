# Voting Platform — Full Project Documentation

> Version 1.0 | Status: In Development
> Stack: React · Redux Toolkit · Supabase · Firebase Hosting · Tailwind CSS

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Philosophy & Goals](#2-philosophy--goals)
3. [Tech Stack](#3-tech-stack)
4. [Application Architecture](#4-application-architecture)
5. [Project File Structure](#5-project-file-structure)
6. [Database — Full Schema](#6-database--full-schema)
7. [File Storage](#7-file-storage)
8. [Trust Score System](#8-trust-score-system)
9. [Anti-Fraud System](#9-anti-fraud-system)
10. [Contest Types](#10-contest-types)
11. [Application Pages](#11-application-pages)
12. [Stage System (Standard Contest)](#12-stage-system-standard-contest)
13. [User Roles](#13-user-roles)
14. [Participant Profiles](#14-participant-profiles)
15. [Step-by-Step Development Plan](#15-step-by-step-development-plan)
16. [Migration Path](#16-migration-path)

---

## 1. Project Overview

**Voting Platform** is a mobile-first web platform for running contests and polls. Users vote for contest participants, follow results in real time, and build their reputation on the platform over time.

Contests are created exclusively by administrators. Users can submit applications to participate and cast votes. Over time, the platform will become a space where anyone can showcase their skills (nails, outfits, photography, style) and receive honest feedback from an audience.

**Monetisation (long-term):**
- Participant profiles with sponsor and product links
- Branded contests (brands pay for placement)
- Expert accounts with extended analytics access

---

## 2. Philosophy & Goals

### Core Principles

| Principle | How it's implemented |
|-----------|---------------------|
| Fair voting | Trust Score, IP collapse, anonymity |
| Low barrier to entry | Minimal application (photo + description) |
| Transparent results | Percentages only (no raw counts) after each stage |
| Vote anonymity | Who voted for whom is never visible between users |
| Reputation growth | Trust Score grows over time through consistent activity |

### What the platform intentionally does NOT do
- Users cannot create contests themselves (applications only)
- Absolute vote counts are never shown publicly
- Trust Score details are not disclosed to users
- A user's voting history is not visible to others

---

## 3. Tech Stack

```
FRONTEND
├── React 18               — UI library
├── Redux Toolkit          — state management
├── React Router v6        — routing
├── Tailwind CSS           — styling (mobile-first)
└── Supabase JS Client     — backend connection

BACKEND (BaaS)
├── Supabase PostgreSQL    — primary database
├── Supabase Auth          — authentication (Email OTP)
├── Supabase Realtime      — live updates (Battle, Race)
├── Supabase Storage       — participant photos
└── Supabase Edge Functions— cron jobs (Trust Score)

HOSTING
└── Firebase Hosting       — CDN, deployment, HTTPS

FUTURE MIGRATION (if needed)
├── Self-hosted Supabase   — VPS (Hetzner ~€6/mo)
└── Vercel / custom server — Firebase Hosting replacement
```

### Why Supabase and not full Firebase

| Criteria | Supabase | Firebase Firestore |
|----------|----------|--------------------|
| Database | PostgreSQL (industry standard) | NoSQL (proprietary) |
| Self-hosting | ✅ Docker, 1 command | ❌ Impossible |
| Migration | `pg_dump` / standard SQL | Very difficult |
| Email OTP | ✅ Native support | Requires extra setup |
| SQL queries | ✅ Full SQL | ❌ |
| Free tier | Generous | Limited |

---

## 4. Application Architecture

```
┌─────────────────────────────────────────┐
│              REACT (UI)                  │
│   Pages → Components → Hooks            │
└──────────────────┬──────────────────────┘
                   │ dispatch / select
┌──────────────────▼──────────────────────┐
│           REDUX TOOLKIT                  │
│   authSlice · pollsSlice · votesSlice   │
│   userSlice · contestSlice              │
└──────────────────┬──────────────────────┘
                   │ service calls
┌──────────────────▼──────────────────────┐
│          SERVICE LAYER  ← KEY LAYER      │
│   authService · contestService          │
│   voteService · profileService          │
│   groupService · trustService           │
└──────────────────┬──────────────────────┘
                   │ Supabase JS
┌──────────────────▼──────────────────────┐
│              SUPABASE                    │
│   PostgreSQL · Auth · Storage · Realtime│
└─────────────────────────────────────────┘
```

**Key rule:** Components and Redux never talk to Supabase directly. Everything goes through `services/`. When migrating, only the service layer changes — React and Redux stay untouched.

---

## 5. Project File Structure

```
src/
│
├── services/                    ← Abstraction layer (changes on migration)
│   ├── supabase.js              — Supabase client (single file to swap)
│   ├── authService.js           — login, logout, OTP
│   ├── contestService.js        — contest CRUD
│   ├── voteService.js           — voting, vote history
│   ├── groupService.js          — group formation algorithm
│   ├── profileService.js        — participant profiles
│   ├── trustService.js          — Trust Score logic
│   └── storageService.js        — file uploads
│
├── store/
│   ├── store.js
│   └── slices/
│       ├── authSlice.js
│       ├── contestsSlice.js
│       ├── votesSlice.js
│       ├── profileSlice.js
│       └── uiSlice.js
│
├── hooks/
│   ├── useAuth.js
│   ├── useContests.js
│   ├── useVote.js
│   ├── useRealtime.js           — live update subscriptions
│   └── useTrust.js
│
├── pages/
│   ├── FeedPage/                — main feed
│   ├── ContestPage/             — contest page (3 modes)
│   ├── ProfilePage/             — user profile
│   ├── ParticipantPage/         — contest participant profile
│   ├── AuthPage/                — email OTP login
│   ├── OnboardingPage/          — 3-screen intro for new users
│   └── AdminPage/               — admin panel
│
├── components/
│   ├── layout/
│   │   ├── BottomNav.jsx        — bottom navigation (mobile)
│   │   ├── Header.jsx
│   │   └── PageWrapper.jsx
│   ├── contest/
│   │   ├── ContestCard.jsx      — feed card
│   │   ├── GroupVoting.jsx      — group voting UI
│   │   ├── ResultsView.jsx      — stage results
│   │   ├── LiveCounter.jsx      — live counter for Battle/Race
│   │   └── StageTimeline.jsx    — contest progress
│   ├── participant/
│   │   ├── ParticipantCard.jsx
│   │   └── SubmissionForm.jsx   — application form
│   ├── auth/
│   │   ├── EmailStep.jsx
│   │   └── OtpStep.jsx
│   └── ui/
│       ├── FilterTabs.jsx
│       ├── TrustBadge.jsx
│       ├── Timer.jsx
│       └── ProgressBar.jsx
│
├── utils/
│   ├── groupAlgorithm.js        — group distribution algorithm
│   ├── trustCalculator.js       — Trust Score formula
│   ├── ipHash.js                — IP hashing
│   └── formatters.js
│
└── constants/
    ├── contestTypes.js
    ├── roles.js
    └── trustLevels.js
```

---

## 6. Database — Full Schema

### Users & Trust

```sql
-- User profile (extends auth.users)
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     TEXT UNIQUE,
  display_name TEXT,
  avatar_url   TEXT,
  bio          TEXT,
  role         TEXT NOT NULL DEFAULT 'user',
  -- roles: 'user' | 'expert' | 'moderator' | 'admin'
  show_participations BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Trust Score (updated once per day)
CREATE TABLE user_trust (
  user_id         UUID PRIMARY KEY REFERENCES profiles(id),
  score           NUMERIC(5,2) DEFAULT 1.0,
  -- score components (for debugging)
  days_active     INTEGER DEFAULT 0,
  contests_voted  INTEGER DEFAULT 0,
  vote_diversity  NUMERIC(4,3) DEFAULT 0,
  last_updated    DATE DEFAULT CURRENT_DATE,
  level           TEXT DEFAULT 'new'
  -- levels: 'new'(1) | 'regular'(2-5) | 'trusted'(6-10) | 'senior'(11-20)
);

-- Daily activity log (aggregated, not raw events)
CREATE TABLE user_daily_log (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID REFERENCES profiles(id),
  log_date     DATE DEFAULT CURRENT_DATE,
  votes_cast   INTEGER DEFAULT 0,
  contests_viewed INTEGER DEFAULT 0,
  unique_participants_voted INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  UNIQUE(user_id, log_date)
);
```

---

### Categories & Contests

```sql
-- Contest categories
CREATE TABLE categories (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name     TEXT NOT NULL,
  slug     TEXT UNIQUE NOT NULL,
  icon_url TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Contests
CREATE TABLE contests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  rules         TEXT,
  type          TEXT NOT NULL,
  -- types: 'standard' | 'battle' | 'race' | 'eternal'
  status        TEXT NOT NULL DEFAULT 'draft',
  -- statuses: 'draft'|'registration'|'active'|'completed'|'cancelled'
  category_id   UUID REFERENCES categories(id),
  cover_url     TEXT,
  max_participants INTEGER,
  group_size    INTEGER DEFAULT 6,
  -- for standard: target group size
  registration_start TIMESTAMPTZ,
  registration_end   TIMESTAMPTZ,
  voting_start       TIMESTAMPTZ,
  voting_end         TIMESTAMPTZ,
  created_by    UUID REFERENCES profiles(id),
  is_featured   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Contest stages (standard contests only)
CREATE TABLE contest_stages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id   UUID REFERENCES contests(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL,
  title        TEXT,
  -- e.g. 'Qualifying Round' | 'Semi-Final' | 'Final'
  status       TEXT DEFAULT 'pending',
  -- 'pending' | 'active' | 'completed'
  start_time   TIMESTAMPTZ,
  end_time     TIMESTAMPTZ,
  UNIQUE(contest_id, stage_number)
);

-- Groups within a stage
CREATE TABLE contest_groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id     UUID REFERENCES contest_stages(id) ON DELETE CASCADE,
  contest_id   UUID REFERENCES contests(id),
  group_number INTEGER NOT NULL,
  status       TEXT DEFAULT 'pending',
  UNIQUE(stage_id, group_number)
);
```

---

### Participants & Applications

```sql
-- Participant applications
CREATE TABLE participants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id     UUID REFERENCES contests(id),
  user_id        UUID REFERENCES profiles(id),
  -- submission_data — flexible JSON field
  submission_data JSONB DEFAULT '{}',
  -- example: {
  --   "photos": ["url1", "url2"],
  --   "description": "text",
  --   "social_links": {"instagram": "@handle"},
  --   "sponsor_name": "BrandName",
  --   "sponsor_url": "https://...",
  --   "buy_link": "https://..."
  -- }
  status         TEXT DEFAULT 'pending',
  -- 'pending' | 'approved' | 'rejected' | 'eliminated'
  admin_note     TEXT,
  submitted_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contest_id, user_id)
  -- 1 application per contest per user
);

-- Group members (participant → group)
CREATE TABLE group_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID REFERENCES contest_groups(id),
  stage_id        UUID REFERENCES contest_stages(id),
  participant_id  UUID REFERENCES participants(id),
  contest_id      UUID REFERENCES contests(id),
  UNIQUE(stage_id, participant_id)
  -- participant is in one group per stage
);

-- Contest subscriptions
CREATE TABLE contest_subscriptions (
  user_id     UUID REFERENCES profiles(id),
  contest_id  UUID REFERENCES contests(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(user_id, contest_id)
);
```

---

### Voting

```sql
-- Votes (standard, battle, race contests)
CREATE TABLE votes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id      UUID REFERENCES contests(id),
  stage_id        UUID REFERENCES contest_stages(id),
  group_id        UUID REFERENCES contest_groups(id),
  voter_id        UUID REFERENCES profiles(id),
  participant_id  UUID REFERENCES participants(id),
  trust_weight    NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  -- snapshot at time of vote — never recalculated retroactively
  ip_hash         TEXT,
  -- SHA256(IP + salt) — never raw IP
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stage_id, group_id, voter_id)
  -- 1 vote per group per stage
);

-- Votes for eternal contests (can be updated)
CREATE TABLE eternal_votes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id      UUID REFERENCES contests(id),
  voter_id        UUID REFERENCES profiles(id),
  participant_id  UUID REFERENCES participants(id),
  trust_weight    NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  ip_hash         TEXT,
  voted_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contest_id, voter_id)
  -- 1 updatable vote per eternal contest per user
);

-- Stage results (calculated after stage closes, not on the fly)
CREATE TABLE stage_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id        UUID REFERENCES contest_stages(id),
  group_id        UUID REFERENCES contest_groups(id),
  participant_id  UUID REFERENCES participants(id),
  vote_percentage NUMERIC(5,2),
  -- percentages only, never absolute counts
  rank_in_group   INTEGER,
  passed          BOOLEAN DEFAULT false,
  -- did they advance to the next stage?
  calculated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Anti-Fraud (internal use only)

```sql
-- IP log by vote
CREATE TABLE vote_ip_log (
  id           BIGSERIAL PRIMARY KEY,
  ip_hash      TEXT NOT NULL,
  contest_id   UUID REFERENCES contests(id),
  stage_id     UUID REFERENCES contest_stages(id),
  group_id     UUID REFERENCES contest_groups(id),
  participant_id UUID REFERENCES participants(id),
  vote_count   INTEGER DEFAULT 1,
  -- how many votes from this IP for this participant in this group
  last_vote_at TIMESTAMPTZ DEFAULT NOW(),
  is_flagged   BOOLEAN DEFAULT false,
  UNIQUE(ip_hash, group_id, participant_id)
);

-- Suspicious activity flags
CREATE TABLE fraud_flags (
  id           BIGSERIAL PRIMARY KEY,
  participant_id UUID REFERENCES participants(id),
  contest_id   UUID REFERENCES contests(id),
  flag_type    TEXT,
  -- 'ip_cluster' | 'new_account_burst' | 'speed_voting'
  details      JSONB,
  severity     TEXT DEFAULT 'low',
  -- 'low' | 'medium' | 'high'
  reviewed     BOOLEAN DEFAULT false,
  admin_action TEXT,
  -- 'dismissed' | 'warned' | 'disqualified'
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Indexes (performance)

```sql
CREATE INDEX idx_contests_status ON contests(status);
CREATE INDEX idx_contests_type ON contests(type);
CREATE INDEX idx_votes_contest ON votes(contest_id);
CREATE INDEX idx_votes_voter ON votes(voter_id);
CREATE INDEX idx_votes_stage_group ON votes(stage_id, group_id);
CREATE INDEX idx_participants_contest ON participants(contest_id);
CREATE INDEX idx_group_members_stage ON group_members(stage_id);
CREATE INDEX idx_fraud_flags_participant ON fraud_flags(participant_id);
CREATE INDEX idx_user_daily_log_date ON user_daily_log(user_id, log_date);
```

---

## 7. File Storage

### Supabase Storage Buckets

```
supabase/storage/
├── avatars/                     — user avatars
│   └── {user_id}/avatar.jpg
│
├── submissions/                 — participant application photos
│   └── {contest_id}/{participant_id}/
│       ├── photo_1.jpg
│       ├── photo_2.jpg
│       └── photo_3.jpg
│
└── contests/                    — contest cover images
    └── {contest_id}/cover.jpg
```

### Access Rules

| Bucket | Read access | Write access |
|--------|-------------|--------------|
| avatars | Public | Owner only |
| submissions | Public (after approval) | Participant only |
| contests | Public | Admin/Moderator only |

### File Limits
- Avatar: max 2MB, formats JPG/PNG/WebP
- Submission photo: max 5MB per file, up to 5 files
- Contest cover: max 3MB

### Optimisation
Supabase Storage supports on-the-fly image transforms:
```
/storage/v1/render/image/public/submissions/{path}?width=400&quality=80
```
Use this for feed cards — never load full-size images in the list view.

---

## 8. Trust Score System

### Levels

| Level | Score | Vote weight | Description |
|-------|-------|-------------|-------------|
| new | 1.0 | 1x | New account |
| regular | 2.0 – 5.0 | 2-5x | Active participant |
| trusted | 6.0 – 10.0 | 6-10x | Consistent user |
| senior | 11.0 – 20.0 | 11-20x | Platform veteran |

### Recalculation formula (runs nightly via Edge Function)

```javascript
// Pseudocode
function calculateTrustScore(userId) {
  const stats = getUserStats(userId);

  // Component 1: days active (30%)
  const daysComponent = Math.min(stats.activeDays / 30, 1) * 6;

  // Component 2: contests voted in (40%)
  const contestsComponent = Math.min(stats.contestsVoted / 20, 1) * 8;

  // Component 3: vote diversity (30%)
  // uniqueParticipants / totalVotes — closer to 1 = better
  const diversityComponent = stats.voteDiversity * 6;

  const rawScore = daysComponent + contestsComponent + diversityComponent;

  // Cap daily growth: max +2 per day
  const currentScore = getCurrentScore(userId);
  const maxDailyGrowth = 2;
  const newScore = Math.min(rawScore, currentScore + maxDailyGrowth);

  return Math.max(1, Math.min(20, newScore));
}
```

### What users see

```
Shown:     Level name ("Senior Member") + icon badge
NOT shown: Numeric score, formula components, calculation details
```

### Edge Function (cron)

```javascript
// supabase/functions/daily-trust-update/index.ts
// Runs every night at 00:00 UTC
// Updates user_trust for all users active in the last 30 days
```

---

## 9. Anti-Fraud System

### IP Collapse

When a vote is recorded:
```
1. Hash the IP: SHA256(rawIP + SECRET_SALT)
2. Check vote_ip_log: how many votes from this ip_hash
   for this participant in this group?
3. If > 10 → all votes beyond 10 are written with trust_weight = 0.1
4. The vote is still recorded, but carries near-zero weight
5. Set is_flagged = true in vote_ip_log
```

### Automatic Flags

```
ip_cluster:        30+ votes for 1 participant from < 5 unique IPs
new_account_burst: 20+ new accounts (<7 days old) voting for 1 participant
speed_voting:      1 IP casting 5+ votes in under 60 seconds
```

### Handling Principle

```
Flag created → participant is NOT automatically disqualified
            → flag appears in admin panel only
            → admin decides manually
            → on disqualification: admin_action = 'disqualified'
```

This protects against deliberate setup attacks where someone tries to make a legitimate participant look like they're cheating.

---

## 10. Contest Types

### STANDARD — core format
```
Registration → Stage 1 (groups) → Stage 2 (groups) → Final
```
- Participants distributed into groups
- Group winners advance to the next stage
- Voting is open for a limited time window
- Results shown as percentages after each stage closes

### BATTLE — head-to-head
```
2 participants → live counter → deadline → winner
```
- Exactly two participants
- Votes display in real time (Supabase Realtime)
- Like a boxing match — builds tension
- No groups, no stages

### RACE — leaderboard sprint
```
N participants → public live ranking → deadline
```
- All participants visible simultaneously
- Rankings update live (like an election night board)
- No groups, single stage
- Final result: full ranking with all percentages

### ETERNAL — ongoing poll
```
Topic → vote → change your vote → no end date
```
- No deadline
- Users can change their vote at any time
- Vote change history stored in user's private profile
- Examples: "Sweet vs Savoury", "Cats vs Dogs"

---

## 11. Application Pages

### `/` — Feed (FeedPage)

```
Filters: [Subscriptions] [All] [Active] [Upcoming] [Completed]
         + category filter

Contest card:
  - Cover image
  - Type badge (BATTLE / RACE / etc.)
  - Title
  - Category
  - Status + timer (X hours remaining)
  - Participant count
  - Subscribe button
```

### `/contest/:id` — Contest Page

One URL, three modes based on `status`:

```
status = 'registration':
  → Contest info and rules
  → List of approved participants (cards)
  → "Submit Application" button (if logged in)
  → Application form (photos + description)

status = 'active':
  → Current stage and group for voting
  → Participant cards for the group
  → "Vote" button
  → After voting: your group's result (%)
  → Stage progress (how many groups remain)

status = 'completed':
  → Top 12 finalists (large cards)
  → "Show all" button (remaining participants)
  → Participant profiles with details
  → Stage history (who passed each round)
```

### `/participant/:id` — Participant Profile

```
  - Photo gallery
  - Name / username
  - Description
  - Social links (if provided)
  - Sponsor (name + link, if provided)
  - Results: percentage share per stage
  - Other contests this participant entered
```

### `/profile` — Personal Profile (authenticated)

```
Public section:
  - Avatar, name, level badge
  - Contests participated in (if user has enabled this)
  - Achievements (finalist, winner)

Private section (visible to owner only):
  - Voting history: contest → participant → date
  - Eternal votes: current vote + change button
  - Contest subscriptions management
```

### `/auth` — Authentication (Email OTP)

```
Step 1: Enter email → "Send code" button
Step 2: 6-digit code → "Sign in" button
        (code valid for 10 minutes)
```

### `/onboarding` — New User Intro (3 screens)

```
Screen 1: "What is [platform name]?" — brief overview
Screen 2: "How does voting work?" — stages and groups explained
Screen 3: "Your vote grows stronger" — motivation to stay active
```

### `/admin` — Admin Panel

```
Tabs:
  - Contests: create, edit, manage stages
  - Participants: review applications (approve/reject), assign groups
  - Flags: suspicious activity list, actions
  - Users: roles, bans
  - Analytics: votes per contest, activity overview
```

---

## 12. Stage System (Standard Contest)

### Group Distribution Algorithm

```
Inputs:
  participants[] — approved participants
  group_size = 6 — target group size

Algorithm:
  1. total = participants.length            // e.g. 120
  2. full_groups = Math.floor(total / group_size)  // 20
  3. remainder = total % group_size         // 0
  4. If remainder > 0:
       If remainder >= 3: create an undersized group
       If remainder < 3: distribute extras across existing groups
         (some groups get 7 participants)
  5. Shuffle participants randomly (Fisher-Yates shuffle)
  6. If one user had multiple applications (future feature):
       Guarantee they are placed in different groups
  7. Assign participants to groups sequentially
```

### Stage Progression Example

```
120 participants:

STAGE 1 (Qualifying Round):
  20 groups × 6 participants
  Winners (top 1 per group): 20 people advance

STAGE 2 (Semi-Final):
  4 groups × 5 people = 20 people
  Winners: 4 × 3 = 12 people advance

FINAL:
  1 group × 12 people
  Open voting, full results published
```

### What Participants See

| Moment | Participant sees | Public sees |
|--------|-----------------|-------------|
| Stage in progress | Nothing | Nothing |
| Stage completed | Their own % in their group | Winners only |
| Final completed | All % + their rank | All % + all ranks |

**Important:** Absolute vote counts are never shown to anyone. Percentages only.

---

## 13. User Roles

```
user        — standard user
             (vote, subscribe, submit contest applications)

expert      — verified expert
             (access to extended contest statistics,
              visually marked on the platform,
              higher base Trust Score)

moderator   — moderator
             (approve/reject participant applications,
              review fraud flags,
              CANNOT create contests)

admin       — administrator
             (everything: create contests, manage stages,
              assign roles, full platform control)
```

### RLS Policies (Row Level Security)

```sql
-- Example: users can only read their own votes
CREATE POLICY "Users can only read own votes"
ON votes FOR SELECT
USING (voter_id = auth.uid());

-- Contests are publicly readable (excluding drafts)
CREATE POLICY "Contests are public"
ON contests FOR SELECT
USING (status != 'draft');

-- Only admins can create contests
CREATE POLICY "Only admin creates contests"
ON contests FOR INSERT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

## 14. Participant Profiles

### submission_data structure (JSONB)

```json
{
  "photos": [
    "https://storage.supabase.co/.../photo_1.jpg",
    "https://storage.supabase.co/.../photo_2.jpg"
  ],
  "description": "Participant or work description",
  "social_links": {
    "instagram": "@handle",
    "tiktok": "@handle",
    "website": "https://..."
  },
  "sponsor": {
    "name": "BrandName",
    "url": "https://brand.com",
    "product_name": "Product or service name",
    "buy_link": "https://shop.com/product"
  },
  "tags": ["nails", "gel", "nail-art"]
}
```

Using a flexible JSONB field means new attributes can be added later without altering the DB schema.

---

## 15. Step-by-Step Development Plan

> Each step is a standalone task completable in one focused session.
> Order matters — each step builds on the previous one.

---

### PHASE 0 — Setup (Steps 1–3)

#### Step 1: Audit the existing project
```
Task: Review the current skeleton codebase
- Document what already exists (routing, components, styles)
- Document what needs to be replaced or rewritten
- Confirm Firebase Auth is connected and working
- Decide: migrate Auth to Supabase now or later?

Recommendation: Migrate to Supabase Auth immediately.
Maintaining dual authentication is harder to support long-term.
```

#### Step 2: Set up Supabase
```
Task: Create the Supabase project
- Create a project at supabase.com
- Save SUPABASE_URL and SUPABASE_ANON_KEY to .env
- Enable Email OTP in Auth → Providers → Email
  (disable "Confirm email", enable "Magic Link" / OTP)
- Create src/services/supabase.js:
  import { createClient } from '@supabase/supabase-js'
  export const supabase = createClient(URL, KEY)
```

#### Step 3: Set up Firebase Hosting
```
Task: Connect Firebase Hosting for deployment
- firebase init hosting (public: build, SPA: yes)
- Add deploy script to package.json:
  "deploy": "npm run build && firebase deploy"
- Verify an empty page deploys successfully
- Set up .env variables in CI or manually
```

---

### PHASE 1 — Database (Steps 4–7)

#### Step 4: Create core tables
```
Task: Run SQL in the Supabase SQL Editor
- profiles
- user_trust
- user_daily_log
- categories
Verify: test INSERT and SELECT work correctly
```

#### Step 5: Create contest tables
```
Task:
- contests
- contest_stages
- contest_groups
- participants
- group_members
- contest_subscriptions
Verify: foreign key constraints do not break
```

#### Step 6: Create voting tables
```
Task:
- votes
- eternal_votes
- stage_results
- vote_ip_log
- fraud_flags
Verify: UNIQUE constraints work as expected
```

#### Step 7: RLS policies and indexes
```
Task: Write and apply all security policies
- contests: readable by all (not drafts)
- votes: readable by owner only
- participants: readable by all (approved ones)
- profiles: readable by all, writable by owner only
Add all indexes from Section 6
Test with different roles
```

---

### PHASE 2 — Authentication (Steps 8–10)

#### Step 8: Remove Firebase Auth, configure Supabase Auth
```
Task: Replace existing authentication
- Remove firebase auth dependencies from the codebase
- Create authService.js:
  signInWithEmail(email)    → supabase.auth.signInWithOtp
  verifyOtp(email, token)   → supabase.auth.verifyOtp
  signOut()                 → supabase.auth.signOut
  getCurrentUser()          → supabase.auth.getUser
```

#### Step 9: Create authSlice and AuthPage
```
Task:
- authSlice: { user, loading, error }
- Actions: loginStart, loginSuccess, loginFailure, logout
- AuthPage component:
  → EmailStep (email input)
  → OtpStep (6-digit code input)
- Automatically create a profiles row after first login
  (Supabase trigger: on auth.users INSERT → create profile)
```

#### Step 10: Route protection + session persistence
```
Task:
- ProtectedRoute component
- Restore session on page reload:
  supabase.auth.onAuthStateChange
- Redirect unauthenticated users to /auth
- OnboardingPage for new users (check via profiles.created_at)
```

---

### PHASE 3 — Feed & Contests (Steps 11–15)

#### Step 11: Contest service + contestsSlice
```
Task:
- contestService.js:
  getContests(filters)    → contest list
  getContestById(id)      → single contest
  subscribeToContest(id)  → add subscription
- contestsSlice: { list, current, loading, filters }
- Load contests on app startup
```

#### Step 12: FeedPage — the main feed
```
Task:
- FilterTabs component (Subscriptions / All / Active / Upcoming / Completed)
- ContestCard component:
  → Cover image (optimised via Supabase image transforms)
  → Type + status badge
  → Countdown timer
  → Subscribe button
- Infinite scroll (or pagination with 10 items per page)
```

#### Step 13: ContestPage — Registration mode
```
Task:
- Contest page when status = 'registration'
- Contest info (rules, dates, category)
- List of approved participants (cards)
- SubmissionForm component:
  → Photo upload (up to 5 photos)
  → Text description
  → Social links (optional)
- participantService.submitApplication(contestId, data)
```

#### Step 14: ContestPage — Voting mode
```
Task:
- Contest page when status = 'active'
- Show current stage and assigned group
- GroupVoting component:
  → 6 participant cards
  → "Vote" button under each
  → Vote confirmation step
- voteService.castVote(groupId, participantId)
  → Writes trust_weight from current user_trust.score
  → Hashes the IP
- After voting: show the user's group result (%)
```

#### Step 15: ContestPage — Completed mode
```
Task:
- Contest page when status = 'completed'
- Top 12 finalists (large cards)
- "Show all" — remaining participants
- Navigate to /participant/:id from a card
- StageTimeline: progress through rounds
```

---

### PHASE 4 — Profiles (Steps 16–18)

#### Step 16: ParticipantPage
```
Task:
- Photo gallery from submission_data.photos
- Description, social links, sponsor info
- Stage results (percentages)
- Link back to the contest
```

#### Step 17: ProfilePage (personal dashboard)
```
Task:
- Public section: avatar, name, level badge, participations
- Private section (owner only):
  → Vote history (contest → participant → date)
  → Eternal votes: current vote + change button
  → Subscription management
- Avatar upload/replace (Supabase Storage)
```

#### Step 18: Profile settings
```
Task:
- Edit display_name
- Toggle show_participations
- Optional: set unique username
```

---

### PHASE 5 — Trust Score (Steps 19–21)

#### Step 19: Activity logging
```
Task: Update user_daily_log on every vote
- Upsert into user_daily_log: votes_cast++, unique_participants_voted
- This is a lightweight operation (1 row per user per day)
```

#### Step 20: Edge Function — nightly recalculation
```
Task: Create a Supabase Edge Function
- File: supabase/functions/daily-trust-update/index.ts
- Schedule: CRON '0 0 * * *' (every night at 00:00 UTC)
- Logic: for each active user, recalculate score using
  the formula from Section 8
- Update user_trust (score, level, last_updated)
- Log errors gracefully — one bad user should not crash the job
```

#### Step 21: Display level in the UI
```
Task:
- TrustBadge component (icon + level label)
- Show on profile cards
- Do NOT show numeric score
- Motivating copy: "Your vote is getting stronger"
```

---

### PHASE 6 — Anti-Fraud (Steps 22–23)

#### Step 22: IP collapse on vote
```
Task: Modify voteService.castVote
- Get the IP inside an Edge Function (never from the browser!)
- Hash it: SHA256(ip + process.env.IP_SALT)
- Upsert into vote_ip_log (vote_count++)
- If vote_count > 10: set trust_weight = 0.1
- Write ip_hash to the votes record
```

#### Step 23: Fraud flags in admin panel
```
Task:
- Edge Function to generate flags (runs hourly)
- AdminPage → "Flags" tab:
  → List of flags (severity, type, participant)
  → Action buttons: Dismiss / Warn / Disqualify
- On disqualify: set participant.status = 'eliminated'
```

---

### PHASE 7 — Realtime + Battle/Race (Steps 24–26)

#### Step 24: Realtime hook
```
Task:
- useRealtime.js — subscribe to votes table changes
- supabase
    .channel('votes')
    .on('postgres_changes', { event: 'INSERT', table: 'votes' })
    .subscribe(payload => dispatch(updateVoteCount(payload)))
```

#### Step 25: Battle contest
```
Task:
- ContestPage for type = 'battle'
- LiveCounter component: two columns with live counters
- Voting: 1 tap → instant update
- Countdown timer to battle end
- After end: winner declared + final percentages
```

#### Step 26: Race contest
```
Task:
- ContestPage for type = 'race'
- Vertical list of participants with progress bars
- Real-time position updates
- Animated rank changes (who moved up / down)
```

---

### PHASE 8 — Eternal + Polish (Steps 27–29)

#### Step 27: Eternal voting
```
Task:
- eternal_votes: use upsert instead of insert
- ProfilePage: show eternal vote history
- "Change vote" button → confirmation → new vote recorded
- Store updated_at to track history
```

#### Step 28: Full admin panel
```
Task:
- Contest creation form (all fields)
- Stage management (open/close stages)
- Participant application review (approve/reject)
- "Form groups" button → triggers distribution algorithm
- Confirmation dialogs for every destructive action
```

#### Step 29: PWA and optimisation
```
Task:
- manifest.json (name, icons, theme_color)
- Service Worker (static asset caching)
- Image optimisation (lazy loading, responsive sizes)
- Skeleton loaders instead of spinners
- Offline state handling
```

---

### Summary: 29 steps across 8 phases

| Phase | Steps | Deliverable |
|-------|-------|-------------|
| 0 — Setup | 1–3 | Project running, Firebase + Supabase connected |
| 1 — Database | 4–7 | All tables, RLS policies, indexes |
| 2 — Auth | 8–10 | Email OTP working, session persists on reload |
| 3 — Feed | 11–15 | Core flow: browse, apply, vote |
| 4 — Profiles | 16–18 | User and participant profiles |
| 5 — Trust Score | 19–21 | Vote weight system live |
| 6 — Anti-Fraud | 22–23 | IP collapse, admin flags |
| 7 — Realtime | 24–26 | Battle and Race contests |
| 8 — Polish | 27–29 | Eternal votes, full admin, PWA |

---

## 16. Migration Path

### Now (Free tier)
```
Firebase Hosting  — free
Supabase Cloud    — free up to 500MB DB, 1GB Storage
```

### On growth (6–12 months)
```
Supabase Cloud Pro — $25/mo
  + more DB, more Storage, more requests
  + no cold starts on Edge Functions
```

### If Supabase Cloud becomes too expensive (optional)
```
1. pg_dump from Supabase Cloud
2. Spin up Docker on a VPS (Hetzner €6/mo):
   docker-compose up supabase
3. pg_restore
4. Update SUPABASE_URL in .env
5. Everything else stays the same — thanks to the service layer
```

This is exactly why we chose Supabase over Firebase Firestore. A full migration is two commands and a URL swap.

---

*This document is updated as the project evolves.*
*Next document: detailed RLS policies + Edge Functions code*
