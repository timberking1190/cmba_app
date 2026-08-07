# Service worker: what it does, and how to turn it off

**Status: shipped OFF.** `NEXT_PUBLIC_ENABLE_SW` is not set, so no worker is registered and no
cache exists. Nothing in this document is live until someone deliberately sets that variable.

Read this before enabling it. A service worker is the stickiest thing you can ship: it survives
redeploys, it keeps serving old assets to people who already have it, and "we stopped shipping it"
is not the same as "it is gone".

## What it caches, and the constraint that decided it

**Static build assets only. No page documents. No API responses.**

The original plan was stale-while-revalidate for the public schedule and standings, so a parent in a
gym with no signal could still read game times. That was dropped for a specific, verified reason:

> The root layout renders `<Header user={...}>` on the server, so **every page document in this app
> contains the signed in person's name and email address**. Caching `/schedule` for offline reading
> would therefore write a member's identity to unencrypted storage on a possibly shared family
> phone, under a URL that looks public.

This was checked by reading the served HTML, not assumed. An unencrypted copy of a parent's email on
a shared phone is not a fair trade for an offline schedule, particularly in an app that holds
minors' data.

The complete allowlist lives in `public/sw.js` as `CACHEABLE`:

| Pattern | Why it is safe |
|---|---|
| `/_next/static/**` | content hashed by the build, immutable, no personal data |
| `/favicon.(png\|ico)` | brand asset |
| `/icon-*.png` | PWA icons |
| `/cmba-logo*.png` | brand asset |
| `/manifest.webmanifest` | static manifest |

Plus `/offline`, precached at install so the offline page itself works offline.

`NEVER_CACHE` vetoes `/account`, `/manage`, `/rep`, `/compliance`, `/scan`, `/api`, `/admin`,
`/login`, `/score-login` and `/guardian` explicitly, even though the allowlist already excludes
them. Two independent refusals, because one of them will eventually be edited by someone in a hurry.

Non-GET requests are never touched. A cached POST is a lost score report, or a duplicated one.

## What it actually buys

The app shell, fonts and icons load with no network, so a dropped connection gets a branded page at
`/offline` that explains what is and is not available, instead of the browser's error page. An
offline banner appears whenever the browser reports no connection.

That is the honest scope. It does **not** give offline schedule or standings reading.

## Turning it on

Set `NEXT_PUBLIC_ENABLE_SW=true` in the environment and deploy. Then:

1. Load the site, confirm a worker registers (DevTools, Application, Service Workers).
2. Run `NEXT_PUBLIC_ENABLE_SW=true npm run test:e2e -- cache-privacy.spec.ts`. All 9 must pass. The
   4 runtime tests skip without the flag and say so rather than passing silently.
3. Go offline in DevTools and confirm `/offline` renders rather than the browser error page.
4. Deploy again with a change and confirm the "A new version of CMBA+ is ready" prompt appears,
   rather than assets swapping underneath a running page.

## Turning it off: the kill switch

**Set `NEXT_PUBLIC_ENABLE_SW` to anything other than `true` and redeploy.**

This is a real removal, not just "stop registering". With the flag off,
`ServiceWorkerManager` runs a kill path on **every page load**:

```
navigator.serviceWorker.getRegistrations() -> unregister() each
caches.keys() -> caches.delete() each
```

So every returning visitor loses the worker and its caches on their next visit, with no action from
them. That is the property that matters: a bad worker cannot outlive the flag.

**Honest limitation.** On Vercel, changing an environment variable requires a redeploy, which is a
minute or two rather than instant. There is no code change involved and no rollback needed, but it
is not a runtime toggle. If a genuinely instant kill is ever required, the worker would need to poll
a server-controlled endpoint on activate, which is more moving parts than this currently justifies.

### Second lever: bump the cache version

Change `CACHE_VERSION` in `public/sw.js` and deploy. The `activate` handler deletes every cache
whose name does not match the current version, so the old contents are gone on the next activation.
Use this when the worker itself is fine but something bad got cached.

### Last resort: for one person, in support

If someone is stuck on a broken worker and cannot wait for a deploy, in their browser's DevTools
console:

```js
navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))
caches.keys().then(ks => ks.forEach(k => caches.delete(k)))
```

Then a hard reload.

## Sign out

`ServiceWorkerManager` listens for the `auth:signout` event that `Header.signOut()` dispatches, and
purges every cache plus posts `PURGE_ALL` to the worker. Nothing personal should be in there given
the allowlist, but a cache created during a session must not outlive it on a shared phone.

## Updates

The worker does **not** call `skipWaiting()` on install. A worker that activates immediately can
start serving new assets to a page still running old code, which is how a deploy turns into chunk
load errors. Instead the page detects a waiting worker, offers "A new version of CMBA+ is ready"
with a Refresh button, and only then posts `SKIP_WAITING` and reloads once control has actually
changed hands.

## CSP

The strict nonce policy in `src/lib/security/headers.ts` already carries `worker-src 'self'`, so
registration works without weakening anything. The registration call itself comes from a nonced
Next.js bundle. No CSP change was needed for any of this, and none was made.

## Tests

`e2e/cache-privacy.spec.ts`, 9 tests in two layers:

- **Source level (5)**: reads `public/sw.js` and asserts the allowlist literally, that `NEVER_CACHE`
  names every private area, that non-GET is refused, that the navigation handler never writes to a
  cache, and that the purge and version machinery exists. These run with the flag off, so they
  protect the file even when nothing is deployed.
- **Runtime (4)**: drives a real browser with the worker installed and enumerates the actual
  contents of Cache Storage, checks no page document is cached, checks sign out empties everything,
  and exercises the kill switch.

Adversarially verified: deliberately adding `/^\/schedule$/` to the allowlist made the source layer
fail immediately. The runtime layer stayed green in that case, because the navigation guard blocks
document caching independently, which is defence in depth working rather than a gap.

## Before enabling in production

- [ ] Confirm on a real iPhone and a real Android that the offline page appears, and that install to
      home screen still works.
- [ ] Confirm a Vercel deploy does not leave a stale worker serving old chunks. Deploy twice and
      watch for the refresh prompt.
- [ ] Decide whether the offline page is worth a service worker at all. It is a real but small
      benefit, and it is the only benefit, given page documents cannot be cached here.
