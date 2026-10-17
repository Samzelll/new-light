/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable Next.js image optimisation with allowed remote domains.
  // All photos from Supabase Storage and Unsplash CDN will be served
  // through Next.js's built-in resizing pipeline (WebP/AVIF, lazy-loaded,
  // right-sized per breakpoint) — the user never downloads the full original.
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24, // 24h CDN cache for optimised images
    deviceSizes: [390, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [32, 48, 64, 96, 128, 160, 192, 256, 384],
    remotePatterns: [
      // Supabase Storage (replace project ref with your own if needed)
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Unsplash CDN (used in seed/mock data)
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      // Plus.unsplash
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
    ],
  },

  // Compiler options for smaller production bundles
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
};

module.exports = nextConfig;
