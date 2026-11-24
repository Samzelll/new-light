// Pure TypeScript anti-fraud engine: IP weight collapse + anomaly detection.
// No I/O, no side effects — deterministic and unit-testable.

export type FraudFlagType = 'ip_cluster' | 'speed_voting' | 'new_account_burst';

export interface VoteSignal {
  voteId: string;
  voterId: string;
  participantId: string;
  ipHash: string;
  baseTrustWeight: number;
  accountAgeHours: number;
  createdAt: string; // ISO 8601
}

export interface FraudFlag {
  type: FraudFlagType;
  participantId?: string;
  severity: 'low' | 'medium' | 'high';
  details: string;
  affectedVoteIds: string[];
}

export interface IPCollapseResult {
  effectiveWeights: Record<string, number>; // voteId -> adjusted weight
  collapsedIpHashes: string[];
}

/** Max votes per (IP, participant) group that keep full weight; excess get fixed 0.1. */
const DEFAULT_MAX_FULL_WEIGHT_VOTES_PER_IP = 10;

/** Fixed weight applied to every vote beyond the per-group cap. */
const EXCESS_WEIGHT = 0.1;

/** IP cluster: flag a participant with this many or more votes... */
const IP_CLUSTER_VOTE_THRESHOLD = 30;

/** ...sourced from fewer than this many distinct IPs. */
const IP_CLUSTER_MIN_DISTANT_IPS = 5;

/** Speed voting: this many votes or more within the window. */
const SPEED_VOTE_COUNT_THRESHOLD = 5;

/** Speed voting window in milliseconds (60 seconds). */
const SPEED_VOTE_WINDOW_MS = 60_000;

/** New account threshold in hours (strictly less than). */
const NEW_ACCOUNT_AGE_HOURS = 24;

/** New-account burst: this many fresh accounts voting for the same participant. */
const NEW_ACCOUNT_BURST_THRESHOLD = 10;

/** Safe timestamp parse; returns NaN for invalid dates. */
function parseTs(iso: string): number {
  return Date.parse(iso);
}

/** Chronological sort that tolerates invalid dates (NaN sorts last, deterministically). */
function sortByTs<T>(items: T[], tsOf: (item: T) => number): T[] {
  return [...items].sort((a, b) => {
    const ta = tsOf(a);
    const tb = tsOf(b);
    const aBad = Number.isNaN(ta);
    const bBad = Number.isNaN(tb);
    if (aBad && bBad) return 0;
    if (aBad) return 1;
    if (bBad) return -1;
    return ta - tb;
  });
}

// ---------------------------------------------------------------------------
// IP weight collapse
// ---------------------------------------------------------------------------

export function applyIpWeightCollapse(
  votes: VoteSignal[],
  maxFullWeightVotesPerIp: number = DEFAULT_MAX_FULL_WEIGHT_VOTES_PER_IP
): IPCollapseResult {
  const effectiveWeights: Record<string, number> = {};
  const collapsedIpHashes: string[] = [];

  // Group per (ipHash + '::' + participantId).
  const byGroup = new Map<string, VoteSignal[]>();
  for (const vote of votes) {
    const key = vote.ipHash + '::' + vote.participantId;
    const bucket = byGroup.get(key);
    if (bucket) bucket.push(vote);
    else byGroup.set(key, [vote]);
  }

  for (const [groupKey, groupVotes] of byGroup) {
    const sorted = sortByTs(groupVotes, (v) => parseTs(v.createdAt));

    if (sorted.length > maxFullWeightVotesPerIp) {
      const ipHash = groupKey.slice(0, groupKey.indexOf('::'));
      if (!collapsedIpHashes.includes(ipHash)) {
        collapsedIpHashes.push(ipHash);
      }
    }

    sorted.forEach((vote, index) => {
      if (index < maxFullWeightVotesPerIp) {
        effectiveWeights[vote.voteId] = vote.baseTrustWeight;
      } else {
        effectiveWeights[vote.voteId] = EXCESS_WEIGHT;
      }
    });
  }

  return { effectiveWeights, collapsedIpHashes };
}

// ---------------------------------------------------------------------------
// Anomaly detection
// ---------------------------------------------------------------------------

function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}

