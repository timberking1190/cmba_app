import { withPayload } from '@payloadcms/next/withPayload'

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
  /*
   * /schedule is the canonical schedule URL. It used to be an alias that
   * re-exported /calendar, so the same page answered on two URLs while every nav
   * item on the site was labelled SCHEDULE and pointed at /calendar. That is a
   * split signal for search engines and a small lie to anyone reading the address
   * bar. A permanent redirect keeps old links, bookmarks, and the offline cache
   * working.
   */
  async redirects() {
    return [{ source: '/calendar', destination: '/schedule', permanent: true }]
  },
}

// withPayload resolves the `@payload-config` alias to src/payload.config.ts and
// transpiles Payload's server packages for the Next build.
export default withPayload(nextConfig, { devBundleServerPackages: false })
