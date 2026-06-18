/*
 * Single source of truth for real Calgary Minor Basketball Association links,
 * contact details, and program data (pulled from cmba.ab.ca). The public
 * sub-pages reference these so CMBA+ links out to the association's real
 * resources (registration, courses, rules, calendar) instead of placeholders.
 *
 * Note: copy in this file intentionally avoids em/en dashes.
 */

export const CMBA = {
  siteUrl: "https://cmba.ab.ca",
  email: "league@cmba.ab.ca",
  emailHref: "mailto:league@cmba.ab.ca",
  phone: "(403) 804-3396",
  phoneHref: "tel:+14038043396",
  address: "PO Box 24150 Calgary RPO, Evergreen, AB T2Y 0J9",
  officeHours: [
    { day: "Monday", hours: "10:00 AM to 8:00 PM" },
    { day: "Tuesday to Thursday", hours: "10:00 AM to 6:00 PM" },
    { day: "Friday", hours: "8:00 AM to 4:00 PM" },
    { day: "Saturday", hours: "8:00 AM to 6:00 PM" },
    { day: "Sunday", hours: "Closed" },
  ],
  social: {
    instagram: "https://www.instagram.com/cmbabasketball/",
    facebook: "https://www.facebook.com/calgaryminorbasketball/",
    youtube: "https://www.youtube.com/channel/UC9PtfPcCTZySvbFLK8trHNw/",
  },
} as const;

/* Real age groups CMBA runs (Tykes through U18). */
export const AGE_GROUPS = ["Tykes", "U11", "U13", "U15", "U18"] as const;

/* TeamLinkt registration (CMBA's real registration platform). */
export const REGISTER = {
  player:
    "https://app.teamlinkt.com/register/find/calgaryminorbasketballassociation?cid=62203",
  coach:
    "https://app.teamlinkt.com/register/find/calgaryminorbasketballassociation?cid=62196",
  weeknightTeam:
    "https://app.teamlinkt.com/register/find/calgaryminorbasketballassociation?cid=62188",
  weekendTeam:
    "https://app.teamlinkt.com/register/find/calgaryminorbasketballassociation?cid=63190",
  zonesAndSchedules:
    "https://leagues.teamlinkt.com/calgaryminorbasketballassociation/390906",
} as const;

/* CMBA online courses (hosted on reach360). */
export const COURSES = {
  coachTrainingRegister:
    "https://cmba.reach360.com/register/78e6dd48-3cb8-4988-be05-6563e849cf4b",
  coachTraining:
    "https://cmba.reach360.com/share/course/55ed3dd3-87dc-44e0-b300-2fb0e60ec743",
  spectator:
    "https://cmba.reach360.com/share/course/60269d65-63f4-4edb-9a9f-8d01d170025c",
  introOfficiating:
    "https://cmba.reach360.com/share/course/2adf207a-4b56-48dd-9154-f671aa5ddbd8",
  safeInteractions:
    "https://cmba.reach360.com/share/course/fc129e16-b677-4be8-b2ab-733ade3ee23a",
  // Native CMBA Connect page (recreated from the course content), not cmba.ab.ca.
  managingTheMoment: "/coach/managing-the-moment",
} as const;

/* Key rules, policies, and calendar documents. */
export const DOCS = {
  officialCalendar: "https://cmba.ab.ca/content/cmba-official-calendar",
  rulesOfPlay:
    "https://cloud.rampinteractive.com/calgaryminorbasketball/files/CMBA%20Rules%20and%20Policies/7%20Rules%20of%20Play.pdf",
  fees: "https://cloud.rampinteractive.com/calgaryminorbasketball/files/CMBA%20Rules%20and%20Policies/3%20Fees.pdf",
  concussion:
    "https://cloud.rampinteractive.com/calgaryminorbasketball/files/CMBA%20Rules%20and%20Policies/CMBA%20Concussion%20Policy%20-%20update%20Jan%202023.pdf",
  mercy40:
    "https://docs.google.com/document/d/1Btp1dkS395yFt0bj3P2461OBvzleZlGTRMhCmbBpUWY/edit",
  forfeit: "/rules", // native — the Forfeit policy is published in the Rules hub

  ruleOfTwo: "https://coach.ca/understanding-rule-two",
  u11Mods:
    "https://docs.google.com/document/d/1u9YE_P63zV160g1k2Tdt5uDgicFAZZvHVB7rEbi0YTE/edit",
  u13Mods:
    "https://cloud.rampinteractive.com/calgaryminorbasketball/files/CMBA%20Rules%20and%20Policies/7.2%20u13%20mods%20%281%29.pdf",
  u15Mods:
    "https://cloud.rampinteractive.com/calgaryminorbasketball/files/CMBA%20Rules%20and%20Policies/7.3%20U15%20Mods.pdf",
  u18Mods:
    "https://cloud.rampinteractive.com/calgaryminorbasketball/files/CMBA%20Rules%20and%20Policies/7.4%20U18%20Mods.pdf",
  ruleModsGuide:
    "https://docs.google.com/spreadsheets/d/1h8YH_8uC73gUOVxXkg-L2t2gnqzsQ833/edit",
  leadership: "/leadership", // native Leadership & Board page
  boardContacts: "/leadership", // native Leadership & Board page

  meetingMinutes: "https://cmba.ab.ca/content/meeting-info-amp-minutes",
  sccCodeOfConduct: "/rules", // native — the SCC Code of Conduct is in the Rules hub

  sccReportDatabase: "https://cmba.ab.ca/content/scc-report-database",
  gameReportForm: "https://cmba.ab.ca/form/1953",
  springLeague: "https://cmba.ab.ca/content/2026-spring-league-technical-package",
  summerCamps: "https://cmba.ab.ca/content/summer-camps-2026-information-package",
} as const;