/** ip_cluster: per participant — >= 30 votes from < 5 distinct IPs. */
function detectIpCluster(votes: VoteSignal[]): FraudFlag[] {
  const flags: FraudFlag[] = [];
  const byParticipant = groupBy(votes, (v) => v.participantId);

  for (const [participantId, pVotes] of byParticipant) {
    const distinctIps = new Set(pVotes.map((v) => v.ipHash));

    if (pVotes.length >= IP_CLUSTER_VOTE_THRESHOLD && distinctIps.size < IP_CLUSTER_MIN_DISTANT_IPS) {
      flags.push({
        type: 'ip_cluster',
        participantId,
        severity: 'high',
        details:
          'Participant ' + participantId + ': ' + pVotes.length + ' votes from only ' +
          distinctIps.size + ' distinct IP(s). Strong indication of coordinated vote farming.',
        affectedVoteIds: pVotes.map((v) => v.voteId),
      });
    }
  }

  return flags;
}

/** speed_voting: sliding 60s window, >= 5 votes, per voterId and per ipHash. */
function detectSpeedVoting(votes: VoteSignal[]): FraudFlag[] {
  const flags: FraudFlag[] = [];

  for (const groupingKey of ['voterId', 'ipHash'] as const) {
    const groups = groupBy(votes, (v) => v[groupingKey]);

    for (const [key, groupVotes] of groups) {
      const withTs: Array<{ vote: VoteSignal; ts: number }> = [];
      for (const vote of groupVotes) {
        const ts = parseTs(vote.createdAt);
        if (!Number.isNaN(ts)) {
          withTs.push({ vote, ts });
        }
      }
      withTs.sort((a, b) => a.ts - b.ts);

      // Sliding window over chronologically sorted timestamps.
      let start = 0;
      for (let end = 0; end < withTs.length; end++) {
        while (withTs[end].ts - withTs[start].ts > SPEED_VOTE_WINDOW_MS) {
          start++;
        }
        const windowVotes = withTs.slice(start, end + 1);
        if (windowVotes.length >= SPEED_VOTE_COUNT_THRESHOLD) {
          const spanSec = Math.round((withTs[end].ts - withTs[start].ts) / 1000);
          flags.push({
            type: 'speed_voting',
            severity: windowVotes.length >= SPEED_VOTE_COUNT_THRESHOLD * 2 ? 'high' : 'medium',
            details:
              windowVotes.length + ' votes in ' + spanSec + 's ' +
              '(threshold: ' + SPEED_VOTE_COUNT_THRESHOLD + ' per ' +
              (SPEED_VOTE_WINDOW_MS / 1000) + 's) ' +
              'for ' + groupingKey + ' ' + key + '.',
            affectedVoteIds: windowVotes.map((w) => w.vote.voteId),
          });
          start = end; // avoid re-flagging overlapping windows
        }
      }
    }
  }

  return flags;
}

/** new_account_burst: per participant, accounts < 24h old, >= 10 such votes. */
function detectNewAccountBurst(votes: VoteSignal[]): FraudFlag[] {
  const flags: FraudFlag[] = [];

  const byParticipant = groupBy(votes, (v) => v.participantId);
  for (const [participantId, pVotes] of byParticipant) {
    const freshVotes = pVotes.filter((v) => v.accountAgeHours < NEW_ACCOUNT_AGE_HOURS);
    if (freshVotes.length < NEW_ACCOUNT_BURST_THRESHOLD) continue;

    const sorted = sortByTs(
      freshVotes,
      (v) => parseTs(v.createdAt)
    ).filter((v) => !Number.isNaN(parseTs(v.createdAt)));
    if (sorted.length < NEW_ACCOUNT_BURST_THRESHOLD) continue;

    const spanHours =
      (parseTs(sorted[sorted.length - 1].createdAt) -
        parseTs(sorted[0].createdAt)) / 3_600_000;

    const distinctVoters = new Set(freshVotes.map((v) => v.voterId)).size;
    const distinctIps = new Set(freshVotes.map((v) => v.ipHash)).size;

    const severity: FraudFlag['severity'] =
      freshVotes.length >= NEW_ACCOUNT_BURST_THRESHOLD * 3 || distinctIps <= 2
        ? 'high'
        : 'medium';

    flags.push({
      type: 'new_account_burst',
      participantId,
      severity,
      details:
        freshVotes.length + ' votes from accounts < ' + NEW_ACCOUNT_AGE_HOURS + 'h old ' +
        '(' + distinctVoters + ' distinct voters, ' + distinctIps + ' distinct IPs) within ' +
        spanHours.toFixed(1) + 'h targeting participant ' + participantId + '.',
      affectedVoteIds: freshVotes.map((v) => v.voteId),
    });
  }

  return flags;
}

export function detectFraudAnomalies(votes: VoteSignal[]): FraudFlag[] {
  if (votes.length === 0) return [];

  return [
    ...detectIpCluster(votes),
    ...detectSpeedVoting(votes),
    ...detectNewAccountBurst(votes),
  ];
}
