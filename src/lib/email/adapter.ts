import type { Payload } from 'payload'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'

import {
  CATEGORY_HEADER,
  errorCodeOf,
  hashRecipient,
  recipientCount,
  recipientDomain,
  resolveCategory,
  sanitizeErrorMessage,
  type EmailCategory,
} from './meta'

/*
 * Wraps the nodemailer email adapter so EVERY send that goes through
 * payload.sendEmail is recorded in the email-send-log collection: the app
 * composers, the reminder crons, Payload's own auth emails (password reset,
 * verify), and the email OTP. This is the single chokepoint, so there is no
 * double counting and no call site can forget to log.
 *
 * The log is PII free (salted recipient hash + bare domain). A send failure is
 * always logged at error level so an auth email can never fail silently, and the
 * log write itself is guarded so it can never break an actual send.
 *
 * nodemailerAdapter returns a Promise of the adapter factory, so we await it and
 * return a wrapped factory (Payload accepts a Promise for the email option).
 *
 * Copy rule: no em or en dashes anywhere.
 */

// The resolved adapter factory: (args: { payload }) => { name, defaultFromAddress,
// defaultFromName, sendEmail }.
type AdapterFactory = Awaited<ReturnType<typeof nodemailerAdapter>>
type FactoryArgs = Parameters<AdapterFactory>[0]
type Initialized = ReturnType<AdapterFactory>
type SendArgs = Parameters<Initialized['sendEmail']>[0]

export async function trackedEmailAdapter(
  innerPromise: ReturnType<typeof nodemailerAdapter>,
): Promise<AdapterFactory> {
  const innerFactory = await innerPromise

  const wrapped: AdapterFactory = (args: FactoryArgs) => {
    const adapter = innerFactory(args)
    const payload = args.payload
    const transport: 'ses' | 'json' = process.env.SES_SMTP_HOST ? 'ses' : 'json'

    return {
      ...adapter,
      sendEmail: async (message: SendArgs) => {
        // Pull and strip our private category header so it never leaves on the wire.
        const headers = (message as { headers?: Record<string, string> }).headers
        let categoryHeader: string | undefined
        if (headers) {
          for (const k of Object.keys(headers)) {
            if (k.toLowerCase() === CATEGORY_HEADER) {
              categoryHeader = headers[k]
              delete headers[k]
            }
          }
        }
        const subject = (message as { subject?: string }).subject
        const to = (message as { to?: unknown }).to
        const category = resolveCategory(categoryHeader, subject)

        let status: 'sent' | 'failed' = 'sent'
        let errorCode: string | undefined
        let errorMessage: string | undefined
        try {
          return await adapter.sendEmail(message)
        } catch (err) {
          status = 'failed'
          errorCode = errorCodeOf(err)
          errorMessage = sanitizeErrorMessage(err)
          // Never let an auth email fail silently.
          payload.logger.error(`[email] send failed (${category}) code=${errorCode}: ${errorMessage}`)
          throw err
        } finally {
          await logSend(payload, { category, subject, to, status, transport, errorCode, errorMessage })
        }
      },
    }
  }

  return wrapped
}

async function logSend(
  payload: Payload,
  fields: {
    category: EmailCategory
    subject?: string
    to: unknown
    status: 'sent' | 'failed'
    transport: 'ses' | 'json'
    errorCode?: string
    errorMessage?: string
  },
): Promise<void> {
  try {
    await payload.create({
      collection: 'email-send-log',
      overrideAccess: true,
      data: {
        category: fields.category,
        subject: (fields.subject ?? '').slice(0, 300),
        recipientHash: hashRecipient(fields.to, payload.secret),
        recipientDomain: recipientDomain(fields.to),
        recipientCount: recipientCount(fields.to),
        status: fields.status,
        transport: fields.transport,
        errorCode: fields.errorCode,
        errorMessage: fields.errorMessage,
        sentAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    payload.logger.error(`[email] health log write failed: ${String(err)}`)
  }
}
