# Solive — Frequency App

## Project Overview
- Next.js 14 app (App Router) + Supabase auth + Three.js
- Name: Solive
- Purpose: Personalized healing frequency studio — questionnaire → AI frequency prescription → 3D cymatic visualization

## App Flow (Phase 1 — COMPLETE)
- `/` → Welcome screen (app/page.tsx)
- `/session` → 6-question tap-card questionnaire → prescription card → `/studio?hz=...`
- `/studio` → Full studio: 3D cymatic Three.js viz + audio engine (FrequencyStudio + ThreeVisualizer)
- `/history` → Session log (requires Supabase sessions table)
- `/dashboard` → redirects to `/`
- `/auth/login` → login + register
- `/auth/callback` → Supabase code exchange

## Key Files
- `app/page.tsx` — Welcome screen (dark, animated, CTA to /session)
- `app/session/page.tsx` — Full questionnaire client component (framer-motion)
- `app/studio/page.tsx` + `app/studio/StudioClient.tsx` — Studio page (reads URL params)
- `app/history/page.tsx` — Session history (Supabase)
- `components/FrequencyStudio.tsx` — Audio engine (WebAudio API, binaural + Solfeggio)
- `components/ThreeVisualizer.tsx` — Cymatic 3D viz (Three.js, Chladni standing wave equations)
- `lib/frequencies.ts` — Full 10 Solfeggio frequency data library
- `lib/recommendation.ts` — Weighted scoring engine (answers → frequency)
- `supabase/sessions_table.sql` — Sessions table SQL (run in Supabase dashboard)
- `lib/supabase/client.ts` — Browser Supabase client
- `lib/supabase/server.ts` — Server Supabase client
- `middleware.ts` — Passthrough (auth is optional)

## Frequency Library (lib/frequencies.ts)
All 10 Solfeggio frequencies: 174, 285, 396, 417, 432, 528, 639, 741, 852, 963 Hz
Each has: hz, name, tagline, description, effects[], researchNote, color, colorHex, cymatics

## Recommendation Engine (lib/recommendation.ts)
- 5 questions: currentFeeling, bodyState, mindState, sleepQuality, primaryNeed + sessionDuration
- Weighted scoring across all 10 frequencies
- Returns: primary frequency + binaural band (delta/theta/alpha/beta/gamma)
- Serialized to URL params: /studio?hz=528&binaural=alpha&duration=30

## Audio Engine (FrequencyStudio.tsx)
- WebAudio API: base Solfeggio tone + stereo binaural beat (L = carrier, R = carrier + beat Hz)
- Fade in/out on play/stop
- Volume control + session timer with progress bar

## 3D Visualizer (ThreeVisualizer.tsx)
- Three.js: cymatic sphere mesh deformed by Chladni standing wave equations
- n, m (nodal numbers) scale with frequency complexity level (1-5)
- Audio-reactive: FFT amplitude drives vertex deformation magnitude
- Waveform ring around sphere, particle field, cinematic camera orbit
- Color hex from frequency library

## Design System (globals.css)
- `--bg-void: #06060e` — main background
- Frequency color themes: freq-amber/red/emerald/blue/violet/purple
- `--accent` / `--accent-glow` CSS vars override per frequency
- Glass morphism: `.glass`, `.tap-card`, `.tap-card.selected`
- Animations: `.fade-up`, `.pulse`, `.breathe`, `.spin-slow`

## Auth Flow (unchanged)
- Supabase email+password
- Guests can do sessions without login (history not saved)
- `/auth/login` → login + register forms
- `/auth/callback` → code exchange → /

## Supabase sessions table
- Run `supabase/sessions_table.sql` in Supabase SQL editor
- Columns: id, user_id, created_at, hz, binaural_band, duration_seconds, answers (jsonb), before_score, after_score

## Vercel Deployment — Required Steps
1. Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app`
2. Supabase Dashboard → Auth → URL Configuration:
   - Site URL: `https://your-domain.vercel.app`
   - Redirect URLs: add `https://your-domain.vercel.app/auth/callback`

## Packages
- framer-motion (questionnaire animations)
- three + @types/three
- @supabase/ssr + @supabase/supabase-js
- next 14, tailwind 3
