/*
 * Maintained blocklist for arcade high-score names. Plain lowercase base forms,
 * no leetspeak (the filter normalizes input to this shape before matching, so
 * "f4ck", "F.U.C.K" and "fuuuck" all reduce to a base word here).
 *
 * Two tiers:
 *  - SUBSTRING: severe, evasion-prone terms (slurs, hard obscenities). Matched
 *    ANYWHERE inside the collapsed, space-stripped form so "xxslurxx" and
 *    "s l u r" are both caught. Keep these unambiguous so they rarely appear
 *    inside clean words.
 *  - WORD: matched only as a whole token. Milder or ambiguous terms that DO
 *    appear inside clean words ("hell" in "shell") live here to avoid nuking
 *    normal names, while still blocking them when used alone.
 *
 * No blocklist is perfect: leetspeak and spacing evolve, and context matters.
 * This is one layer of defense in depth alongside server authority, a safe
 * character set, URL/contact rejection, Turnstile, rate limits, public
 * reporting, and admin moderation. When something slips through, add it here
 * (one word per line) and it is live on the next deploy. Err toward rejection:
 * children play this game.
 */

// Severe terms: matched as a substring of the normalized, collapsed form.
export const BLOCKLIST_SUBSTRING: readonly string[] = [
  // sexual / obscene
  'fuck',
  'shit',
  'cunt',
  'cock',
  'dick',
  'pussy',
  'penis',
  'vagina',
  'boner',
  'cum',
  'jizz',
  'blowjob',
  'handjob',
  'anal',
  'anus',
  'rimjob',
  'dildo',
  'masturbat',
  'orgasm',
  'porn',
  'hentai',
  'creampie',
  'titties',
  'boobs',
  'nipple',
  'horny',
  'wank',
  'twat',
  'slut',
  'whore',
  'hooker',
  'bitch',
  'bastard',
  'asshole',
  'dumbass',
  'jackass',
  'bullshit',
  'motherfucker',
  'goddamn',
  'douche',
  'prick',
  'pedo',
  'pedophile',
  'rapist',
  'rape',
  'molest',
  'incest',
  'bestiality',
  // hate / slurs (racial, ethnic, homophobic, transphobic, ableist, religious)
  'nigger',
  'nigga',
  'niglet',
  'coon',
  'chink',
  'gook',
  'spic',
  'wetback',
  'beaner',
  'kike',
  'kyke',
  'heeb',
  'raghead',
  'towelhead',
  'sandnigger',
  'paki',
  'wop',
  'dago',
  'gyp',
  'redskin',
  'injun',
  'squaw',
  'savage',
  'faggot',
  'faggit',
  'fagot',
  'dyke',
  'tranny',
  'shemale',
  'ladyboy',
  'retard',
  'retarded',
  'spastic',
  'mongoloid',
  'cripple',
  'nazi',
  'hitler',
  'holocaust',
  'kkk',
  'klan',
  'whitepower',
  'heil',
  'jihad',
  'terrorist',
  'isis',
  'genocide',
  'lynch',
  'slavery',
  // self-harm / drugs / violence that are not welcoming on a kids leaderboard
  'suicide',
  'killyourself',
  'kys',
  'heroin',
  'cocaine',
  'meth',
]

// Milder or word-fragment-prone terms: matched only as a whole token.
export const BLOCKLIST_WORD: readonly string[] = [
  'ass',
  'arse',
  'hell',
  'damn',
  'crap',
  'piss',
  'fart',
  'turd',
  'sex',
  'sexy',
  'nude',
  'naked',
  'nazi',
  'gay', // as a standalone name it is used as a slur here; "gaylord" etc. are covered by substring where relevant
  'homo',
  'fag',
  'ho',
  'hoe',
  'thot',
  'simp',
  'weed',
  'drugs',
  'kill',
  'die',
  'gun',
  'bomb',
]
