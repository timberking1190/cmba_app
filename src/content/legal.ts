/*
 * Legal document content, in plain markdown. Rendered as static pages in Phase 1
 * (/privacy, /terms, /guardian-consent) so the consent links are real, and used
 * as the seed source when these become CMS-editable Pages in Phase 3. The
 * version strings here mirror PolicyVersions; bump both together on changes.
 */
export type LegalDoc = { slug: string; title: string; version: string; body: string }

export const PRIVACY_POLICY: LegalDoc = {
  slug: 'privacy',
  title: 'Privacy Policy',
  version: '2026-06-01',
  body: `# CMBA Connect Privacy Policy

This policy explains what personal information Calgary Minor Basketball Association ("CMBA", "we", "us") collects through the CMBA Connect website and accounts, why we collect it, how we protect it, and the choices you have. We follow Canada's Personal Information Protection and Electronic Documents Act (PIPEDA) and Alberta's Personal Information Protection Act (PIPA).

We wrote this in plain language on purpose. If anything here is unclear, contact our Privacy Officer (see "How to reach us").

## Who this covers
This policy covers people who create or use a CMBA Connect account, including athletes, parents and guardians, coaches, officials, and volunteers. League play, registration, and game scores are handled by TeamLinkt, which has its own privacy policy.

## A note about children
Many of our participants are under 18. We treat their information with extra care. A parent or legal guardian must create and manage the account for any athlete under 18 and must give consent before we collect the child's information.

## What we collect
We only collect what we need to run our programs: account and contact details (name, email, phone, date of birth); optional profile details (photo, pronouns, bio, role, club); a safety emergency contact; development and certification records including certificate files; guardian details for minors; consent records (which policy version you agreed to, and when); and basic technical details such as a session cookie.

We do not collect payment information on CMBA Connect. We do not ask for a Social Insurance Number. We do not sell your information.

## Why we collect it
To create and manage your account and sign you in securely; to track certifications and development pathways; to send account messages such as password resets and certification-expiry reminders; to support participant safety; and to meet sport governance and legal requirements. We do not use children's information for advertising or profiling.

## Consent
We collect, use, and share your information with your consent, given when you create an account and agree to this policy and our Terms of Use. You can withdraw consent at any time, subject to legal and program requirements. For athletes under 18, a parent or guardian gives and can withdraw consent.

## Accounts for children under 18
A parent or legal guardian must set up and manage the account for an athlete under 18. We confirm the guardian's email. A child's personal information is visible only to the guardian and to authorized CMBA administrators; it is not shown to other members and is not public.

## How we store and protect your information
We keep personal information on servers located in Canada — database, file storage, email, and website all run from a Canadian region. We use encryption in transit and at rest, secure signed-in sessions, role-based access, and private access-controlled certificate files. No system is perfectly secure, but we work hard to protect your information.

## Service providers we use
Hosting: Vercel (Canadian region). Database and file storage: Supabase (Canadian region). Email: Amazon Web Services SES (Canadian region). League play / scores / registration: TeamLinkt (separate platform with its own policy). We choose Canadian hosting regions so your data stays in Canada.

## How long we keep your information
We keep your information only as long as needed for the purposes above or as required by law and sport governance, then remove it securely. We keep children's information for the shortest period that meets those needs.

## Your choices and rights
You can see, correct, download, or delete your information, and withdraw optional consents. For a minor, the guardian can do all of the above. Contact our Privacy Officer to make a request.

## Cookies
We use a small number of essential cookies to keep you signed in and secure. We do not use advertising cookies and do not track you across other websites.

## If there is a data breach
If a breach creates a real risk of significant harm, we will notify you and report to the Office of the Privacy Commissioner of Canada (and Alberta's OIPC where required), and keep a breach record.

## Changes to this policy
When we make a meaningful change we post a new version with a new date and, where appropriate, ask you to review and agree again.

## How to reach us
CMBA Privacy Officer, Calgary Minor Basketball Association. Contact details are published on our Contact page. You may also contact the Office of the Privacy Commissioner of Canada (priv.gc.ca) or Alberta's OIPC (oipc.ab.ca).`,
}

