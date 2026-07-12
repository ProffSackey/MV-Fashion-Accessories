import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel is currently rejecting optimized image requests with
  // OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED. Serve the original assets
  // directly so images remain available without the optimization service.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
