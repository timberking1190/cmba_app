import path from 'path'
import { fileURLToPath } from 'url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Announcements } from './collections/Announcements'
import { AuditLog } from './collections/AuditLog'
import { Availability } from './collections/Availability'
import { BracketSeries } from './collections/BracketSeries'
import { CertificateFiles } from './collections/CertificateFiles'
import { CertificationTypes } from './collections/CertificationTypes'
import { Certifications } from './collections/Certifications'
import { Clubs } from './collections/Clubs'
import { Confirmations } from './collections/Confirmations'
import { ConsentRecords } from './collections/ConsentRecords'
import { Courses } from './collections/Courses'
import { Courts } from './collections/Courts'
import { Disputes } from './collections/Disputes'
import { Divisions } from './collections/Divisions'
import { EmailOtp } from './collections/EmailOtp'
import { GameIncidents } from './collections/GameIncidents'
import { GameOfficials } from './collections/GameOfficials'
import { GameReports } from './collections/GameReports'
import { Games } from './collections/Games'
import { IdempotencyKeys } from './collections/IdempotencyKeys'
import { ImportBatches } from './collections/ImportBatches'
import { IncidentFiles } from './collections/IncidentFiles'
import { IncidentLog } from './collections/IncidentLog'
import { Officials } from './collections/Officials'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Pathways } from './collections/Pathways'
import { PlayerStats } from './collections/PlayerStats'
import { PlayoffBrackets } from './collections/PlayoffBrackets'
import { RateLimitHits } from './collections/RateLimitHits'
import { RefreshTokens } from './collections/RefreshTokens'
import { Sanctions } from './collections/Sanctions'
import { ScoreReports } from './collections/ScoreReports'
import { ScoresheetFiles } from './collections/ScoresheetFiles'
import { Seasons } from './collections/Seasons'
import { StandingsCache } from './collections/StandingsCache'
import { TeamMemberships } from './collections/TeamMemberships'
import { Teams } from './collections/Teams'
import { Users } from './collections/Users'
import { Venues } from './collections/Venues'
import { WebauthnCredentials } from './collections/WebauthnCredentials'
import { WebauthnChallenges } from './collections/WebauthnChallenges'
import { MfaTotp } from './collections/MfaTotp'
import { RecoveryCodes } from './collections/RecoveryCodes'
import { FooterNav } from './globals/FooterNav'
import { HeaderNav } from './globals/HeaderNav'
import { PolicyVersions } from './globals/PolicyVersions'
import { SiteSettings } from './globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const isProd = process.env.NODE_ENV === 'production'
// `next build` runs with NODE_ENV=production but no runtime secrets; allow the
// placeholder during the build phase, enforce a real secret at actual runtime.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

// In production a real PAYLOAD_SECRET MUST be set. We fall back to a clearly
// labelled dev placeholder ONLY so config/type-gen/build work before secrets are
// provisioned; the runtime guard below refuses to boot with it in production.
const DEV_SECRET = 'DEV_ONLY_INSECURE_SECRET_CHANGE_ME'
const secret = process.env.PAYLOAD_SECRET || DEV_SECRET
if (isProd && !isBuildPhase && secret === DEV_SECRET) {
  throw new Error(
    'PAYLOAD_SECRET is not set. Refusing to start in production without a real secret.',
  )
}

// Shared S3 client config — Supabase Storage (S3-compatible) in ca-central-1.
const s3ClientConfig = {
  region: process.env.S3_REGION || 'ca-central-1',
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true, // Supabase requires path-style addressing
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
}

const publicBucket = process.env.S3_BUCKET_PUBLIC || process.env.S3_BUCKET || ''
const privateBucket = process.env.S3_BUCKET_PRIVATE || ''

