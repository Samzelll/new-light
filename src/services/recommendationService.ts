/**
 * Recommendation & Infinite Preloading Service for TikTok-style Feeds
 * 
 * Provides progressive batch loading, proactive image preloading,
 * and endless recommendations for 1v1 Battles and 4-way Group Contests.
 */

import { BattleItem } from '@/components/contest/TikTokBattleView';
import type { Group } from '@/services/types';

// Curated pool of dynamic battles to expand the infinite stream with full author and sponsor data
const SAMPLE_EXPANSION_BATTLES: BattleItem[] = [
  {
    id: 'battle-rec-01',
    contestId: 'contest-street-bw',
    title: 'STREET B&W · Contrast Duel',
    category: 'Monochrome & Noir',
    tags: ['Photography', 'Art'],
    timeRemaining: '14h left',
    isPopular: true,
    sponsorName: 'Leica Masters & Urban Street Guild',
    red: {
      id: 'red-rec-01',
      name: 'Shadows on Asphalt',
      author: '@shadow_seeker',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      authorBio: 'Tokyo street photographer focusing on high-contrast silhouetted figures and rainy pavements. Shot on 35mm f/1.4 prime lens.',
      photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900&q=80',
      percent: 54,
      sponsorName: 'Leica Masters & Urban Street Guild',
      sponsorTier: 'Premier Diamond Partner',
      prizePool: '$5,000 Cash Grant + Exhibition in Berlin',
      socialLinks: {
        instagram: 'https://instagram.com/shadow_seeker',
        telegram: 'https://t.me/shadow_seeker',
        twitter: 'https://x.com/shadow_seeker',
        portfolio: 'https://shadowseeker.photo',
      },
    },
    green: {
      id: 'green-rec-01',
      name: 'Subway Light Ray',
      author: '@metro_noir',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
      authorBio: 'Underground transit light explorer. Capturing beam reflections through dust and tile mosaics in metropolitan subways.',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80',
      percent: 46,
      sponsorName: 'Leica Masters & Urban Street Guild',
      sponsorTier: 'Premier Diamond Partner',
      prizePool: '$5,000 Cash Grant + Exhibition in Berlin',
      socialLinks: {
        instagram: 'https://instagram.com/metro_noir',
        telegram: 'https://t.me/metro_noir',
        twitter: 'https://x.com/metro_noir',
        portfolio: 'https://metronoir.art',
      },
    },
  },
  {
    id: 'battle-rec-02',
    contestId: 'contest-nature-stars',
    title: 'WILD HORIZON · Mountain Duel',
    category: 'Landscape & Nature',
    tags: ['Photography', 'Creative'],
    timeRemaining: '6h left',
    isPopular: true,
    sponsorName: 'National Geographic Visual Fund',
    red: {
      id: 'red-rec-02',
      name: 'Misty Alpine Ridge',
      author: '@peak_walker',
      authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
      authorBio: 'Alpinist and high-altitude visual creator. Documenting glacier melt and twilight ridge lines above 3,000 meters.',
      photo: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=80',
      percent: 62,
      sponsorName: 'National Geographic Visual Fund',
      sponsorTier: 'Official Title Sponsor',
      prizePool: '$10,000 Expedition Grant',
      socialLinks: {
        instagram: 'https://instagram.com/peak_walker',
        telegram: 'https://t.me/peak_walker',
        twitter: 'https://x.com/peak_walker',
        portfolio: 'https://peakwalker.earth',
      },
    },
    green: {
      id: 'green-rec-02',
      name: 'Emerald Valley Mist',
      author: '@nordic_lens',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
      authorBio: 'Fjord and Nordic forest photographer. Specializing in long exposure morning fog and emerald moss ecosystems.',
      photo: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=900&q=80',
      percent: 38,
      sponsorName: 'National Geographic Visual Fund',
      sponsorTier: 'Official Title Sponsor',
      prizePool: '$10,000 Expedition Grant',
      socialLinks: {
        instagram: 'https://instagram.com/nordic_lens',
        telegram: 'https://t.me/nordic_lens',
        twitter: 'https://x.com/nordic_lens',
        portfolio: 'https://nordiclense.com',
      },
    },
  },
  {
    id: 'battle-rec-03',
    contestId: 'contest-design-ideas',
    title: 'FUTURISM · Isometric Duel',
    category: '3D & Concept Art',
    tags: ['Design', 'Art'],
    timeRemaining: '20h left',
    isPopular: false,
    sponsorName: 'Houdini & Octane Render Labs',
    red: {
      id: 'red-rec-03',
      name: 'Cybernetic Cube',
      author: '@mesh_artisan',
      authorAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200',
      authorBio: 'Procedural hard-surface artist working on neon geometry, mathematical fractals, and raytraced reflections.',
      photo: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900&q=80',
      percent: 48,
      sponsorName: 'Houdini & Octane Render Labs',
      sponsorTier: 'Innovator Sponsor',
      prizePool: '$4,000 Creative Software Bundle',
      socialLinks: {
        instagram: 'https://instagram.com/mesh_artisan',
        telegram: 'https://t.me/mesh_artisan',
        twitter: 'https://x.com/mesh_artisan',
        portfolio: 'https://meshartisan.xyz',
      },
    },
    green: {
      id: 'green-rec-03',
      name: 'Abstract Fluid Core',
      author: '@render_flow',
      authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      authorBio: 'Fluid dynamics specialist and digital sculptor creating hyper-gloss chrome and iridescent viscosities.',
      photo: 'https://images.unsplash.com/photo-1515260268569-9271009adfdb?w=900&q=80',
      percent: 52,
      sponsorName: 'Houdini & Octane Render Labs',
      sponsorTier: 'Innovator Sponsor',
      prizePool: '$4,000 Creative Software Bundle',
      socialLinks: {
        instagram: 'https://instagram.com/render_flow',
        telegram: 'https://t.me/render_flow',
        twitter: 'https://x.com/render_flow',
        portfolio: 'https://renderflow.studio',
      },
    },
  },
  {
    id: 'battle-rec-04',
    contestId: 'contest-tennis-apply',
    title: 'COURT GLORY · Action Shot',
    category: 'Sports & Motion',
    tags: ['Sports'],
    timeRemaining: '11h left',
    isPopular: true,
    sponsorName: 'Nike Action Sports & Sony Alpha',
    red: {
      id: 'red-rec-04',
      name: 'Power Smash',
      author: '@speed_capture',
      authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200',
      authorBio: 'High-speed sports photographer capturing 1/8000s shutter action at Grand Slam and clay court tourneys.',
      photo: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=900&q=80',
      percent: 57,
      sponsorName: 'Nike Action Sports & Sony Alpha',
      sponsorTier: 'Official Grand Slam Partner',
      prizePool: '$7,500 Gear Grant + VIP Media Pass',
      socialLinks: {
        instagram: 'https://instagram.com/speed_capture',
        telegram: 'https://t.me/speed_capture',
        twitter: 'https://x.com/speed_capture',
        portfolio: 'https://speedcapture.pro',
      },
    },
    green: {
      id: 'green-rec-04',
      name: 'Backhand Spin',
      author: '@tennis_pro',
      authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
      authorBio: 'Editorial sports documentarian focusing on athlete determination, dust clouds, and dynamic courtside kinetics.',
      photo: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=900&q=80',
      percent: 43,
      sponsorName: 'Nike Action Sports & Sony Alpha',
      sponsorTier: 'Official Grand Slam Partner',
      prizePool: '$7,500 Gear Grant + VIP Media Pass',
      socialLinks: {
        instagram: 'https://instagram.com/tennis_pro',
        telegram: 'https://t.me/tennis_pro',
        twitter: 'https://x.com/tennis_pro',
        portfolio: 'https://tennisprophotos.com',
      },
    },
  },
];

