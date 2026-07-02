/*
 * Arcade high-score name filter. Pure and isomorphic: the Payload collection hook
 * runs it as the AUTHORITATIVE server check, and the client runs the exact same
 * function for instant feedback. The client is never trusted; a request that skips
 * the client still hits this on the server.
 *
 * Defense in depth, in order: length -> contact info (URLs, emails, phones,
 * handles) -> safe character set -> normalized blocklist (accent fold + leetspeak
 * map + repeat collapse, matched as whole words and as substrings). No filter is
 * perfect, which is why this is backed by Turnstile, rate limits, public reporting,
 * and admin moderation. Err toward rejection: children play this game.
 */
import { BLOCKLIST_SUBSTRING, BLOCKLIST_WORD } from './blocklist'

export const MIN_NAME_LEN = 1
export const MAX_NAME_LEN = 12
export const INITIALS_LEN = 3

export type NameRejectReason = 'empty' | 'length' | 'charset' | 'contact' | 'blocked'
export interface NameCheckResult {
  ok: boolean
  reason?: NameRejectReason
  message?: string
}

// Friendly, retro-flavoured rejection copy. No dashes anywhere per the house rule.
const MESSAGES: Record<NameRejectReason, string> = {
  empty: 'ENTER A NAME',
  length: 'TOO LONG, KEEP IT SHORT',
  charset: 'LETTERS AND NUMBERS ONLY',
  contact: 'NO LINKS OR CONTACT INFO',
  blocked: 'NICE TRY, PICK ANOTHER NAME',
}

// Map common leetspeak and symbol substitutions to a base letter. Applied for
// MATCHING ONLY; the displayed name keeps the player's original characters.
const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a', '5': 's',
  '6': 'g', '7': 't', '8': 'b', '9': 'g',
  '@': 'a', $: 's', '!': 'i', '|': 'i', '+': 't', '(': 'c', ')': '',
}

/** Lowercase, strip accents, and fold leetspeak to letters (for matching only). */
export function foldForMatch(input: string): string {
  const lowered = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining accent marks
  let out = ''
  for (const ch of lowered) out += ch in LEET ? LEET[ch] : ch
  return out
}

/** Letters only, spaces/digits/punctuation removed: "big_ass" -> "bigass". */
export function lettersOnly(folded: string): string {
  return folded.replace(/[^a-z]/g, '')
}

/** Letters only with runs collapsed to one: "f u u u c k" and "fuuuck" -> "fuck". */
export function compactForm(folded: string): string {
  return lettersOnly(folded).replace(/(.)\1+/g, '$1')
}

/** Maximal letter-run tokens after folding: "big_ass" -> ["big", "ass"]. */
export function wordTokens(folded: string): string[] {
  return folded.split(/[^a-z]+/).filter(Boolean)
}

// Contact-info patterns, checked on the raw input so spaced or formatted variants
// are still caught before the character-set gate would reject the punctuation.
const URL_RE = /(https?:\/\/|www\.|:\/\/|\b[a-z0-9-]+\.(com|net|org|io|co|gg|xyz|info|biz|ca|us|uk|tv|me|app|dev)\b)/i
const EMAIL_RE = /\S+@\S+/
const HANDLE_RE = /(^|\s)@\w/
// 7+ digits, optionally separated by spaces, dots, or hyphens (a phone number).
const PHONE_RE = /(?:\d[ .-]?){7,}/

function looksLikeContact(raw: string): boolean {
  return URL_RE.test(raw) || EMAIL_RE.test(raw) || HANDLE_RE.test(raw) || PHONE_RE.test(raw)
}

export interface CheckNameOptions {
  /** Max allowed length. Defaults to MAX_NAME_LEN (12). Initials mode passes 3. */
  maxLen?: number
}

/**
 * Authoritative name check. Returns { ok: false, reason, message } on rejection.
 * Safe to call on client and server; the server result is the one that counts.
 */
export function checkName(input: string, opts: CheckNameOptions = {}): NameCheckResult {
  const maxLen = opts.maxLen ?? MAX_NAME_LEN
  const raw = (input ?? '').trim()

  if (raw.length < MIN_NAME_LEN) return reject('empty')
  if (raw.length > maxLen) return reject('length')
  if (looksLikeContact(raw)) return reject('contact')
  // Safe character set: letters and digits, single interior spaces, nothing else.
  if (!/^[a-z0-9]+( [a-z0-9]+)*$/i.test(raw)) return reject('charset')

  const folded = foldForMatch(raw)
  const letters = lettersOnly(folded)
  const compact = compactForm(folded)
  const toks = wordTokens(folded)

  // Severe terms: substring of the letters-only form (catches double letters and
  // spacing like "n i g g a") OR of the collapsed form (catches repeat-padding
  // like "fuuuck"). Checking both avoids the collapse eating a blocked word's own
  // double letters.
  for (const bad of BLOCKLIST_SUBSTRING) {
    if (letters.includes(bad) || compact.includes(bad)) return reject('blocked')
  }
  // Milder or fragment-prone terms: whole token only.
  for (const bad of BLOCKLIST_WORD) {
    if (toks.includes(bad)) return reject('blocked')
  }

  return { ok: true }
}

/** True when the name passes. Convenience wrapper for guards. */
export function isNameAllowed(input: string, opts?: CheckNameOptions): boolean {
  return checkName(input, opts).ok
}

/** Canonical stored/displayed form: trimmed, uppercased, clamped. Validate first. */
export function formatArcadeName(input: string, maxLen: number = MAX_NAME_LEN): string {
  return (input ?? '').trim().toUpperCase().slice(0, maxLen)
}

function reject(reason: NameRejectReason): NameCheckResult {
  return { ok: false, reason, message: MESSAGES[reason] }
}
