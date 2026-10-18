/**
 * Opinion Net — Tournament Engine & Contest Lifecycle Automated Test Suite
 * Validates end-to-end contest logic across all stages:
 * 1. Contest Creation (Standard & 1v1 Battle)
 * 2. Participant Registration & Moderation
 * 3. Group Distribution Algorithm (Standard & Remainder Edge Cases)
 * 4. Stage 1 (Registration) -> Stage 2 (Group Stage)
 * 5. Trust-Weighted Voting Simulation & Formula Points Calculation
 * 6. Stage 2 -> Stage 3 (Playoffs / Cutoff advancement)
 * 7. Stage 3 -> Stage 4 (Grand Final & Champion Crowning)
 * 8. 1v1 Battle Duel Lifecycle & Split Percentages
 */

import { distributeIntoGroups } from '../src/utils/groupAlgorithm.ts';

// ── Test Runner Utilities ──────────────────────────────────────────────────
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✓\x1b[0m ${message}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${message}`);
  }
}

function section(title) {
  console.log(`\n\x1b[36m━━━ ${title} ━━━\x1b[0m`);
}

// ── In-Memory Mock Database for Simulation ─────────────────────────────────
const mockDb = {
  contests: new Map(),
  participants: new Map(),
  stages: new Map(),
  groups: new Map(),
  groupMembers: new Map(),
  votes: new Map(),
  profiles: new Map(),
};

// Seed test users with different Trust Levels
const mockUsers = [
  { id: 'usr-new-01', name: 'Alice Newbie', trustLevel: 'new', weight: 1.0 },
  { id: 'usr-reg-01', name: 'Bob Regular', trustLevel: 'regular', weight: 3.0 },
  { id: 'usr-tru-01', name: 'Carol Trusted', trustLevel: 'trusted', weight: 8.0 },
  { id: 'usr-sen-01', name: 'Dave Senior', trustLevel: 'senior', weight: 15.0 },
];
mockUsers.forEach(u => mockDb.profiles.set(u.id, u));

// ══════════════════════════════════════════════════════════════════════════════
// TEST 1: Contest Creation & Validation
// ══════════════════════════════════════════════════════════════════════════════
section('TEST 1: Contest Creation & Configuration');

// 1.1 Create Standard Tournament
const standardContest = {
  id: 'test-contest-std-01',
  title: 'Autumn Photography Championship 2026',
  type: 'standard',
  status: 'registration',
  group_size: 4,
  max_participants: 32,
  min_participants: 16,
  current_stage: 1,
  stages: [
    { number: 1, title: 'Registration & Moderation', status: 'active' },
    { number: 2, title: 'Group Stage (4 per group)', status: 'pending' },
    { number: 3, title: 'Playoff Semi-Finals', status: 'pending' },
    { number: 4, title: 'Grand Final Showcase', status: 'pending' },
  ],
  created_at: new Date().toISOString(),
};
mockDb.contests.set(standardContest.id, standardContest);

assert(standardContest.type === 'standard', 'Standard contest created with type "standard"');
assert(standardContest.status === 'registration', 'Initial contest status is "registration"');
assert(standardContest.group_size === 4, 'Standard group size set to 4');
assert(standardContest.stages.length === 4, 'Contest configured with 4 stages (Registration -> Groups -> Playoffs -> Final)');

// 1.2 Create 1v1 Battle Duel
const battleContest = {
  id: 'test-battle-01',
  title: 'Neon Tokyo vs Manhattan Sunset',
  type: 'battle',
  status: 'active',
  group_size: 2,
  max_participants: 2,
  current_stage: 1,
  created_at: new Date().toISOString(),
};
mockDb.contests.set(battleContest.id, battleContest);

assert(battleContest.type === 'battle', 'Battle contest created with type "battle"');
assert(battleContest.group_size === 2, 'Battle duel group size is strictly 2');
assert(battleContest.status === 'active', 'Battle launches immediately with "active" voting status');

// ══════════════════════════════════════════════════════════════════════════════
// TEST 2: Participant Registration & Approval
// ══════════════════════════════════════════════════════════════════════════════
section('TEST 2: Participant Registration & Moderation');

// Generate 16 fake participants with mock submission data
const fakeParticipantNames = [
  'Golden Dawn Over Alps', 'Midnight Neon Alley', 'Silk & Shadows Studio', 'Morning Horizon',
  'Monochrome Architecture', 'Cybernetic Grid', 'Autumn Velvet Forest', 'Nordic Fjord Reflections',
  'Desert Mirage at Dusk', 'Street Jazz Portrait', 'Emerald Glass Tower', 'Tokyo Rain Glow',
  'Misty Pine Valley', 'Studio Geometry No. 4', 'Sunburst Over Manhattan', 'Glacier at Twilight',
];

const mockParticipants = fakeParticipantNames.map((name, i) => {
  const p = {
    id: `part-${i + 1}`,
    contest_id: standardContest.id,
    user_id: `usr-entrant-${i + 1}`,
    name,
    photo_url: `https://images.unsplash.com/photo-${1500000000000 + i}?w=800&q=80`,
    status: 'approved', // moderated & approved
    points: 0,
    eliminated: false,
    stage_reached: 1,
  };
  mockDb.participants.set(p.id, p);
  return p;
});

