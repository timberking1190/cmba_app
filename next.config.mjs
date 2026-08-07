import { withPayload } from '@payloadcms/next/withPayload'
import bundleAnalyzer from '@next/bundle-analyzer'

// Bundle analysis is opt-in so normal builds and Vercel deploys are unaffected.
// Run `ANALYZE=true npm run build` to emit the treemaps under .next/analyze/.
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // There is an unrelated package-lock.json in the home directory, which makes
  // Next 16 infer the wrong workspace root and warn on every build. Pin it.
  turbopack: { root: import.meta.dirname },
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
export default withBundleAnalyzer(withPayload(nextConfig, { devBundleServerPackages: false }))
