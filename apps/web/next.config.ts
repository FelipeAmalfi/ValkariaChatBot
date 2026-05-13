import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@valkaria/shared'],
  experimental: {
    typedRoutes: true,
  },
}

export default nextConfig