export const TERMS_OF_USE: LegalDoc = {
  slug: 'terms',
  title: 'Terms of Use',
  version: '2026-06-01',
  body: `# CMBA Connect Terms of Use

These terms are an agreement between you and Calgary Minor Basketball Association ("CMBA", "we", "us") for the use of the CMBA Connect website and accounts. By creating an account or using the site, you agree to these terms. If you do not agree, please do not create an account.

## Who can use CMBA Connect
You may create an account if you are 18 or older. If you are under 18, a parent or legal guardian must create and manage your account and agree to these terms on your behalf.

## Your account
Give true and current information; keep your password private; and tell us promptly if you think someone used your account without permission. You are responsible for activity under your account. We may verify certain information, such as certifications, before marking it confirmed.

## What CMBA Connect is for
CMBA Connect helps members manage profiles, track coaching and officiating development and certifications, find courses and resources, and read league information. League play, schedules, scores, and registration are run on TeamLinkt. When you follow a link to an outside site, that site's own terms and privacy policy apply.

## Acceptable use
Do not upload false or fraudulent certification records; do not upload unlawful or harmful content; do not try to access areas you are not allowed to; do not interfere with the site's security or operation; and do not collect other members' personal information without permission. Follow CMBA's codes of conduct and Safe Sport expectations.

## Certifications and information
Records you see are based on information you and CMBA enter. You are responsible for keeping certifications current with the bodies that issue them. CMBA Connect is a tracking tool and does not replace official issuer records.

## Content and ownership
The site's design, text, and graphics belong to CMBA or its licensors. Content you upload (profile photo, certificate files) remains yours; by uploading it you give CMBA permission to store and use it for the purposes in our Privacy Policy.

## Links to other sites
CMBA Connect links to outside services including TeamLinkt and Reach360. We do not control those sites and are not responsible for their content or practices.

## Availability
We provide the site on an "as is" and "as available" basis. We do not promise it will always be available or error free, and we may change or pause features at any time.

## Limitation of liability
To the extent allowed by law, CMBA and its directors, volunteers, and staff are not liable for indirect, incidental, or consequential losses arising from your use of CMBA Connect. Nothing limits liability that cannot be limited by law.

## Suspending or ending accounts
We may suspend or close an account that breaks these terms or is used harmfully or fraudulently. You may close your account at any time, subject to legal or safety holds described in our Privacy Policy.

## Changes to these terms
When we make a meaningful change we post a new version with a new date and, where appropriate, ask you to review and agree again.

## Governing law
These terms are governed by the laws of Alberta and the laws of Canada that apply there. Disputes will be handled in the courts of Alberta.

## How to reach us
Calgary Minor Basketball Association — see the Contact page for current details.`,
}

export const GUARDIAN_CONSENT: LegalDoc = {
  slug: 'guardian-consent',
  title: 'Guardian Consent & Children’s Privacy Notice',
  version: '2026-06-01',
  body: `# Guardian Consent and Children's Privacy Notice

This notice is for parents and legal guardians of athletes under 18. It explains, in plain language, what information CMBA Connect collects about your child, how we use it, and the control you have. Please read it before you create or approve your child's account.

## You are in control of your child's account
A parent or legal guardian must create and manage the account for any athlete under 18. You give consent on your child's behalf, and you can change or withdraw that consent at any time. We confirm your email address so we know the account is connected to a real guardian.

## What we collect about your child
Only what we need: the child's name and date of birth (to confirm age and development stage); club or team affiliation; an emergency contact; development records; and your details as guardian (name, email, phone) plus a record of the consent you gave. We do not collect payment information here and do not ask for a Social Insurance Number.

## How we use it
To manage their account, support their development in basketball, keep them safe, and communicate with you. We do not use children's information for advertising and do not build marketing or behavioural profiles of children.

## Who can see it
Your child's personal information is visible only to you as the guardian and to authorized CMBA administrators who need it. It is not shown to other members and is not public.

## Where it is stored
On servers located in Canada, with encryption in transit and at rest. Uploaded files are kept private. See our full Privacy Policy for details.

## Your rights as a guardian
At any time you can see, correct, download, or delete your child's information, and withdraw your consent (which may limit or end certain features). Contact our Privacy Officer to make a request.

## How long we keep it
Only as long as needed, using the shortest reasonable period for children, then removed securely.

## Your consent
By creating or approving your child's account and checking the consent box at sign up, you confirm that you are the parent or legal guardian; you have read this notice, the Privacy Policy, and the Terms of Use; you consent to CMBA collecting and using your child's information as described; and you understand you can withdraw consent at any time. We record the version you agreed to, with the date and time.

## A short version for young athletes
CMBA Connect keeps a little information about you — your name, age, team, and how you are growing as a player. A trusted adult looks after your account. Only your guardian and CMBA staff can see your information. We keep it safe and in Canada, and we never sell it.`,
}

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  privacy: PRIVACY_POLICY,
  terms: TERMS_OF_USE,
  'guardian-consent': GUARDIAN_CONSENT,
}
