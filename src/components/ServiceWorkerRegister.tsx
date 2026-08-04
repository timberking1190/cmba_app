'use client'

import { useEffect } from 'react'

/*
 * Registers the service worker (public/sw.js) in production only, so families can
 * still see the schedule and standings at the gym on weak signal. Dev is left alone
 * to avoid cache confusion. Failure is swallowed so it never affects the page.
 *
 * Copy rule: no em or en dashes anywhere.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad, { once: true })
    return () => window.removeEventListener('load', onLoad)
  }, [])
  return null
}
