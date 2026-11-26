import { collection, doc, getDocs, limit, query, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import type { Contest } from '@/services/contestService';
import type { Participant } from '@/services/participantService';
import type { Profile } from '@/services/profileService';

export interface SeedCategory {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  sort_order: number;
}

export const SEED_CATEGORIES: SeedCategory[] = [
  { id: 'cat-all', name: 'All', slug: 'all', icon_url: null, sort_order: 0 },
  { id: 'cat-portrait', name: 'Portrait', slug: 'portrait', icon_url: null, sort_order: 1 },
  { id: 'cat-street', name: 'Street & Sports', slug: 'street', icon_url: null, sort_order: 2 },
  { id: 'cat-nature', name: 'Landscape', slug: 'nature', icon_url: null, sort_order: 3 },
  { id: 'cat-architecture', name: 'Architecture', slug: 'architecture', icon_url: null, sort_order: 4 },
  { id: 'cat-creative', name: 'Art & Concept', slug: 'creative', icon_url: null, sort_order: 5 },
];

export const SEED_PROFILES: Profile[] = [
  {
    id: 'usr-admin-01',
    username: 'admin',
    display_name: 'Alexander',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
    bio: 'Lead Coordinator at Opinion Net',
    role: 'admin',
    show_participations: true,
    created_at: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'usr-mod-01',
    username: 'elenalens',
    display_name: 'Elena Lens',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces',
    bio: 'Photo curator & league moderator',
    role: 'moderator',
    show_participations: true,
    created_at: '2026-09-02T00:00:00.000Z',
  },
  {
    id: 'usr-entrant-01',
    username: 'photographer',
    display_name: 'Dmitry Sokolov',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    bio: 'Street & Travel photographer',
    role: 'user',
    show_participations: true,
    created_at: '2026-09-03T00:00:00.000Z',
  },
  {
    id: 'usr-user-01',
    username: 'marina_art',
    display_name: 'Marina Romanova',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces',
    bio: 'Portrait & studio photography',
    role: 'user',
    show_participations: true,
    created_at: '2026-09-04T00:00:00.000Z',
  },
];

export const SEED_CONTESTS: Contest[] = [
  {
    id: 'contest-glamour',
    title: 'MISS GLAMOUR',
    description: 'Annual contest for portrait and high-fashion photography.',
    rules: 'Original studio or street portrait photography.\nOne entry submission per verified author.\nNo heavy synthetic AI modifications or filters.',
    prize: '$2,500 + Cup',
    quickRules: [
      'Original studio or street portrait photography',
      'One entry submission per verified author',
      'No heavy synthetic AI modifications or filters',
      'Winner decided through daily groups of 4 and playoffs',
    ],
    rulesSections: [
      { title: 'Eligibility', body: 'Open to all registered photographers and models with no minimum experience.' },
      { title: 'Work Requirements', body: 'High quality JPG or PNG photo, min 2000px along the long edge.' },
      { title: 'Schedule & Stages', body: 'Group stage runs in groups of 4 entries. Daily reshuffle at 06:00 UTC.' },
      { title: 'Voting Rules', body: '1 vote per group. You can switch your vote until the round closes at 06:00 UTC.' },
      { title: 'Prizes', body: 'Grand Prix $2,500, season trophy, and spotlight feature in Opinion Net magazine.' },
    ],
    type: 'standard',
    status: 'active',
    visibility: 'public',
    feed_listing_status: 'approved',
    category_id: 'cat-portrait',
    cover_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1080&q=80',
    max_participants: 128,
    group_size: 4,
    registration_start: '2026-09-10T00:00:00.000Z',
    registration_end: '2026-09-20T00:00:00.000Z',
    voting_start: '2026-09-21T06:00:00.000Z',
    voting_end: '2026-12-30T06:00:00.000Z',
    created_by: 'usr-admin-01',
    is_featured: true,
    created_at: '2026-09-10T00:00:00.000Z',
    updated_at: '2026-09-21T06:00:00.000Z',
    categories: { name: 'Portrait', slug: 'portrait', icon_url: null },
  },
  {
    id: 'contest-tennis-apply',
    title: 'TENNIS OPEN CUP',
    description: 'Open registration for the Autumn Court Action and sports photography cup.',
    rules: 'Original sports photography captured on court.\nHigh-resolution JPG or PNG (2000px+).\nOne submission per registered entrant.',
    prize: '$1,500 + Cup',
    quickRules: [
      'Original sports photography captured on court',
      'High-resolution JPG or PNG (2000px+)',
      'One submission per registered entrant',
      'No excessive promotional watermarks or generated art',
    ],
    rulesSections: [
      { title: 'Eligibility', body: 'Open to sports and action photographers of all skill levels.' },
      { title: 'Work Requirements', body: 'Between 1 and 3 dynamic shots of match play under daylight or night stadium lighting.' },
      { title: 'Awards', body: '1st Place: $1,500 cash + Autumn Tennis Trophy.' },
    ],
    type: 'standard',
    status: 'registration',
    visibility: 'public',
    feed_listing_status: 'approved',
    category_id: 'cat-street',
    cover_url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1080&q=80',
    max_participants: 64,
    group_size: 4,
    registration_start: '2026-09-25T00:00:00.000Z',
    registration_end: '2026-12-15T00:00:00.000Z',
    voting_start: '2026-12-16T06:00:00.000Z',
    voting_end: null,
    created_by: 'usr-admin-01',
    is_featured: true,
    created_at: '2026-09-25T00:00:00.000Z',
    updated_at: '2026-09-25T00:00:00.000Z',
    categories: { name: 'Street & Sports', slug: 'street', icon_url: null },
  },
  {
    id: 'contest-photo-month',
    title: 'PHOTO OF THE MONTH',
    description: 'The premier showdown among September top-rated photos. Champion crowned.',
    rules: 'Invitational for weekly battle winners.\nSingle-elimination playoff bracket.\nTransparent percentages visible after voting.',
    prize: '$5,000 + Trophy',
    quickRules: [
      'Invitational for weekly battle winners',
      'Single-elimination playoff bracket',
      'Transparent percentages visible after voting',
    ],
    rulesSections: [
      { title: 'Format', body: 'Superfinal showcase among the highest rated creators of the month.' },
      { title: 'Outcome', body: 'The champion was awarded the $5,000 Grand Prize.' },
    ],
    type: 'standard',
    status: 'completed',
    visibility: 'public',
    feed_listing_status: 'approved',
    category_id: 'cat-creative',
    cover_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&q=80',
    max_participants: 16,
    group_size: 4,
    registration_start: '2026-09-01T00:00:00.000Z',
    registration_end: '2026-09-15T00:00:00.000Z',
    voting_start: '2026-09-16T06:00:00.000Z',
    voting_end: '2026-09-30T06:00:00.000Z',
    created_by: 'usr-admin-01',
    is_featured: false,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-30T06:00:00.000Z',
    categories: { name: 'Art & Concept', slug: 'creative', icon_url: null },
  },
  {
    id: 'contest-design-ideas',
    title: 'DESIGN OF IDEAS',
    description: 'Conceptual 3D design, architecture, and structural aesthetics competition. Apply now.',
    rules: 'Original 3D concept or architectural vision.\nCrisp high-definition renders and a concise brief.\nMaximum 1 submission per creator.',
    prize: '$2,000 + Spotlight',
    quickRules: [
      'Original 3D concept or architectural vision',
      'Crisp high-definition renders and a concise brief',
      'Maximum 1 submission per creator',
      'Full intellectual property rights must belong to the applicant',
    ],
    rulesSections: [
      { title: 'Eligibility', body: '3D artists, industrial designers, and architects worldwide.' },
      { title: 'Prize', body: '$2,000 innovation grant towards concept prototyping.' },
    ],
    type: 'standard',
    status: 'registration',
    visibility: 'public',
    feed_listing_status: 'approved',
    category_id: 'cat-architecture',
    cover_url: '/img/contests/design_ideas.jpg',
    max_participants: 96,
    group_size: 4,
    registration_start: '2026-09-26T00:00:00.000Z',
    registration_end: '2026-12-20T00:00:00.000Z',
    voting_start: '2026-12-21T06:00:00.000Z',
    voting_end: null,
    created_by: 'usr-admin-01',
    is_featured: true,
    created_at: '2026-09-26T00:00:00.000Z',
    updated_at: '2026-09-26T00:00:00.000Z',
    categories: { name: 'Architecture', slug: 'architecture', icon_url: null },
  },
  {
    id: 'contest-nature-stars',
    title: 'MAJESTIC NATURE',
    description: 'Misty peaks, untamed forests, and raw natural elements captured by adventurous travelers.',
    rules: 'Wild nature without heavy human alteration.\nAuthentic travel captures only.\nTournament groups of 4 entries.',
    prize: '$1,800 + Gear',
    quickRules: [
      'Wild nature without heavy human alteration',
      'Authentic travel captures only',
      'Tournament groups of 4 entries',
    ],
    rulesSections: [
      { title: 'Themes', body: 'Mountains, forests, rivers, dawns, and twilight horizons.' },
    ],
    type: 'eternal',
    status: 'active',
    visibility: 'public',
    feed_listing_status: 'approved',
    category_id: 'cat-nature',
    cover_url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1080&q=80',
    max_participants: 64,
    group_size: 4,
    registration_start: '2026-09-15T00:00:00.000Z',
    registration_end: '2026-09-25T00:00:00.000Z',
    voting_start: '2026-09-26T06:00:00.000Z',
    voting_end: null,
    created_by: 'usr-admin-01',
    is_featured: true,
    created_at: '2026-09-15T00:00:00.000Z',
    updated_at: '2026-09-26T06:00:00.000Z',
    categories: { name: 'Landscape', slug: 'nature', icon_url: null },
  },
  {
    id: 'contest-neon-shinjuku',
    title: 'NEON TOKYO',
    description: 'Rain-slicked night streets, vibrant neon signage, and cyberpunk reflections.',
    rules: 'Night metropolis and high-contrast ambient glow.\nDirect 1v1 battle voting.\nLive vote percentages unveiled immediately upon voting.',
    prize: '$1,000 + Merch',
    quickRules: [
      'Night metropolis and high-contrast ambient glow',
      'Direct 1v1 battle voting',
      'Live vote percentages unveiled immediately upon voting',
    ],
    rulesSections: [
      { title: 'Format', body: 'Live head-to-head duel. Vote to reveal real-time split percentages.' },
    ],
    type: 'battle',
    status: 'active',
    visibility: 'public',
    feed_listing_status: 'approved',
    category_id: 'cat-street',
    cover_url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1080&q=80',
    max_participants: 2,
    group_size: 2,
    registration_start: null,
    registration_end: null,
    voting_start: '2026-09-26T06:00:00.000Z',
    voting_end: null,
    created_by: 'usr-admin-01',
    is_featured: true,
    created_at: '2026-09-20T00:00:00.000Z',
    updated_at: '2026-09-26T06:00:00.000Z',
    categories: { name: 'Street & Sports', slug: 'street', icon_url: null },
  },
  {
    id: 'contest-battle-01',
    title: 'MANHATTAN SUNSET VS NEON SHINJUKU',
    description: 'Head-to-head urban photography battle between twilight silhouettes and neon rain.',
    rules: '1v1 live duel.\nOne vote per user.\nTrust-weighted live percentage split.',
    prize: '$800 Spotlight',
    quickRules: ['1v1 live duel', 'One vote per user', 'Trust-weighted live split'],
    rulesSections: [],
    type: 'battle',
    status: 'active',
    visibility: 'public',
    feed_listing_status: 'approved',
    category_id: 'cat-street',
    cover_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1080&q=80',
    max_participants: 2,
    group_size: 2,
    registration_start: null,
    registration_end: null,
    voting_start: '2026-09-22T06:00:00.000Z',
    voting_end: null,
    created_by: 'usr-admin-01',
    is_featured: true,
    created_at: '2026-09-22T00:00:00.000Z',
    updated_at: '2026-09-22T06:00:00.000Z',
    categories: { name: 'Street & Sports', slug: 'street', icon_url: null },
  },
  {
    id: 'contest-stars',
    title: 'ALL-STARS SHOWDOWN',
    description: 'Iconic visual showdowns curated by Opinion Net community editors.',
    rules: 'Top community works compete in a continuous sprint.\nOne vote per user.',
    prize: '$3,000 + Trophy',
    quickRules: ['Live race sprint', 'One vote per user'],
    rulesSections: [],
    type: 'race',
    status: 'active',
    visibility: 'public',
    feed_listing_status: 'approved',
    category_id: 'cat-creative',
    cover_url: '/img/contests/tennis_balls.jpg',
    max_participants: 16,
    group_size: 4,
    registration_start: null,
    registration_end: null,
    voting_start: '2026-09-18T06:00:00.000Z',
    voting_end: null,
    created_by: 'usr-admin-01',
    is_featured: false,
    created_at: '2026-09-18T00:00:00.000Z',
    updated_at: '2026-09-18T06:00:00.000Z',
    categories: { name: 'Art & Concept', slug: 'creative', icon_url: null },
  },
];

export const SEED_PARTICIPANTS: Participant[] = [
  {
    id: 'part-neon-01',
    contest_id: 'contest-neon-shinjuku',
    user_id: 'usr-entrant-01',
    submission_data: {
      name: 'Shinjuku in Rain',
      photos: [
        'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&q=85',
        'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&q=85',
      ],
      description: 'Wet neon pavement reflections, umbrellas, and cyber alleyways in Tokyo.',
      votes: 116,
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-09-21T10:00:00.000Z',
    profiles: {
      username: 'photographer',
      display_name: 'Dmitry Sokolov',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    },
  },
  {
    id: 'part-neon-02',
    contest_id: 'contest-neon-shinjuku',
    user_id: 'usr-user-01',
    submission_data: {
      name: 'Neon Crossing',
      photos: [
        'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=85',
        'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1200&q=85',
      ],
      description: 'Urban night color study through customized vintage prism filters.',
      votes: 84,
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-09-21T11:00:00.000Z',
    profiles: {
      username: 'marina_art',
      display_name: 'Marina Romanova',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
    },
  },
  {
    id: 'part-glam-01',
    contest_id: 'contest-glamour',
    user_id: 'usr-user-01',
    submission_data: {
      name: 'Flash in the Dark',
      photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&q=85'],
      description: 'Studio portrait with hard specular flash and editorial styling.',
      votes: 106,
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-09-21T12:00:00.000Z',
    profiles: {
      username: 'marina_art',
      display_name: 'Marina Romanova',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
    },
  },
  {
    id: 'part-glam-02',
    contest_id: 'contest-glamour',
    user_id: 'usr-mod-01',
    submission_data: {
      name: 'Silk Glance',
      photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&q=85'],
      description: 'Natural beauty lighting with silk fabrics and warm highlights.',
      votes: 94,
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-09-21T13:00:00.000Z',
    profiles: {
      username: 'elenalens',
      display_name: 'Elena Lens',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    },
  },
  {
    id: 'part-nature-01',
    contest_id: 'contest-nature-stars',
    user_id: 'usr-entrant-01',
    submission_data: {
      name: 'Alps Peak Mist',
      photos: ['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=85'],
      description: 'Morning mist layers drifting across Dolomites and Swiss peaks.',
      votes: 102,
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-09-22T09:00:00.000Z',
    profiles: {
      username: 'photographer',
      display_name: 'Dmitry Sokolov',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    },
  },
  {
    id: 'part-nature-02',
    contest_id: 'contest-nature-stars',
    user_id: 'usr-mod-01',
    submission_data: {
      name: 'Sunset Fjord',
      photos: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=85'],
      description: 'Coastal waterways and calm glacial mirrors at dusk.',
      votes: 98,
    },
    status: 'approved',
    admin_note: null,
    submitted_at: '2026-09-22T10:00:00.000Z',
    profiles: {
      username: 'elenalens',
      display_name: 'Elena Lens',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    },
  },
];

let seedingAttempted = false;

/**
 * Seeds categories, starter contests, and starter participants into Firestore
 * if the contests collection is currently empty (runs only for signed-in admin).
 */
export async function ensureSeedDataInFirestore(): Promise<void> {
  if (seedingAttempted) return;
  seedingAttempted = true;

  try {
    const existingSnap = await getDocs(query(collection(db, 'contests'), limit(1)));
    if (!existingSnap.empty) return;

    for (const cat of SEED_CATEGORIES) {
      await setDoc(doc(db, 'categories', cat.id), {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon_url: cat.icon_url,
        sort_order: cat.sort_order,
      });
    }

    for (const c of SEED_CONTESTS) {
      await setDoc(doc(db, 'contests', c.id), {
        id: c.id,
        title: c.title,
        description: c.description ?? null,
        rules: c.rules ?? null,
        prize: c.prize ?? null,
        quickRules: c.quickRules ?? null,
        rulesSections: c.rulesSections ?? null,
        type: c.type,
        status: c.status,
        visibility: c.visibility ?? 'public',
        feed_listing_status: c.feed_listing_status ?? 'approved',
        category_id: c.category_id ?? null,
        cover_url: c.cover_url ?? null,
        max_participants: c.max_participants ?? null,
        group_size: c.group_size ?? 4,
        registration_start: c.registration_start ?? null,
        registration_end: c.registration_end ?? null,
        voting_start: c.voting_start ?? null,
        voting_end: c.voting_end ?? null,
        created_by: c.created_by,
        is_featured: c.is_featured,
        created_at: c.created_at,
        updated_at: c.updated_at,
      });
    }

    for (const p of SEED_PARTICIPANTS) {
      await setDoc(doc(db, 'participants', p.id), {
        id: p.id,
        contest_id: p.contest_id,
        user_id: p.user_id,
        submission_data: p.submission_data,
        status: p.status,
        admin_note: p.admin_note ?? null,
        submitted_at: p.submitted_at,
      });
    }
  } catch (err) {
    console.warn('Seed data check skipped or deferred:', err);
  }
}

export { handleFirestoreError, OperationType };
