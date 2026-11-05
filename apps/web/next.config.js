/* global process */
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // The Express server in apps/server is the only backend. Proxying /api
  // through Next keeps the auth cookie same-origin.
  async rewrites() {
    const apiUrl = process.env.API_URL || 'http://localhost:5001';
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
