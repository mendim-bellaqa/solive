'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const DEPTH_KEY = 'hzaura_nav_depth'
const LAST_KEY  = 'hzaura_nav_last'

/**
 * Counts how many in-app navigations this tab has made. `document.referrer`
 * cannot answer that question in a single-page app — it keeps naming whatever
 * loaded the document — so the back control needs its own memory to know
 * whether "back" lands on one of our pages or throws the user off the site.
 *
 * Mounted once in the root layout; renders nothing.
 */
export function NavMemory() {
  const pathname = usePathname()

  useEffect(() => {
    try {
      const last = window.sessionStorage.getItem(LAST_KEY)
      if (last === pathname) return
      const depth = Number(window.sessionStorage.getItem(DEPTH_KEY) ?? '0')
      window.sessionStorage.setItem(DEPTH_KEY, String(last === null ? 0 : depth + 1))
      window.sessionStorage.setItem(LAST_KEY, pathname)
    } catch { /* private browsing — the fallback route still works */ }
  }, [pathname])

  return null
}

function hasInAppHistory(): boolean {
  try {
    return Number(window.sessionStorage.getItem(DEPTH_KEY) ?? '0') > 0 && window.history.length > 1
  } catch {
    return false
  }
}

/**
 * The back control every page carries. It goes back where there is somewhere
 * of ours to go back to, and to `fallback` otherwise — someone who opened this
 * page from a search result or a shared link gets a way up rather than a way
 * off the site.
 */
export default function BackLink({ fallback = '/', label = 'Back', fallbackLabel }: {
  fallback?: string
  label?: string
  /** Shown instead of `label` when the button would go to the fallback. */
  fallbackLabel?: string
}) {
  const router = useRouter()
  const [canGoBack, setCanGoBack] = useState(true)

  // Resolved after mount so the server and the first client render agree.
  useEffect(() => { setCanGoBack(hasInAppHistory()) }, [])

  return (
    <button
      type="button"
      onClick={() => (hasInAppHistory() ? router.back() : router.push(fallback))}
      className="back-link"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {canGoBack ? label : (fallbackLabel ?? label)}
    </button>
  )
}
