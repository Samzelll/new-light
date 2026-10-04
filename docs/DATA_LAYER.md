# Data Layer Contract

One contract, two implementations:
- **Now**: `src/services/mock/` (in-memory store, seed scenarios, dev time machine).
- **Later**: `src/services/supabase/` (tables, views, RPC, Edge Functions from `supabase/migrations/001_voting_platform.sql`).

Screens, hooks and Redux import only `src/services/index.js` (or `index.ts`). Everything below must behave the same in both adapters.

```js
// src/services/index.ts
import * as mock from './mock';
import * as supabase from './supabase';

const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? 'mock';
const impl = source === 'supabase' ? supabase : mock;

export const {
  authService,
  contestService,
  entryService,
  feedService,
  voteService,
  profileService,
  adminService,
  storageService,
  timeService,
} = impl;
```

---

## 1. Conventions
- Every function is async. Failures throw `{ code, message }` (codes in section 4).
- Ids are strings (uuid). Dates are ISO 8601 strings in UTC. Money-like or count fields are never returned (see rules).
- JS field names are camelCase; they map one to one to database columns (`registration_end` becomes `registrationEnd`).
- Lists accept `{ cursor, limit }` and return `{ items, nextCursor }`.
- **Never returned to the client, by either adapter**: raw vote counts, vote weights, the Trust Score number, other people's votes, adminNote to non-owners, ranks / shares / points of a group that is not finished, live percentages before the viewer voted.

---

## 2. Shapes

```ts
type Contest = {
  id: string;
  seriesId?: string;
  title: string;
  description: string;
  quickRules: string[];
  rulesSections: { title: string; body: string }[];
  prize: string;
  type: 'standard' | 'battle' | 'race' | 'eternal';
  status: 'draft' | 'registration' | 'active' | 'paused' | 'completed' | 'cancelled';
  categoryId: string;
  coverUrl: string;
  isFeatured: boolean;
  registrationStart: string;
  registrationEnd: string;
  startsAt: string; // always 06:00 UTC
  minParticipants: number;
  maxParticipants: number;
  currentStage: 'registration' | 'group_stage' | 'swiss_stage' | 'playoff_stage' | 'finished';
  currentRound: number;
  finalParticipants: number;
  groupDays: number;
  advanceCount: number;
  swissEnabled: boolean;
  entriesCount?: number;
  myEntryStatus?: EntryStatus | null;
  isSubscribed?: boolean;
};

type EntryStatus =
  | 'pending'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'cut'
  | 'active'
  | 'eliminated'
  | 'disqualified';

type Entry = {
  id: string;
  contestId: string;
  userId: string;
  title: string;
  submissionData: {
    photos: string[];
    description?: string;
    socialLinks?: Record<string, string>;
    sponsor?: { name: string; url?: string; productName?: string; buyLink?: string };
    tags?: string[];
  };
  status: 'approved' | 'active' | 'eliminated';
  stageReached?: number;
  finalRank?: number;
  submittedAt: string;
};

type MyEntry = Entry & {
  status: EntryStatus;
  adminNote?: string;
  priority: boolean;
  revisions?: Revision[];
};

type Revision = {
  version: number;
  title: string;
  submissionData: any;
  createdAt: string;
};

type Group = {
  id: string;
  contestId: string;
  stageType: 'group_stage' | 'swiss_stage' | 'playoff_stage' | 'battle' | 'race';
  roundNumber: number;
  groupNumber: number;
  status: 'active' | 'finished' | 'void';
  startsAt: string;
  endsAt: string;
  extended: boolean;
  members: {
    participantId: string;
    title: string;
    photo: string;
    rankInGroup: number | null;
    sharePercent: number | null;
    result: 'win' | 'loss' | null;
  }[];
  myPickId?: string | null;
};

type LivePercent = {
  groupId: string;
  participantId: string;
  percent: number;
};

type VoteHistoryItem = {
  votedAt: string;
  contestId: string;
  contestTitle: string;
  stageType: string;
  roundNumber: number;
  groupId: string;
  participantId: string;
  entryTitle: string;
  entryStatus: string;
  groupStatus: string;
  rankInGroup: number | null;
  sharePercent: number | null;
};

type Profile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string;
  role: 'user' | 'critic' | 'moderator' | 'admin';
  showParticipations: boolean;
  trustLevel?: 'new' | 'regular' | 'trusted' | 'senior';
};
```

