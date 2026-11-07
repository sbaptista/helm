import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['stanleys-macbook-pro.local'],
  // Import Document reads PDFs with pdf-parse (pdfjs-dist), which loads its
  // worker file from its own package folder; bundled, it can't find it and
  // every PDF fails with "Failed to read text from this file".
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', '@napi-rs/canvas'],
};

export default nextConfig;
