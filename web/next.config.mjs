/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { externalDir: true },
  transpilePackages: ['recharts'],
  async rewrites() {
    return [
      { source: '/api/digest/:path*', destination: 'http://localhost:4000/api/digest/:path*' },
      { source: '/api/ai/:path*',     destination: 'http://localhost:4000/api/ai/:path*' }, // add this
    ];
  },
};
export default nextConfig;