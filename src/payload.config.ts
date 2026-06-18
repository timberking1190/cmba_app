import path from 'path'
import { fileURLToPath } from 'url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { CertificateFiles } from './collections/CertificateFiles'
import { Media } from './collections/Media'
import { Users } from './collections/Users'

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

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL,
  secret,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '· CMBA Connect',
    },
  },
  collections: [Users, Media, CertificateFiles],
  editor: lexicalEditor(),
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
    // Dev: auto-push schema for fast iteration. Prod: use committed migrations.
    push: !isProd,
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
    // PRIVATE bucket: certificate files keep Payload access control (gated
    // downloads via Payload's access-checked endpoint; never public).
    s3Storage({
      collections: {
        [CertificateFiles.slug]: true,
      },
      bucket: privateBucket,
      config: s3ClientConfig,
    }),
  ],
})
