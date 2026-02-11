/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Product images come from any supplier domain — skip built-in optimization.
    // A dedicated image proxy/CDN can be added in Phase 2.
    unoptimized: true,
  },
};

module.exports = nextConfig;
