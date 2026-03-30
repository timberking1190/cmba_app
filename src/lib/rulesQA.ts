// Smart Rules Q&A Engine — provides direct Siri-like answers to rules questions
// Falls back to keyword search when no direct match is found

import { searchRules } from "./rulesData";

export interface DirectAnswer {
  answer: string;
  ruleReference: string;
  confidence: "high" | "medium";
  sourceDocId?: string;
  followUp?: string;
}

export interface QAResult {
  directAnswer: DirectAnswer | null;
  searchResults: ReturnType<typeof searchRules>;
}

// Division alias mapping
const divisionAliases: Record<string, string[]> = {
  u11: ["u11", "u-11", "under 11", "under-11", "u 11"],
  u13: ["u13", "u-13", "under 13", "under-13", "u 13"],
  u15: ["u15", "u-15", "under 15", "under-15", "u 15"],
  u18: ["u18", "u-18", "under 18", "under-18", "u 18"],
  tykes: ["tykes", "tyke", "u8", "u-8", "under 8"],
  platinum: ["platinum", "plat"],
};

function detectDivision(q: string): string | null {
  const lower = q.toLowerCase();
  for (const [div, aliases] of Object.entries(divisionAliases)) {
    for (const alias of aliases) {
      if (lower.includes(alias)) return div;
    }
  }
  return null;
}

