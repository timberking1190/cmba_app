import type { Payload } from 'payload'

import { getVerifiedTeamIds } from './teamAccess'

/*
 * Rep dashboard data: a verified rep's upcoming games, games awaiting their report,
 * and games awaiting their confirmation (with the opposing report and its photo).
 * One shape powers the web /rep page and the /api/v1/me/dashboard native endpoint.
 */
const fmt = new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Edmonton' })
const rel = (r: unknown, k = 'name') => (r && typeof r === 'object' ? (r as Record<string, string>)[k] ?? '' : '')
const relId = (r: unknown): string | number | undefined => (r == null ? undefined : typeof r === 'object' ? (r as { id: string | number }).id : (r as string | number))

export type RepGame = {
  id: number | string
  homeTeam: string
  awayTeam: string
  division: string
  date: string
  status: string
  homeScore?: number | null
  awayScore?: number | null
  myTeamId?: number | string
  // For awaiting-confirmation:
  scoreReportId?: number | string
  scoresheetUrl?: string | null
}

export type RepDashboard = {
  teamIds: (number | string)[]
  upcoming: RepGame[]
  awaitingReport: RepGame[]
  awaitingConfirmation: RepGame[]
}

function toRepGame(g: Record<string, unknown>, myTeams: Set<string>): RepGame {
  const home = relId(g.homeTeam)
  const away = relId(g.awayTeam)
  const myTeamId = myTeams.has(String(home)) ? home : myTeams.has(String(away)) ? away : undefined
  return {
    id: g.id as number,
    homeTeam: rel(g.homeTeam),
    awayTeam: rel(g.awayTeam),
    division: rel(g.division, 'displayLabel') || rel(g.division, 'fullPath'),
    date: g.startAt ? fmt.format(new Date(g.startAt as string)) : 'TBD',
    status: (g.status as string) ?? 'scheduled',
    homeScore: g.homeScore as number | null,
    awayScore: g.awayScore as number | null,
    myTeamId,
  }
}

export async function getRepDashboard(payload: Payload, userId: string | number): Promise<RepDashboard> {
  const teamIds = await getVerifiedTeamIds(payload, userId)
  if (!teamIds.length) return { teamIds: [], upcoming: [], awaitingReport: [], awaitingConfirmation: [] }
  const myTeams = new Set(teamIds.map(String))
  const now = Date.now()

  const res = await payload.find({
    collection: 'games',
    where: { and: [{ isBye: { not_equals: true } }, { or: [{ homeTeam: { in: teamIds } }, { awayTeam: { in: teamIds } }] }] },
    sort: ['startAt', 'id'],
    depth: 1,
    limit: 500,
    overrideAccess: true,
  })
  const games = res.docs as unknown as Array<Record<string, unknown>>

  const upcoming: RepGame[] = []
  const awaitingReport: RepGame[] = []
  const awaitingConfirmation: RepGame[] = []

  for (const g of games) {
    const status = (g.status as string) ?? 'scheduled'
    const start = g.startAt ? new Date(g.startAt as string).getTime() : 0
    const rg = toRepGame(g, myTeams)
    if (status === 'scheduled' && start >= now) {
      upcoming.push(rg)
    } else if (status === 'scheduled' && start < now) {
      awaitingReport.push(rg)
    } else if (status === 'reported') {
      // If the existing report is for the OTHER team, this rep must confirm.
      const reports = await payload.find({ collection: 'score-reports', where: { game: { equals: g.id } }, depth: 1, limit: 5, overrideAccess: true })
      const report = reports.docs[0] as { id?: number | string; submittedForTeam?: unknown; homeScore?: number; awayScore?: number; scoresheetPhoto?: { url?: string } | null } | undefined
      const reportTeam = relId(report?.submittedForTeam)
      const reportedByMe = reportTeam != null && myTeams.has(String(reportTeam))
      if (report && !reportedByMe) {
        awaitingConfirmation.push({ ...rg, scoreReportId: report.id, homeScore: report.homeScore, awayScore: report.awayScore, scoresheetUrl: report.scoresheetPhoto && typeof report.scoresheetPhoto === 'object' ? report.scoresheetPhoto.url ?? null : null })
      } else {
        upcoming.push(rg) // reported by me; waiting on the other side
      }
    }
  }
  return { teamIds, upcoming, awaitingReport, awaitingConfirmation }
}
