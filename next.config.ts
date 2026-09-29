import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Generated images are served from Vercel Blob; next/image rejects remote
    // hosts that are not listed here.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
