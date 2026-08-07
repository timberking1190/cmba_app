"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";

/*
 * Registers, updates and kills the service worker, and shows the offline banner.
 *
 * Three behaviours worth understanding before changing anything here:
 *
 * 1. THE FLAG IS ALSO THE KILL SWITCH. When NEXT_PUBLIC_ENABLE_SW is not exactly
 *    "true", this does not simply skip registration: it actively unregisters any
 *    worker that is already installed and purges every cache. A service worker is
 *    sticky, so "stop shipping it" is not the same as "remove it" for someone who
 *    already has one. Without this path, a bad worker would keep serving stale
 *    assets to returning users forever, and no amount of redeploying would help.
 *
 * 2. UPDATES ASK, THEY DO NOT SWAP. When a new worker is waiting, the user is
 *    offered a refresh rather than having assets silently replaced underneath a
 *    running page. Silent swaps are how a half-old, half-new page starts throwing
 *    chunk load errors after a deploy.
 *
 * 3. IT PURGES ON SIGN OUT. Nothing personal is cached in the first place (see the
 *    allowlist in public/sw.js), but a cache created during a session must not
 *    outlive it on a shared family phone.
 */

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_SW === "true";

export function ServiceWorkerManager() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [offline, setOffline] = useState(false);

  /* ------------------------------------------------ register, or kill */

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    if (!ENABLED) {
      /*
       * The kill path. Runs on every load while the flag is off, so flipping the
       * environment variable removes the worker from every returning visitor
       * without needing them to do anything.
       */
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
      if ("caches" in window) {
        void caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))));
      }
      return;
    }

    let cancelled = false;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (cancelled) return;

        // Something is already waiting from a previous visit.
        if (reg.waiting) setWaiting(reg.waiting);

        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            // "installed" with an existing controller means an UPDATE is ready,
            // as opposed to a first install, where there is nothing to refresh.
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setWaiting(installing);
            }
          });
        });
      } catch {
        // A failed registration is not worth breaking the page over. The site
        // works without it; that is the whole point of it being an enhancement.
      }
    };

    // Register after load so it never competes with the first paint.
    if (document.readyState === "complete") void register();
    else window.addEventListener("load", () => void register(), { once: true });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------------------------------ offline state */

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  /* ------------------------------------------------- purge on sign out */

  useEffect(() => {
    /*
     * `auth.signout` is dispatched by the sign out handler. Listening for an event
     * rather than reaching into the auth code keeps this component optional: if it
     * is not mounted, nothing breaks.
     */
    const purge = () => {
      navigator.serviceWorker?.controller?.postMessage({ type: "PURGE_ALL" });
      if ("caches" in window) {
        void caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))));
      }
    };
    window.addEventListener("auth:signout", purge);
    return () => window.removeEventListener("auth:signout", purge);
  }, []);

  const applyUpdate = useCallback(() => {
    if (!waiting) return;
    waiting.postMessage({ type: "SKIP_WAITING" });
    // Reload once the new worker takes control, not immediately, or the page can
    // reload before the swap and land on the old one again.
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), {
      once: true,
    });
  }, [waiting]);

  if (!offline && !waiting) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-16 lg:bottom-0 z-[60] px-4 pb-2 safe-bottom pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto max-w-lg pointer-events-auto">
        {offline ? (
          <div className="flex items-center gap-3 border border-cmba-red/40 bg-cmba-black-card/95 backdrop-blur px-4 py-3">
            <WifiOff size={18} className="text-cmba-red shrink-0" aria-hidden="true" />
            <p className="text-sm text-cmba-grey-light">
              You are offline. Game times and scores may be out of date until you reconnect.
            </p>
          </div>
        ) : null}

        {waiting && !offline ? (
          <div className="flex items-center gap-3 border border-cmba-red/40 bg-cmba-black-card/95 backdrop-blur px-4 py-3">
            <RefreshCw size={18} className="text-cmba-red shrink-0" aria-hidden="true" />
            <p className="text-sm text-cmba-grey-light flex-1">A new version of CMBA+ is ready.</p>
            <button
              type="button"
              onClick={applyUpdate}
              className="min-h-[44px] px-4 bg-cmba-red text-white font-display font-bold uppercase tracking-wide text-xs"
            >
              Refresh
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
