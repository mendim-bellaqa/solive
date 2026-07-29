'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface UserInfo {
  email: string | null
  name: string | null
}

export default function Header() {
  const [scrolled, setScrolled]       = useState(false)
  const [user, setUser]               = useState<UserInfo | null>(null)
  const [menuOpen, setMenuOpen]       = useState(false)
  const [navOpen, setNavOpen]         = useState(false)
  const [hzIdx, setHzIdx]             = useState(0)
  const ticking                       = useRef(false)
  const menuRef                       = useRef<HTMLDivElement>(null)
  const pathname                      = usePathname()

  // Pointless to offer "Start Session" while building or already in one.
  const inSessionFlow = pathname === '/session' || pathname === '/studio'

  const NAV = [
    { label: 'Frequencies', href: '/frequencies' },
    { label: 'Science',     href: '/science' },
    { label: 'Pricing',     href: '/pricing' },
    { label: 'History',     href: '/history' },
  ]

  // Cycle Hz values for the logo waveform color
  const PALETTE = ['#00c896', '#4a90e8', '#7c6ff7', '#b06ef5', '#e05050', '#e8a020']
  const accentColor = PALETTE[hzIdx % PALETTE.length]

  // Scroll behavior — header stays fixed & visible; only the background reacts
  const handleScroll = useCallback(() => {
    if (ticking.current) return
    ticking.current = true
    requestAnimationFrame(() => {
      setScrolled(window.scrollY > 20)
      ticking.current = false
    })
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Auth check — subscribe to Firebase auth state
  useEffect(() => {
    let unsub = () => {}
    Promise.all([
      import('firebase/auth'),
      import('@/lib/firebase/client'),
    ]).then(([{ onAuthStateChanged }, { getFirebaseAuth }]) => {
      const auth = getFirebaseAuth()
      if (!auth) return
      unsub = onAuthStateChanged(auth, (u) => {
        setUser(u ? { email: u.email, name: u.displayName } : null)
      })
    }).catch(() => {})
    return () => unsub()
  }, [])

  // Hz cycle for logo
  useEffect(() => {
    const id = setInterval(() => setHzIdx(i => i + 1), 2400)
    return () => clearInterval(id)
  }, [])

  // Freeze the page while the mobile nav is open, so the blurred backdrop
  // stays put instead of scrolling around underneath the panel.
  useEffect(() => {
    if (!navOpen) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow }
  }, [navOpen])

  // Close menu on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const initial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email
      ? user.email.charAt(0).toUpperCase()
      : null

  const displayName = user?.name || user?.email?.split('@')[0] || 'User'

  async function handleSignOut() {
    setMenuOpen(false)
    const [{ signOut }, { getFirebaseAuth }] = await Promise.all([
      import('firebase/auth'),
      import('@/lib/firebase/client'),
    ])
    const auth = getFirebaseAuth()
    if (auth) await signOut(auth)
    setUser(null)
    window.location.href = '/'
  }

  return (
    <motion.header
      className="site-header fixed top-0 left-0 right-0 z-50"
      style={{
        background: scrolled ? 'rgba(5,5,12,0.82)' : 'transparent',
        backdropFilter: scrolled ? 'blur(24px) saturate(160%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(24px) saturate(160%)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
        transition: 'background 0.35s ease, border-color 0.35s ease',
        // Drop the bar below the iOS notch / status bar in standalone (home-screen) mode
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* Positioned so the bar paints above the mobile nav backdrop — an
          unpositioned in-flow child would otherwise fall behind it. */}
      <div className="max-w-7xl mx-auto px-5 sm:px-10 h-16 flex items-center justify-between"
           style={{ position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group" style={{ WebkitTapHighlightColor: 'transparent' }}>
          <motion.div
            animate={{ color: accentColor }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <motion.path
                d="M1 11 Q4 5 7 11 Q10 17 13 11 Q16 5 19 11 Q20 13 21 11"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                animate={{ pathLength: [0.8, 1, 0.8] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
            </svg>
          </motion.div>
          <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Solive
          </span>
        </Link>

        {/* Nav center — hidden on mobile */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="px-3 py-1.5 rounded-lg text-sm transition-all hover:bg-white/[0.06]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">

          {/* New Session CTA — flat 2D white outline, inverts to solid on hover */}
          {!inSessionFlow && (
          <Link
            href="/session"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.85)',
              color: '#ffffff',
              letterSpacing: '-0.01em',
              transition: 'background 0.22s ease, color 0.22s ease, border-color 0.22s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.color = '#07070f'
              e.currentTarget.style.borderColor = '#ffffff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#ffffff'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.85)'
            }}
          >
            <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor" aria-hidden style={{ flexShrink: 0 }}>
              <polygon points="0,0 9,5 0,10" />
            </svg>
            Start Session
          </Link>
          )}

          {/* Auth section */}
          {user ? (
            /* Logged-in user with dropdown */
            <div className="relative" ref={menuRef}>
              <motion.button
                onClick={() => setMenuOpen(v => !v)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all"
                style={{
                  background: menuOpen ? 'rgba(255,255,255,0.07)' : 'transparent',
                  border: '1px solid transparent',
                }}
                whileHover={{ background: 'rgba(255,255,255,0.06)' }}
                whileTap={{ scale: 0.97 }}
              >
                {/* Avatar */}
                <motion.div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  animate={{ borderColor: accentColor }}
                  transition={{ duration: 1.2 }}
                  style={{
                    background: `${accentColor}22`,
                    border: `1.5px solid ${accentColor}60`,
                    color: accentColor,
                  }}
                >
                  {initial}
                </motion.div>
                <span className="hidden sm:block text-sm font-medium max-w-[100px] truncate"
                      style={{ color: 'var(--text-secondary)' }}>
                  {displayName}
                </span>
                <motion.svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ color: 'var(--text-muted)' }}
                  animate={{ rotate: menuOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" />
                </motion.svg>
              </motion.button>

              {/* Dropdown */}
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                    className="glass-card w-52 py-1"
                    // `position` must be inline: .glass-card sets `position: relative`
                    // in globals.css, which loads after Tailwind and would otherwise
                    // beat the `absolute` utility and drop the menu into normal flow.
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      transformOrigin: 'top right',
                      zIndex: 60,
                    }}
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{displayName}</p>
                      {user.email && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                      )}
                    </div>

                    {/* Menu items */}
                    {[
                      {
                        label: 'My Sessions', href: '/history',
                        icon: <><path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 14l3-4 3 3 4-6" strokeLinecap="round" strokeLinejoin="round" /></>,
                      },
                      {
                        label: 'Start Session', href: '/session',
                        icon: <><circle cx="12" cy="12" r="9" /><path d="M10 9l5 3-5 3V9z" strokeLinejoin="round" fill="currentColor" stroke="none" /></>,
                      },
                      {
                        label: 'Plans & Pricing', href: '/pricing',
                        icon: <><path d="M20.6 12.3 12.3 20.6a1.4 1.4 0 0 1-2 0l-7-7a1.4 1.4 0 0 1-.4-1V4.4A1.4 1.4 0 0 1 4.4 3h8.2a1.4 1.4 0 0 1 1 .4l7 7a1.4 1.4 0 0 1 0 1.9Z" strokeLinejoin="round" /><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" /></>,
                      },
                      {
                        label: 'Settings', href: '/settings',
                        icon: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" strokeLinecap="round" strokeLinejoin="round" /></>,
                      },
                    ].map(item => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.05]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                             style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                          {item.icon}
                        </svg>
                        {item.label}
                      </Link>
                    ))}

                    <div className="border-t my-1" style={{ borderColor: 'rgba(255,255,255,0.07)' }} />

                    {/* Sign out */}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-red-500/[0.08]"
                      style={{ color: '#e05050' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" />
                      </svg>
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* Not logged in */
            <Link
              href="/auth/login"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                color: 'var(--text-secondary)',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Sign in
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setNavOpen(v => !v)}
            aria-label="Menu"
            className="md:hidden flex items-center justify-center rounded-xl"
            style={{ width: 40, height: 40, background: navOpen ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {navOpen
                ? <path d="M6 6l12 12M18 6L6 18" />
                : <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav — dimmed, blurred backdrop over the rest of the page so the
          panel reads as one layer instead of competing with the content below.
          It sits at z-index 0 inside the header's own stacking context, which
          keeps it under the bar and the panel but over everything on the page.
          Tapping it closes the menu. */}
      <AnimatePresence>
        {navOpen && (
          <motion.div
            key="nav-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={() => setNavOpen(false)}
            aria-hidden
            className="md:hidden"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 0,
              // The page is already near-black, so the tint stays light — the
              // blur does the separating, not the darkness.
              background: 'rgba(4,4,10,0.38)',
              backdropFilter: 'blur(13px) saturate(115%)',
              WebkitBackdropFilter: 'blur(13px) saturate(115%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Mobile nav panel */}
      <AnimatePresence>
        {navOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="md:hidden"
              style={{
                position: 'relative',
                zIndex: 1,
                background: 'rgba(5,5,12,0.94)',
                backdropFilter: 'blur(28px) saturate(160%)',
                WebkitBackdropFilter: 'blur(28px) saturate(160%)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)',
              }}
            >
              <div className="px-5 py-4 flex flex-col gap-1">
                {NAV.map(({ label, href }) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setNavOpen(false)}
                    className="px-3 py-3 rounded-xl text-base font-medium transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {label}
                  </Link>
                ))}

                <div className="my-2" style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

                {!inSessionFlow && (
                  <Link
                    href="/session"
                    onClick={() => setNavOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.85)', color: '#ffffff' }}
                  >
                    <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor" aria-hidden style={{ flexShrink: 0 }}>
                      <polygon points="0,0 9,5 0,10" />
                    </svg>
                    Start a session
                  </Link>
                )}

                {!user && (
                  <Link
                    href="/auth/login"
                    onClick={() => setNavOpen(false)}
                    className="px-3 py-3 rounded-xl text-sm text-center"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
