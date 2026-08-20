const PRODUCTION_API_URL = 'https://canchaappnueva-0dkn.onrender.com';

function normalizeApiUrl(value) {
  const fallback = process.env.NODE_ENV === 'production'
    ? PRODUCTION_API_URL
    : 'http://localhost:8000';
  let raw = (value || '').trim();

  const markdownTarget = raw.match(/\]\((https?:\/\/[^)\s]+)\)/i);
  if (markdownTarget) {
    raw = markdownTarget[1];
  } else {
    const embeddedUrl = raw.match(/https?:\/\/[^\s\])"']+/i);
    if (embeddedUrl) raw = embeddedUrl[0];
  }

  raw = raw.replace(/^['"]|['"]$/g, '').replace(/\/+$/, '');
  if (raw && !/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  try {
    const parsed = new URL(raw || fallback);
    if (!['http:', 'https:'].includes(parsed.protocol)) return fallback;
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: 'http', hostname: 'localhost' }] },
  async rewrites() {
    const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);
    return [
      {
        source: '/uploads/:path*',
        destination: `${apiUrl}/uploads/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