/* Coach's Corner resources. */
export const COACH = {
  mandatoryTraining: COURSES.coachTrainingRegister,
  essentialsWorkbook:
    "https://cloud.rampinteractive.com/calgaryminorbasketball/files/Coaches/CMBA%20Essentials%20Coaching%20Workbook.pdf",
  scoreReporting:
    "https://cloud.rampinteractive.com/calgaryminorbasketball/files/CMBA%20Rules%20and%20Policies/B.3.%20Score%20Reporting.pdf",
  gameSheet:
    "https://cloud.rampinteractive.com/calgaryminorbasketball/files/CMBA%20Rules%20and%20Policies/TeamLinkt%20CMBA%20Score%20Sheet%20.pdf",
  drillsYouTube:
    "https://www.youtube.com/channel/UC9PtfPcCTZySvbFLK8trHNw/playlists",
  cspDrills: "https://sites.google.com/cmba.ab.ca/cmbacsp/home",
  emergencyActionPlan:
    "https://cloud.rampinteractive.com/calgaryminorbasketball/files/CMBA%20Rules%20and%20Policies/Emergency%20Action%20Plan.pdf",
  aedLocations:
    "https://docs.google.com/spreadsheets/d/19C6WRDzhhyiCTuDqGNukwmrcVCPIGm98nUwk0O8ci8k/edit",
  womenInCoaching: "https://cmba.ab.ca/content/coach-women-in-coaching",
  blueWhistle:
    "https://docs.google.com/document/d/10zs3kPbEJuGDlJpNOH4F41w9D7V52vExRmwcTcfTSaI/edit",
} as const;

/* Athlete Development Guides (per age group) + master guide and intro video. */
export const DEV_GUIDES = {
  intro: "https://youtu.be/kXn94inLsgw",
  master:
    "https://docs.google.com/document/d/1nXJshJBCVE62US60qdLsI1MwShBYD5bFqgnvONf76h8/edit",
  tykes:
    "https://docs.google.com/document/d/105Tvt1BxAGx0hLAHus3FUnKPZqEy3oaaBUF4rXgw7Lw/edit",
  u11: "https://docs.google.com/document/d/1D1H0Cob5SrN-F3ATuQMzXvAsu8y3szgZVnmoGF-5nLo/edit",
  u13: "https://docs.google.com/document/d/1a4v2-DB-Gjy986dKOdHjxRkVIr-qdFbUYnqaWL3d99Q/edit",
  u15: "https://docs.google.com/document/d/1Fbj89O8P97b3wM8y4YYU8WDdVdLQEj5s6Vfp9UvI7O4/edit",
  u18: "https://docs.google.com/document/d/1UWz0AC26ug3y0ieg6egBmJ0WGYfu-eRLypIAXAldL8U/edit",
} as const;

/* Athlete Development report cards (per age group). */
export const REPORT_CARDS = {
  tykes: "https://drive.google.com/file/d/1D9-RS1jXtXeiDzt7CJztAk7Wc5TbTnev/view",
  u11: "https://drive.google.com/file/d/1vvkMgIENiVCHEUoxRTzZ4QrURae9GamV/view",
  u13: "https://drive.google.com/file/d/1vi6nlb8i9EMh5_Kij6Qat06_PIqUCIbM/view",
  u15: "https://drive.google.com/file/d/1lg2hHb-nfTFQgI8UrjT3eHog1F_pQCl2/view",
  u18: "https://drive.google.com/file/d/1csInRuvGW-l223bmU_Z11xyH9DoTz7hE/view",
} as const;

/* Family / community support resources referenced by CMBA. */
export const SUPPORT = {
  kidSport: "https://kidsportcanada.ca/alberta/calgary/",
  kidsHelpPhone: "https://kidshelpphone.ca/",
  coachCa: "https://coach.ca/",
} as const;

/* Referee's Room resources. */
export const REF = {
  handbook:
    "https://docs.google.com/document/d/1ESAbGODaw42SLsJUvF1P8iZupQZw7FlbIVQDnAp-t8k/edit",
  assigning: "https://cmba.rampassigning.com",
  introCourse: COURSES.introOfficiating,
  minorOfficials:
    "https://cloud.rampinteractive.com/calgaryminorbasketball/files/CMBA%20Rules%20and%20Policies/B.1.%20Minor%20Officials.pdf",
  ruleModsGuide: DOCS.ruleModsGuide,
  wageForm:
    "https://docs.google.com/forms/d/e/1FAIpQLScdmYtPpC-i2073rSAKN_tW8dStAc8_ktWzQPrxyfVVSlterg/viewform",
} as const;
