import { NextResponse } from 'next/server'

/*
 * Cron route protection. Vercel Cron (and manual calls) must present
 * `Authorization: Bearer <CRON_SECRET>`. If CRON_SECRET is unset we REJECT
 * rather than skip the check (fail closed).
 */
export function checkCronAuth(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured; refusing to run.' },
      { status: 503 },
    )
  }
  const header = req.headers.get('authorization')
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