function normalize(q: string): string {
  return q.toLowerCase().replace(/[?!.,'"]/g, "").trim();
}

// Knowledge base of Q&A rules derived from actual CMBA rule documents
const qaKnowledgeBase: {
  patterns: RegExp[];
  division?: string | string[];
  answer: string;
  ruleRef: string;
  docId?: string;
}[] = [
  // ===== PRESSING RULES =====
  {
    patterns: [/press.*u11/i, /u11.*press/i, /can.*press.*under.?11/i, /full.?court.*press.*u11/i, /u11.*full.?court/i],
    division: "u11",
    answer: "No, you may not press at U11. U11 rules require strict person-to-person defense with no double-teaming or traps allowed. Each defensive player must guard one offensive player and maintain gap distance (two arm lengths). Full-court pressing is not permitted.",
    ruleRef: "Rule 7.1.9.1 — 7.1.9.6 (U11 Rule Modifications)",
    docId: "1u9YE_P63zV160g1k2Tdt5uDgicFAZZvHVB7rEbi0YTE",
  },
  {
    patterns: [/press.*u13/i, /u13.*press/i, /can.*press.*under.?13/i, /full.?court.*press.*u13/i],
    division: "u13",
    answer: "It depends on the division. Full-court person-to-person press is allowed in U13 Boys Divisions 1, 2, 3 and U13 Girls Divisions 1, 2 only. Double-teaming the ball carrier is allowed once in play in those divisions. Pressing is NOT allowed once a team leads by 20+ points.",
    ruleRef: "Rule 7.2.8 — 7.2.8.3 (U13 Rule Modifications)",
    docId: "1EentMpd_z1mZgM3fislK3tVjlvEY2g-Bag5yf5iYiuw",
  },
  {
    patterns: [/press.*u15/i, /u15.*press/i, /can.*press.*under.?15/i, /full.?court.*press.*u15/i],
    division: "u15",
    answer: "Yes. All U15 divisions may employ a person-to-person or zone press. However, after the offensive team reaches their front court, defense must revert to person-to-person coverage (double-teaming the ball carrier is allowed). Pressing is NOT allowed once a team leads by 20+ points.",
    ruleRef: "Rule 7.3.7 — 7.3.7.2 (U15 Rule Modifications)",
    docId: "1aVzFZaOWFRsSfrBXmCQiy3A-6dcROLEmt3zvSK5Gol4",
  },
  {
    patterns: [/press.*u18/i, /u18.*press/i, /can.*press.*under.?18/i, /full.?court.*press.*u18/i],
    division: "u18",
    answer: "Yes, full-court pressing is allowed at U18. However, pressing is NOT allowed once a team leads by 20+ points. Teams that continue to press when ahead by 20+ points will receive a warning, and if they disregard the warning, a technical foul will be assessed.",
    ruleRef: "Rule 7.4.4 — 7.4.4.1 (U18 Rule Modifications)",
    docId: "1YUnX7Fw5VTG-fcwD-JOoKHuUZb21MG7rTVz3oEHgw0Q",
  },
  {
    patterns: [/press.*platinum/i, /platinum.*press/i],
    answer: "Yes, zone pressing and zone defense are permitted in Platinum League. However, no team shall press when up by 20 or more points. A warning is issued first, then a technical foul if the warning is disregarded.",
    ruleRef: "Rule 7.5.5 (Platinum League Rules)",
    docId: "1sw25-UpDfMS96jGyQLbZiP7WSf9bAETo8VtpADAMuCo",
  },

  // ===== ZONE DEFENSE =====
  {
    patterns: [/zone.*defense.*u11/i, /u11.*zone/i, /can.*play.*zone.*u11/i],
    division: "u11",
    answer: "No. U11 must play strict person-to-person defense. Each defensive player must guard one offensive player. No double-teaming, no traps, and no zone defense is permitted.",
    ruleRef: "Rule 7.1.9.1 — 7.1.9.3 (U11 Rule Modifications)",
    docId: "1u9YE_P63zV160g1k2Tdt5uDgicFAZZvHVB7rEbi0YTE",
  },
  {
    patterns: [/zone.*defense.*u13/i, /u13.*zone/i, /can.*play.*zone.*u13/i],
    division: "u13",
    answer: "No. All U13 divisions must employ person-to-person defense. Zone defense is considered illegal defense at U13. Triple-teaming the ball carrier in the front court is deemed zone defense and is not allowed.",
    ruleRef: "Rule 7.2.5 — 7.2.7 (U13 Rule Modifications)",
    docId: "1EentMpd_z1mZgM3fislK3tVjlvEY2g-Bag5yf5iYiuw",
  },
  {
    patterns: [/zone.*defense.*u15/i, /u15.*zone/i, /can.*play.*zone.*u15/i],
    division: "u15",
    answer: "No. All U15 divisions must employ person-to-person defense. Zone defense is considered illegal defense at U15. Triple-teaming the ball carrier in the front court is deemed zone defense and is not allowed. However, a zone press is allowed in the backcourt.",
    ruleRef: "Rule 7.3.4 — 7.3.7 (U15 Rule Modifications)",
    docId: "1aVzFZaOWFRsSfrBXmCQiy3A-6dcROLEmt3zvSK5Gol4",
  },
  {
    patterns: [/zone.*defense.*u18/i, /u18.*zone/i, /can.*play.*zone.*u18/i],
    answer: "U18 follows FIBA rules with CMBA modifications. Zone defense rules depend on the specific division — check with your zone president for division-specific rules.",
    ruleRef: "Rule 7.4 (U18 Rule Modifications)",
    docId: "1YUnX7Fw5VTG-fcwD-JOoKHuUZb21MG7rTVz3oEHgw0Q",
  },
  {
    patterns: [/zone.*defense.*platinum/i, /platinum.*zone/i],
    answer: "Yes. Zone pressing and zone defense are both permitted in Platinum League.",
    ruleRef: "Rule 7.5.5 (Platinum League Rules)",
    docId: "1sw25-UpDfMS96jGyQLbZiP7WSf9bAETo8VtpADAMuCo",
  },

  // ===== DOUBLE TEAMING =====
  {
    patterns: [/double.?team.*u11/i, /u11.*double.?team/i, /can.*double.?team.*u11/i, /trap.*u11/i, /u11.*trap/i],
    division: "u11",
    answer: "No. No intentional double-teaming or traps on the ball carrier is allowed at U11. Any player without the ball also cannot be double-teamed. Each defensive player must be responsible for guarding one offensive player.",
    ruleRef: "Rule 7.1.9.1 — 7.1.9.3 (U11 Rule Modifications)",
    docId: "1u9YE_P63zV160g1k2Tdt5uDgicFAZZvHVB7rEbi0YTE",
  },
  {
    patterns: [/double.?team.*u13/i, /u13.*double.?team/i, /can.*double.?team.*u13/i],
    division: "u13",
    answer: "At U13, any player WITHOUT the ball cannot be double-teamed. In divisions that allow full-court press (Boys Div 1-3, Girls Div 1-2), double-teaming the ball carrier is allowed once in play.",
    ruleRef: "Rule 7.2.6, 7.2.8.1 (U13 Rule Modifications)",
    docId: "1EentMpd_z1mZgM3fislK3tVjlvEY2g-Bag5yf5iYiuw",
  },
  {
    patterns: [/double.?team.*u15/i, /u15.*double.?team/i, /can.*double.?team.*u15/i],
    division: "u15",
    answer: "At U15, any player WITHOUT the ball cannot be double-teamed. However, double-teaming the ball carrier is allowed. Triple-teaming the ball carrier in the front court is not allowed (deemed zone defense).",
    ruleRef: "Rule 7.3.5 — 7.3.6 (U15 Rule Modifications)",
    docId: "1aVzFZaOWFRsSfrBXmCQiy3A-6dcROLEmt3zvSK5Gol4",
  },

  // ===== BALL SIZE =====
  {
    patterns: [/ball.?size.*u11/i, /u11.*ball.?size/i, /what.*ball.*u11/i, /u11.*ball/i],
    division: "u11",
    answer: "U11 uses a Size 5 (27\") basketball for both boys and girls.",
    ruleRef: "Rule 7.1.2 (U11 Rule Modifications)",
    docId: "1u9YE_P63zV160g1k2Tdt5uDgicFAZZvHVB7rEbi0YTE",
  },
  {
    patterns: [/ball.?size.*u13/i, /u13.*ball.?size/i, /what.*ball.*u13/i, /u13.*ball/i],
    division: "u13",
    answer: "U13 uses a Size 6 (28.5\") basketball for both boys and girls.",
    ruleRef: "Rule 7.2.1 (U13 Rule Modifications)",
    docId: "1EentMpd_z1mZgM3fislK3tVjlvEY2g-Bag5yf5iYiuw",
  },
  {
    patterns: [/ball.?size.*u15/i, /u15.*ball.?size/i, /what.*ball.*u15/i, /u15.*ball/i],
    division: "u15",
    answer: "U15 Girls use a Size 6 (28.5\") basketball. U15 Boys use a Size 7 (29.5\") basketball.",
    ruleRef: "Rule 7.3.1 (U15 Rule Modifications)",
    docId: "1aVzFZaOWFRsSfrBXmCQiy3A-6dcROLEmt3zvSK5Gol4",
  },
  {
    patterns: [/ball.?size.*u18/i, /u18.*ball.?size/i, /what.*ball.*u18/i, /u18.*ball/i],
    division: "u18",
    answer: "U18 Girls use a Size 6 (28.5\") basketball. U18 Boys use a Size 7 (29.5\") basketball.",
    ruleRef: "Rule 7.4.1 (U18 Rule Modifications)",
    docId: "1YUnX7Fw5VTG-fcwD-JOoKHuUZb21MG7rTVz3oEHgw0Q",
  },

  // ===== HOOP HEIGHT =====
  {
    patterns: [/hoop.*height.*u11/i, /u11.*hoop/i, /rim.*height.*u11/i, /basket.*height.*u11/i, /how.*high.*hoop.*u11/i],
    division: "u11",
    answer: "U11 hoop height is 8 feet 6 inches (8'6\").",
    ruleRef: "Rule 7.1.3 (U11 Rule Modifications)",
    docId: "1u9YE_P63zV160g1k2Tdt5uDgicFAZZvHVB7rEbi0YTE",
  },

  // ===== SCREENING =====
  {
    patterns: [/screen.*u11/i, /u11.*screen/i, /can.*screen.*u11/i, /pick.*u11/i, /u11.*pick/i],
    division: "u11",
    answer: "No. There is no screening on or off the ball in U11.",
    ruleRef: "Rule 7.1.10 (U11 Rule Modifications)",
    docId: "1u9YE_P63zV160g1k2Tdt5uDgicFAZZvHVB7rEbi0YTE",
  },

  // ===== GAME FORMAT =====
  {
    patterns: [/how.*many.*player.*u11/i, /u11.*player.*court/i, /u11.*format/i, /4.*vs.*4.*u11/i, /u11.*4.*4/i],
    division: "u11",
    answer: "U11 games are played in a 4 vs. 4 format with a minimum of 4 players per team. All U11 games follow the 3-Minute Shifts format.",
    ruleRef: "Rule 7.1.1, 7.1.5, 7.1.6 (U11 Rule Modifications)",
    docId: "1u9YE_P63zV160g1k2Tdt5uDgicFAZZvHVB7rEbi0YTE",
  },

  // ===== QUARTER LENGTH =====
  {
    patterns: [/quarter.*length.*u13/i, /u13.*quarter/i, /how.*long.*game.*u13/i, /game.*time.*u13/i],
    division: "u13",
    answer: "U13 games consist of four 10-minute quarters: 8 minutes running time plus 2 minutes stop time at the end of each quarter. There is a 3-minute halftime break.",
    ruleRef: "Rule 7.2.2 — 7.2.2.3 (U13 Rule Modifications)",
    docId: "1EentMpd_z1mZgM3fislK3tVjlvEY2g-Bag5yf5iYiuw",
  },
  {
    patterns: [/quarter.*length.*u15/i, /u15.*quarter/i, /how.*long.*game.*u15/i, /game.*time.*u15/i],
    division: "u15",
    answer: "U15 games consist of four 10-minute quarters: 8 minutes running time plus 2 minutes stop time at the end of each quarter. There is a 3-minute halftime break.",
    ruleRef: "Rule 7.3.2 — 7.3.2.3 (U15 Rule Modifications)",
    docId: "1aVzFZaOWFRsSfrBXmCQiy3A-6dcROLEmt3zvSK5Gol4",
  },
  {
    patterns: [/quarter.*length.*u18/i, /u18.*quarter/i, /how.*long.*game.*u18/i, /game.*time.*u18/i],
    division: "u18",
    answer: "U18 games consist of four 10-minute quarters: 8 minutes running time plus 2 minutes stop time at the end of each quarter. There is a 3-minute halftime break.",
    ruleRef: "Rule 7.4.2 — 7.4.2.3 (U18 Rule Modifications)",
    docId: "1YUnX7Fw5VTG-fcwD-JOoKHuUZb21MG7rTVz3oEHgw0Q",
  },

  // ===== TIMEOUTS =====
  {
    patterns: [/time.?out.*u13/i, /u13.*time.?out/i, /how.*many.*time.?out.*u13/i],
    division: "u13",
    answer: "Each U13 team gets 2 timeouts in the first half and 2 timeouts in the second half. No carry over.",
    ruleRef: "Rule 7.2.4 (U13 Rule Modifications)",
    docId: "1EentMpd_z1mZgM3fislK3tVjlvEY2g-Bag5yf5iYiuw",
  },
  {
    patterns: [/time.?out.*u15/i, /u15.*time.?out/i, /how.*many.*time.?out.*u15/i],
    division: "u15",
    answer: "Each U15 team gets 2 timeouts in the first half and 2 timeouts in the second half. No carry over.",
    ruleRef: "Rule 7.3.3 (U15 Rule Modifications)",
    docId: "1aVzFZaOWFRsSfrBXmCQiy3A-6dcROLEmt3zvSK5Gol4",
  },
  {
    patterns: [/time.?out.*u18/i, /u18.*time.?out/i, /how.*many.*time.?out.*u18/i],
    division: "u18",
    answer: "Each U18 team gets 2 timeouts in the first half and 2 timeouts in the second half. No carry over.",
    ruleRef: "Rule 7.4.3 (U18 Rule Modifications)",
    docId: "1YUnX7Fw5VTG-fcwD-JOoKHuUZb21MG7rTVz3oEHgw0Q",
  },
  {
    patterns: [/time.?out.*platinum/i, /platinum.*time.?out/i],
    answer: "Each Platinum League team gets 2 timeouts in the first half and 3 timeouts in the second half. No carry over. Teams lose one timeout if they have 3 remaining at the 2-minute mark.",
    ruleRef: "Rule 7.5.4 (Platinum League Rules)",
    docId: "1sw25-UpDfMS96jGyQLbZiP7WSf9bAETo8VtpADAMuCo",
  },

  // ===== MERCY RULE =====
  {
    patterns: [/mercy/i, /40.*point/i, /point.*spread/i, /running.*up.*score/i, /lopsided/i, /blow.?out/i],
    answer: "If one team reaches a 40-point lead at any time, the game is stopped immediately. The team in the lead is credited with the win. The score is recorded as 40-0. The scoreboard is zeroed out and play continues for the remaining time with all rules still in effect. Additionally, when the spread reaches 20 points in U11 or 25 points in U13-U18, coaches should employ sportsmanship strategies (e.g., pass 5 times before shooting, no fast breaks, weak hand only).",
    ruleRef: "CMBA 40 Point Game Spread Mercy Policy",
    docId: "1Btp1dkS395yFt0bj3P2461OBvzleZlGTRMhCmbBpUWY",
  },

  // ===== OVERTIME =====
  {
    patterns: [/overtime/i, /tied.*game/i, /game.*tied/i, /tie.*break/i],
    answer: "There is NO regular season overtime — ties stand. In playoffs, overtime starts immediately with a jump ball. The first team to score 4 points or the team leading after a 3-minute running period wins. If still tied after 3 minutes, sudden death begins — first team to score any point wins. Each team gets one 1-minute timeout for the entire overtime.",
    ruleRef: "Playoff Overtime Rules",
    docId: "1yYmZ0WQ7qifisqYVw0CRiVviOK8t7ufvmF72_BjV4SI",
  },

  // ===== JEWELRY =====
  {
    patterns: [/jewelry/i, /jewellery/i, /earring/i, /necklace/i, /bracelet/i, /ring/i, /watch/i],
    answer: "Players may not participate while wearing jewelry. Religious medals must be taped and worn under the uniform. Medical alert medals must be taped but may be visible. Head coverings worn for medical or religious reasons are permitted if they are not abrasive, hard, or dangerous.",
    ruleRef: "CMBA Jewelry Policy",
    docId: "17nI722Aw3T9lgy_CwHQ5ww3PGExMRDR6n7Jhe7SqZFI",
  },

  // ===== CONCUSSION =====
  {
    patterns: [/concussion/i, /head.*injur/i, /bump.*head/i, /hit.*head/i],
    answer: "Any impact to the head results in the player being immediately removed from the game. CMBA strongly recommends seeing a concussion specialist before returning to play. Return-to-play follows a 6-step protocol: (1) complete rest, (2) light aerobic exercise, (3) sport-specific activities, (4) drills without contact, (5) drills with contact, (6) game play with medical clearance. Each step takes a minimum of one day.",
    ruleRef: "CMBA Concussion Policy / Return to Play Protocol",
    docId: "1YFjNhs-I-WlCQAixNtUibmWNp2cbmxgyRSo-IzshTMk",
  },

  // ===== PLAYING TIME =====
  {
    patterns: [/playing.*time/i, /equal.*time/i, /play.*every.*quarter/i, /fair.*play/i, /minutes.*each.*player/i],
    answer: "All players must play a similar amount of time in each game, and all players must play a part of every quarter. Any individual player who plays significantly more time than others is deemed unsportsmanlike and is subject to discipline by the SCC. Variables like shortened rosters, injuries, or illness may affect this — coaches should inform referees and opponents before the game.",
    ruleRef: "Section 7 Rules of Play — CMBA Playing Time Guidelines",
    docId: "1TzEoUhjRvPaj1AeTewYEWSCw5piTzU_DNtg1-4yOE_8",
  },

  // ===== COACHES ON BENCH =====
  {
    patterns: [/how.*many.*coach/i, /bench.*personnel/i, /coach.*bench/i, /coach.*stand/i],
    answer: "Maximum 3 adult coaches on the bench during a game. Only one coach may stand at a time. Only the head coach may address the officials. Assistant coaches who address the officials may be assessed a technical foul.",
    ruleRef: "Section 7 Rules of Play — Bench Personnel (FIBA Rule 7.3-7.7)",
    docId: "1TzEoUhjRvPaj1AeTewYEWSCw5piTzU_DNtg1-4yOE_8",
  },

  // ===== ILLEGAL DEFENSE =====
  {
    patterns: [/illegal.*defen[sc]e/i, /what.*illegal.*defen/i],
    answer: "Except where zone defense is permitted, all players must play person-to-person defense. Illegal defense includes covering a section of floor and/or not covering your opponent. Help-side defense and sagging from a player not actively involved in play is permitted. The call is based on the intent of the play and is at the referees' discretion.",
    ruleRef: "Section 7 Rules of Play — Definition of Illegal Defense",
    docId: "1TzEoUhjRvPaj1AeTewYEWSCw5piTzU_DNtg1-4yOE_8",
  },

  // ===== GAME REPORTS =====
  {
    patterns: [/game.*report/i, /report.*incident/i, /how.*report/i, /file.*complaint/i],
    answer: "Any incidents involving a player, coach, referee, or spectator should be reported by both teams and the referees via game report on the CMBA website within 48 hours of occurrence. Failure to comply may delay action and/or lead to further action.",
    ruleRef: "Rule 8.3.1 (Section 8 Discipline)",
    docId: "1PQ5poyr8TC81il2h1Y9SAZ9ght_hJHr0rsQN3drTdCc",
  },

  // ===== TECHNICAL FOULS =====
  {
    patterns: [/technical.*foul/i, /what.*happen.*technical/i, /tech.*foul/i],
    answer: "Technical fouls are recorded on the score sheet with the player's number and nature of the foul (e.g., language, excessive arguing). Score sheets containing technical fouls must be submitted to the CMBA office by both teams by business close on Monday following the game.",
    ruleRef: "Rule 5.2.4 — 5.2.5 (Section 5 Participation)",
    docId: "1moGM1wVFvjVTuCnEgnPd0ZZxA2taf9t5ig1ebN0gbwk",
  },

  // ===== FORFEITS =====
  {
    patterns: [/forfeit/i, /not.*enough.*player/i, /team.*not.*show/i, /no.?show/i],
    answer: "If a team cannot field the minimum number of players or doesn't show up, the opposing team is awarded a forfeit win. A $300 fee is charged to the forfeiting team and given to the opposing team. A team that fails to show for 2 scheduled games will be asked to withdraw from league play.",
    ruleRef: "Rule 5.3.1 — 5.3.4 (Section 5 Participation)",
    docId: "1moGM1wVFvjVTuCnEgnPd0ZZxA2taf9t5ig1ebN0gbwk",
  },

  // ===== CALL UPS / GUEST PLAYERS =====
  {
    patterns: [/call.?up/i, /guest.*player/i, /play.?up/i, /borrow.*player/i, /short.*player/i],
    answer: "If a team has fewer than 8 available players, they may call up guest players who must be from the same zone, from the same or lower division/age group. Guest players may play a maximum of 2 games per team — a 3rd game makes them permanently part of that team. No guest players are allowed in playoffs.",
    ruleRef: "Rule 5.5.1 — 5.5.3 (Section 5 Participation)",
    docId: "1moGM1wVFvjVTuCnEgnPd0ZZxA2taf9t5ig1ebN0gbwk",
  },

  // ===== UNIFORMS =====
  {
    patterns: [/uniform/i, /jersey/i, /what.*wear/i, /dress.*code/i, /pinnie/i],
    answer: "Each player must wear a team shirt or jersey with visible numbers on front and back. Players without proper uniforms are ineligible. Teams need either reversible jerseys, two sets of tops (light and dark), or at least 7 pinnies. Home teams wear light, away teams wear dark. No cut-offs, jams, tear-away shorts, pockets, or belt loops.",
    ruleRef: "Rule 5.1.2 (Section 5 Participation)",
    docId: "1moGM1wVFvjVTuCnEgnPd0ZZxA2taf9t5ig1ebN0gbwk",
  },

  // ===== WHITE WHISTLE =====
  {
    patterns: [/white.*whistle/i, /new.*referee/i, /ref.*training/i],
    answer: "The White Whistle Program identifies new basketball officials. Any referee wearing a white whistle is NOT to be approached or have negative comments directed towards them before, during, or after games. CMBA invests significant funds and hours recruiting, developing, and retaining new referees.",
    ruleRef: "CMBA White Whistle Program",
    docId: "1buBUAIZO0CQH6WRK5LE1HuHxzlCS5WpUtOXJ9XKO3Vo",
  },

  // ===== SPECTATOR RULES =====
  {
    patterns: [/spectator/i, /parent.*game/i, /sideline.*behav/i, /noise.*device/i, /airhorn/i, /drum/i],
    answer: "Spectators must watch from the side opposite team benches. No artificial noise devices (whistles, drums, horns, airhorns) are permitted. Spectators may not cross the court after a game to voice displeasure with officiating. Spectators who interfere may be asked to leave — refusal results in a technical foul to the coach and possible game forfeiture.",
    ruleRef: "Rule 5.6 (Section 5 Participation)",
    docId: "1moGM1wVFvjVTuCnEgnPd0ZZxA2taf9t5ig1ebN0gbwk",
  },

  // ===== FOUL LINE =====
  {
    patterns: [/foul.*line.*u11/i, /u11.*foul.*line/i, /free.*throw.*line.*u11/i],
    division: "u11",
    answer: "U11 foul line is 15 feet from the baseline, or 3 feet closer than the marked foul line.",
    ruleRef: "Rule 7.1.4 (U11 Rule Modifications)",
    docId: "1u9YE_P63zV160g1k2Tdt5uDgicFAZZvHVB7rEbi0YTE",
  },
  {
    patterns: [/foul.*line.*u13/i, /u13.*foul.*line/i, /free.*throw.*line.*u13/i],
    division: "u13",
    answer: "U13 foul line is 13 feet from the backboard (16 feet from baseline), or 2 feet closer than the marked foul line.",
    ruleRef: "Rule 7.2.3 (U13 Rule Modifications)",
    docId: "1EentMpd_z1mZgM3fislK3tVjlvEY2g-Bag5yf5iYiuw",
  },

  // ===== SUSPENSION / DISCIPLINE =====
  {
    patterns: [/suspend/i, /suspension.*appeal/i, /appeal.*suspend/i, /disciplin/i],
    answer: "CMBA uses progressive discipline: (1) Warning, (2) Suspension, (3) Extended suspension, (4) Indefinite suspension. Steps may be bypassed for serious incidents. Suspended parties cannot be in the facility before, during, or after games. Appeals must be filed within 24 hours with a $100 bond (returned if successful). The Executive Appeals Committee can uphold, reduce, increase, or rescind a suspension.",
    ruleRef: "Rule 8.3 — 8.5 (Section 8 Discipline)",
    docId: "1PQ5poyr8TC81il2h1Y9SAZ9ght_hJHr0rsQN3drTdCc",
  },

  // ===== SCORE REPORTING =====
  {
    patterns: [/report.*score/i, /enter.*score/i, /submit.*score/i, /score.*report/i],
    answer: "Both teams are equally responsible to enter the game score and upload the game sheet online immediately after the game. If neither team enters the score by 8:00 PM on the Saturday of the game, it will be permanently recorded as not played.",
    ruleRef: "Rule 5.4 (Section 5 Participation)",
    docId: "1moGM1wVFvjVTuCnEgnPd0ZZxA2taf9t5ig1ebN0gbwk",
  },

  // ===== FIBA RULES =====
  {
    patterns: [/fiba/i, /what.*rules.*follow/i, /which.*rules/i],
    answer: "CMBA games are played under current FIBA Official Basketball Rules with specific modifications for each division. Where matters are not specified in CMBA rules, Canada Basketball and FIBA rules apply in that order.",
    ruleRef: "Section 1 General Information / Section 7 Rules of Play",
    docId: "1TzEoUhjRvPaj1AeTewYEWSCw5piTzU_DNtg1-4yOE_8",
  },

  // ===== HELP-SIDE DEFENSE =====
  {
    patterns: [/help.?side.*u11/i, /u11.*help/i, /can.*help.*defense.*u11/i],
    division: "u11",
    answer: "Yes, help-side defense is allowed at U11. A player may leave their check to help on an opposing player entering the key with the ball. If the ball leaves the key, the help side should too. Stopping the ball in the key is NOT considered a double team.",
    ruleRef: "Rule 7.1.9.6 (U11 Rule Modifications)",
    docId: "1u9YE_P63zV160g1k2Tdt5uDgicFAZZvHVB7rEbi0YTE",
  },

  // ===== GAP DISTANCE =====
  {
    patterns: [/gap.*distance/i, /arm.*length/i, /how.*close.*defend.*u11/i, /defense.*distance.*u11/i, /sag.*u11/i],
    division: "u11",
    answer: "At U11, on-ball defenders must be at maximum two arm lengths away from the ball carrier (gap distance). Off-ball defenders must move when their offensive player moves and should only have one foot in the key if their check is off the lane. No excessive sagging on or off the ball.",
    ruleRef: "Rule 7.1.9.4 — 7.1.9.5 (U11 Rule Modifications)",
    docId: "1u9YE_P63zV160g1k2Tdt5uDgicFAZZvHVB7rEbi0YTE",
  },

  // ===== PLAYOFFS =====
  {
    patterns: [/playoff/i, /city.*champion/i, /post.?season/i],
    answer: "All teams qualify for CMBA City Championships. No guest players (call-ups) are allowed in playoffs. CMBA creates divisions of 6 with emphasis on parity and development. Top 3 finishers in each division receive medals. Playing ineligible players in playoffs results in a forfeit; a second occurrence results in removal from playoffs.",
    ruleRef: "Rule 6.4 (Section 6 Games and Competition)",
    docId: "1pjMbTSGFzrGZAk9DOCdfE-AXR8IuWuZg7hPbNzPpo2M",
  },

  // ===== GYM MONITOR =====
  {
    patterns: [/gym.*monitor/i, /parent.*duty/i, /monitor.*duties/i],
    answer: "Gym monitors should: (1) Identify and meet the other gym monitor and referees, (2) Ensure all spectators are respectful, (3) Politely ask unruly spectators to stop — if they persist, unite with fellow monitor and ask them to leave, (4) Report any incidents on the game sheet. If there's an ejection, submit a game report online.",
    ruleRef: "Gym Monitor Duties",
    docId: "1VpDNpAhU_Lk0iKQnoF6mS9iyERfzk7FrpFUM697LDzY",
  },
];

// Generic press question without division
const genericPressQA = {
  answer: "Pressing rules vary by division:\n\n- **U11**: No pressing allowed. Strict person-to-person with gap distance.\n- **U13**: Full-court press allowed ONLY in Boys Div 1-3 and Girls Div 1-2.\n- **U15**: All divisions may press (person-to-person or zone press in backcourt).\n- **U18**: Full-court pressing is allowed.\n- **Platinum**: Zone pressing and zone defense both permitted.\n\nIn ALL divisions, pressing stops when a team leads by 20+ points.",
  ruleRef: "Rules 7.1-7.5 (Division Rule Modifications)",
};

export function answerQuestion(query: string): QAResult {
  const q = normalize(query);
  const searchResults = searchRules(query);

  // Try to find a direct answer from the knowledge base
  for (const entry of qaKnowledgeBase) {
    for (const pattern of entry.patterns) {
      if (pattern.test(q) || pattern.test(query)) {
        return {
          directAnswer: {
            answer: entry.answer,
            ruleReference: entry.ruleRef,
            confidence: "high",
            sourceDocId: entry.docId,
          },
          searchResults,
        };
      }
    }
  }

  // Handle generic "press" questions without a division
  if (/press/i.test(q) && !detectDivision(q)) {
    return {
      directAnswer: {
        answer: genericPressQA.answer,
        ruleReference: genericPressQA.ruleRef,
        confidence: "high",
      },
      searchResults,
    };
  }

  // Handle generic "zone defense" without a division
  if (/zone.*defen[sc]e/i.test(q) && !detectDivision(q)) {
    return {
      directAnswer: {
        answer: "Zone defense rules vary by division:\n\n- **U11**: Not allowed. Strict person-to-person only.\n- **U13**: Not allowed. Person-to-person only.\n- **U15**: Not allowed in half-court. Zone press is allowed in backcourt only.\n- **U18**: Follow FIBA rules with CMBA modifications.\n- **Platinum**: Zone defense is permitted.",
        ruleReference: "Rules 7.1-7.5 (Division Rule Modifications)",
        confidence: "high",
      },
      searchResults,
    };
  }

  // Handle generic "ball size" without division
  if (/ball.?size/i.test(q) && !detectDivision(q)) {
    return {
      directAnswer: {
        answer: "Ball sizes by division:\n\n- **U11**: Size 5 (27\") — boys and girls\n- **U13**: Size 6 (28.5\") — boys and girls\n- **U15 Girls**: Size 6 (28.5\") | **U15 Boys**: Size 7 (29.5\")\n- **U18 Girls**: Size 6 (28.5\") | **U18 Boys**: Size 7 (29.5\")\n- **Platinum**: Size 7 (29.5\")",
        ruleReference: "Rules 7.1-7.5 (Division Rule Modifications)",
        confidence: "high",
      },
      searchResults,
    };
  }

  // No direct answer found — return search results only
  return {
    directAnswer: null,
    searchResults,
  };
}