// Stage C / S0 — CORS + CSRF allowlist. Only the known web origin(s) may make
// credentialed browser requests; native apps authenticate with bearer tokens and
// are not subject to browser CORS. No wildcard with credentials.
const serverURL = process.env.NEXT_PUBLIC_SERVER_URL
const trustedOrigins = [
  serverURL,
  ...(isProd ? [] : ['http://localhost:3000']),
].filter((o): o is string => Boolean(o))

export default buildConfig({
  serverURL,
  secret,
  // Lock CORS to known origins (allow our custom + idempotency headers on
  // preflight); enable Payload's cookie CSRF check for the same origins.
  cors: {
    origins: trustedOrigins,
    headers: ['idempotency-key', 'x-cmba-hp', 'x-cmba-turnstile'],
  },
  csrf: trustedOrigins,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      // Stage C / S1 (I7): enforce MFA across the admin SPA (no-op until MFA_ENFORCE).
      providers: ['@/components/security/AdminMfaGate#AdminMfaGate'],
    },
    meta: {
      titleSuffix: '· CMBA Connect',
    },
  },
  collections: [
    Users,
    Clubs,
    CertificationTypes,
    Certifications,
    CertificateFiles,
    Courses,
    Pathways,
    ConsentRecords,
    IncidentLog,
    GameReports,
    Pages,
    Announcements,
    Media,
    // Competition (Stage B): scheduling, scores, standings, officials.
    Seasons,
    Divisions,
    Teams,
    Venues,
    Courts,
    TeamMemberships,
    Games,
    ScoreReports,
    ScoresheetFiles,
    Confirmations,
    Disputes,
    Officials,
    GameOfficials,
    PlayoffBrackets,
    BracketSeries,
    StandingsCache,
    ImportBatches,
    // Gap-analysis scaffolds (model only, feature-gated).
    Sanctions,
    Availability,
    PlayerStats,
    // Compliance + system records for Stage B.
    AuditLog,
    GameIncidents,
    IncidentFiles,
    IdempotencyKeys,
    RefreshTokens,
    RateLimitHits,
    // S1 — multi-factor authentication (secrets in private collections).
    WebauthnCredentials,
    WebauthnChallenges,
    MfaTotp,
    RecoveryCodes,
    EmailOtp,
  ],
  globals: [PolicyVersions, SiteSettings, HeaderNav, FooterNav],
  editor: lexicalEditor(),
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
    // Migrations are the single source of truth (no dev push) so the schema is
    // committable, deterministic, and verifiable. Run `npm run migrate:create`
    // after changing collections, then `npm run migrate`.
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  email: nodemailerAdapter({
    defaultFromAddress: process.env.EMAIL_FROM || 'no-reply@cmba.ab.ca',
    defaultFromName: 'CMBA Connect',
    // AWS SES (ca-central-1) over SMTP when configured. Without SES creds we use
    // nodemailer's jsonTransport (no network) so dev/build never hangs or sends.
    transportOptions: process.env.SES_SMTP_HOST
      ? {
          host: process.env.SES_SMTP_HOST,
          port: Number(process.env.SES_SMTP_PORT) || 587,
          secure: false,
          requireTLS: true,
          auth: {
            user: process.env.SES_SMTP_USER,
            pass: process.env.SES_SMTP_PASS,
          },
        }
      : { jsonTransport: true },
  }),
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  plugins: [
    // PUBLIC bucket: images served directly from Supabase's public URL.
    s3Storage({
      collections: {
        [Media.slug]: {
          disablePayloadAccessControl: true,
        },
      },
      bucket: publicBucket,
      config: s3ClientConfig,
    }),
    // PRIVATE bucket: certificate files, scoresheet photos, and incident photos
    // keep Payload access control (gated downloads via Payload's access-checked
    // endpoint; never public). EXIF/GPS is stripped from the photos on upload.
    s3Storage({
      collections: {
        [CertificateFiles.slug]: true,
        [ScoresheetFiles.slug]: true,
        [IncidentFiles.slug]: true,
      },
      bucket: privateBucket,
      config: s3ClientConfig,
    }),
  ],
})
