import type { Payload } from 'payload'

import { CATEGORY_HEADER } from './email/meta'

/*
 * Scheduling notifications. Every message is plain text with NO personal data in
 * the subject or body: it states what happened and links the recipient into the
 * portal (PIPEDA data minimization). Sends are best effort and wrapped so a
 * failure is logged and never throws out of a hook. Transactional notices
 * (contested escalation, official assignment) are never suppressed by a
 * preference; only the optional update style notices honor notificationPrefs.
 */
const base = () => process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
const PORTAL_NOTE = '\n\n(We keep personal details out of email. Please sign in to the portal to see them.)'

export async function emailReportRequest(payload: Payload, args: { toEmail?: string | null }): Promise<void> {
  if (!args.toEmail) return
  try {
    await payload.sendEmail({
      to: args.toEmail,
      subject: 'A game score is waiting for your confirmation',
      text: `A score has been reported for one of your games. Sign in to CMBA Connect to review and confirm it:\n${base()}/rep${PORTAL_NOTE}`,
      headers: { [CATEGORY_HEADER]: 'report_request' },
    })
  } catch (err) {
    payload.logger.error(`Report request email failed: ${String(err)}`)
  }
}

/*
 * Contested escalation to the scheduling admin. Unsuppressable and transactional.
 * Resolves the LIVE Site Settings scheduling-admin email at send time, falling back
 * to the snapshot taken when the dispute opened, then to EMAIL_FROM (with an error
 * log) so it can never silently go nowhere.
 */
export async function emailContested(payload: Payload, args: { snapshotEmail?: string | null }): Promise<void> {
  let to = args.snapshotEmail || ''
  try {
    const settings = (await payload.findGlobal({ slug: 'site-settings' })) as { schedulingAdmin?: { email?: string | null } } | null
    const live = settings?.schedulingAdmin?.email
    if (live) to = live
  } catch {
    /* fall back to the snapshot */
  }
  if (!to) {
    to = process.env.EMAIL_FROM || 'league@cmba.ab.ca'
    payload.logger.error('Scheduling admin email is not configured; contested escalation fell back to EMAIL_FROM.')
  }
  try {
    await payload.sendEmail({
      to,
      subject: 'A game result is contested and needs review',
      text: `A game result was contested and needs an admin review. Open the contested queue:\n${base()}/admin/contested${PORTAL_NOTE}`,
      headers: { [CATEGORY_HEADER]: 'contested' },
    })
  } catch (err) {
    payload.logger.error(`Contested escalation email failed: ${String(err)}`)
  }
}

export async function emailScheduleChange(payload: Payload, args: { toEmails: Array<string | null | undefined> }): Promise<void> {
  for (const to of args.toEmails) {
    if (!to) continue
    try {
      await payload.sendEmail({
        to,
        subject: 'A game on your schedule has changed',
        text: `A game on your team schedule has changed. Sign in to see the latest time, venue, and details:\n${base()}/schedule${PORTAL_NOTE}`,
        headers: { [CATEGORY_HEADER]: 'schedule_change' },
      })
    } catch (err) {
      payload.logger.error(`Schedule change email failed: ${String(err)}`)
    }
  }
}

/*
 * A targeted announcement to one recipient. Sent as a single-recipient envelope
 * (never multi-recipient To/Cc, so families are not exposed to each other), with a
 * portal link. The caller suppresses recipients who opted out of general updates.
 */
export async function emailTargetedAnnouncement(payload: Payload, args: { toEmail: string; subject: string; message: string }): Promise<void> {
  try {
    await payload.sendEmail({
      to: args.toEmail,
      subject: args.subject,
      text: `${args.message}\n\nSee the latest in CMBA Connect:\n${base()}/schedule\n\nTo change your email preferences, sign in and visit your account.`,
      headers: { [CATEGORY_HEADER]: 'announcement' },
    })
  } catch (err) {
    payload.logger.error(`Targeted announcement email failed: ${String(err)}`)
  }
}

export async function emailAssignment(payload: Payload, args: { toEmail?: string | null }): Promise<void> {
  if (!args.toEmail) return
  try {
    await payload.sendEmail({
      to: args.toEmail,
      subject: 'You have a new officiating assignment',
      text: `You have been assigned to officiate a game. Sign in to CMBA Connect to see the details:\n${base()}/account${PORTAL_NOTE}`,
      headers: { [CATEGORY_HEADER]: 'assignment' },
    })
  } catch (err) {
    payload.logger.error(`Assignment email failed: ${String(err)}`)
  }
}

/*
 * Weekly engagement digest. Optional (honors notificationPrefs.weeklyDigest at the
 * call site). PII-free: it says only that there is new activity and links to the
 * portal; counts and details are shown after sign-in.
 */
export async function emailWeeklyDigest(payload: Payload, args: { toEmail?: string | null }): Promise<void> {
  if (!args.toEmail) return
  try {
    await payload.sendEmail({
      to: args.toEmail,
      subject: 'Your week in CMBA Connect',
      text: `You have new activity this week, new badges, recognitions, or team news. Sign in to see it:\n${base()}/account\n\nTo change your email preferences, sign in and visit your account.`,
      headers: { [CATEGORY_HEADER]: 'weekly_digest' },
    })
  } catch (err) {
    payload.logger.error(`Weekly digest email failed: ${String(err)}`)
  }
}

/*
 * A recognition for this member was approved. Optional (honors
 * notificationPrefs.recognitionUpdates). PII-free: no names or message text.
 */
export async function emailRecognition(payload: Payload, args: { toEmail?: string | null }): Promise<void> {
  if (!args.toEmail) return
  try {
    await payload.sendEmail({
      to: args.toEmail,
      subject: 'You received a recognition in CMBA Connect',
      text: `Someone recognized a member of your CMBA Connect account. Sign in to see it:\n${base()}/account${PORTAL_NOTE}`,
      headers: { [CATEGORY_HEADER]: 'recognition' },
    })
  } catch (err) {
    payload.logger.error(`Recognition email failed: ${String(err)}`)
  }
}
