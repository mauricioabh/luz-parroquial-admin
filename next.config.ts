import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Turbopack is the default bundler in Next.js 16.
  turbopack: {},
  // Exclude pdfkit/fontkit from server bundle — they use native Node.js
  // modules that Turbopack can't resolve at build time.
  serverExternalPackages: ['pdfkit', 'fontkit', '@pdf-lib/fontkit'],
};

export default nextConfig;
