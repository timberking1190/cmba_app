/*
 * Seed a LARGE test season so the scheduling console can be measured at the size
 * this league actually runs: on the order of 170 teams, dozens of divisions,
 * weekends of 100 to 200 games, and 150 officials.
 *
 * Defaults produce roughly 1,500 games across 20 weekends, 180 teams in 24
 * divisions, 24 venues with 3 courts each, and 150 officials.
 *
 * DEV/STAGING ONLY. Hard-guarded against the production project, the same way
 * seed-member-card-synthetic.ts is. Everything it creates is tagged with a
 * SCALE- external id prefix and a dedicated season, so it can be found and
 * removed again without touching real data.
 *
 * Usage:
 *   SCALE_SEED_ALLOW=1 npm run seed:scale
 *   SCALE_SEED_ALLOW=1 SCALE_GAMES=3000 npm run seed:scale
 *   SCALE_SEED_ALLOW=1 npm run seed:scale -- --clean     (remove what it made)
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import type { Payload } from 'payload'
import config from '@payload-config'

const PROD_REF = 'pdwautioosstdgbbblxl'
const TAG = 'SCALE-'
const SEASON_NAME = process.env.SCALE_SEASON || 'Scale test season'

const TARGET_GAMES = Number(process.env.SCALE_GAMES || '1500')
const DIVISIONS = Number(process.env.SCALE_DIVISIONS || '24')
const TEAMS_PER_DIVISION = Number(process.env.SCALE_TEAMS_PER_DIVISION || '8')
const VENUES = Number(process.env.SCALE_VENUES || '24')
const COURTS_PER_VENUE = Number(process.env.SCALE_COURTS || '3')
const OFFICIALS = Number(process.env.SCALE_OFFICIALS || '150')

// Saturdays, 8:00 AM to 8:00 PM in the league time zone.
const FIRST_SATURDAY = process.env.SCALE_FIRST_SATURDAY || '2026-09-12'
const SLOTS = ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30', '20:00']

function assertRunnable() {
  const url = process.env.DATABASE_URL || ''
  if (url.includes(PROD_REF) && process.env.SCALE_SEED_FORCE_PROD !== '1') {
    throw new Error(
      `Refusing to seed ${TARGET_GAMES} synthetic games into the PRODUCTION project (${PROD_REF}). Point DATABASE_URL at a staging or preview database first.`,
    )
  }
  if (process.env.SCALE_SEED_ALLOW !== '1') {
    throw new Error('Set SCALE_SEED_ALLOW=1 to run the scale seed. It is for development and staging only.')
  }
}

const AGES = ['U11', 'U13', 'U15', 'U18']
const GENDERS = ['Boys', 'Girls']
const TIERS = ['A', 'B', 'C']
const CLUB_NAMES = ['Excel', 'CoMBA', 'Okotoks', 'DMS', 'Bow Valley', 'Foothills', 'Airdrie', 'Chinook']
const FIRST = ['Avery', 'Jordan', 'Riley', 'Casey', 'Quinn', 'Sam', 'Taylor', 'Morgan', 'Jamie', 'Drew', 'Alex', 'Cameron']
const LAST = ['Nguyen', 'Singh', 'Patel', 'Brown', 'Tremblay', 'Lee', 'Martin', 'Roy', 'Gagnon', 'Wong', 'Smith', 'Ali']
const RAMP = ['level1', 'level2', 'level3']

const pick = <T,>(arr: T[], i: number): T => arr[i % arr.length]
const personName = (i: number) => `${pick(FIRST, i)} ${pick(LAST, Math.floor(i / FIRST.length))} ${i}`

/** The UTC instant for a league wall time, matching src/lib/leagueTime. */
function leagueToUtc(dateStr: string, timeStr: string): string {
  const naive = new Date(`${dateStr}T${timeStr}:00Z`)
  const utc = new Date(naive.toLocaleString('en-US', { timeZone: 'UTC' }))
  const local = new Date(naive.toLocaleString('en-US', { timeZone: 'America/Edmonton' }))
  const off = Math.round((local.getTime() - utc.getTime()) / 60000)
  return new Date(naive.getTime() - off * 60000).toISOString()
}

