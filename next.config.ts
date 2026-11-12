import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['stanleys-macbook-pro.local'],
  // Import Document reads PDFs with pdf-parse (pdfjs-dist), which loads its
  // worker file from its own package folder; bundled, it can't find it and
  // every PDF fails with "Failed to read text from this file".
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', '@napi-rs/canvas'],
  // Local development database (docs/local-dev-database-plan.md): the iPad and
  // iPhone can't reach Supabase on the Mac's 127.0.0.1, and an https page may
  // not call http, so in development Supabase traffic goes through this server
  // under /sb. Production builds have no rewrite.
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return [];
    return [{ source: '/sb/:path*', destination: 'http://127.0.0.1:54321/:path*' }];
  },
};

export default nextConfig;
