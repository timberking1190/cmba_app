'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'dark' | 'light'

/*
 * Theme toggle + initializer. On mount it applies the saved theme (or the OS
 * preference) to <html data-theme>; the button flips dark<->light and persists the
 * choice. <html> ships with data-theme="dark" so the common (dark) case has no flash;
 * light users see a brief switch on load (a strict CSP blocks a pre-paint inline script).
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    let t: Theme = 'dark'
    try {
      const stored = localStorage.getItem('cmba-theme')
      if (stored === 'light' || stored === 'dark') t = stored
      else if (window.matchMedia('(prefers-color-scheme: light)').matches) t = 'light'
    } catch {
      /* storage/matchMedia unavailable */
    }
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('cmba-theme', next)
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      className={`flex h-10 w-10 items-center justify-center rounded-lg text-cmba-grey transition-colors hover:text-cmba-red ${className}`}
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}
