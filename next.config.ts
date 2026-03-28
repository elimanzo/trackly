import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // React Strict Mode's intentional double-mount causes Web Locks API
  // deadlocks with Supabase auth (documented incompatibility). All our
  // useEffect hooks already clean up correctly so strict mode adds no value.
  reactStrictMode: false,
  allowedDevOrigins: ['127.0.0.1'],
}

export default nextConfig
