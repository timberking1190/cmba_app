#!/usr/bin/env node
/*
 * Derive an AWS SES SMTP password from an IAM secret access key, for a region.
 * Pure + offline (no AWS calls). The SES SMTP password is a SigV4 signature of the
 * literal string "SendRawEmail" using the IAM secret, prefixed with a version byte.
 *
 *   node scripts/ses-smtp-password.mjs "<SecretAccessKey>" ca-central-1
 *
 * Pass the secret as an argument only in a trusted shell; it is never stored.
 */
import { createHmac } from 'node:crypto'

const secret = process.argv[2]
const region = process.argv[3] || 'ca-central-1'
if (!secret) {
  console.error('usage: node scripts/ses-smtp-password.mjs <SecretAccessKey> [region]')
  process.exit(1)
}

const sign = (key, msg) => createHmac('sha256', key).update(msg, 'utf8').digest()

let sig = sign(`AWS4${secret}`, '11111111')
sig = sign(sig, region)
sig = sign(sig, 'ses')
sig = sign(sig, 'aws4_request')
sig = sign(sig, 'SendRawEmail')

// Version 0x04 prefix, then base64.
const smtpPassword = Buffer.concat([Buffer.from([0x04]), sig]).toString('base64')
console.log(smtpPassword)
