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
  /*
   * Force sharp's native libraries into the serverless bundle.
   *
   * On 2026-08-28 every route on production returned 500 for about 16 hours with:
   *
   *   Could not load the "sharp" module using the linux-x64 runtime
   *   ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3: cannot open shared object file
   *
   * Read that error carefully, because it says which half is missing. dlopen was
   * ATTEMPTED, so @img/sharp-linux-x64/lib/sharp-linux-x64-0.35.3.node was present
   * and got loaded. What could not be resolved was its sibling
   * @img/sharp-libvips-linux-x64/lib/libvips-cpp.so.8.18.3.
   *
   * That asymmetry is the whole story. The .node file is reached through a normal
   * require in sharp's loader, so Next's file tracer follows it. The .so is never
   * required by any JavaScript: the OS dynamic linker resolves it while loading the
   * .node, long after static analysis is over. A tracer cannot see that edge, so
   * whether the .so ships is down to heuristics, and Vercel's build CLI changed
   * those between 58.1.0 (working) and 59.3.0 (broken). package-lock.json was byte
   * identical across both builds.
   *
   * So the dependency is stated explicitly here rather than left to inference.
   * The whole package directory is included, not just the .so, because it also
   * carries glib-2.0 which libvips loads the same invisible way.
   *
   * Only linux-x64 is listed, which is the runtime the error names and what Vercel
   * serves. If the deploy target ever moves to arm64 or musl, add the matching
   * @img/sharp-libvips-linux-arm64 or -linuxmusl-x64 here or this returns.
   */
  outputFileTracingIncludes: {
    '/**': [
      './node_modules/@img/sharp-libvips-linux-x64/**',
      './node_modules/@img/sharp-linux-x64/**',
    ],
  },
}

// withPayload resolves the `@payload-config` alias to src/payload.config.ts and
// transpiles Payload's server packages for the Next build.
export default withPayload(nextConfig, { devBundleServerPackages: false })
