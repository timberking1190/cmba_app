/*
 * Member Cards — Apple Wallet .pkpass generation + signing (Phase 2).
 *
 * Builds a signed generic .pkpass whose QR barcode is the SAME Ed25519 pass token the
 * scanner already verifies (token.ts) — so Wallet cards flow through /verify unchanged.
 *
 * Signing chain: the provisioned Pass Type ID cert + key arrive as ONE password-
 * protected .p12; passkit-generator wants them as separate PEMs plus the WWDR G4
 * intermediate. We split the .p12 with node-forge (no hand-rolled crypto — forge does
 * the PKCS#12 + PKCS#7), convert the WWDR .cer (DER) to PEM, and hand all three to
 * passkit-generator, which produces the manifest + detached PKCS#7 signature + zip.
 *
 * `signPkpass` takes already-resolved PEMs so a unit test can exercise the full
 * build+sign with a throwaway fixture cert; `generateApplePkpass` is the env-driven
 * entry that resolves the .p12 first and fails LOUDLY if the password is wrong/missing.
 */
import forge from 'node-forge'
import { PKPass } from 'passkit-generator'

import { APPLE_PASS_IMAGES } from './applePassAssets'
import type { AppleWalletConfig } from './walletKeys'

export interface AppleCardData {
  serialNumber: string
  /** Plaintext PassKit web-service authenticationToken (>=16 chars). */
  authenticationToken: string
  memberNumber: string
  displayName: string
  roleLabel: string
  season: string
  /** Human validity, e.g. "Aug 2027". */
  validThru: string
  /** QR message — the Ed25519 pass token. Empty string → no barcode (ID-only/voided). */
  token: string
  /** Base for Apple's web-service calls: `${appUrl}/api/v1/member-cards/apple`. */
  webServiceURL: string
  /** Marks the pass voided (revoked card) — Wallet greys it out. */
  voided?: boolean
}

const isPem = (buf: Buffer): boolean => buf.toString('utf8', 0, 32).includes('-----BEGIN')

/** WWDR .cer → PEM. Accepts DER (.cer) or an already-PEM buffer. */
export function wwdrToPem(wwdr: Buffer): string {
  if (isPem(wwdr)) return wwdr.toString('utf8')
  const asn1 = forge.asn1.fromDer(forge.util.createBuffer(wwdr.toString('binary')))
  return forge.pki.certificateToPem(forge.pki.certificateFromAsn1(asn1))
}

/** Split a password-protected .p12 into { signer cert PEM, private key PEM }. */
export function p12ToPem(p12: Buffer, password: string): { certPem: string; keyPem: string } {
  const asn1 = forge.asn1.fromDer(forge.util.createBuffer(p12.toString('binary')))
  const p12obj = forge.pkcs12.pkcs12FromAsn1(asn1, password)

  const shrouded = p12obj.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? []
  const plain = p12obj.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ?? []
  const key = (shrouded[0] ?? plain[0])?.key
  if (!key) throw new Error('.p12 contains no private key (wrong password?)')

  const certBags = p12obj.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? []
  // Prefer the leaf (non-CA) cert — the Pass Type ID cert — over any bundled CA.
  let signer: forge.pki.Certificate | undefined
  for (const bag of certBags) {
    const cert = bag.cert
    if (!cert) continue
    const bc = cert.getExtension('basicConstraints') as { cA?: boolean } | undefined
    if (!bc?.cA) {
      signer = cert
      break
    }
  }
  signer = signer ?? certBags[0]?.cert
  if (!signer) throw new Error('.p12 contains no certificate')

  return { certPem: forge.pki.certificateToPem(signer), keyPem: forge.pki.privateKeyToPem(key) }
}

interface SignInput {
  certPem: string
  keyPem: string
  wwdrPem: string
  passTypeId: string
  teamId: string
  card: AppleCardData
}

/** Build + sign the .pkpass from resolved PEMs. Returns the zipped, signed bundle. */
export function signPkpass(input: SignInput): Buffer {
  const pass = new PKPass({}, { wwdr: input.wwdrPem, signerCert: input.certPem, signerKey: input.keyPem }, {
    passTypeIdentifier: input.passTypeId,
    teamIdentifier: input.teamId,
    serialNumber: input.card.serialNumber,
    organizationName: 'Calgary Minor Basketball Association',
    description: 'CMBA+ Member Card',
    logoText: 'CMBA+',
    webServiceURL: input.card.webServiceURL,
    authenticationToken: input.card.authenticationToken,
    backgroundColor: 'rgb(20,20,22)',
    foregroundColor: 'rgb(255,255,255)',
    labelColor: 'rgb(235,28,36)',
    ...(input.card.voided ? { voided: true } : {}),
  })

  // Setting the style resets fields — do it before pushing any.
  pass.type = 'generic'
  pass.headerFields.push({ key: 'season', label: 'SEASON', value: input.card.season })
  pass.primaryFields.push({ key: 'name', label: 'MEMBER', value: input.card.displayName })
  pass.secondaryFields.push(
    { key: 'member', label: 'MEMBER NO.', value: input.card.memberNumber },
    { key: 'role', label: 'ROLE', value: input.card.roleLabel },
  )
  pass.auxiliaryFields.push({ key: 'valid', label: 'VALID THRU', value: input.card.validThru })
  pass.backFields.push(
    {
      key: 'about',
      label: 'About this card',
      value:
        'Present the QR code at the gym for sideline verification. It confirms your CMBA+ clearance without exposing personal details.',
    },
    { key: 'member_number_back', label: 'Member Number', value: input.card.memberNumber },
    { key: 'org', label: 'Issued by', value: 'Calgary Minor Basketball Association' },
  )
  if (input.card.token) {
    pass.setBarcodes({
      format: 'PKBarcodeFormatQR',
      message: input.card.token,
      messageEncoding: 'iso-8859-1',
      altText: input.card.memberNumber,
    })
  }

  for (const [name, buf] of Object.entries(APPLE_PASS_IMAGES)) pass.addBuffer(name, buf)

  return pass.getAsBuffer()
}

/** Env-driven entry: resolve the .p12 + WWDR, then build + sign. */
export function generateApplePkpass(cfg: AppleWalletConfig, card: AppleCardData): Buffer {
  let pems: { certPem: string; keyPem: string }
  try {
    pems = p12ToPem(cfg.p12, cfg.p12Password)
  } catch (err) {
    throw new Error(`Failed to read the Apple Pass Type .p12 (check MEMBERCARD_APPLE_P12_PASSWORD): ${err instanceof Error ? err.message : String(err)}`)
  }
  return signPkpass({
    certPem: pems.certPem,
    keyPem: pems.keyPem,
    wwdrPem: wwdrToPem(cfg.wwdr),
    passTypeId: cfg.passTypeId,
    teamId: cfg.teamId,
    card,
  })
}
