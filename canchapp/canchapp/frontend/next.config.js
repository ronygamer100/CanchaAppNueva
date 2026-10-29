/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1'],
  images: { remotePatterns: [{ protocol: 'http', hostname: 'localhost' }] },
  async rewrites() {
    const apiUrl = (process.env.INTERNAL_API_URL || 'http://api:8000').replace(/\/+$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${apiUrl}/uploads/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