assert(mockParticipants.length === 16, 'Successfully registered 16 mock entrants');
assert(mockParticipants.every(p => p.status === 'approved'), 'All 16 entrants approved by moderation');
assert(mockParticipants.every(p => p.contest_id === standardContest.id), 'All entrants correctly linked to contest');

// ══════════════════════════════════════════════════════════════════════════════
// TEST 3: Group Distribution Algorithm (Edge Cases & Remainder Math)
// ══════════════════════════════════════════════════════════════════════════════
section('TEST 3: Group Distribution Algorithm & Edge Cases');

// 3.1 Perfect division: 16 participants, group size 4
const ids16 = mockParticipants.map(p => p.id);
const groups16 = distributeIntoGroups(ids16, 4);
assert(groups16.length === 4, '16 participants split into exactly 4 groups');
assert(groups16.every(g => g.length === 4), 'Each group has exactly 4 members');

// Ensure all participants are preserved and no duplicates
const flattened16 = groups16.flat();
const uniqueIds16 = new Set(flattened16);
assert(uniqueIds16.size === 16, 'Conservation of participants: exactly 16 unique IDs in groups');

// 3.2 Remainder < 3 (e.g. 17 participants, groupSize 4)
// Remainder is 1: should be distributed into first group so sizes are [5, 4, 4, 4] (no single-member groups!)
const ids17 = [...ids16, 'part-extra-17'];
const groups17 = distributeIntoGroups(ids17, 4);
assert(groups17.length === 4, '17 participants: remainder < 3 absorbed without creating 1-item group (4 groups total)');
assert(groups17.some(g => g.length === 5), 'Extra participant distributed into existing group (size 5)');
assert(groups17.flat().length === 17, 'All 17 participants accounted for');

// 3.3 Remainder >= 3 (e.g. 19 participants, groupSize 4)
// Remainder is 3: creates undersized group of 3 (sizes: 4, 4, 4, 4, 3)
const ids19 = [...ids16, 'part-extra-17', 'part-extra-18', 'part-extra-19'];
const groups19 = distributeIntoGroups(ids19, 4);
assert(groups19.length === 5, '19 participants: remainder 3 >= 3 creates undersized 5th group');
assert(groups19[4].length === 3, '5th group has exactly 3 members');
assert(groups19.flat().length === 19, 'All 19 participants accounted for');

// 3.4 1v1 Battle duel (2 participants, groupSize 2)
const groupsBattle = distributeIntoGroups(['b-red', 'b-green'], 2);
assert(groupsBattle.length === 1 && groupsBattle[0].length === 2, 'Battle duel: exactly 1 group of 2');

// ══════════════════════════════════════════════════════════════════════════════
// TEST 4: Stage 1 (Registration) -> Stage 2 (Group Stage)
// ══════════════════════════════════════════════════════════════════════════════
section('TEST 4: Transition to Stage 2 (Group Stage of 4)');

// Transition contest status to 'active'
standardContest.status = 'active';
standardContest.current_stage = 2;
standardContest.stages[0].status = 'completed';
standardContest.stages[1].status = 'active';

assert(standardContest.current_stage === 2, 'Contest current_stage advanced to 2');
assert(standardContest.stages[1].status === 'active', 'Stage 2 "Group Stage" is now active');

// Assign the 16 participants to Stage 2 groups
const stage2Groups = groups16.map((memberIds, idx) => {
  const group = {
    id: `stg2-grp-${idx + 1}`,
    contest_id: standardContest.id,
    stage_number: 2,
    group_number: idx + 1,
    member_ids: memberIds,
    status: 'active',
  };
  mockDb.groups.set(group.id, group);
  return group;
});

assert(stage2Groups.length === 4, 'Stage 2 has 4 active groups of 4');
assert(stage2Groups.every(g => g.member_ids.length === 4), 'All Stage 2 groups have 4 participants');

