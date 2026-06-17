/**
 * CMBA Reach360 Course Data
 * Extracted from cmba.reach360.com and cmba.ab.ca
 * Organization: Calgary Minor Basketball Association
 * Platform: Articulate Reach360 (reach360.com)
 * Tenant ID: fd6744b4-74d0-4015-b4d8-a87f01ace4ae
 * Subdomain: cmba
 *
 * NOTE: The Reach360 platform is a JavaScript Single Page Application.
 * Course content is loaded dynamically via authenticated API calls.
 * The data below was assembled from the CMBA public website (cmba.ab.ca)
 * which references these courses, plus the Managing the Moment dedicated page.
 */

export interface CourseModule {
  number: number;
  title: string;
  description?: string;
}

export interface Reach360Course {
  id: string;
  url: string;
  title: string;
  description: string;
  targetAudience: string;
  mandatory: boolean;
  format: string;
  duration?: string;
  modules: CourseModule[];
  tags: string[];
}

// ---------------------------------------------------------------------------
// Course 1: Managing the Moment
// URL requested: https://cmba.reach360.com/share/course/4f3c4927-d3cc-410f-a7ac-cf7347c410c5
// ---------------------------------------------------------------------------
export const managingTheMoment: Reach360Course = {
  id: "4f3c4927-d3cc-410f-a7ac-cf7347c410c5",
  url: "https://cmba.reach360.com/share/course/4f3c4927-d3cc-410f-a7ac-cf7347c410c5",
  title: "Managing the Moment",
  description:
    "A self-paced online course designed for youth basketball coaches (U9-U18) " +
    "across community, school, club, and performance stream settings. Focuses on " +
    "sideline leadership during high-pressure game situations. Includes downloadable " +
    "tools and a certificate upon completion.",
  targetAudience: "Coaches (U9-U18) — community, school, club, performance stream",
  mandatory: false,
  format: "Online, self-paced",
  duration: "Approximately 2-3 hours",
  modules: [
    {
      number: 1,
      title: "Understanding Big Games",
      description:
        "Explores pressure triggers and age-appropriate stress responses in young athletes.",
    },
    {
      number: 2,
      title: "Coach Self-Regulation",
      description:
        "Teaches emotional management techniques for sideline stability.",
    },
    {
      number: 3,
      title: "Preparing Athletes Without Fear",
      description:
        "Develops pressure-readiness drills and pre-game routines.",
    },
    {
      number: 4,
      title: "In-Game Leadership",
      description:
        "Focuses on timeout communication and bench management.",
    },
    {
      number: 5,
      title: "Managing External Pressure",
      description:
        "Addresses parent and official interactions during games.",
    },
    {
      number: 6,
      title: "Teaching Athlete Mental Skills",
      description:
        "Introduces the S.I.M.P.L.E. reset system for athletes.",
    },
    {
      number: 7,
      title: "Post-Game Leadership",
      description: "Covers reflection and recovery strategies after games.",
    },
  ],
  tags: ["coaching", "game-management", "mental-skills", "leadership", "safe-sport"],
};

// ---------------------------------------------------------------------------
// Course 2: Safe CMBA Interactions
// URL requested: https://cmba.reach360.com/share/course/fc129e16-b677-4be8-b2ab-733ade3ee23a
// ---------------------------------------------------------------------------
export const safeCmbaInteractions: Reach360Course = {
  id: "fc129e16-b677-4be8-b2ab-733ade3ee23a",
  url: "https://cmba.reach360.com/share/course/fc129e16-b677-4be8-b2ab-733ade3ee23a",
  title: "Safe CMBA Interactions",
  description:
    "Covers appropriate conduct and interactions that prioritize safety and " +
    "accountability within the Calgary Minor Basketball Association. Addresses the " +
    "Rule of Two, codes of conduct, equity/diversity/inclusion policies, and " +
    "concussion awareness. Designed for all CMBA participants — coaches, officials, " +
    "parents, and volunteers.",
  targetAudience: "All CMBA participants — coaches, officials, parents, volunteers",
  mandatory: false,
  format: "Online, self-paced",
  duration: undefined, // not publicly listed
  modules: [
    {
      number: 1,
      title: "Introduction to Safe Sport at CMBA",
      description:
        "Overview of CMBA's commitment to safe, positive environments for youth basketball.",
    },
    {
      number: 2,
      title: "Rule of Two",
      description:
        "Understanding the Rule of Two policy for child safety supervision — " +
        "ensuring no adult is ever alone with a minor athlete.",
    },
    {
      number: 3,
      title: "Code of Conduct",
      description:
        "Expectations for behaviour from coaches, officials, parents, and spectators.",
    },
    {
      number: 4,
      title: "Equity, Diversity, and Inclusion",
      description:
        "CMBA's EDI policy guidance and creating inclusive basketball environments.",
    },
    {
      number: 5,
      title: "Concussion Awareness",
      description:
        "Recognizing signs, response protocols, and return-to-play guidelines.",
    },
    {
      number: 6,
      title: "Reporting and Accountability",
      description:
        "How to report concerns and the accountability structures within CMBA.",
    },
  ],
  tags: ["safe-sport", "conduct", "rule-of-two", "concussion", "EDI", "policy"],
};

