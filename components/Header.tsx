'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface UserInfo {
  email: string | null
  name: string | null
}

export default function Header() {
  const [scrolled, setScrolled]       = useState(false)
  const [visible, setVisible]         = useState(true)
  const [user, setUser]               = useState<UserInfo | null>(null)
  const [menuOpen, setMenuOpen]       = useState(false)
  const [hzIdx, setHzIdx]             = useState(0)
  const lastScrollY                   = useRef(0)
  const ticking                       = useRef(false)
  const menuRef                       = useRef<HTMLDivElement>(null)

  // Cycle Hz values for the logo waveform color
  const PALETTE = ['#00c896', '#4a90e8', '#7c6ff7', '#b06ef5', '#e05050', '#e8a020']
  const accentColor = PALETTE[hzIdx % PALETTE.length]

  // Scroll behavior
  const handleScroll = useCallback(() => {
    if (ticking.current) return
    ticking.current = true
    requestAnimationFrame(() => {
      const y = window.scrollY
      setScrolled(y > 20)
      if (y < 60) {
        setVisible(true)
      } else if (y > lastScrollY.current + 6) {
        setVisible(false)
        setMenuOpen(false)
      } else if (y < lastScrollY.current - 4) {
        setVisible(true)
      }
      lastScrollY.current = y
      ticking.current = false
    })
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Auth check
  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      createClient().auth.getUser().then(({ data: { user: u } }) => {
        if (u) {
          const name = u.user_metadata?.full_name || u.user_metadata?.name || null
          setUser({ email: u.email ?? null, name })
        }
      }).catch(() => {})
    })
  }, [])

  // Hz cycle for logo
  useEffect(() => {
    const id = setInterval(() => setHzIdx(i => i + 1), 2400)
    return () => clearInterval(id)
  }, [])

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
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.signOut()
    setUser(null)
    window.location.href = '/'
  }

  return (
    <motion.header
      animate={{ y: visible ? 0 : -80, opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: scrolled ? 'rgba(5,5,12,0.82)' : 'transparent',
        backdropFilter: scrolled ? 'blur(24px) saturate(160%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(24px) saturate(160%)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
        transition: 'background 0.35s ease, border-color 0.35s ease',
      }}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-10 h-16 flex items-center justify-between">

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
          {[
            { label: 'Frequencies', href: '#frequencies' },
            { label: 'Science', href: '#science' },
            { label: 'History', href: '/history' },
          ].map(({ label, href }) => (
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

          {/* New Session CTA */}
          <Link
            href="/session"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: `${accentColor}18`,
              border: `1px solid ${accentColor}35`,
              color: accentColor,
              transition: 'all 0.3s ease',
            }}
          >
            <span className="live-dot" style={{ background: accentColor, width: 6, height: 6 }} />
            Start Session
          </Link>

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
                    className="glass-card absolute right-0 mt-2 w-52 py-1"
                    style={{ top: '100%' }}
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
                      { icon: '📊', label: 'My Sessions', href: '/history' },
                      { icon: '🎵', label: 'Start Session', href: '/session' },
                    ].map(item => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.05]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <span>{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}

                    {/* Settings placeholder */}
                    <button
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.05]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <span>⚙️</span>
                      Settings
                      <span className="ml-auto text-xs px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-muted)' }}>
                        Soon
                      </span>
                    </button>

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
        </div>
      </div>
    </motion.header>
  )
}
