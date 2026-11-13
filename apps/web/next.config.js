/* global process */
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // The Express server in apps/server is the only backend. Proxying /api
  // through Next keeps the auth cookie same-origin. On Vercel, vercel.json
  // routes /api to the server service before it reaches Next, so this
  // rewrite only applies to `npm run dev` and other self-hosted setups.
  async rewrites() {
    if (process.env.VERCEL) return [];
    const apiUrl = process.env.API_URL || 'http://localhost:5001';
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
