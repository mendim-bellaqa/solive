# Solive — Frequency App

## Project Overview
- Next.js 14 app (App Router) + Supabase auth + Three.js
- Name: Solive
- Purpose: Personalized healing frequency studio — questionnaire → AI frequency prescription → 3D cymatic visualization
- **STATUS: ALL 6 PHASES COMPLETE**

## App Flow
- `/` → Welcome screen (OnboardingModal on first visit)
- `/session` → 6-question tap-card questionnaire → prescription card → `/studio?hz=...`
- `/studio` → Full studio: 3D cymatic Three.js viz + audio engine (FrequencyStudio + ThreeVisualizer)
- `/history` → Session log (streak, freq chart, improvement delta) — requires Supabase sessions table
- `/dashboard` → redirects to `/`
- `/auth/login` → login + register

## Key Files
- `app/page.tsx` — Welcome screen (dark, animated, OnboardingModal)
- `app/session/page.tsx` — Questionnaire (framer-motion), saves answers to sessionStorage
- `app/studio/page.tsx` + `app/studio/StudioClient.tsx` — Studio page (reads URL params + sessionStorage answers)
- `app/history/page.tsx` — Session history (streak, freq chart, session list)
- `components/FrequencyStudio.tsx` — Audio engine + post-session rating + Supabase save
- `components/ThreeVisualizer.tsx` — Cymatic 3D viz (Three.js, dual Chladni standing waves, LOD)
- `components/OnboardingModal.tsx` — 3-slide first-time intro (localStorage flag)
- `lib/frequencies.ts` — Full 10 Solfeggio frequency data library
- `lib/recommendation.ts` — Weighted scoring engine (answers → frequency)
- `lib/supabase/client.ts` — Browser Supabase client
- `lib/supabase/server.ts` — Server Supabase client
- `supabase/sessions_table.sql` — Sessions table SQL
- `public/manifest.json` — PWA manifest
- `middleware.ts` — Passthrough (auth is optional)

## Audio Engine (FrequencyStudio.tsx)
- Persistent audio graph (oscillators survive pause via masterGain muting)
- Solfeggio base + binaural stereo pair + secondary undertone + Schumann layer (7.83 Hz)
- End chime: Tibetan bowl synthesis (3 partials, exponential decay)
- Live binaural band switching (linearRampToValueAtTime over 2s)
- Post-session rating: 5-emoji overlay → Supabase save (before inferred from Q1, after from rating)

## 3D Visualizer (ThreeVisualizer.tsx) — Phase 4
- Dual superimposed Chladni standing waves per frequency
- LOD: 48/72/96 segments based on devicePixelRatio
- isPlayingRef pattern (stale closure fix)
- MeshStandardMaterial (PBR), AdditiveBlending on rings/particles
- Two waveform rings (equatorial + meridional), two orbit rings
- Audio-reactive particle breathing (expands with RMS energy)
- Full GPU cleanup on unmount

## Session Logging (Phase 5)
- Answers saved to sessionStorage in session/page.tsx → read by StudioClient → passed to FrequencyStudio
- After session ends: 5-emoji rating → saveSession() → Supabase insert (guests silently skipped)
- before_score inferred from Q1 answer (anxious/in_pain/sad → 2, unfocused/disconnected → 3, calm_seeking → 4)
- after_score = user's 1-5 rating
- History: streak counter, avg improvement, top freq CSS bar chart, session list with ±delta

## PWA + Polish (Phase 6)
- public/manifest.json — standalone PWA
- layout.tsx — Viewport export, theme-color #06060e, apple-web-app
- OnboardingModal — 3 slides shown once (localStorage key: solive_onboarded_v1)
- globals.css — .skeleton class, focus-visible ring, ::selection color

## Supabase sessions table
- Run `supabase/sessions_table.sql` in Supabase SQL editor
- Columns: id, user_id, created_at, hz, binaural_band, duration_seconds, answers (jsonb), before_score, after_score

## Vercel Deployment — Required Steps
1. Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app`
2. Supabase Dashboard → Auth → URL Configuration:
   - Site URL: `https://your-domain.vercel.app`
   - Redirect URLs: add `https://your-domain.vercel.app/auth/callback`
3. Run sessions_table.sql in Supabase SQL editor