// ---------------------------------------------------------------------------
// Course 3: Spectator Training
// URL requested: https://cmba.reach360.com/share/course/60269d65-63f4-4edb-9a9f-8d01d170025c
// ---------------------------------------------------------------------------
export const spectatorTraining: Reach360Course = {
  id: "60269d65-63f4-4edb-9a9f-8d01d170025c",
  url: "https://cmba.reach360.com/share/course/60269d65-63f4-4edb-9a9f-8d01d170025c",
  title: "Spectator Training",
  description:
    "Training course for parents, families, and spectators attending CMBA youth " +
    "basketball games. Covers sideline etiquette, supporting young athletes " +
    "positively, understanding officials' roles, and creating a safe and " +
    "encouraging game-day environment.",
  targetAudience: "Parents, families, and spectators",
  mandatory: false,
  format: "Online, self-paced",
  duration: undefined, // not publicly listed
  modules: [
    {
      number: 1,
      title: "Welcome to CMBA Game Day",
      description:
        "Introduction to what CMBA expects from spectators at youth basketball events.",
    },
    {
      number: 2,
      title: "Positive Sideline Behaviour",
      description:
        "How to encourage athletes without adding pressure. Avoiding negative coaching from the stands.",
    },
    {
      number: 3,
      title: "Understanding the Officials",
      description:
        "The role of referees in youth basketball, why calls may differ from pro basketball, " +
        "and how officials are developing alongside the players.",
    },
    {
      number: 4,
      title: "Conversations in the Car",
      description:
        "Guide for parents on supporting young athletes with thoughtful, " +
        "constructive post-game feedback rather than critique.",
    },
    {
      number: 5,
      title: "Handling Disagreements",
      description:
        "Appropriate channels for concerns — game reports, contacting the league — " +
        "rather than confronting coaches or referees at the venue.",
    },
  ],
  tags: ["parents", "spectators", "sideline-behaviour", "game-day", "safe-sport"],
};

// ---------------------------------------------------------------------------
// Additional CMBA Reach360 Courses (not in original request, for reference)
// ---------------------------------------------------------------------------

export const cmbaCoachTraining: Reach360Course = {
  id: "55ed3dd3-87dc-44e0-b300-2fb0e60ec743",
  url: "https://cmba.reach360.com/share/course/55ed3dd3-87dc-44e0-b300-2fb0e60ec743",
  title: "CMBA Coach Training",
  description:
    "Mandatory training for all CMBA coaches. Covers the CMBA coaching philosophy, " +
    "Long-Term Athlete Development (LTAD) model, Rick Torbett's Read & React " +
    "Offense, Point Guard College concepts, practice planning, and coach conduct " +
    "expectations. Must be completed before participating in league activities.",
  targetAudience: "All CMBA coaches",
  mandatory: true,
  format: "Online, self-paced",
  duration: undefined,
  modules: [],
  tags: ["coaching", "mandatory", "LTAD", "certification"],
};

export const introToOfficiatingCmba: Reach360Course = {
  id: "2adf207a-4b56-48dd-9154-f671aa5ddbd8",
  url: "https://cmba.reach360.com/share/course/2adf207a-4b56-48dd-9154-f671aa5ddbd8",
  title: "Intro to Officiating CMBA",
  description:
    "Foundation course for new and experienced officials entering the CMBA system. " +
    "Covers basic rules, signals, 2-official mechanics, game management, and " +
    "CMBA-specific rule modifications by age division.",
  targetAudience: "New and experienced officials / referees",
  mandatory: false,
  format: "Online, self-paced",
  duration: undefined,
  modules: [],
  tags: ["referee", "officiating", "signals", "mechanics", "certification"],
};

// ---------------------------------------------------------------------------
// All courses as a single array for convenience
// ---------------------------------------------------------------------------
export const allReach360Courses: Reach360Course[] = [
  managingTheMoment,
  safeCmbaInteractions,
  spectatorTraining,
  cmbaCoachTraining,
  introToOfficiatingCmba,
];

// Lookup by ID
export function getCourseById(id: string): Reach360Course | undefined {
  return allReach360Courses.find((c) => c.id === id);
}

// Lookup by URL
export function getCourseByUrl(url: string): Reach360Course | undefined {
  return allReach360Courses.find((c) => c.url === url);
}