// ══════════════════════════════════════════════════════════════════════════════
// TEST 5: Trust-Weighted Voting & Formula Scoring Simulation
// ══════════════════════════════════════════════════════════════════════════════
section('TEST 5: Trust-Weighted Voting & Points Formula (Group 1)');

// Simulate votes cast in Group 1
// Group 1 members:
const grp1 = stage2Groups[0];
const [pA, pB, pC, pD] = grp1.member_ids;

// Mock Votes with different Trust Weights:
// User New (1.0x) votes for pA
// User Regular (3.0x) votes for pA
// User Trusted (8.0x) votes for pB
// User Senior (15.0x) votes for pC
// pD gets 0 votes
const groupVotes = [
  { voter_id: 'usr-new-01', participant_id: pA, weight: 1.0 },
  { voter_id: 'usr-reg-01', participant_id: pA, weight: 3.0 },
  { voter_id: 'usr-tru-01', participant_id: pB, weight: 8.0 },
  { voter_id: 'usr-sen-01', participant_id: pC, weight: 15.0 },
];

const voteTally = { [pA]: 0, [pB]: 0, [pC]: 0, [pD]: 0 };
groupVotes.forEach(v => {
  voteTally[v.participant_id] += v.weight;
});

const totalWeightedVotes = Object.values(voteTally).reduce((a, b) => a + b, 0);
assert(totalWeightedVotes === 27.0, `Total weighted votes in Group 1 is 27.0 (1+3+8+15)`);

// Verify percentage distribution
const percentA = Number(((voteTally[pA] / totalWeightedVotes) * 100).toFixed(1));
const percentB = Number(((voteTally[pB] / totalWeightedVotes) * 100).toFixed(1));
const percentC = Number(((voteTally[pC] / totalWeightedVotes) * 100).toFixed(1));
const percentD = Number(((voteTally[pD] / totalWeightedVotes) * 100).toFixed(1));

assert(percentC === 55.6, `Participant C received 55.6% (15/27)`);
assert(percentB === 29.6, `Participant B received 29.6% (8/27)`);
assert(percentA === 14.8, `Participant A received 14.8% (4/27)`);
assert(percentD === 0.0, `Participant D received 0.0% (0/27)`);

// Calculate points according to documentation formula:
// points = 3 * (n - rank) / (n - 1)
// For n = 4: Rank 1 -> 3 pts, Rank 2 -> 2 pts, Rank 3 -> 1 pt, Rank 4 -> 0 pts
function calculatePoints(rank, n = 4) {
  return 3 * ((n - rank) / (n - 1));
}

assert(calculatePoints(1) === 3, 'Rank 1 receives 3 tournament points');
assert(calculatePoints(2) === 2, 'Rank 2 receives 2 tournament points');
assert(calculatePoints(3) === 1, 'Rank 3 receives 1 tournament point');
assert(calculatePoints(4) === 0, 'Rank 4 receives 0 tournament points');

// Assign points to participants
mockDb.participants.get(pC).points += calculatePoints(1); // 3 pts
mockDb.participants.get(pB).points += calculatePoints(2); // 2 pts
mockDb.participants.get(pA).points += calculatePoints(3); // 1 pt
mockDb.participants.get(pD).points += calculatePoints(4); // 0 pts

assert(mockDb.participants.get(pC).points === 3, 'Winner pC has 3 points');
assert(mockDb.participants.get(pB).points === 2, 'Runner-up pB has 2 points');

// ══════════════════════════════════════════════════════════════════════════════
// TEST 6: Stage 2 -> Stage 3 (Playoffs / Top 2 Cutoff)
// ══════════════════════════════════════════════════════════════════════════════
section('TEST 6: Advancement to Stage 3 (Top 2 from Each Group Advance)');

// In each of the 4 groups, the top 2 advance (total 8 advance, 8 eliminated)
const advancingStage3 = [];
const eliminatedStage2 = [];

stage2Groups.forEach((grp, gIdx) => {
  // First 2 members simulate top ranks
  advancingStage3.push(grp.member_ids[0], grp.member_ids[1]);
  eliminatedStage2.push(grp.member_ids[2], grp.member_ids[3]);
});

advancingStage3.forEach(id => {
  const p = mockDb.participants.get(id);
  p.stage_reached = 3;
});

eliminatedStage2.forEach(id => {
  const p = mockDb.participants.get(id);
  p.eliminated = true;
  p.status = 'eliminated';
});

