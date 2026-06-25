import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * GET /api/v1/config - public app config. minSupportedAppVersion is a soft nudge
 * (the client shows a friendly update prompt; never hard-block on an unreachable
 * config). No personal data.
 */
export async function GET() {
  return NextResponse.json({
    minSupportedAppVersion: process.env.MIN_SUPPORTED_APP_VERSION || '0.0.0',
    timezone: 'America/Edmonton',
    apiVersion: 'v1',
    featureFlags: {
      legacyTeamLinkt: process.env.FEATURE_LEGACY_TEAMLINKT !== 'false',
    },
  })
}
