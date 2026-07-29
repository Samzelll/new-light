/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable image optimisation if unoptimized images are needed
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
