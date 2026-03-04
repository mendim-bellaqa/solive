# Solive — Personalized Healing Frequency Studio

A personalized healing frequency studio. The user answers a short questionnaire about their current mental, emotional, and physical state. The app uses research-backed logic to prescribe a specific sound frequency session — combining a Solfeggio base tone + binaural beats — and plays it with a real-time 3D cymatic visualization that is physically accurate to the frequency being played.

---

## The Science Foundation (built into the app)

Based on the research, the app uses three layers of sound:

| Layer | What it is | Example |
|---|---|---|
| Solfeggio base tone | The healing frequency itself | 528 Hz |
| Binaural beat overlay | Two offset tones → brain entrainment | 200 Hz L / 209 Hz R = 9 Hz alpha |
| Schumann grounding | Earth resonance hum (7.83 Hz) | Optional ambient layer |

---

## Screen-by-Screen Flow (0 → 100)

### Screen 1 — Welcome / Onboarding
- Full-screen dark minimal design
- Name: **Solive** with a subtle animated frequency waveform in the background
- Tagline: *"Your frequency. Your healing."*
- Two paths: **Start Session** (new users) | **My History** (returning)
- Brief 3-line explainer: what the app does + headphone prompt (mandatory for binaural beats)

### Screen 2 — The Questionnaire (5–7 Questions)

Each question is a **tap-card UI** — large visual options, no text fields. Takes ~60 seconds total.

**Q1 — Right now, I feel…**
- Options: Anxious | Exhausted | In pain | Unfocused | Disconnected | Sad/Heavy | Calm but seeking more

**Q2 — My body feels…**
- Options: Tense / tight | Sore / aching | Fine physically | Restless / wired | Heavy / drained

**Q3 — My mind is…**
- Options: Racing / overwhelmed | Foggy / slow | Scattered / distracted | Fairly clear | Shut down

**Q4 — My sleep lately has been…**
- Options: Poor — can't fall asleep | Poor — wake up a lot | Average | Good

**Q5 — What do I most need right now?**
- Options: Rest & calm | Focus & clarity | Emotional release | Physical healing | Spiritual depth | Energy boost

**Q6 (conditional — if "In pain" selected in Q1):**
- Where? Head | Neck/Shoulders | Back | Full body | Chest
- How intense? Mild / Moderate / Severe

**Q7 — Session length**
- 15 min | 30 min | 45 min | Open (manual stop)

### Screen 3 — Frequency Prescription Card

Before playing, show the user **why** they got this frequency. Like a doctor's note but beautiful.

```
┌─────────────────────────────────────────┐
│                                         │
│        YOUR FREQUENCY TODAY             │
│                                         │
│              528 Hz                     │
│         "The Transformation Tone"       │
│                                         │
│  Base: 528 Hz Solfeggio                 │
│  Brainwave: Alpha (9 Hz binaural)       │
│  Goal: Reduce anxiety · Restore calm    │
│                                         │
│  Backed by: 3 clinical studies on       │
│  autonomic nervous system regulation    │
│                                         │
│        [ Begin Session ]                │
└─────────────────────────────────────────┘
```

### Screen 4 — The Studio (Main Experience)

**Top half:** Real-time 3D cymatic visualization
- Built with Three.js + WebAudio API
- The 3D shape is mathematically driven by the actual frequency being played
- Lower frequencies (174–285 Hz) → slow, simple pulsing geometric forms
- Mid frequencies (396–639 Hz) → rotating mandalas, six-fold symmetry
- High frequencies (741–963 Hz) → intricate crystalline lattices, rapid evolution
- Color palette shifts with frequency: warm amber at low end, violet/white at high end
- The shape reacts in real time to the amplitude — it breathes with the sound

**Bottom third:** Controls
- Frequency name + Hz number (live)
- Play/Pause | Volume | Timer
- "What is this frequency?" → bottom sheet with the research
- "Adjust session" → tweak binaural beat target (e.g., move from alpha to theta)

### Screen 5 — Session End / Integration

After the session ends:
- Soft fade of the visualization
- Prompt: *"How do you feel now?"* (before/after comparison — 1–5 scale on 3 dimensions: body / mind / mood)
- Log is saved to session history
- Optional: journal note field (free text)
- Share card: a still of the cymatic visualization with the frequency info (shareable image)

### Screen 6 — History & Patterns

- Timeline of past sessions
- Which frequencies used most
- Before/after feeling comparison trends
- "Your most visited states" — insight cards

---

## The Recommendation Engine (Logic)

A **weighted scoring system** — not just a decision tree:

Each answer contributes weighted points to each frequency.

Example scoring for "Anxious + Racing mind + Poor sleep + Need calm":
```
528 Hz  →  +4 (anxiety)  +3 (racing mind)  +2 (sleep)  +4 (need calm)  = 13 ✓ PRIMARY
396 Hz  →  +3            +2               +2           +2               = 9
432 Hz  →  +1            +1               +4           +2               = 8
174 Hz  →  +0            +0               +1           +1               = 2
```

→ Recommend: 528 Hz + Alpha binaural (9 Hz)
→ Secondary layer: 396 Hz undertone (subtle blend)

The logic handles 10 possible Solfeggio frequencies + 5 binaural band targets = 50 combinations. The top scorer wins, second scorer becomes the binaural differential target.

---

## Technical Build Plan (Phase by Phase)

### Phase 1 — Foundation (Clean Slate) ✅ COMPLETE
- Wipe current studio UI, keep Supabase auth + Next.js shell
- Create new route structure: `/` → welcome, `/session` → questionnaire, `/studio` → player, `/history` → logs
- Set up Supabase table: `sessions` (user_id, date, answers JSON, frequency, before/after scores)
- Design system: dark background (`#06060e`), accent colors by frequency band

### Phase 2 — Questionnaire Engine ✅ COMPLETE
- Build question components (tap-card UI, swipe-forward flow)
- Build scoring logic (TypeScript pure function: `answers → { primaryFrequency, binauralTarget, explanation }`)
- Build prescription card screen

### Phase 3 — Audio Engine ✅ COMPLETE
- WebAudio API: oscillator for base Solfeggio tone (sine wave)
- Binaural beat generator: L channel tone + R channel tone with Hz differential
- Optional Schumann layer: 7.83 Hz LFO on a carrier
- Volume envelope: slow fade in/out (prevents jarring start)
- Session timer with gentle end signal

### Phase 4 — 3D Visualization (Three.js) ✅ COMPLETE
- Frequency-accurate 3D cymatic geometry (parametric mesh that changes shape per Hz)
- WebAudio analyser node → real-time amplitude → mesh deformation
- Color gradient tied to frequency value
- Camera: slow auto-orbit for cinematic depth
- Performance: 60fps on mobile via instanced geometry, LOD

### Phase 5 — Session Logging + History
- Save session on end
- Before/after comparison prompt
- History screen with charts (recharts or d3)
- Streak tracking

### Phase 6 — Polish + Production
- Mobile-first responsive layout
- PWA support (offline playback)
- Share card generation (html2canvas → PNG)
- Onboarding flow for first-time users
- Headphone reminder + binaural explanation tooltip

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) — already in place |
| Auth + DB | Supabase — already in place |
| Audio | Web Audio API (native browser) |
| 3D | Three.js + React Three Fiber |
| Animation | Framer Motion (UI transitions) |
| State | Zustand (session state) |
| Charts | Recharts (history screen) |
| Styling | Tailwind CSS |
