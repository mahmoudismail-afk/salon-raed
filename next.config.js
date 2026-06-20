/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  output: 'standalone',
  // Exclude source maps and type declarations so esbuild doesn't fail
  // when bundling for Cloudflare Workers (opennextjs-cloudflare).
  outputFileTracingExcludes: {
    '*': ['./**/*.js.map', './**/*.d.ts'],
  },
  // Redirect root to /dashboard at the config level (avoids the page manifest issue)
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
