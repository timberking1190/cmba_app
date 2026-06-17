This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## TeamLinkt integration (hybrid: native render + iframe fallback)

The schedule page (`/calendar`, also aliased at `/schedule`) and `/standings`
read TeamLinkt's league JSON endpoints **server-side** and render them in the
app's own design. If those endpoints change or return nothing, the pages
automatically fall back to TeamLinkt's official iframe, so users never see a
blank page. TeamLinkt stays the source of truth for scores, standings, and
account actions; login / score reporting / account deep-link to
`app.teamlinkt.com` (we never proxy or replicate TeamLinkt auth, and never invent
scores/standings).

Note: the JSON endpoints are undocumented/private and may change without notice;
the iframe fallback is what keeps these pages working if they do. They must be
called server-side (CORS blocks browser calls).

Copy `.env.example` to `.env.local` and set (IDs change each season, so they live
in env, never in components):

- **`TEAMLINKT_LEAGUE_BASE`**: e.g. `https://leagues.teamlinkt.com`
- **`TEAMLINKT_ASSOC_ID`**: CMBA association id (e.g. `34176`)
- **`TEAMLINKT_SEASON_ID`**: current season/league id (e.g. `50938`)
- **`TEAMLINKT_LEAGUE_SLUG`**: e.g. `calgaryminorbasketballassociation`
- **`NEXT_PUBLIC_TEAMLINKT_APP_URL`**: base URL for deep-links
  (default `https://app.teamlinkt.com`)

Endpoint responses are cached for an hour (`revalidate: 3600`), with an 8s
timeout; any failure returns an empty result and triggers the iframe fallback.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
