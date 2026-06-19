/*
 * Program/info pages recreated natively from CMBA's published content, replacing
 * cmba.ab.ca links. Seeded as CMS Pages (hero + rich text [+ CTA]) so they render
 * on-brand via RenderBlocks and are editable in the admin. Seasonal details
 * (dates/fees) should be kept current in the CMS.
 */
export type ProgramPage = {
  slug: string
  title: string
  hero: { eyebrow?: string; heading: string; subheading?: string }
  body: string
  cta?: { heading: string; body?: string; buttonLabel: string; buttonHref: string }
}

const SUMMER_CAMPS_REGISTER =
  'https://app.teamlinkt.com/register/find/calgaryminorbasketballassociation?cid=63840'

export const PROGRAM_PAGES: ProgramPage[] = [
  {
    slug: 'spring-league',
    title: 'Spring League',
    hero: {
      eyebrow: 'Programs',
      heading: 'CMBA Spring League',
      subheading: 'Competitive spring basketball in two streams — Club Weeknight and Rec Weekend.',
    },
    body: `## Two streams
CMBA Spring League offers competitive basketball in two streams: Club Weeknight (top club teams) and Rec Weekend (recreational club and community teams).

## Age groups
Club Weeknight: U13 (born 2013–2014), U15 (born 2011–2012), and U18 (born 2008–2010).
Rec Weekend Tournament: U11 (born 2015 or later), plus U13, U15, and U18 at the same birth years.

## Key dates
February 2 — Registration opens at 7:00 PM.
March 23 — Last day for a full refund (less a 10% service charge).
March 30 — Last day for a 50% refund.
April 11 — Club Weeknight Seeding Day (mandatory).
April 13–15 — Club Weeknight league begins.
May 8/9, May 29/30, and June 12/13 — Weekend Tournament dates.
June 1–10 — Club Weeknight playoffs.

## Fees
Club Weeknight: $1,700 plus a $300 Sportsmanship Deposit.
Weekend Rec League: $1,400 plus a $300 Sportsmanship Deposit.
Payment is by credit card online only. Full payment is required to be placed on a waitlist.

## Format
Club Weeknight is capped at 8 teams per division, with weeknight games by age group. Rec Weekend runs three tournament weekends — attendance at all three is required — with nine games guaranteed and a minimum of four teams per division.

## Registration requirements
All players register under their team in RAMP. No athlete may play on two teams. Proof of insurance is required before the first game. Coaches must register by the deadline and obtain a CMBA Staff ID Card, which requires a criminal record check, Safe Sport completion, and mandatory coach training.`,
    cta: {
      heading: 'Register for Spring League',
      body: 'Registration runs through TeamLinkt.',
      buttonLabel: 'Register on TeamLinkt',
      buttonHref: REGISTER_PLACEHOLDER(),
    },
  },
  {
    slug: 'summer-camps',
    title: 'Summer Camps 2026',
    hero: {
      eyebrow: 'Programs',
      heading: 'Summer Camps 2026',
      subheading: 'Coed camps that build skills, confidence, and a love for the game.',
    },
    body: `## Overview
CMBA's coed summer camps build skills, confidence, and a love for basketball in a positive, structured environment, with experienced coaches from U Sports and high-school programs.

## Location and cost
Clearwater Academy, 3910 Quesnay Wood Dr SW, Calgary, AB T3E 8G1. $400 per athlete.

## Daily schedule
Monday to Thursday: 9:00 AM to 4:00 PM. Friday: 9:00 AM to 12:00 PM. Athletes bring their own lunch and snacks, with two snack breaks and one lunch break each day.

## Camps
Learn to Play Basketball Camp (U11–U13) — July 6–10. Beginner to intermediate; ideal for athletes new to organized basketball. Focus on fundamentals, confidence, and game exposure.
Next Level Hoops Camp (U11–U13) — July 13–17 and July 27–31. Intermediate to advanced with prior team experience. Focus on advanced fundamentals, skill refinement, and a competitive environment.
U15 Development Basketball Camp — July 20–24. Competitive experience required. Focus on advanced development, basketball IQ, and skill application.`,
    cta: {
      heading: 'Register for a camp',
      body: 'Spots are limited and registration runs through TeamLinkt.',
      buttonLabel: 'Register on TeamLinkt',
      buttonHref: SUMMER_CAMPS_REGISTER,
    },
  },
  {
    slug: 'women-in-coaching',
    title: 'Women in Coaching',
    hero: {
      eyebrow: 'Coach Development',
      heading: 'Women in Coaching',
      subheading: 'CMBA encourages and supports women entering and advancing in coaching.',
    },
    body: `## ABA Hoops Hangouts — coach education
A coach-education session from Alberta Basketball features Sarah Neufeld (University of Calgary Dinos), Isabel Ormond (University of Alberta Pandas), and Robyn Fleckenstein (Mount Royal University Cougars).

## Individual Performance Plan (IPP) resources
IPP — Mental Performance & Sport Psychology, presented by Isabel Ormond (Assistant Coach, University of Alberta; Alberta U15 Girls).
Female Apprenticeship Program: Steps for Women in Coaching, presented by Sarah Neufeld (BSc Health Science, BSc Community Health, MA Leadership; Assistant Coach, University of Calgary Dinos).
Application of IPPs, presented by Robyn Fleckenstein (BSc, BEd, MEd; U17 Alberta Women's Head Coach; Mount Royal University Women's Head Coach).

## Get involved
To get involved or learn more about coaching opportunities and mentorship for women at CMBA, contact the CMBA office.`,
  },
  {
    slug: 'key-dates',
    title: 'Key Dates',
    hero: {
      eyebrow: 'Season',
      heading: 'Key Dates',
      subheading: 'Important registration, refund, and play dates for the current season.',
    },
    body: `## Spring 2026
February 2 — Spring League registration opens (7:00 PM).
March 23 — Last day for a full refund (less 10%).
March 30 — Last day for a 50% refund.
April 11 — Club Weeknight Seeding Day.
April 13–15 — Club Weeknight league begins.
May 8/9, May 29/30, and June 12/13 — Weekend Tournament dates.
June 1–10 — Club Weeknight playoffs.

## Game schedule
For live game times, standings, and the full season schedule, see the Schedule page.`,
    cta: { heading: 'See the live schedule', buttonLabel: 'View schedule', buttonHref: '/calendar' },
  },
  {
    slug: 'meeting-minutes',
    title: 'Meetings & Minutes',
    hero: {
      eyebrow: 'Governance',
      heading: 'Meetings & Minutes',
      subheading: 'Board and committee meeting information for member clubs and officials.',
    },
    body: `## Meetings & minutes
CMBA board and committee meeting information, agendas, and minutes are maintained for member clubs and association officials. Access is restricted to authorized members.

## Request access
Club presidents and association officials can request meeting information and minutes from the CMBA office. See the Leadership & Board page for the executive and committee contacts.`,
    cta: { heading: 'Leadership & Board', buttonLabel: 'View leadership', buttonHref: '/leadership' },
  },
]

// REGISTER is imported in the seed; this indirection keeps the player-register
// link in one place without a circular import in this content module.
function REGISTER_PLACEHOLDER(): string {
  return 'https://app.teamlinkt.com/register/find/calgaryminorbasketballassociation?cid=62203'
}
