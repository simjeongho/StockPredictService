import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App Router 활성화 (Next.js 14 기본값)
  experimental: {},
  // 백엔드 API 프록시 (개발 환경)
  async rewrites() {
    return [];
  },
};

export default nextConfig;
