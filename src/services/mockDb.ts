/**
 * Opinion Net — Comprehensive In-Browser Mock Database
 * Fully emulates Supabase (Auth, Tables, Storage, Realtime, Functions)
 * with persistence in localStorage and rich photography contest seed data.
 */

export interface MockCategory {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  sort_order: number;
}

export interface MockProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: 'admin' | 'creator' | 'developer' | 'user';
  show_participations: boolean;
  created_at: string;
}

export interface MockUserTrust {
  user_id: string;
  score: number;
  level: 'new' | 'regular' | 'trusted' | 'senior';
  days_active: number;
  contests_voted: number;
  vote_diversity: number;
  last_updated: string;
}

export interface MockContest {
  id: string;
  title: string;
  description: string | null;
  rules: string | null;
  prize?: string | null;
  quickRules?: string[];
  rulesSections?: { title: string; body: string }[];
  type: 'battle' | 'race' | 'standard' | 'eternal';
  status: 'registration' | 'voting' | 'completed' | 'paused' | 'blocked';
  visibility?: 'public' | 'private';
  feed_listing_status?: 'none' | 'pending' | 'approved' | 'rejected';
  category_id: string | null;
  cover_url: string | null;
  max_participants: number | null;
  group_size: number;
  registration_start: string | null;
  registration_end: string | null;
  voting_start: string | null;
  voting_end: string | null;
  created_by: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface MockParticipant {
  id: string;
  contest_id: string;
  user_id: string;
  submission_data: {
    name?: string;
    photos?: string[];
    description?: string;
    social_links?: { instagram?: string; tiktok?: string; website?: string };
    sponsor?: { name: string; url: string; product_name?: string; buy_link?: string };
    tags?: string[];
  };
  status: 'pending' | 'approved' | 'rejected' | 'eliminated';
  admin_note: string | null;
  submitted_at: string;
}

export interface MockVote {
  id: string;
  contest_id: string;
  stage_id: string;
  group_id: string;
  voter_id: string;
  participant_id: string;
  trust_weight: number;
  created_at: string;
}

export interface MockEternalVote {
  id: string;
  contest_id: string;
  voter_id: string;
  participant_id: string;
  trust_weight: number;
  voted_at: string;
  updated_at: string;
}

export interface MockSubscription {
  user_id: string;
  contest_id: string;
  created_at?: string;
}

export interface MockAuthUser {
  id: string;
  email: string;
  password?: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial Seed Data (High Quality Photography Contests)
// ─────────────────────────────────────────────────────────────────────────────

export const SEED_CATEGORIES: MockCategory[] = [
  { id: 'cat-street', name: 'Street Photography', slug: 'street', icon_url: null, sort_order: 1 },
  { id: 'cat-portrait', name: 'Portrait & People', slug: 'portrait', icon_url: null, sort_order: 2 },
  { id: 'cat-nature', name: 'Nature & Landscapes', slug: 'nature', icon_url: null, sort_order: 3 },
  { id: 'cat-architecture', name: 'Architecture & Urban', slug: 'architecture', icon_url: null, sort_order: 4 },
  { id: 'cat-creative', name: 'Creative & Concept', slug: 'creative', icon_url: null, sort_order: 5 },
  { id: 'cat-wildlife', name: 'Wildlife & Macro', slug: 'wildlife', icon_url: null, sort_order: 6 },
];

export const SEED_USERS: MockAuthUser[] = [
  {
    id: 'usr-admin-01',
    email: 'admin@opinionnet.com',
    password: 'password123',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'usr-creator-01',
    email: 'creator@opinionnet.com',
    password: 'password123',
    created_at: '2026-01-02T00:00:00Z',
  },
  {
    id: 'usr-demo-01',
    email: 'photographer@opinionnet.com',
    password: 'password123',
    created_at: '2026-01-03T00:00:00Z',
  },
  {
    id: 'usr-participant-01',
    email: 'marina@photo.art',
    password: 'password123',
    created_at: '2026-01-04T00:00:00Z',
  },
  {
    id: 'usr-participant-02',
    email: 'kirill@photo.art',
    password: 'password123',
    created_at: '2026-01-05T00:00:00Z',
  },
];

export const SEED_PROFILES: MockProfile[] = [
  {
    id: 'usr-admin-01',
    username: 'admin',
    display_name: 'Alexander',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
    bio: 'Lead Coordinator at Opinion Net',
    role: 'admin',
    show_participations: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'usr-creator-01',
    username: 'elenalens',
    display_name: 'Elena Lens',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces',
    bio: 'Photo curator and battle organizer.',
    role: 'creator',
    show_participations: true,
    created_at: '2026-01-02T00:00:00Z',
  },
  {
    id: 'usr-demo-01',
    username: 'photographer',
    display_name: 'Dmitry Sokolov',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    bio: 'Street & travel photographer, Opinion Net league member.',
    role: 'user',
    show_participations: true,
    created_at: '2026-01-03T00:00:00Z',
  },
  {
    id: 'usr-participant-01',
    username: 'marina_art',
    display_name: 'Marina Romanova',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces',
    bio: 'Portrait & studio photography, interplay of light and shadows.',
    role: 'user',
    show_participations: true,
    created_at: '2026-01-04T00:00:00Z',
  },
  {
    id: 'usr-participant-02',
    username: 'kirill_urban',
    display_name: 'Kirill Vetrov',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
    bio: 'Night cityscapes, cyberpunk aesthetics, and neon reflections.',
    role: 'user',
    show_participations: true,
    created_at: '2026-01-05T00:00:00Z',
  },
];

export const SEED_USER_TRUST: MockUserTrust[] = [
  {
    user_id: 'usr-admin-01',
    score: 950,
    level: 'senior',
    days_active: 180,
    contests_voted: 250,
    vote_diversity: 0.94,
    last_updated: '2026-09-28T12:00:00Z',
  },
  {
    user_id: 'usr-creator-01',
    score: 820,
    level: 'trusted',
    days_active: 110,
    contests_voted: 140,
    vote_diversity: 0.89,
    last_updated: '2026-09-28T12:00:00Z',
  },
  {
    user_id: 'usr-demo-01',
    score: 540,
    level: 'regular',
    days_active: 45,
    contests_voted: 38,
    vote_diversity: 0.78,
    last_updated: '2026-09-28T12:00:00Z',
  },
  {
    user_id: 'usr-participant-01',
    score: 610,
    level: 'regular',
    days_active: 60,
    contests_voted: 42,
    vote_diversity: 0.81,
    last_updated: '2026-09-28T12:00:00Z',
  },
  {
    user_id: 'usr-participant-02',
    score: 480,
    level: 'regular',
    days_active: 30,
    contests_voted: 25,
    vote_diversity: 0.72,
    last_updated: '2026-09-28T12:00:00Z',
  },
];

export const SEED_CONTESTS: MockContest[] = [
  {
    id: 'contest-stars',
    title: 'ALL-STARS SHOWDOWN',
    description: 'Grand showdown of bright talent. Vote for the season best!',
    rules: 'Fair voting weighted by community Trust Index.',
    type: 'battle',
    status: 'voting',
    category_id: 'cat-creative',
    cover_url: '/img/contests/tennis_balls.jpg',
    max_participants: 2,
    group_size: 2,
    registration_start: '2026-09-20T00:00:00Z',
    registration_end: '2026-09-25T00:00:00Z',
    voting_start: '2026-09-26T00:00:00Z',
    voting_end: '2026-10-10T00:00:00Z',
    created_by: 'usr-creator-01',
    is_featured: true,
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-28T12:00:00Z',
  },
  {
    id: 'contest-writers',
    title: 'CREATIVE WRITING & VISUALS',
    description: 'Literary and visual competition of original stories and poetic captures.',
    rules: 'Original works and photographic illustrations.',
    type: 'standard',
    status: 'voting',
    category_id: 'cat-creative',
    cover_url: '/img/contests/writer_pen.jpg',
    max_participants: 12,
    group_size: 4,
    registration_start: '2026-09-18T00:00:00Z',
    registration_end: '2026-09-24T00:00:00Z',
    voting_start: '2026-09-25T00:00:00Z',
    voting_end: '2026-10-08T00:00:00Z',
    created_by: 'usr-admin-01',
    is_featured: true,
    created_at: '2026-09-18T08:00:00Z',
    updated_at: '2026-09-28T12:00:00Z',
  },
  {
    id: 'contest-tennis-night',
    title: 'TENNIS OPEN TOURNAMENT',
    description: 'Night court action and sports photography under floodlights.',
    rules: 'Dynamic action shots and tournament leaderboard.',
    type: 'race',
    status: 'voting',
    category_id: 'cat-street',
    cover_url: '/img/contests/tennis_court.jpg',
    max_participants: 6,
    group_size: 6,
    registration_start: '2026-09-19T00:00:00Z',
    registration_end: '2026-09-24T00:00:00Z',
    voting_start: '2026-09-25T00:00:00Z',
    voting_end: '2026-10-06T00:00:00Z',
    created_by: 'usr-creator-01',
    is_featured: true,
    created_at: '2026-09-19T10:00:00Z',
    updated_at: '2026-09-28T12:00:00Z',
  },
  {
    id: 'contest-tennis-apply',
    title: 'TENNIS OPEN TOURNAMENT',
    description: 'Open registration for the Autumn Cup. Submit your best shots or entry form.',
    rules: 'Applications are open to everyone.',
    prize: '$1,500 + Cup',
    quickRules: [
      'Original sports photography taken on court',
      'High-resolution JPG/PNG format (min 2000px)',
      'One submission per registered photographer',
      'No intrusive watermarks or AI-generated imagery',
    ],
    rulesSections: [
      {
        title: 'Who can join',
        body: 'Open to all registered sports and street photographers, amateur and professional alike worldwide.',
      },
      {
        title: 'Entry requirements',
        body: 'Submit 1-3 high-resolution action shots captured on tennis courts during daylight or under night floodlights. Minimum resolution 2000px on the longest side.',
      },
      {
        title: 'Timeline',
        body: 'Registration ends on October 15, 2026 at 23:59 UTC. Stage 1 voting kicks off immediately on October 16.',
      },
      {
        title: 'Voting',
        body: 'Community 1v1 battle match-ups with Trust Index weighting to ensure fair and tamper-proof evaluation.',
      },
      {
        title: 'Prizes',
        body: '1st Place: $1,500 cash + Autumn Tennis Trophy. Top 3 featured on the Opinion Net homepage and spotlight feed.',
      },
      {
        title: 'Not allowed',
        body: 'No stock photos, copyright infringements, deepfakes, or watermarked collages. Infringing entries will be eliminated.',
      },
    ],
    type: 'standard',
    status: 'registration',
    category_id: 'cat-street',
    cover_url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1080&q=80',
    max_participants: 16,
    group_size: 4,
    registration_start: '2026-09-25T00:00:00Z',
    registration_end: '2026-10-15T00:00:00Z',
    voting_start: '2026-10-16T00:00:00Z',
    voting_end: '2026-10-30T00:00:00Z',
    created_by: 'usr-admin-01',
    is_featured: false,
    created_at: '2026-09-25T12:00:00Z',
    updated_at: '2026-09-28T12:00:00Z',
  },
  {
    id: 'contest-design-ideas',
    title: 'DESIGN OF IDEAS',
    description: 'Conceptual 3D design, architecture, and form exploration. Submit your entry.',
    rules: '3D renders, industrial design, and architectural concepts.',
    prize: '$2,000 + Spotlight',
    quickRules: [
      'Original 3D concept, product or architectural design',
      'Clear render perspectives and brief concept statement',
      'Maximum 1 project submission per creator',
      'Entries must be owned solely by the applicant',
    ],
    rulesSections: [
      {
        title: 'Who can join',
        body: '3D artists, industrial designers, interior architects, and conceptual creators of all skill levels.',
      },
      {
        title: 'Entry requirements',
        body: 'Renderings or real mockups in high quality (JPG/PNG/WEBP). Include a short description explaining the design philosophy.',
      },
      {
        title: 'Timeline',
        body: 'Applications open until October 20, 2026. Round 1 community voting begins on October 21.',
      },
      {
        title: 'Voting',
        body: 'Direct head-to-head elimination format. Every vote is weighted by community trust index.',
      },
      {
        title: 'Prizes',
        body: 'Winner receives $2,000 grant and exclusive feature in the Opinion Net Design Digest.',
      },
      {
        title: 'Not allowed',
        body: 'Plagiarism, unlicensed commercial assets without attribution, or low-resolution sketches.',
      },
    ],
    type: 'standard',
    status: 'registration',
    category_id: 'cat-architecture',
    cover_url: '/img/contests/design_ideas.jpg',
    max_participants: 24,
    group_size: 4,
    registration_start: '2026-09-26T00:00:00Z',
    registration_end: '2026-10-20T00:00:00Z',
    voting_start: '2026-10-21T00:00:00Z',
    voting_end: '2026-11-05T00:00:00Z',
    created_by: 'usr-creator-01',
    is_featured: true,
    created_at: '2026-09-26T14:00:00Z',
    updated_at: '2026-09-28T12:00:00Z',
  },
  {
    id: 'contest-glamour',
    title: 'MISS GLAMOUR',
    description: 'Annual portrait and high-fashion photography contest.',
    rules: 'Fair community voting on Opinion Net.',
    type: 'standard',
    status: 'voting',
    category_id: 'cat-portrait',
    cover_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80',
    max_participants: 20,
    group_size: 4,
    registration_start: '2026-09-10T00:00:00Z',
    registration_end: '2026-09-20T00:00:00Z',
    voting_start: '2026-09-21T00:00:00Z',
    voting_end: '2026-10-10T00:00:00Z',
    created_by: 'usr-creator-01',
    is_featured: true,
    created_at: '2026-09-10T10:00:00Z',
    updated_at: '2026-09-28T12:00:00Z',
  },
  {
    id: 'contest-photo-month',
    title: 'PHOTO OF THE MONTH',
    description: 'Premier showdown of September best shots.',
    rules: 'Finals completed. Results official.',
    type: 'battle',
    status: 'completed',
    category_id: 'cat-creative',
    cover_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80',
    max_participants: 2,
    group_size: 2,
    registration_start: '2026-09-01T00:00:00Z',
    registration_end: '2026-09-15T00:00:00Z',
    voting_start: '2026-09-16T00:00:00Z',
    voting_end: '2026-09-28T00:00:00Z',
    created_by: 'usr-admin-01',
    is_featured: true,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-28T12:00:00Z',
  },
  {
    id: 'contest-battle-01',
    title: 'NEON TOKYO',
    description: 'Duel of two strongest works in modern city photography. Vote for the most atmospheric shot.',
    rules: 'One vote per user. Tapping your choice casts an immutable vote. Trust-weighted ranking.',
    type: 'battle',
    status: 'voting',
    category_id: 'cat-street',
    cover_url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1080&q=80',
    max_participants: 2,
    group_size: 2,
    registration_start: '2026-09-20T00:00:00Z',
    registration_end: '2026-09-25T00:00:00Z',
    voting_start: '2026-09-26T00:00:00Z',
    voting_end: '2026-10-05T00:00:00Z',
    created_by: 'usr-creator-01',
    is_featured: true,
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-28T12:00:00Z',
  },
  {
    id: 'contest-race-02',
    title: 'GOLDEN HOUR PORTRAIT',
    description: 'Fast-paced portrait sprint under soft golden-hour ambient light.',
    rules: 'Race format: competitors contest the leaderboard concurrently.',
    type: 'race',
    status: 'voting',
    category_id: 'cat-portrait',
    cover_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1080&q=80',
    max_participants: 6,
    group_size: 6,
    registration_start: '2026-09-18T00:00:00Z',
    registration_end: '2026-09-24T00:00:00Z',
    voting_start: '2026-09-25T00:00:00Z',
    voting_end: '2026-10-02T00:00:00Z',
    created_by: 'usr-admin-01',
    is_featured: true,
    created_at: '2026-09-18T08:00:00Z',
    updated_at: '2026-09-28T12:00:00Z',
  },
  {
    id: 'contest-eternal-04',
    title: 'MAJESTIC NATURE',
    description: 'Hall of fame for the greatest landscape photography worldwide.',
    rules: 'Perpetual voting.',
    type: 'eternal',
    status: 'voting',
    category_id: 'cat-nature',
    cover_url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1080&q=80',
    max_participants: 50,
    group_size: 10,
    registration_start: '2026-01-01T00:00:00Z',
    registration_end: null,
    voting_start: '2026-01-01T00:00:00Z',
    voting_end: null,
    created_by: 'usr-admin-01',
    is_featured: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-09-28T12:00:00Z',
  },
];

export const SEED_PARTICIPANTS: MockParticipant[] = [
  // Participants for contest-battle-01 (1v1 Duel matching design mockup)
  {
    id: 'part-b01-1',
    contest_id: 'contest-battle-01',
    user_id: 'usr-participant-01',
    submission_data: {
      name: 'Manhattan sunset',
      photos: [
        'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1080&q=80',
        'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1080&q=80',
      ],
      description: 'Golden sunset ray cutting through towering Manhattan skyscrapers.',
      social_links: { instagram: '@marina_art' },
      tags: ['sunset', 'manhattan', 'street', 'city'],
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-09-24T18:00:00Z',
  },
  {
    id: 'part-b01-2',
    contest_id: 'contest-battle-01',
    user_id: 'usr-participant-02',
    submission_data: {
      name: 'Neon Shinjuku',
      photos: [
        'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1080&q=80',
        'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1080&q=80',
      ],
      description: 'Rainy cyberpunk evening with glowing neon reflections in Shinjuku, Tokyo.',
      social_links: { instagram: '@kirill_urban' },
      tags: ['neon', 'tokyo', 'cyberpunk', 'street'],
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-09-24T20:15:00Z',
  },

  // Participants for contest-stars (Next Battle)
  {
    id: 'part-stars-1',
    contest_id: 'contest-stars',
    user_id: 'usr-demo-01',
    submission_data: {
      name: 'Golden Glow Horizon',
      photos: [
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1080&q=80',
      ],
      description: 'Warm glowing spheres and sunset horizon.',
      social_links: { instagram: '@dmitry_photo' },
      tags: ['golden', 'horizon', 'aesthetic'],
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-09-22T10:00:00Z',
  },
  {
    id: 'part-stars-2',
    contest_id: 'contest-stars',
    user_id: 'usr-creator-01',
    submission_data: {
      name: 'Cosmic Neon Eclipse',
      photos: [
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1080&q=80',
      ],
      description: 'Dramatic celestial landscape under misty starlight.',
      social_links: { instagram: '@elena_lens' },
      tags: ['cosmic', 'eclipse', 'night'],
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-09-22T12:00:00Z',
  },

  // Participants for contest-race-02
  {
    id: 'part-r02-1',
    contest_id: 'contest-race-02',
    user_id: 'usr-demo-01',
    submission_data: {
      name: 'Radiance in Twilight',
      photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1080&q=80'],
      description: 'Natural rim lighting during the golden hour. Canon R5, 85mm f/1.2.',
      social_links: { instagram: '@dmitry_photo' },
      tags: ['portrait', 'goldenhour', 'naturallight'],
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-09-23T14:00:00Z',
  },
  {
    id: 'part-r02-2',
    contest_id: 'contest-race-02',
    user_id: 'usr-participant-01',
    submission_data: {
      name: 'Emotion in the Moment',
      photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1080&q=80'],
      description: 'Candid smile and warm autumnal light along the embankment.',
      social_links: { instagram: '@marina_art' },
      tags: ['smile', 'portrait', 'mood'],
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-09-23T16:30:00Z',
  },
  {
    id: 'part-r02-3',
    contest_id: 'contest-race-02',
    user_id: 'usr-participant-02',
    submission_data: {
      name: 'Through the Glass',
      photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&q=80'],
      description: 'Light refracting through raindrops on a café window.',
      social_links: { instagram: '@kirill_urban' },
      tags: ['portrait', 'raindrops', 'mood'],
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-09-24T11:00:00Z',
  },

  // Participants for contest-eternal-04
  {
    id: 'part-e04-1',
    contest_id: 'contest-eternal-04',
    user_id: 'usr-demo-01',
    submission_data: {
      name: 'Morning Mist in the Dolomites',
      photos: ['https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1080&q=80'],
      description: 'First sun rays catching Tre Cime peaks shrouded in thick mist.',
      tags: ['mountains', 'alps', 'landscape', 'mist'],
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-02-10T10:00:00Z',
  },
  {
    id: 'part-e04-2',
    contest_id: 'contest-eternal-04',
    user_id: 'usr-participant-02',
    submission_data: {
      name: 'Atlantic Storm at the Lighthouse',
      photos: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1080&q=80'],
      description: 'Ocean swell crashing against the rugged coast of Portugal.',
      tags: ['ocean', 'storm', 'nature', 'water'],
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-02-12T15:00:00Z',
  },

  // Participants for contest-battle-05
  {
    id: 'part-b05-1',
    contest_id: 'contest-battle-05',
    user_id: 'usr-participant-01',
    submission_data: {
      name: 'Emerald Dew on Cobweb',
      photos: ['https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=1080&q=80'],
      description: 'Morning dew beads glistening like pearls on delicate silk strands.',
      tags: ['macro', 'dew', 'raindrops'],
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-09-26T10:00:00Z',
  },
  {
    id: 'part-b05-2',
    contest_id: 'contest-battle-05',
    user_id: 'usr-demo-01',
    submission_data: {
      name: 'Tropical Butterfly Wing',
      photos: ['https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=1080&q=80'],
      description: 'Micro-texture and iridescent scales of a Morpho butterfly wing.',
      tags: ['macro', 'butterfly', 'texture'],
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-09-26T12:30:00Z',
  },

  // Pending participant for admin moderation demo
  {
    id: 'part-std-pending-1',
    contest_id: 'contest-standard-03',
    user_id: 'usr-participant-02',
    submission_data: {
      name: 'Street Crosswalk Shadows',
      photos: ['https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1080&q=80'],
      description: 'Elongated contrasting shadows under low winter sun.',
      tags: ['street', 'bw', 'monochrome', 'shadows'],
    },
    status: 'pending',
    admin_note: null,
    submitted_at: '2026-09-28T16:00:00Z',
  },

  // Participants for contest-design-ideas (Registration open with entries)
  {
    id: 'part-design-01',
    contest_id: 'contest-design-ideas',
    user_id: 'usr-demo-01',
    submission_data: {
      name: 'Kinetic Pavilion',
      photos: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1080&q=80'],
      description: 'Parametric architectural canopy with responsive light-reactive shading.',
      tags: ['architecture', '3d', 'parametric'],
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-09-27T10:00:00Z',
  },
  {
    id: 'part-design-02',
    contest_id: 'contest-design-ideas',
    user_id: 'usr-participant-01',
    submission_data: {
      name: 'Ceramic Lounge Pod',
      photos: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1080&q=80'],
      description: 'Ergonomic biophilic seating sculpted from organic terracotta and woven linen.',
      tags: ['industrial-design', 'furniture', 'minimalism'],
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-09-27T14:30:00Z',
  },

  // Participants for usr-admin-01 matching Profile mockup
  {
    id: 'part-admin-glamour',
    contest_id: 'contest-glamour',
    user_id: 'usr-admin-01',
    submission_data: {
      name: 'MISS GLAMOUR',
      photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80'],
      description: 'Portrait under soft studio lighting.',
      tags: ['portrait', 'glamour'],
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-09-21T12:00:00Z',
  },
  {
    id: 'part-admin-photomonth',
    contest_id: 'contest-photo-month',
    user_id: 'usr-admin-01',
    submission_data: {
      name: 'PHOTO OF THE MONTH',
      photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80'],
      description: 'Headline capture of the September showcase.',
      tags: ['street', 'winner'],
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-09-17T15:00:00Z',
  },
];

export const SEED_VOTES: MockVote[] = [
  {
    id: 'vote-01',
    contest_id: 'contest-battle-01',
    stage_id: 'contest-battle-01',
    group_id: 'contest-battle-01',
    voter_id: 'usr-admin-01',
    participant_id: 'part-b01-1',
    trust_weight: 9.5,
    created_at: '2026-09-27T10:00:00Z',
  },
  {
    id: 'vote-02',
    contest_id: 'contest-battle-01',
    stage_id: 'contest-battle-01',
    group_id: 'contest-battle-01',
    voter_id: 'usr-creator-01',
    participant_id: 'part-b01-2',
    trust_weight: 8.2,
    created_at: '2026-09-27T11:30:00Z',
  },
  {
    id: 'vote-03',
    contest_id: 'contest-battle-01',
    stage_id: 'contest-battle-01',
    group_id: 'contest-battle-01',
    voter_id: 'usr-demo-01',
    participant_id: 'part-b01-1',
    trust_weight: 5.4,
    created_at: '2026-09-28T09:15:00Z',
  },
  {
    id: 'vote-04',
    contest_id: 'contest-race-02',
    stage_id: 'contest-race-02',
    group_id: 'contest-race-02',
    voter_id: 'usr-admin-01',
    participant_id: 'part-r02-1',
    trust_weight: 9.5,
    created_at: '2026-09-26T12:00:00Z',
  },
  {
    id: 'vote-05',
    contest_id: 'contest-race-02',
    stage_id: 'contest-race-02',
    group_id: 'contest-race-02',
    voter_id: 'usr-creator-01',
    participant_id: 'part-r02-2',
    trust_weight: 8.2,
    created_at: '2026-09-26T13:45:00Z',
  },
];

export const SEED_SUBSCRIPTIONS: MockSubscription[] = [
  { user_id: 'usr-admin-01', contest_id: 'contest-battle-01' },
  { user_id: 'usr-creator-01', contest_id: 'contest-battle-01' },
  { user_id: 'usr-demo-01', contest_id: 'contest-race-02' },
];

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory & LocalStorage State Management
// ─────────────────────────────────────────────────────────────────────────────

interface MockDatabaseState {
  categories: MockCategory[];
  users: MockAuthUser[];
  profiles: MockProfile[];
  user_trust: MockUserTrust[];
  contests: MockContest[];
  participants: MockParticipant[];
  votes: MockVote[];
  eternal_votes: MockEternalVote[];
  contest_subscriptions: MockSubscription[];
  fraud_flags: any[];
  contest_groups: any[];
  group_members: any[];
  stages: any[];
  stage_results: any[];
  user_daily_log: any[];
  storage_files: Record<string, string>; // path -> base64 / url
}

const STORAGE_KEY = 'opinionnet_mock_db_v4';
const AUTH_SESSION_KEY = 'opinionnet_mock_session_v4';

function getInitialState(): MockDatabaseState {
  return {
    categories: [...SEED_CATEGORIES],
    users: [...SEED_USERS],
    profiles: [...SEED_PROFILES],
    user_trust: [...SEED_USER_TRUST],
    contests: [...SEED_CONTESTS],
    participants: [...SEED_PARTICIPANTS],
    votes: [...SEED_VOTES],
    eternal_votes: [],
    contest_subscriptions: [...SEED_SUBSCRIPTIONS],
    fraud_flags: [],
    contest_groups: [
      { id: 'grp-01', stage_id: 'contest-battle-01', contest_id: 'contest-battle-01', group_number: 1, status: 'active' },
      { id: 'grp-02', stage_id: 'contest-race-02', contest_id: 'contest-race-02', group_number: 1, status: 'active' },
    ],
    group_members: [
      { id: 'gm-01', group_id: 'grp-01', stage_id: 'contest-battle-01', participant_id: 'part-b01-1', contest_id: 'contest-battle-01' },
      { id: 'gm-02', group_id: 'grp-01', stage_id: 'contest-battle-01', participant_id: 'part-b01-2', contest_id: 'contest-battle-01' },
    ],
    stages: [],
    stage_results: [],
    user_daily_log: [],
    storage_files: {},
  };
}

class MockDatabaseManager {
  private state: MockDatabaseState;
  private currentSession: { access_token: string; user: { id: string; email: string; created_at: string } } | null = null;
  private authListeners: Set<(event: string, session: any) => void> = new Set();
  private realtimeListeners: Map<string, Set<(payload: any) => void>> = new Map();

  constructor() {
    this.state = this.loadState();
    this.currentSession = this.loadSession();

    // Default to admin user session if none exists, making testing seamless!
    if (!this.currentSession && typeof window !== 'undefined') {
      const admin = this.state.users[0];
      if (admin) {
        this.currentSession = {
          access_token: `mock-token-${admin.id}`,
          user: { id: admin.id, email: admin.email, created_at: admin.created_at },
        };
        this.saveSession();
      }
    }

    // Expose manager globally in browser for debugging / resetting
    if (typeof window !== 'undefined') {
      (window as any).__MOCK_DB__ = this;
    }
  }

  private loadState(): MockDatabaseState {
    if (typeof window === 'undefined') return getInitialState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Ensure all required keys exist
        const initial = getInitialState();
        return {
          ...initial,
          ...parsed,
          categories: parsed.categories?.length ? parsed.categories : initial.categories,
          contests: parsed.contests?.length ? parsed.contests : initial.contests,
          participants: parsed.participants?.length ? parsed.participants : initial.participants,
          profiles: parsed.profiles?.length ? parsed.profiles : initial.profiles,
        };
      }
    } catch (e) {
      console.warn('Failed to parse mock DB state, using default seed:', e);
    }
    return getInitialState();
  }

  public saveState() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save mock DB state:', e);
    }
  }

  public resetToDefault() {
    this.state = getInitialState();
    this.saveState();
    const admin = this.state.users[0];
    this.currentSession = {
      access_token: `mock-token-${admin.id}`,
      user: { id: admin.id, email: admin.email, created_at: admin.created_at },
    };
    this.saveSession();
    this.notifyAuthChange('SIGNED_IN', this.currentSession);
  }

  private loadSession() {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(AUTH_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public saveSession() {
    if (typeof window === 'undefined') return;
    try {
      if (this.currentSession) {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(this.currentSession));
      } else {
        localStorage.removeItem(AUTH_SESSION_KEY);
      }
    } catch (e) {
      console.warn('Failed to save session:', e);
    }
  }

  public getTable<T = any>(tableName: keyof MockDatabaseState): T[] {
    if (!this.state[tableName]) {
      (this.state as any)[tableName] = [];
    }
    return (this.state as any)[tableName] as T[];
  }

  public notifyRealtime(table: string, event: 'INSERT' | 'UPDATE' | 'DELETE', newRow: any, oldRow?: any) {
    const listeners = this.realtimeListeners.get(table);
    if (listeners) {
      const payload = { eventType: event, new: newRow, old: oldRow || null, table };
      listeners.forEach((cb) => {
        try { cb(payload); } catch (err) { console.error('Realtime listener error:', err); }
      });
    }
  }

  public addRealtimeListener(table: string, cb: (payload: any) => void): () => void {
    if (!this.realtimeListeners.has(table)) {
      this.realtimeListeners.set(table, new Set());
    }
    this.realtimeListeners.get(table)!.add(cb);
    return () => {
      this.realtimeListeners.get(table)?.delete(cb);
    };
  }

  public notifyAuthChange(event: string, session: any) {
    this.authListeners.forEach((cb) => {
      try { cb(event, session); } catch (err) { console.error('Auth change callback error:', err); }
    });
  }

  public addAuthListener(cb: (event: string, session: any) => void): () => void {
    this.authListeners.add(cb);
    // Immediate notification
    setTimeout(() => {
      cb(this.currentSession ? 'INITIAL_SESSION' : 'SIGNED_OUT', this.currentSession);
    }, 0);
    return () => {
      this.authListeners.delete(cb);
    };
  }

  public getSession() {
    return this.currentSession;
  }

  public setSession(session: any) {
    this.currentSession = session;
    this.saveSession();
    this.notifyAuthChange(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
  }

  public storeFile(path: string, url: string) {
    this.state.storage_files[path] = url;
    this.saveState();
  }

  public getStoredFile(path: string): string | null {
    return this.state.storage_files[path] || null;
  }
}

export const mockDbManager = new MockDatabaseManager();

// ─────────────────────────────────────────────────────────────────────────────
// Supabase-Compatible Query Builder
// ─────────────────────────────────────────────────────────────────────────────

interface FilterCondition {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'notIn';
  value: any;
}

export class MockQueryBuilder<T = any> implements PromiseLike<{ data: T; error: any; count?: number | null }> {
  private tableName: string;
  private selectColumns: string = '*';
  private filters: FilterCondition[] = [];
  private orderColumn?: string;
  private orderAscending: boolean = true;
  private limitCount?: number;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;
  private action: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private mutateData: any = null;
  private upsertOptions?: { onConflict?: string; ignoreDuplicates?: boolean };

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*', _options?: any): this {
    this.selectColumns = columns;
    return this;
  }

  insert(values: any | any[]): this {
    this.action = 'insert';
    this.mutateData = values;
    return this;
  }

  update(values: any): this {
    this.action = 'update';
    this.mutateData = values;
    return this;
  }

  upsert(values: any | any[], options?: { onConflict?: string; ignoreDuplicates?: boolean }): this {
    this.action = 'upsert';
    this.mutateData = values;
    this.upsertOptions = options;
    return this;
  }

  delete(): this {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: any): this {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  neq(column: string, value: any): this {
    this.filters.push({ column, operator: 'neq', value });
    return this;
  }

  gt(column: string, value: any): this {
    this.filters.push({ column, operator: 'gt', value });
    return this;
  }

  gte(column: string, value: any): this {
    this.filters.push({ column, operator: 'gte', value });
    return this;
  }

  lt(column: string, value: any): this {
    this.filters.push({ column, operator: 'lt', value });
    return this;
  }

  lte(column: string, value: any): this {
    this.filters.push({ column, operator: 'lte', value });
    return this;
  }

  in(column: string, values: any[]): this {
    this.filters.push({ column, operator: 'in', value: values });
    return this;
  }

  not(column: string, operator: string, value: any): this {
    if (operator === 'in') {
      let parsed = value;
      if (typeof value === 'string') {
        parsed = value.replace(/^\(|\)$/g, '').split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
      }
      this.filters.push({ column, operator: 'notIn', value: parsed });
    } else {
      this.filters.push({ column, operator: 'neq', value });
    }
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderColumn = column;
    this.orderAscending = options?.ascending ?? true;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  single(): this {
    this.isSingle = true;
    return this;
  }

  maybeSingle(): this {
    this.isMaybeSingle = true;
    return this;
  }

  private execute(): { data: any; error: any } {
    const table = mockDbManager.getTable(this.tableName as any);

    // ── Handle Insert ──
    if (this.action === 'insert') {
      const items = Array.isArray(this.mutateData) ? this.mutateData : [this.mutateData];
      const inserted: any[] = [];

      for (const item of items) {
        const row = {
          id: item.id || `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          created_at: item.created_at || new Date().toISOString(),
          submitted_at: item.submitted_at || new Date().toISOString(),
          ...item,
        };
        table.push(row);
        inserted.push(row);
        mockDbManager.notifyRealtime(this.tableName, 'INSERT', row);
      }

      mockDbManager.saveState();
      const resolved = inserted.map((r) => this.resolveJoins(r));
      const res = Array.isArray(this.mutateData) ? resolved : resolved[0];
      return { data: this.isSingle ? resolved[0] : res, error: null };
    }

    // ── Handle Upsert ──
    if (this.action === 'upsert') {
      const items = Array.isArray(this.mutateData) ? this.mutateData : [this.mutateData];
      const upserted: any[] = [];
      const onConflict = this.upsertOptions?.onConflict;

      for (const item of items) {
        let existingIdx = -1;
        if (onConflict) {
          const keys = onConflict.split(',').map((k) => k.trim());
          existingIdx = table.findIndex((row: any) => keys.every((k) => row[k] === item[k]));
        } else if (item.id) {
          existingIdx = table.findIndex((row: any) => row.id === item.id);
        }

        if (existingIdx >= 0) {
          if (!this.upsertOptions?.ignoreDuplicates) {
            table[existingIdx] = { ...table[existingIdx], ...item, updated_at: new Date().toISOString() };
            upserted.push(table[existingIdx]);
            mockDbManager.notifyRealtime(this.tableName, 'UPDATE', table[existingIdx]);
          } else {
            upserted.push(table[existingIdx]);
          }
        } else {
          const row = {
            id: item.id || `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            created_at: item.created_at || new Date().toISOString(),
            ...item,
          };
          table.push(row);
          upserted.push(row);
          mockDbManager.notifyRealtime(this.tableName, 'INSERT', row);
        }
      }

      mockDbManager.saveState();
      const resolved = upserted.map((r) => this.resolveJoins(r));
      const res = Array.isArray(this.mutateData) ? resolved : resolved[0];
      return { data: this.isSingle ? resolved[0] : res, error: null };
    }

    // ── Handle Delete ──
    if (this.action === 'delete') {
      const toKeep: any[] = [];
      const deleted: any[] = [];

      for (const row of table) {
        if (this.matchesFilters(row)) {
          deleted.push(row);
          mockDbManager.notifyRealtime(this.tableName, 'DELETE', null, row);
        } else {
          toKeep.push(row);
        }
      }

      table.length = 0;
      table.push(...toKeep);
      mockDbManager.saveState();
      return { data: deleted, error: null };
    }

    // ── Handle Update ──
    if (this.action === 'update') {
      const updated: any[] = [];

      for (let i = 0; i < table.length; i++) {
        if (this.matchesFilters(table[i])) {
          table[i] = { ...table[i], ...this.mutateData, updated_at: new Date().toISOString() };
          updated.push(table[i]);
          mockDbManager.notifyRealtime(this.tableName, 'UPDATE', table[i]);
        }
      }

      mockDbManager.saveState();
      const resolved = updated.map((r) => this.resolveJoins(r));
      return { data: this.isSingle ? resolved[0] || null : resolved, error: null };
    }

    // ── Handle Select ──
    let rows = table.filter((row: any) => this.matchesFilters(row));

    // Order
    if (this.orderColumn) {
      const col = this.orderColumn;
      const asc = this.orderAscending;
      rows = [...rows].sort((a: any, b: any) => {
        const valA = a[col];
        const valB = b[col];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (valA < valB) return asc ? -1 : 1;
        return asc ? 1 : -1;
      });
    }

    // Limit
    if (this.limitCount !== undefined && this.limitCount > 0) {
      rows = rows.slice(0, this.limitCount);
    }

    // Resolve Joined Relationships
    const processedRows = rows.map((row: any) => this.resolveJoins(row));

    if (this.isSingle) {
      if (processedRows.length === 0) {
        return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
      }
      return { data: processedRows[0], error: null };
    }

    if (this.isMaybeSingle) {
      return { data: processedRows[0] || null, error: null };
    }

    return { data: processedRows, error: null };
  }

  private matchesFilters(row: any): boolean {
    for (const f of this.filters) {
      const val = row[f.column];
      switch (f.operator) {
        case 'eq':
          if (val !== f.value) return false;
          break;
        case 'neq':
          if (val === f.value) return false;
          break;
        case 'gt':
          if (!(val > f.value)) return false;
          break;
        case 'gte':
          if (!(val >= f.value)) return false;
          break;
        case 'lt':
          if (!(val < f.value)) return false;
          break;
        case 'lte':
          if (!(val <= f.value)) return false;
          break;
        case 'in':
          if (!Array.isArray(f.value) || !f.value.includes(val)) return false;
          break;
        case 'notIn':
          if (Array.isArray(f.value) && f.value.includes(val)) return false;
          break;
      }
    }
    return true;
  }

  private resolveJoins(row: any): any {
    const res = { ...row };

    // Resolve categories join on contests
    if (this.tableName === 'contests' && (this.selectColumns.includes('categories') || this.selectColumns === '*')) {
      const cats = mockDbManager.getTable<MockCategory>('categories');
      res.categories = cats.find((c) => c.id === row.category_id) || null;
    }

    // Resolve profiles and contests join on participants
    if (this.tableName === 'participants') {
      if (this.selectColumns.includes('profiles') || this.selectColumns === '*') {
        const profiles = mockDbManager.getTable<MockProfile>('profiles');
        res.profiles = profiles.find((p) => p.id === row.user_id) || {
          username: 'user',
          display_name: 'Photographer',
          avatar_url: null,
        };
      }
      if (this.selectColumns.includes('contests')) {
        const contests = mockDbManager.getTable<MockContest>('contests');
        res.contests = contests.find((c) => c.id === row.contest_id) || null;
      }
    }

    // Resolve participants and profiles join on group_members
    if (this.tableName === 'group_members') {
      const participants = mockDbManager.getTable<MockParticipant>('participants');
      const profiles = mockDbManager.getTable<MockProfile>('profiles');
      const p = participants.find((item) => item.id === row.participant_id);
      if (p) {
        const prof = profiles.find((item) => item.id === p.user_id);
        res.participants = {
          ...p,
          profiles: prof || { username: 'user', display_name: 'Photographer', avatar_url: null },
        };
      }
    }

    return res;
  }

  then<TResult1 = { data: T; error: any; count?: number | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T; error: any; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    try {
      const result = this.execute();
      const resolved = Promise.resolve(result as any);
      return resolved.then(onfulfilled, onrejected);
    } catch (err) {
      if (onrejected) {
        return Promise.resolve(onrejected(err));
      }
      return Promise.reject(err);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Complete Mock Supabase Client Object
// ─────────────────────────────────────────────────────────────────────────────

export const mockSupabase = {
  // Query builder
  from(tableName: string) {
    return new MockQueryBuilder(tableName);
  },

  // Auth module
  auth: {
    async signUp({ email, password }: { email: string; password?: string }): Promise<{ data: { user: any; session: any }; error: any }> {
      const cleanEmail = email.trim().toLowerCase();
      const users = mockDbManager.getTable<MockAuthUser>('users');
      const profiles = mockDbManager.getTable<MockProfile>('profiles');
      const trust = mockDbManager.getTable<MockUserTrust>('user_trust');

      let existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (existing) {
        return { data: { user: null, session: null }, error: { message: 'User with this email already exists.' } };
      }

      const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newUser: MockAuthUser = {
        id,
        email: cleanEmail,
        password: password || 'password123',
        created_at: new Date().toISOString(),
      };
      users.push(newUser);

      const username = cleanEmail.split('@')[0] || 'photographer';
      const newProfile: MockProfile = {
        id,
        username,
        display_name: username.charAt(0).toUpperCase() + username.slice(1),
        avatar_url: null,
        bio: 'Opinion Net competitor',
        role: 'user',
        show_participations: true,
        created_at: new Date().toISOString(),
      };
      profiles.push(newProfile);

      const newTrust: MockUserTrust = {
        user_id: id,
        score: 1.0,
        level: 'new',
        days_active: 1,
        contests_voted: 0,
        vote_diversity: 0,
        last_updated: new Date().toISOString(),
      };
      trust.push(newTrust);

      mockDbManager.saveState();

      const session = {
        access_token: `mock-token-${id}`,
        user: { id, email: cleanEmail, created_at: newUser.created_at },
      };
      mockDbManager.setSession(session);

      return { data: { user: session.user, session }, error: null };
    },

    async signInWithPassword({ email, password }: { email: string; password?: string }): Promise<{ data: { user: any; session: any }; error: any }> {
      const cleanEmail = email.trim().toLowerCase();
      const users = mockDbManager.getTable<MockAuthUser>('users');
      const profiles = mockDbManager.getTable<MockProfile>('profiles');
      const trust = mockDbManager.getTable<MockUserTrust>('user_trust');

      let user = users.find((u) => u.email.toLowerCase() === cleanEmail);

      // Helpful live mode feature: if user does not exist yet, auto-register for testing ease!
      if (!user) {
        const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        user = {
          id,
          email: cleanEmail,
          password: password || 'password123',
          created_at: new Date().toISOString(),
        };
        users.push(user);

        const username = cleanEmail.split('@')[0] || 'photographer';
        profiles.push({
          id,
          username,
          display_name: username.charAt(0).toUpperCase() + username.slice(1),
          avatar_url: null,
          bio: 'Opinion Net competitor',
          role: cleanEmail.includes('admin') ? 'admin' : cleanEmail.includes('creator') ? 'creator' : 'user',
          show_participations: true,
          created_at: new Date().toISOString(),
        });

        trust.push({
          user_id: id,
          score: 1.0,
          level: 'new',
          days_active: 1,
          contests_voted: 0,
          vote_diversity: 0,
          last_updated: new Date().toISOString(),
        });

        mockDbManager.saveState();
      }

      const session = {
        access_token: `mock-token-${user.id}`,
        user: { id: user.id, email: user.email, created_at: user.created_at },
      };
      mockDbManager.setSession(session);

      return { data: { user: session.user, session }, error: null };
    },

    async signOut(): Promise<{ error: any }> {
      mockDbManager.setSession(null);
      return { error: null };
    },

    async getUser(): Promise<{ data: { user: any }; error: any }> {
      const session = mockDbManager.getSession();
      return { data: { user: session ? session.user : null }, error: null };
    },

    async getSession(): Promise<{ data: { session: any }; error: any }> {
      const session = mockDbManager.getSession();
      return { data: { session }, error: null };
    },

    onAuthStateChange(callback: (event: any, session: any) => void): { data: { subscription: { unsubscribe: () => void } } } {
      const unsubscribe = mockDbManager.addAuthListener(callback);
      return {
        data: {
          subscription: {
            unsubscribe,
          },
        },
      };
    },
  },

  // Storage module (converts uploads to Data URLs or stores directly)
  storage: {
    from(bucketName: string) {
      return {
        async upload(path: string, file: File | Blob, _options?: any) {
          try {
            // Read file into data URL if browser supports FileReader
            if (typeof window !== 'undefined' && file instanceof Blob) {
              const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => resolve(URL.createObjectURL(file));
                reader.readAsDataURL(file);
              });
              mockDbManager.storeFile(`${bucketName}/${path}`, dataUrl);
            }
            return { data: { path }, error: null };
          } catch (err: any) {
            return { data: null, error: { message: err?.message || 'Upload failed' } };
          }
        },

        getPublicUrl(path: string) {
          if (!path) return { data: { publicUrl: '' } };
          if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
            return { data: { publicUrl: path } };
          }
          const stored = mockDbManager.getStoredFile(`${bucketName}/${path}`);
          if (stored) {
            return { data: { publicUrl: stored } };
          }
          // Default fallback photography placeholder
          return { data: { publicUrl: `https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800` } };
        },

        async download(_path: string) {
          return { data: new Blob(), error: null };
        },

        async remove(_paths: string[]) {
          return { data: null, error: null };
        },
      };
    },
  },

  // Realtime channel subscriptions
  channel(channelName: string) {
    let unsubs: Array<() => void> = [];

    const channelObj = {
      on(
        eventType: string,
        filterObj: { event?: string; schema?: string; table?: string; filter?: string },
        callback: (payload: any) => void
      ) {
        const table = filterObj?.table || 'votes';
        const unsub = mockDbManager.addRealtimeListener(table, (payload) => {
          callback(payload);
        });
        unsubs.push(unsub);
        return channelObj;
      },
      subscribe() {
        return channelObj;
      },
      unsubscribe() {
        unsubs.forEach((u) => u());
        unsubs = [];
      },
    };

    return channelObj;
  },

  removeChannel(channel: any) {
    if (channel?.unsubscribe) {
      channel.unsubscribe();
    }
  },

  // Functions (Edge Functions) simulation
  functions: {
    async invoke(functionName: string, { body }: { body: any }) {
      if (functionName === 'cast-vote') {
        const session = mockDbManager.getSession();
        const voterId = session?.user?.id || 'usr-anon';

        const votes = mockDbManager.getTable<MockVote>('votes');
        // Check duplicate vote
        const exists = votes.some(
          (v) => v.contest_id === body.contestId && v.voter_id === voterId && v.group_id === (body.groupId || body.contestId)
        );

        if (exists) {
          return { data: null, error: { message: 'You have already voted in this match/group.' } };
        }

        const newVote: MockVote = {
          id: `vote_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          contest_id: body.contestId,
          stage_id: body.stageId || body.contestId,
          group_id: body.groupId || body.contestId,
          voter_id: voterId,
          participant_id: body.participantId,
          trust_weight: Number(body.trustWeight) || 1.0,
          created_at: new Date().toISOString(),
        };

        votes.push(newVote);
        mockDbManager.saveState();
        mockDbManager.notifyRealtime('votes', 'INSERT', newVote);

        return { data: { success: true }, error: null };
      }

      return { data: { success: true }, error: null };
    },
  },
};
