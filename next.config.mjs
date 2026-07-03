import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Serve modern formats first (AVIF then WebP) for faster mobile loads / Core Web Vitals.
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Supabase Storage (public bucket: profile photos, page images), ca-central-1.
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
    ],
  },
}

// withPayload resolves the `@payload-config` alias to src/payload.config.ts and
// transpiles Payload's server packages for the Next build.
export default withPayload(nextConfig, { devBundleServerPackages: false })
