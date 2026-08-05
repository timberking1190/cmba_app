import forge from 'node-forge'
import { describe, expect, it } from 'vitest'

import { generateApplePkpass, p12ToPem, signPkpass, wwdrToPem, type AppleCardData } from './applePass'
import type { AppleWalletConfig } from './walletKeys'

// A throwaway self-signed cert/key standing in for the real Pass Type ID material.
// Used as BOTH signerCert and wwdr so passkit-generator's chain check is self-consistent.
function makeFixture() {
  const keys = forge.pki.rsa.generateKeyPair(2048)
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date(2020, 0, 1)
  cert.validity.notAfter = new Date(2032, 0, 1)
  const attrs = [
    { name: 'commonName', value: 'Pass Type ID: pass.ca.cmba.member' },
    { name: 'organizationName', value: 'CMBA' },
  ]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.sign(keys.privateKey, forge.md.sha256.create())
  return { cert, key: keys.privateKey }
}

const fx = makeFixture()
const certPem = forge.pki.certificateToPem(fx.cert)
const keyPem = forge.pki.privateKeyToPem(fx.key)
const wwdrDer = Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(fx.cert)).getBytes(), 'binary')

const card: AppleCardData = {
  serialNumber: 'serial-abc',
  authenticationToken: 'auth-token-0000000000',
  memberNumber: 'CMBA-00042',
  displayName: 'Sam Coach',
  roleLabel: 'Coach',
  season: '2026-27',
  validThru: 'Aug 2027',
  token: 'THE_QR_TOKEN',
  webServiceURL: 'https://cmba.example/api/v1/member-cards/apple',
}

const PK_MAGIC = Buffer.from([0x50, 0x4b]) // "PK" — zip local file header

describe('applePass — cert plumbing', () => {
  it('wwdrToPem accepts DER and passes PEM through', () => {
    expect(wwdrToPem(wwdrDer)).toContain('BEGIN CERTIFICATE')
    expect(wwdrToPem(Buffer.from(certPem))).toBe(certPem)
  })

  it('p12ToPem splits a password-protected .p12 into cert + key', () => {
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(fx.key, [fx.cert], 'pw123', { algorithm: '3des' })
    const p12 = Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), 'binary')
    const out = p12ToPem(p12, 'pw123')
    expect(out.certPem).toContain('BEGIN CERTIFICATE')
    expect(out.keyPem).toContain('PRIVATE KEY')
    expect(() => p12ToPem(p12, 'wrong')).toThrow()
  })
})

describe('applePass — build + sign', () => {
  it('produces a signed .pkpass zip (manifest + PKCS#7 signature chain executes)', () => {
    const buf = signPkpass({ certPem, keyPem, wwdrPem: certPem, passTypeId: 'pass.ca.cmba.member', teamId: 'D433C7C7BQ', card })
    expect(buf.length).toBeGreaterThan(1000)
    expect(buf.subarray(0, 2).equals(PK_MAGIC)).toBe(true)
  })

  it('builds a voided, barcode-less pass without throwing', () => {
    const buf = signPkpass({
      certPem,
      keyPem,
      wwdrPem: certPem,
      passTypeId: 'pass.ca.cmba.member',
      teamId: 'D433C7C7BQ',
      card: { ...card, token: '', voided: true },
    })
    expect(buf.subarray(0, 2).equals(PK_MAGIC)).toBe(true)
  })

  it('generateApplePkpass resolves a .p12 then signs end-to-end', () => {
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(fx.key, [fx.cert], 'pw123', { algorithm: '3des' })
    const cfg = {
      teamId: 'D433C7C7BQ',
      passTypeId: 'pass.ca.cmba.member',
      p12: Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), 'binary'),
      p12Password: 'pw123',
      wwdr: wwdrDer,
    } as AppleWalletConfig
    const buf = generateApplePkpass(cfg, card)
    expect(buf.subarray(0, 2).equals(PK_MAGIC)).toBe(true)
  })

  it('generateApplePkpass fails loudly on a wrong .p12 password', () => {
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(fx.key, [fx.cert], 'pw123', { algorithm: '3des' })
    const cfg = {
      teamId: 'T',
      passTypeId: 'pass.ca.cmba.member',
      p12: Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), 'binary'),
      p12Password: 'WRONG',
      wwdr: wwdrDer,
    } as AppleWalletConfig
    expect(() => generateApplePkpass(cfg, card)).toThrow(/MEMBERCARD_APPLE_P12_PASSWORD/)
  })
})