---

## 3. Services

### `authService`
| Function | Mock | Supabase |
|---|---|---|
| `signInWithEmail(email)` | Pretends to send a code | `auth.signInWithOtp` |
| `verifyOtp(email, code)` | Accepts `000000` | `auth.verifyOtp` |
| `signOut()`, `getSession()`, `onAuthChange(cb)` | Local state | `auth.*` |
| `devSignInAs(kind)` | `guest`, `user`, `entrant`, `moderator`, `admin` | Not available |

### `contestService`
- `listContests({ tab: 'contests'|'battles', search, categoryId, status, sort: 'popular'|'for_you'|'ending_soon', subscribedOnly, cursor, limit })`
- `getContest(id)`, `getStagePlan(contestId)` (stage list, current round, time to close)
- `subscribe(contestId)`, `unsubscribe(contestId)`

### `entryService`
- `listEntries(contestId)` returns `Entry[]` (public view)
- `getMyEntry(contestId)` returns `MyEntry | null`
- `submitEntry(contestId, { title, data })` returns `{ id }`
- `updateEntry(id, { title, data })` (reverts to pending)
- `withdrawEntry(id)`
- `getRevisions(id)` (owner and staff only)
- Staff: `listModerationQueue({ contestId })`, `moderateEntry(id, decision, note)`, `disqualifyEntry(id, reason)`

### `feedService`
- `getNextGroups({ limit })` returns `Group[]` of open groups sorted with fewest votes first.
- `getGroup(groupId)`

### `voteService`
- `castVote(groupId, participantId)` returns `{ ok: true, myPickId }`
- `getLivePercents(groupId)` returns `LivePercent[]`
- `getMyVoteHistory()` returns `VoteHistoryItem[]`
- `castEternalVote(contestId, participantId)`

### `profileService`
- `getProfile(id)`, `updateProfile({ displayName, bio, avatarUrl, showParticipations })`
- `getMyLevel()` (returns Trust level badge)
- `getMyEntries()`, `getFollowing()`

### `adminService` (Admin and Moderator)
- `createContest(input)`, `updateContest(id, patch)`, `setContestStatus(id, status)`
- `openLiveGroup(contestId, endsAt)`
- `listFlags()`, `resolveFlag(id, action)`, `getEngineLog(contestId)`

### `storageService`
- `uploadEntryPhoto(file)` returns `{ url }`
- `uploadAvatar(file)`

### `timeService`
- `now()` returns server time
- `nextCycleBoundary(date)` returns next 06:00 UTC
- `(mock only) devJumpToNextCycle()` closes groups, awards points, advances stage
- `devSetScenario(name)`

---

## 4. Error Codes

| Code | When | Supabase message |
|---|---|---|
| `AUTH_REQUIRED` | No session | Sign in required |
| `NOT_ALLOWED` | Role is not enough | Not allowed |
| `REGISTRATION_CLOSED` | Registration closed | Registration is not open |
| `MATERIAL_REQUIRED` | No title or photo | Title and photo required |
| `ENTRY_LOCKED` | Edit after registration closed | Entry can no longer be edited |
| `WITHDRAW_LOCKED` | In the last 1 hour before start | Withdrawal is locked |
| `VOTING_CLOSED` | Group closed or not active | Voting is closed |
| `OWN_GROUP` | Participant votes in own group | Cannot vote in own group |
| `INVALID_CANDIDATE` | Candidate not in group | Invalid candidate |
| `NETWORK` | Connection problem | Transport error |
| `UNKNOWN` | Anything else | Unknown error |

---

## 5. Contract Tests
1. A blank entry is rejected with `MATERIAL_REQUIRED`; a valid one is created as `pending`.
2. Editing an approved entry returns it to `pending` and creates a revision.
3. Voting in your own group fails with `OWN_GROUP`.
4. A vote can be changed while the group is open; after closing it fails with `VOTING_CLOSED`.
5. A group's `rankInGroup` and `sharePercent` are null while open and filled after closing.
6. `getLivePercents` returns nothing before the viewer voted.
7. No response object contains `weight`, `votesCount`, `trustScore`.
8. Withdrawal: free before the last hour, `WITHDRAW_LOCKED` inside it, disqualification after start.
