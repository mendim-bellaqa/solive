'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { getSupabase } from '@/lib/supabase/client'
import { useAuthUser, displayNameOf, fetchSessions, type SessionRecord } from '@/lib/supabase/sessions'
import { usePlan, PLANS, planDurationDays } from '@/lib/plan'
import { useSessionPresets } from '@/lib/presets'
import { useSessionDefaults, DEFAULT_PREFS } from '@/lib/prefs'
import { AVATARS } from '@/lib/avatars'
import Avatar from '@/components/Avatar'
import { BINAURAL_PRESETS, type BinauralBand } from '@/lib/frequencies'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BackLink from '@/components/BackLink'

const VIZ_LABELS: Record<string, string> = { brain: 'Brain', aura: 'Body Aura', frequency: 'Cymatics' }
const LENGTHS = [10, 15, 30, 45, 60, 9999]
const BANDS: (BinauralBand | 'suggested')[] = ['suggested', 'delta', 'theta', 'alpha', 'beta', 'gamma']

function lengthLabel(m: number) { return m === 9999 ? 'Open' : `${m} min` }

function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function daysLeft(d: Date) {
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000))
}

export default function SettingsPage() {
  const router = useRouter()
  const user = useAuthUser()
  const { plan, expiresAt } = usePlan()
  const { presets, remove } = useSessionPresets()
  const { prefs, update } = useSessionDefaults()

  const [signingOut, setSigningOut] = useState(false)
  const [name, setName] = useState('')
  const [nameStatus, setNameStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [avatarBusy, setAvatarBusy] = useState<string | null>(null)
  // Both of these are occasional errands, not things to read on the way past,
  // so they stay shut until asked for.
  const [openPanel, setOpenPanel] = useState<'name' | 'avatar' | 'password' | null>(null)
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwStatus, setPwStatus] = useState<{ tone: 'ok' | 'err'; msg: string } | null>(null)
  const [pwBusy, setPwBusy] = useState(false)
  const [sessions, setSessions] = useState<SessionRecord[] | null>(null)
  const [wipe, setWipe] = useState<'idle' | 'confirm' | 'busy' | 'done'>('idle')

  const currentPlan = PLANS.find(p => p.id === plan) ?? PLANS[0]

  useEffect(() => { setName(displayNameOf(user) ?? '') }, [user])
  useEffect(() => {
    const m = user?.user_metadata as { avatar_id?: string } | undefined
    setAvatar(m?.avatar_id ?? null)
  }, [user])

  useEffect(() => {
    if (!user) return
    fetchSessions(user.id).then(setSessions).catch(() => setSessions([]))
  }, [user])

  async function saveName() {
    const supabase = getSupabase()
    if (!supabase) return
    setNameStatus('saving')
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } })
    setNameStatus(error ? 'error' : 'saved')
    setTimeout(() => setNameStatus('idle'), 2600)
  }

  async function chooseAvatar(id: string) {
    const supabase = getSupabase()
    if (!supabase) return
    const previous = avatar
    // Optimistic: the grid should answer the tap immediately, and a failed
    // write puts the old choice back rather than leaving a lie on screen.
    setAvatar(id)
    setAvatarBusy(id)
    const { error } = await supabase.auth.updateUser({ data: { avatar_id: id } })
    setAvatarBusy(null)
    if (error) setAvatar(previous)
  }

  async function changePassword() {
    const supabase = getSupabase()
    if (!supabase) return
    if (pw1.length < 6) { setPwStatus({ tone: 'err', msg: 'Use at least 6 characters.' }); return }
    if (pw1 !== pw2)    { setPwStatus({ tone: 'err', msg: 'Those two do not match.' }); return }
    setPwBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw1 })
    setPwBusy(false)
    if (error) { setPwStatus({ tone: 'err', msg: error.message }); return }
    setPw1(''); setPw2('')
    setPwStatus({ tone: 'ok', msg: 'Password updated.' })
  }

  const exportData = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      account: { email: user?.email ?? null, name: displayNameOf(user) },
      plan: { id: plan, expiresAt: expiresAt?.toISOString() ?? null },
      sessionDefaults: prefs,
      savedSessions: presets ?? [],
      sessions: sessions ?? [],
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `hzaura-data-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [user, plan, expiresAt, prefs, presets, sessions])

  async function clearHistory() {
    const supabase = getSupabase()
    if (!supabase || !user) return
    setWipe('busy')
    const { error } = await supabase.from('sessions').delete().eq('user_id', user.id)
    if (error) { setWipe('idle'); return }
    setSessions([])
    setWipe('done')
    setTimeout(() => setWipe('idle'), 2600)
  }

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = getSupabase()
    if (supabase) { try { await supabase.auth.signOut() } catch { /* ignore */ } }
    router.push('/')
    router.refresh()
  }

  const listened = (sessions ?? []).reduce((n, s) => n + s.elapsedSeconds, 0)

  return (
    <>
      <Header />
      <div className="ambient-bg" aria-hidden>
        <div className="ambient-orb" /><div className="ambient-orb" /><div className="ambient-orb" />
      </div>

      <main className="relative z-10 px-5 mx-auto"
            style={{ maxWidth: 620, paddingTop: 'calc(env(safe-area-inset-top) + 104px)', paddingBottom: 80 }}>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="mb-5"><BackLink fallbackLabel="Home" /></div>
          <h1 className="text-2xl font-black mb-1" style={{ letterSpacing: '-0.02em' }}>Settings</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--t3)' }}>
            Your account, your plan, and what a new session starts as.
          </p>

          {user === undefined ? (
            <div className="glass rounded-3xl p-8 text-center text-sm" style={{ color: 'var(--t3)' }}>Loading…</div>

          ) : user === null ? (
            <div className="glass-card grain p-8 rounded-3xl text-center">
              <div className="shimmer-overlay" />
              <div className="relative z-[2]">
                <h2 className="text-lg font-bold mb-2">You’re signed out</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--t2)' }}>
                  Sign in to manage your account, plan and history. Session defaults below still work — they
                  live in this browser.
                </p>
                <Link href="/auth/login" className="btn-primary inline-block">Sign in / Register</Link>
              </div>
            </div>

          ) : (
            <div className="flex flex-col gap-4">

              {/* ── Profile ──────────────────────────────────────────────── */}
              <Section label="PROFILE">
                <div className="flex items-center gap-4 mb-5">
                  <Avatar id={avatar} fallback={name || user.email || '?'} size={48} />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{user.email}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--t4)' }}>
                      Signed in with email · joined {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <Disclosure
                  label="Display name"
                  summary={name.trim() || 'Not set'}
                  open={openPanel === 'name'}
                  onToggle={() => setOpenPanel(o => (o === 'name' ? null : 'name'))}
                >
                  <div className="flex gap-2">
                    <input value={name} onChange={e => setName(e.target.value)} maxLength={60}
                           placeholder="What should we call you?" className="set-input flex-1"
                           aria-label="Display name" />
                    <button onClick={saveName} disabled={nameStatus === 'saving'} className="btn-ghost text-sm px-4">
                      {nameStatus === 'saving' ? 'Saving…' : nameStatus === 'saved' ? 'Saved ✓' : 'Save'}
                    </button>
                  </div>
                  {nameStatus === 'error' && <Note tone="err">Could not save that name.</Note>}
                </Disclosure>

                <Disclosure
                  label="Avatar"
                  summary={AVATARS.find(a => a.id === avatar)?.label ?? 'Not set'}
                  lead={<Avatar id={avatar} fallback={name || user.email || '?'} size={26} />}
                  open={openPanel === 'avatar'}
                  onToggle={() => setOpenPanel(o => (o === 'avatar' ? null : 'avatar'))}
                >
                  <div className="avatar-grid" role="radiogroup" aria-label="Choose an avatar">
                    {AVATARS.map(a => {
                      const on = avatar === a.id
                      return (
                        <button
                          key={a.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          aria-label={a.label}
                          title={a.label}
                          onClick={() => chooseAvatar(a.id)}
                          className="avatar-cell"
                          data-on={on || undefined}
                          style={{ borderColor: on ? a.color : undefined, background: on ? `${a.color}14` : undefined }}
                        >
                          <Avatar id={a.id} size={38} bare />
                          <span className="avatar-name">{a.label}</span>
                          {avatarBusy === a.id && <span className="avatar-busy" />}
                        </button>
                      )
                    })}
                  </div>
                </Disclosure>

                <Disclosure
                  label="Password"
                  summary="Change it"
                  open={openPanel === 'password'}
                  onToggle={() => setOpenPanel(o => (o === 'password' ? null : 'password'))}
                >
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input type="password" value={pw1} onChange={e => setPw1(e.target.value)}
                           placeholder="New password" autoComplete="new-password"
                           className="set-input flex-1" aria-label="New password" />
                    <input type="password" value={pw2} onChange={e => setPw2(e.target.value)}
                           placeholder="Repeat it" autoComplete="new-password"
                           className="set-input flex-1" aria-label="Repeat new password" />
                    <button onClick={changePassword} disabled={pwBusy || !pw1} className="btn-ghost text-sm px-4">
                      {pwBusy ? 'Updating…' : 'Update'}
                    </button>
                  </div>
                  {pwStatus && <Note tone={pwStatus.tone === 'ok' ? 'ok' : 'err'}>{pwStatus.msg}</Note>}
                </Disclosure>
              </Section>

              {/* ── Plan ─────────────────────────────────────────────────── */}
              <Section label="YOUR PLAN">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-lg">{currentPlan.name}</span>
                      <span className="plan-badge" data-plan={plan}>
                        <span className="plan-badge-dot" aria-hidden />
                        {plan === 'free' ? 'Free' : 'Active'}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--t4)' }}>{currentPlan.tagline}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-black text-xl">${currentPlan.price}</span>
                    <span className="text-xs" style={{ color: 'var(--t4)' }}>/mo</span>
                  </div>
                </div>

                {plan !== 'free' && expiresAt && (
                  <div className="mb-4">
                    <div className="flex items-baseline justify-between mb-2">
                      <p className="text-xs" style={{ color: 'var(--t3)' }}>Active until {fmtDate(expiresAt)}</p>
                      <p className="text-xs font-bold">{daysLeft(expiresAt)} days left</p>
                    </div>
                    {/* Over 40 days left can only be an annual window. */}
                    <Meter value={daysLeft(expiresAt) / planDurationDays(daysLeft(expiresAt) > 40 ? 'annual' : 'monthly')} />
                  </div>
                )}

                <ul className="flex flex-col gap-1.5 mb-4">
                  {currentPlan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-[0.78rem]" style={{ color: 'var(--t3)' }}>
                      <span style={{ color: 'var(--t4)' }}>—</span>{f}
                    </li>
                  ))}
                </ul>

                {plan === 'free' ? (
                  <Link href="/pricing" className="btn-primary w-full text-center block">Upgrade your plan →</Link>
                ) : (
                  <div className="flex gap-2.5">
                    <Link href="/pricing" className="btn-ghost flex-1 text-center text-sm">Extend</Link>
                    <Link href="/history" className="btn-ghost flex-1 text-center text-sm">History</Link>
                  </div>
                )}
                {plan !== 'free' && (
                  <p className="text-[0.68rem] mt-3 text-center" style={{ color: 'var(--t4)' }}>
                    Paid with crypto — nothing auto-renews.
                  </p>
                )}
              </Section>

              {/* ── Session defaults ─────────────────────────────────────── */}
              <Section label="SESSION DEFAULTS"
                       hint="What the builder is already set to when you open it. Stored on this device.">
                <Field label="Visual">
                  <div className="set-row">
                    {(['brain', 'aura', 'frequency'] as const).map(v => (
                      <button key={v} onClick={() => update({ viz: v })} className="set-chip" data-on={prefs.viz === v || undefined}>
                        {VIZ_LABELS[v]}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Length">
                  <div className="set-row">
                    {LENGTHS.map(m => (
                      <button key={m} onClick={() => update({ minutes: m })} className="set-chip" data-on={prefs.minutes === m || undefined}>
                        {lengthLabel(m)}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Brainwave band">
                  <div className="set-row">
                    {BANDS.map(b => (
                      <button key={b} onClick={() => update({ band: b })} className="set-chip" data-on={prefs.band === b || undefined}>
                        {b === 'suggested' ? 'Follow the tone' : BINAURAL_PRESETS[b].label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[0.7rem] mt-2" style={{ color: 'var(--t4)' }}>
                    {prefs.band === 'suggested'
                      ? 'Each tone brings its own curated pairing.'
                      : `Every session starts on ${BINAURAL_PRESETS[prefs.band].label} — ${BINAURAL_PRESETS[prefs.band].state.toLowerCase()}.`}
                  </p>
                </Field>

                {(prefs.viz !== DEFAULT_PREFS.viz || prefs.minutes !== DEFAULT_PREFS.minutes || prefs.band !== DEFAULT_PREFS.band) && (
                  <button onClick={() => update(DEFAULT_PREFS)}
                          className="text-[0.72rem] underline" style={{ color: 'var(--t4)' }}>
                    Reset to the standard defaults
                  </button>
                )}
              </Section>

              {/* ── Saved sessions ───────────────────────────────────────── */}
              <Section label="SAVED SESSIONS"
                       hint="Stored on your account, so they follow you to any device.">
                {!presets || presets.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--t3)' }}>
                    None yet. Build a session you like and tap the bookmark next to Begin —{' '}
                    <Link href="/session" style={{ color: 'var(--accent)' }}>start one</Link>.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {presets.map(p => (
                      <div key={p.id} className="set-list-row">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{p.name}</p>
                          <p className="text-[0.7rem]" style={{ color: 'var(--t4)' }}>
                            {p.hz} Hz · {BINAURAL_PRESETS[p.band].label} · {VIZ_LABELS[p.viz]} · {lengthLabel(p.minutes)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Link href={`/studio?hz=${p.hz}&binaural=${p.band}&duration=${p.minutes}&viz=${p.viz}`}
                                className="set-mini">Play</Link>
                          <button onClick={() => remove(p.id)} className="set-mini set-mini-danger">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* ── Data ─────────────────────────────────────────────────── */}
              <Section label="YOUR DATA">
                <div className="set-list-row">
                  <div>
                    <p className="text-sm font-semibold">Export everything</p>
                    <p className="text-[0.7rem]" style={{ color: 'var(--t4)' }}>
                      {sessions === null ? 'Counting…' : `${sessions.length} sessions · ${Math.round(listened / 60)} minutes listened`}
                      {presets ? ` · ${presets.length} saved setups` : ''}
                    </p>
                  </div>
                  <button onClick={exportData} className="set-mini flex-shrink-0">JSON</button>
                </div>

                <div className="set-list-row">
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-semibold">Clear session history</p>
                    <p className="text-[0.7rem]" style={{ color: 'var(--t4)' }}>
                      Deletes every session row on your account. Saved setups and your plan stay.
                    </p>
                  </div>
                  {wipe === 'confirm' ? (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setWipe('idle')} className="set-mini">Keep</button>
                      <button onClick={clearHistory} className="set-mini set-mini-danger">Delete all</button>
                    </div>
                  ) : (
                    <button onClick={() => setWipe('confirm')} disabled={wipe === 'busy'}
                            className="set-mini set-mini-danger flex-shrink-0">
                      {wipe === 'busy' ? 'Deleting…' : wipe === 'done' ? 'Cleared ✓' : 'Clear'}
                    </button>
                  )}
                </div>
              </Section>

              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="glass rounded-2xl px-6 py-4 flex items-center justify-center gap-2.5 text-sm font-medium transition-colors hover:bg-red-500/[0.06]"
                style={{ color: '#e05050', opacity: signingOut ? 0.6 : 1 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          )}

          {/* Signed-out visitors still get their device defaults. */}
          {user === null && (
            <div className="mt-4">
              <Section label="SESSION DEFAULTS" hint="Stored in this browser.">
                <Field label="Visual">
                  <div className="set-row">
                    {(['brain', 'aura', 'frequency'] as const).map(v => (
                      <button key={v} onClick={() => update({ viz: v })} className="set-chip" data-on={prefs.viz === v || undefined}>
                        {VIZ_LABELS[v]}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Length">
                  <div className="set-row">
                    {LENGTHS.map(m => (
                      <button key={m} onClick={() => update({ minutes: m })} className="set-chip" data-on={prefs.minutes === m || undefined}>
                        {lengthLabel(m)}
                      </button>
                    ))}
                  </div>
                </Field>
              </Section>
            </div>
          )}
        </motion.div>
      </main>

      <Footer />
    </>
  )
}

// ─── Bits ─────────────────────────────────────────────────────────────────────

function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-3xl p-6">
      <p className="text-[0.62rem] font-bold tracking-[0.14em]" style={{ color: 'var(--t4)' }}>{label}</p>
      {hint && <p className="text-[0.72rem] mt-1.5" style={{ color: 'var(--t4)', lineHeight: 1.5 }}>{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <p className="text-[0.7rem] font-semibold mb-2" style={{ color: 'var(--t3)' }}>{label}</p>
      {children}
    </div>
  )
}

/**
 * A settings row that opens.
 *
 * Twelve avatar tiles and a pair of password fields sitting permanently open
 * made the profile card mostly things nobody had come to do — and put two
 * empty password boxes on screen every time somebody wanted to check their
 * plan. Closed, each row still says what it holds and what it is currently
 * set to, so nothing is hidden, only folded.
 */
function Disclosure({ label, summary, lead, open, onToggle, children }: {
  label: string
  summary: string
  lead?: React.ReactNode
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="mb-3 last:mb-0">
      <button type="button" onClick={onToggle} aria-expanded={open} className="disc-row">
        <span className="disc-label">{label}</span>
        <span className="disc-right">
          {lead}
          <span className="disc-summary">{summary}</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
               style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="disc-body">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Note({ tone, children }: { tone: 'ok' | 'err'; children: React.ReactNode }) {
  return (
    <p className="text-[0.72rem] mt-2" style={{ color: tone === 'ok' ? 'var(--accent)' : '#f0a0a0' }}>
      {children}
    </p>
  )
}

function Meter({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value * 100))
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
      <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6 }} style={{ background: 'var(--t2)' }} />
    </div>
  )
}
