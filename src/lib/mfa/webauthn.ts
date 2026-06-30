import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server'

/*
 * Stage C / S1 — passkeys (WebAuthn / FIDO2), the phishing-resistant primary
 * factor. Thin wrapper over @simplewebauthn/server v13 (nested `credential`).
 *
 * Ceremonies are pinned to the canonical RP ID + origin allowlist from env, so a
 * preview deploy (a different *.vercel.app host) cannot complete a ceremony. The
 * signature counter is persisted and regression is rejected (cloned-authenticator
 * detection). Public keys are stored base64url and never returned to clients.
 */

const RP_NAME = 'CMBA Connect'

export function rpID(): string {
  return process.env.WEBAUTHN_RP_ID || 'localhost'
}

export function expectedOrigins(): string[] {
  const env = process.env.WEBAUTHN_ORIGINS
  if (env) return env.split(',').map((s) => s.trim()).filter(Boolean)
  return ['http://localhost:3000']
}

type CredRef = { id: string; transports?: AuthenticatorTransportLike }
type AuthenticatorTransportLike = ('ble' | 'hybrid' | 'internal' | 'nfc' | 'usb' | 'cable' | 'smart-card')[] | null | undefined

export async function regOptions(opts: { userId: string | number; userName: string; exclude?: CredRef[] }) {
  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpID(),
    userID: new TextEncoder().encode(String(opts.userId)),
    userName: opts.userName,
    attestationType: 'none',
    excludeCredentials: (opts.exclude ?? []).map((c) => ({ id: c.id, transports: c.transports ?? undefined })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  })
}

export type VerifiedRegistration = {
  credentialID: string
  publicKey: string
  counter: number
  transports: AuthenticatorTransportLike
  deviceType: 'singleDevice' | 'multiDevice'
  backedUp: boolean
}

export async function verifyReg(
  response: RegistrationResponseJSON,
  expectedChallenge: string,
): Promise<VerifiedRegistration | null> {
  const v = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: expectedOrigins(),
    expectedRPID: rpID(),
  }).catch(() => null)
  if (!v?.verified || !v.registrationInfo) return null
  const info = v.registrationInfo
  return {
    credentialID: info.credential.id,
    publicKey: Buffer.from(info.credential.publicKey).toString('base64url'),
    counter: info.credential.counter,
    transports: info.credential.transports as AuthenticatorTransportLike,
    deviceType: info.credentialDeviceType,
    backedUp: info.credentialBackedUp,
  }
}

export async function authOptions(allow: CredRef[]) {
  return generateAuthenticationOptions({
    rpID: rpID(),
    userVerification: 'preferred',
    allowCredentials: allow.map((c) => ({ id: c.id, transports: c.transports ?? undefined })),
  })
}

export async function verifyAuth(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  cred: { id: string; publicKey: string; counter: number; transports?: AuthenticatorTransportLike },
): Promise<{ newCounter: number } | null> {
  const v = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: expectedOrigins(),
    expectedRPID: rpID(),
    credential: {
      id: cred.id,
      publicKey: new Uint8Array(Buffer.from(cred.publicKey, 'base64url')),
      counter: cred.counter,
      transports: cred.transports ?? undefined,
    },
  }).catch(() => null)
  if (!v?.verified) return null
  return { newCounter: v.authenticationInfo.newCounter }
}
