import { NextResponse } from 'next/server'

import { isSuperAdmin } from '@/access/index'
import { authenticateRequest } from '@/lib/api/auth'
import { getPayloadClient } from '@/lib/auth'
import { CATEGORY_HEADER } from '@/lib/email/meta'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/admin/email-test - super admin only. Sends a test message to the
 * signed-in admin's OWN email address (never an arbitrary address, so this can
 * never be used as a relay) and reports the transport. Use it to confirm SES
 * delivery end to end after the DNS and production-access steps in docs/SES_SETUP.md.
 * The send is recorded in email-send-log like any other (category "test").
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!isSuperAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!user.email) return NextResponse.json({ error: 'Your account has no email address.' }, { status: 400 })

  const configured = Boolean(process.env.SES_SMTP_HOST)
  const transport = configured ? 'ses' : 'json'

  try {
    await payload.sendEmail({
      to: user.email,
      subject: 'CMBA Connect email test',
      text:
        'This is a test message from CMBA Connect to confirm transactional email delivery.\n\n' +
        'If you received it, the sending path is working. You can ignore this message.',
      headers: { [CATEGORY_HEADER]: 'test' },
    })
    return NextResponse.json(
      {
        ok: true,
        transport,
        delivered: configured,
        note: configured
          ? 'Sent over SES. Check the destination inbox.'
          : 'SES is not configured, so this was logged only (dev jsonTransport) and not delivered.',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    payload.logger.error(`[api] email-test send failed: ${String(err)}`)
    return NextResponse.json({ ok: false, transport, error: 'The test send failed. Check the server log and SES configuration.' }, { status: 502 })
  }
}