// Preload helper to ensure zero flash/delay when navigating
export function preloadImages(urls: (string | undefined)[]) {
  if (typeof window === 'undefined') return;
  urls.forEach((url) => {
    if (!url) return;
    try {
      const img = new window.Image();
      img.src = url;
    } catch (e) {
      // Ignored
    }
  });
}

/**
 * Preload upcoming items in a battle list
 */
export function preloadBattleImages(battles: BattleItem[], currentIndex: number) {
  if (!battles.length || typeof window === 'undefined') return;
  const indices = [
    (currentIndex + 1) % battles.length,
    (currentIndex + 2) % battles.length,
    (currentIndex - 1 + battles.length) % battles.length,
  ];
  const urls: string[] = [];
  indices.forEach((idx) => {
    const b = battles[idx];
    if (b) {
      if (b.red?.photo) urls.push(b.red.photo);
      if (b.green?.photo) urls.push(b.green.photo);
    }
  });
  preloadImages(urls);
}

/**
 * Preload upcoming items in a group list
 */
export function preloadGroupImages(groups: Group[], currentIndex: number) {
  if (!groups.length || typeof window === 'undefined') return;
  const indices = [
    (currentIndex + 1) % groups.length,
    (currentIndex + 2) % groups.length,
    (currentIndex - 1 + groups.length) % groups.length,
  ];
  const urls: string[] = [];
  indices.forEach((idx) => {
    const g = groups[idx];
    if (g?.members) {
      g.members.forEach((m) => {
        if (m.photo) urls.push(m.photo);
      });
    }
  });
  preloadImages(urls);
}

/**
 * Generates an extended batch of recommended battles to simulate infinite Reels/TikTok feed
 */
export function getMoreRecommendedBattles(existingCount: number): BattleItem[] {
  const batchNumber = Math.floor(existingCount / SAMPLE_EXPANSION_BATTLES.length) + 1;
  return SAMPLE_EXPANSION_BATTLES.map((b, idx) => ({
    ...b,
    id: `${b.id}-v${batchNumber}-${idx}`,
    title: `${b.title} #${batchNumber}`,
  }));
}