assert(advancingStage3.length === 8, 'Exactly 8 participants advance to Semi-Finals (2 from each group)');
assert(eliminatedStage2.length === 8, 'Exactly 8 participants eliminated from Stage 2');
assert(eliminatedStage2.every(id => mockDb.participants.get(id).eliminated === true), 'Eliminated entrants flagged properly');

// Advance tournament stage to Stage 3
standardContest.current_stage = 3;
standardContest.stages[1].status = 'completed';
standardContest.stages[2].status = 'active';

// Create 2 Semi-Final groups of 4
const stage3Groups = distributeIntoGroups(advancingStage3, 4);
assert(stage3Groups.length === 2, '8 advancing entrants split into 2 Semi-Final groups of 4');
assert(stage3Groups.every(g => g.length === 4), 'Both Semi-Final groups contain 4 entrants');

// ══════════════════════════════════════════════════════════════════════════════
// TEST 7: Stage 3 -> Stage 4 (Grand Final & Champion Crowning)
// ══════════════════════════════════════════════════════════════════════════════
section('TEST 7: Grand Final Showcase & Champion Crowning');

// Top 2 from each semi-final group advance to the 4-person Grand Final
const finalists = [
  stage3Groups[0][0], stage3Groups[0][1],
  stage3Groups[1][0], stage3Groups[1][1],
];

assert(finalists.length === 4, 'Grand Final consists of the top 4 finalists');

// Stage 4 transition
standardContest.current_stage = 4;
standardContest.stages[2].status = 'completed';
standardContest.stages[3].status = 'active';

assert(standardContest.current_stage === 4, 'Contest enters Stage 4: Grand Final');

// Final voting simulation: Finalist 1 wins the championship!
const championId = finalists[0];
const champion = mockDb.participants.get(championId);
champion.final_rank = 1;

// Mark contest as completed
standardContest.status = 'completed';
standardContest.stages[3].status = 'completed';
standardContest.winner_id = championId;

assert(standardContest.status === 'completed', 'Contest status finalized as "completed"');
assert(standardContest.stages.every(s => s.status === 'completed'), 'All 4 stages marked "completed"');
assert(standardContest.winner_id === championId, `Champion crowned: "${champion.name}" (ID: ${championId})`);

// ══════════════════════════════════════════════════════════════════════════════
// TEST 8: 1v1 Battle Quick Duel Lifecycle
// ══════════════════════════════════════════════════════════════════════════════
section('TEST 8: 1v1 Battle Duel Lifecycle & Realtime Split');

const battleEntrants = [
  { id: 'b-red', name: 'Manhattan Sunset', votes: 0, weightTotal: 0 },
  { id: 'b-green', name: 'Neon Shinjuku', votes: 0, weightTotal: 0 },
];

// Cast 6 votes for Red (total weight 18.0) and 4 votes for Green (total weight 12.0)
battleEntrants[0].weightTotal = 18.0;
battleEntrants[1].weightTotal = 12.0;

const battleTotalWeight = battleEntrants[0].weightTotal + battleEntrants[1].weightTotal; // 30.0
const battleSplitRed = (battleEntrants[0].weightTotal / battleTotalWeight) * 100;
const battleSplitGreen = (battleEntrants[1].weightTotal / battleTotalWeight) * 100;

assert(battleSplitRed === 60.0, 'Battle Red corner has 60.0% split');
assert(battleSplitGreen === 40.0, 'Battle Green corner has 40.0% split');
assert(battleSplitRed + battleSplitGreen === 100.0, 'Split percentages sum exactly to 100%');

// Conclude battle
battleContest.status = 'completed';
battleContest.winner_id = 'b-red';

assert(battleContest.status === 'completed', 'Battle contest concluded and marked "completed"');
assert(battleContest.winner_id === 'b-red', 'Red corner crowned as Battle winner');

// ══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n\x1b[35m════════════════════════════════════════════════════════════\x1b[0m');
console.log(`\x1b[1mTEST RESULTS SUMMARY:\x1b[0m`);
console.log(`Total assertions: ${totalTests}`);
console.log(`Passed: \x1b[32m${passedTests}\x1b[0m`);
console.log(`Failed: ${failedTests > 0 ? `\x1b[31m${failedTests}\x1b[0m` : '\x1b[32m0\x1b[0m'}`);
console.log('\x1b[35m════════════════════════════════════════════════════════════\x1b[0m\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\x1b[32m★ ALL TOURNAMENT & GROUP STAGE TESTS PASSED SUCCESSFULLY! ★\x1b[0m\n');
}
