/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${process.env.BACKEND_URL || 'http://api:3001'}/uploads/:path*`,
      },
    ];
  },
};
export default nextConfig;