function saturdayOffset(weekIndex: number): string {
  const d = new Date(`${FIRST_SATURDAY}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + weekIndex * 7)
  return d.toISOString().slice(0, 10)
}

async function clean(payload: Payload) {
  // Order matters: children before parents.
  const order: Array<{ collection: string; field: string }> = [
    { collection: 'game-officials', field: '' },
    { collection: 'games', field: 'externalId' },
    { collection: 'teams', field: 'externalId' },
    { collection: 'courts', field: '' },
    { collection: 'venues', field: 'externalId' },
    { collection: 'officials', field: 'externalId' },
    { collection: 'divisions', field: '' },
    { collection: 'clubs', field: '' },
    { collection: 'seasons', field: '' },
  ]
  for (const { collection, field } of order) {
    if (!field) continue
    const res = await payload.find({ collection: collection as never, where: { [field]: { like: TAG } } as never, limit: 5000, depth: 0, overrideAccess: true })
    for (const doc of res.docs) {
      await payload.delete({ collection: collection as never, id: (doc as { id: number }).id, overrideAccess: true }).catch(() => {})
    }
    console.log(`  removed ${res.docs.length} from ${collection}`)
  }
}

async function main() {
  assertRunnable()
  const payload = await getPayload({ config })
  const cleanOnly = process.argv.includes('--clean')

  if (cleanOnly) {
    console.log('Removing the scale test data.')
    await clean(payload)
    console.log('Done.')
    process.exit(0)
  }

  const started = Date.now()

  const season = await payload.create({
    collection: 'seasons',
    overrideAccess: true,
    data: {
      name: SEASON_NAME,
      status: 'active',
      startDate: `${FIRST_SATURDAY}T00:00:00.000Z`,
      endDate: `${saturdayOffset(30)}T00:00:00.000Z`,
      defaultGameLengthMinutes: 60,
    } as never,
  })

  const clubs: Array<{ id: number }> = []
  for (const c of CLUB_NAMES) {
    clubs.push((await payload.create({ collection: 'clubs', overrideAccess: true, data: { name: `${c} (scale)` } as never })) as never)
  }

  const divisions: Array<{ id: number }> = []
  const LEAGUE_NAME = 'Scale Test League'
  for (let i = 0; i < DIVISIONS; i++) {
    const age = pick(AGES, i)
    const genderLabel = pick(GENDERS, Math.floor(i / AGES.length))
    const tier = pick(TIERS, Math.floor(i / (AGES.length * GENDERS.length)))
    const label = `${age} ${genderLabel} ${tier} ${i}`
    divisions.push(
      (await payload.create({
        collection: 'divisions',
        overrideAccess: true,
        data: {
          name: label,
          fullPath: `${LEAGUE_NAME} / ${label}`,
          displayLabel: label,
          // leagueName and ageGroup are required on this collection.
          leagueName: LEAGUE_NAME,
          ageGroup: age,
          gender: genderLabel.toLowerCase(), // the enum is boys | girls | coed
          tier,
          season: season.id,
          requiredRampLevel: pick(['none', 'level1', 'level2'], i),
        } as never,
      })) as never,
    )
  }

  const teamsByDivision = new Map<number, Array<{ id: number }>>()
  let teamCount = 0
  for (const [di, div] of divisions.entries()) {
    const list: Array<{ id: number }> = []
    for (let t = 0; t < TEAMS_PER_DIVISION; t++) {
      const club = pick(clubs, di + t)
      const team = await payload.create({
        collection: 'teams',
        overrideAccess: true,
        data: { name: `${CLUB_NAMES[(di + t) % CLUB_NAMES.length]} ${di}-${t}`, division: div.id, club: club.id, externalId: `${TAG}T-${di}-${t}` } as never,
      })
      list.push(team as never)
      teamCount++
    }
    teamsByDivision.set(div.id, list)
  }

  const venues: Array<{ id: number; courts: Array<{ id: number }> }> = []
  for (let v = 0; v < VENUES; v++) {
    const venue = await payload.create({
      collection: 'venues',
      overrideAccess: true,
      data: { name: `Scale Gym ${v}`, address: `${100 + v} Test Street NW, Calgary AB`, externalId: `${TAG}V-${v}` } as never,
    })
    const courts: Array<{ id: number }> = []
    for (let c = 0; c < COURTS_PER_VENUE; c++) {
      courts.push((await payload.create({ collection: 'courts', overrideAccess: true, data: { name: `Court ${c + 1}`, venue: venue.id } as never })) as never)
    }
    venues.push({ id: venue.id as number, courts })
  }

  const officials: Array<{ id: number }> = []
  for (let o = 0; o < OFFICIALS; o++) {
    officials.push(
      (await payload.create({
        collection: 'officials',
        overrideAccess: true,
        data: {
          name: personName(o),
          email: `scale-official-${o}@example.invalid`,
          rampLevel: pick(RAMP, o),
          maxGamesPerDay: 3 + (o % 3),
          active: true,
          externalId: `${TAG}O-${o}`,
        } as never,
      })) as never,
    )
  }

  /*
   * Games. Each weekend fills venue and court slots across divisions, so a single
   * Saturday carries a realistic 100 to 200 game slate rather than a thin spread.
   */
  let made = 0
  let week = 0
  const slotCapacityPerWeek = venues.length * COURTS_PER_VENUE * SLOTS.length

  while (made < TARGET_GAMES) {
    const date = saturdayOffset(week)
    let slotIndex = 0
    while (made < TARGET_GAMES && slotIndex < slotCapacityPerWeek) {
      const venue = venues[slotIndex % venues.length]
      const court = venue.courts[Math.floor(slotIndex / venues.length) % venue.courts.length]
      const time = SLOTS[Math.floor(slotIndex / (venues.length * COURTS_PER_VENUE)) % SLOTS.length]
      const div = divisions[made % divisions.length]
      const teams = teamsByDivision.get(div.id)!
      const home = teams[made % teams.length]
      const away = teams[(made + 1 + (week % (teams.length - 1))) % teams.length]
      if (home.id !== away.id) {
        await payload.create({
          collection: 'games',
          overrideAccess: true,
          data: {
            season: season.id,
            division: div.id,
            homeTeam: home.id,
            awayTeam: away.id,
            venue: venue.id,
            court: court.id,
            startAt: leagueToUtc(date, time),
            status: 'scheduled',
            publishState: made % 4 === 0 ? 'draft' : 'published',
            externalId: `${TAG}G-${made}`,
          } as never,
        })
        made++
        if (made % 100 === 0) {
          console.log(`  ${made} of ${TARGET_GAMES} games`)
        }
      }
      slotIndex++
    }
    week++
    if (week > 200) break // safety net
  }

  // Staff roughly the first two weekends, so the officials board has real load.
  const early = await payload.find({ collection: 'games', where: { externalId: { like: TAG } } as never, sort: ['startAt'], limit: 240, depth: 0, overrideAccess: true })
  let assigned = 0
  for (const [i, g] of early.docs.entries()) {
    for (const role of ['referee1', 'referee2'] as const) {
      const official = officials[(i * 2 + (role === 'referee2' ? 1 : 0)) % officials.length]
      const ok = await payload
        .create({ collection: 'game-officials', overrideAccess: true, data: { game: (g as { id: number }).id, official: official.id, role } as never })
        .catch(() => null)
      if (ok) assigned++
    }
  }

  const seconds = Math.round((Date.now() - started) / 1000)
  console.log(
    [
      '',
      'Scale season seeded.',
      `  season      ${SEASON_NAME}`,
      `  divisions   ${divisions.length}`,
      `  teams       ${teamCount}`,
      `  venues      ${venues.length} (${venues.length * COURTS_PER_VENUE} courts)`,
      `  officials   ${officials.length}`,
      `  games       ${made} across ${week} weekends`,
      `  assignments ${assigned}`,
      `  took        ${seconds}s`,
      '',
      'Remove it again with:  SCALE_SEED_ALLOW=1 npm run seed:scale -- --clean',
      '',
    ].join('\n'),
  )
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
