const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // Never let the service worker cache API routes — stale/failed responses
  // would be served from cache silently, suppressing real network requests.
  runtimeCaching: [
    {
      urlPattern: /^\/api\//,
      handler: 'NetworkOnly',
    },
    ...require('next-pwa/cache'),
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nceodlvyacukpcplztca.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

module.exports = withPWA(nextConfig);
