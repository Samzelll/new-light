import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Dynamic OG Image for contest sharing.
 * Route: /api/og/[contestId]
 *
 * Returns an SVG-based PNG-like image (HTML rendered as image via Content-Type).
 * For production: replace with @vercel/og for true PNG rendering.
 *
 * Usage in <head>:
 *   <meta property="og:image" content={`/api/og/${contest.id}`} />
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const TYPE_COLORS: Record<string, { main: string; label: string }> = {
  battle:   { main: '#ff5757', label: 'BATTLE' },
  race:     { main: '#ffc857', label: 'RACE' },
  eternal:  { main: '#a855f7', label: 'ETERNAL' },
  standard: { main: '#3861ff', label: 'CONTEST' },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { contestId: string } }
) {
  const { contestId } = params;

  let title = 'Live Contest';
  let description = 'Vote now on Opinion Net';
  let type = 'standard';
  let status = 'active';

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
    const { data } = await supabase
      .from('contests')
      .select('title, description, type, status')
      .eq('id', contestId)
      .single();

    if (data) {
      title = data.title || title;
      description = data.description || description;
      type = data.type || type;
      status = data.status || status;
    }
  } catch {
    // Fallback to defaults
  }

  const tc = TYPE_COLORS[type] || TYPE_COLORS.standard;
  const isLive = status === 'active';

  // Truncate long strings for display
  const displayTitle = title.length > 55 ? title.slice(0, 55) + '…' : title;
  const displayDesc = description.length > 100 ? description.slice(0, 100) + '…' : description;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0b0d12"/>
      <stop offset="100%" style="stop-color:#10131a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${tc.main};stop-opacity:0.6"/>
      <stop offset="100%" style="stop-color:${tc.main};stop-opacity:0"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${tc.main};stop-opacity:0.15"/>
      <stop offset="100%" style="stop-color:${tc.main};stop-opacity:0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  
  <!-- Top glow overlay -->
  <rect width="1200" height="300" fill="url(#glow)"/>
  
  <!-- Left accent bar -->
  <rect x="0" y="0" width="1200" height="4" fill="url(#accent)"/>
  
  <!-- Type badge background -->
  <rect x="60" y="60" width="${tc.label.length * 11 + 40}" height="36" rx="8" fill="${tc.main}22" stroke="${tc.main}55" stroke-width="1"/>
  
  <!-- Type badge text -->
  <text x="80" y="84" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800" letter-spacing="2" fill="${tc.main}">${tc.label}</text>
  
  ${isLive ? `
  <!-- Live indicator -->
  <circle cx="${tc.label.length * 11 + 120}" cy="78" r="5" fill="#ff5757"/>
  <text x="${tc.label.length * 11 + 132}" y="83" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#ff5757">LIVE</text>
  ` : ''}

  <!-- Main title -->
  <text x="60" y="200" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="900" fill="white" style="dominant-baseline:auto">
    ${displayTitle}
  </text>
  
  <!-- Description -->
  <text x="60" y="270" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="400" fill="#6b7280">
    ${displayDesc.length > 65 ? displayDesc.slice(0, 65) + '…' : displayDesc}
  </text>
  ${displayDesc.length > 65 ? `
  <text x="60" y="305" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="400" fill="#6b7280">
    ${displayDesc.slice(65, 130)}
  </text>` : ''}

  <!-- Bottom divider -->
  <line x1="60" y1="530" x2="1140" y2="530" stroke="#1e2535" stroke-width="1"/>
  
  <!-- CTA text -->
  <text x="60" y="578" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="600" fill="#374151">Cast your vote →</text>
  
  <!-- Brand -->
  <text x="1140" y="578" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="${tc.main}">Opinion Net</text>
  
  <!-- Decorative right circle -->
  <circle cx="1050" cy="280" r="180" fill="${tc.main}" fill-opacity="0.04"/>
  <circle cx="1050" cy="280" r="120" fill="${tc.main}" fill-opacity="0.06"/>
  <text x="1050" y="310" text-anchor="middle" font-size="100">⚡</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
