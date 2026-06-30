/*
 * Basketball IQ starter question bank. Multiple-choice questions whose correct
 * answers are taken DIRECTLY from the authoritative CMBA rules Q&A (rulesQA.ts), so
 * the answer keys are accurate; the distractors are authored. This is a STARTER set
 * for staff to expand. Pure data (no DB), the rulesData/reach360CourseData pattern.
 */
export type IqQuestion = {
  id: string
  topic: string
  division?: 'u11' | 'u13' | 'u15' | 'u18' | 'all'
  question: string
  options: [string, string, string, string]
  /** Index into options of the correct answer. */
  correctIndex: 0 | 1 | 2 | 3
  ruleRef: string
}

export const BASKETBALL_IQ_QUESTIONS: IqQuestion[] = [
  {
    id: 'press-u11',
    topic: 'Defense',
    division: 'u11',
    question: 'In U11, what defense are teams required to play?',
    options: ['Strict person-to-person, no pressing', 'Full-court zone press', 'Any defense they choose', 'Person-to-person only in the front court'],
    correctIndex: 0,
    ruleRef: 'Rule 7.1.9 (U11 Rule Modifications)',
  },
  {
    id: 'ball-u11',
    topic: 'Equipment',
    division: 'u11',
    question: 'What size basketball does U11 use?',
    options: ['Size 5 (27")', 'Size 6 (28.5")', 'Size 7 (29.5")', 'Size 4 (25.5")'],
    correctIndex: 0,
    ruleRef: 'Rule 7.1.2 (U11 Rule Modifications)',
  },
  {
    id: 'hoop-u11',
    topic: 'Equipment',
    division: 'u11',
    question: 'What is the hoop height for U11?',
    options: ["8 feet 6 inches", "10 feet", "9 feet", "8 feet"],
    correctIndex: 0,
    ruleRef: 'Rule 7.1.3 (U11 Rule Modifications)',
  },
  {
    id: 'format-u11',
    topic: 'Game format',
    division: 'u11',
    question: 'How many players per side does a U11 game use?',
    options: ['4 vs. 4', '5 vs. 5', '3 vs. 3', '6 vs. 6'],
    correctIndex: 0,
    ruleRef: 'Rule 7.1.1 (U11 Rule Modifications)',
  },
  {
    id: 'screen-u11',
    topic: 'Offense',
    division: 'u11',
    question: 'Is screening allowed in U11?',
    options: ['No screening on or off the ball', 'Yes, both on and off the ball', 'Only off-ball screens', 'Only in the back court'],
    correctIndex: 0,
    ruleRef: 'Rule 7.1.10 (U11 Rule Modifications)',
  },
  {
    id: 'ball-u13',
    topic: 'Equipment',
    division: 'u13',
    question: 'What size basketball does U13 use (boys and girls)?',
    options: ['Size 6 (28.5")', 'Size 5 (27")', 'Size 7 (29.5")', 'Size 6 for girls, Size 7 for boys'],
    correctIndex: 0,
    ruleRef: 'Rule 7.2.1 (U13 Rule Modifications)',
  },
  {
    id: 'defense-u13',
    topic: 'Defense',
    division: 'u13',
    question: 'What defense must U13 teams play?',
    options: ['Person-to-person; zone is illegal defense', 'Zone defense', 'Any defense, including a box-and-one', 'Full-court zone press only'],
    correctIndex: 0,
    ruleRef: 'Rule 7.2.5 - 7.2.7 (U13 Rule Modifications)',
  },
  {
    id: 'ball-u15-boys',
    topic: 'Equipment',
    division: 'u15',
    question: 'What size basketball do U15 Boys use?',
    options: ['Size 7 (29.5")', 'Size 6 (28.5")', 'Size 5 (27")', 'Size 7 only in playoffs'],
    correctIndex: 0,
    ruleRef: 'Rule 7.3.1 (U15 Rule Modifications)',
  },
  {
    id: 'quarter-length',
    topic: 'Game format',
    division: 'all',
    question: 'In U13 to U18, how is each quarter timed?',
    options: ['10 minutes: 8 running + 2 stop time', 'A straight 8 minutes running', 'A straight 12 minutes', '15 minutes running'],
    correctIndex: 0,
    ruleRef: 'Rule 7.2.2 / 7.3.2 / 7.4.2',
  },
  {
    id: 'timeouts',
    topic: 'Game format',
    division: 'all',
    question: 'In U13 to U18, how many timeouts does each team get per half?',
    options: ['2 (no carry over)', '1', '3', '4'],
    correctIndex: 0,
    ruleRef: 'Rule 7.2.4 / 7.3.3 / 7.4.3',
  },
  {
    id: 'press-20',
    topic: 'Sportsmanship',
    division: 'all',
    question: 'When is a team NOT allowed to press, in every division that permits pressing?',
    options: ['When leading by 20 or more points', 'When trailing', 'During the first quarter', 'There is no such restriction'],
    correctIndex: 0,
    ruleRef: 'Rule 7.x.x (Pressing modifications)',
  },
  {
    id: 'mercy-40',
    topic: 'Sportsmanship',
    division: 'all',
    question: 'What happens when a team reaches a 40-point lead?',
    options: ['The game is stopped, the win is credited, and the score is recorded 40-0', 'Play continues normally to the buzzer', 'The lead is capped at 30 points', 'A technical foul is assessed to the leading team'],
    correctIndex: 0,
    ruleRef: 'CMBA 40 Point Game Spread Mercy Policy',
  },
  {
    id: 'overtime-regular',
    topic: 'Game format',
    division: 'all',
    question: 'What happens if a REGULAR-SEASON game is tied at the end?',
    options: ['The tie stands; there is no overtime', 'Sudden-death overtime begins', 'First team to 4 points wins', 'The fourth quarter is replayed'],
    correctIndex: 0,
    ruleRef: 'Playoff Overtime Rules (regular season: ties stand)',
  },
  {
    id: 'overtime-playoff',
    topic: 'Game format',
    division: 'all',
    question: 'How can a PLAYOFF overtime period be won?',
    options: ['First to 4 points, or leading after a 3-minute running period', 'First to 2 points', 'A full extra quarter is played', 'A free-throw shootout'],
    correctIndex: 0,
    ruleRef: 'Playoff Overtime Rules',
  },
]

/** Score an attempt: answers[i] is the chosen option index for question i (by order). */
export function scoreIqAttempt(questions: IqQuestion[], answers: Array<number | null | undefined>): { correct: number; total: number } {
  let correct = 0
  questions.forEach((q, i) => {
    if (answers[i] === q.correctIndex) correct++
  })
  return { correct, total: questions.length }
}
