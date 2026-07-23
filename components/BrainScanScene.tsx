'use client'

import { useEffect, useRef } from 'react'

interface Props {
  /** Whether the session is actively playing (drives the warm-up). Ignored in preview mode. */
  isPlaying: boolean
  /** 'session' = dissolve tied to session progress; 'preview' = gentle looping dissolve. */
  mode?: 'session' | 'preview'
  /**
   * Session progress 0→1 (elapsed / total). In session mode this maps the dissolve to
   * the whole session — resting scan at the start, fully activated at the end.
   */
  progress?: number
  /** Preview loop speed (seconds per direction). Default 6s. */
  duration?: number
}

/**
 * Brain PET-scan reveal. Shows the resting scan (brain-1) at the start of the
 * session and dissolves into the activated scan (brain-2) across the ENTIRE
 * session — a 30-minute session fades over 30 minutes — mirroring cortical
 * activity climbing throughout the session.
 */
export default function BrainScanScene({ isPlaying, mode = 'session', progress = 0, duration }: Props) {
  const rootRef    = useRef<HTMLDivElement>(null)
  const stageRef   = useRef<HTMLDivElement>(null)
  const img2Ref    = useRef<HTMLDivElement>(null)
  const glowRef    = useRef<HTMLDivElement>(null)
  const captionRef = useRef<HTMLSpanElement>(null)
  const hintRef    = useRef<HTMLDivElement>(null)
  const progRef    = useRef(0)
  const rafRef     = useRef(0)
  const playingRef = useRef(isPlaying)
  const targetRef  = useRef(progress)
  const zoomRef    = useRef({ z: 1, x: 0, y: 0 })

  useEffect(() => { playingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { targetRef.current = progress }, [progress])

  // ── Touchpad / wheel zoom + drag pan (session mode only) ──────────────────
  useEffect(() => {
    if (mode !== 'session') return
    const root = rootRef.current
    const stage = stageRef.current
    if (!root || !stage) return

    const apply = () => {
      const { z, x, y } = zoomRef.current
      stage.style.transform = `translate(${x}px, ${y}px) scale(${z})`
      stage.style.cursor = z > 1 ? 'grab' : 'default'
    }
    const clampPan = () => {
      const s = zoomRef.current
      const r = root.getBoundingClientRect()
      const mx = (r.width  * (s.z - 1)) / 2
      const my = (r.height * (s.z - 1)) / 2
      s.x = Math.max(-mx, Math.min(mx, s.x))
      s.y = Math.max(-my, Math.min(my, s.y))
    }
    const flashHint = () => {
      if (!hintRef.current) return
      hintRef.current.style.opacity = '1'
      window.clearTimeout((flashHint as unknown as { t?: number }).t)
      ;(flashHint as unknown as { t?: number }).t = window.setTimeout(() => {
        if (hintRef.current) hintRef.current.style.opacity = '0'
      }, 1100)
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const s = zoomRef.current
      const r = root.getBoundingClientRect()
      const cx = e.clientX - r.left - r.width / 2
      const cy = e.clientY - r.top  - r.height / 2
      const factor = Math.exp(-e.deltaY * 0.0015)   // pinch/scroll both map here
      const nz = Math.max(1, Math.min(6, s.z * factor))
      // keep the point under the cursor stable while zooming
      s.x = cx - ((cx - s.x) * nz) / s.z
      s.y = cy - ((cy - s.y) * nz) / s.z
      s.z = nz
      if (nz === 1) { s.x = 0; s.y = 0 }
      clampPan(); apply(); flashHint()
    }

    const drag = { active: false, sx: 0, sy: 0, ox: 0, oy: 0 }
    const onPointerDown = (e: PointerEvent) => {
      if (zoomRef.current.z <= 1) return
      drag.active = true
      drag.sx = e.clientX; drag.sy = e.clientY
      drag.ox = zoomRef.current.x; drag.oy = zoomRef.current.y
      root.setPointerCapture(e.pointerId)
      stage.style.cursor = 'grabbing'
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!drag.active) return
      zoomRef.current.x = drag.ox + (e.clientX - drag.sx)
      zoomRef.current.y = drag.oy + (e.clientY - drag.sy)
      clampPan(); apply()
    }
    const onPointerUp = (e: PointerEvent) => {
      drag.active = false
      try { root.releasePointerCapture(e.pointerId) } catch { /* noop */ }
      apply()
    }
    const onDouble = () => { zoomRef.current = { z: 1, x: 0, y: 0 }; apply() }

    root.addEventListener('wheel', onWheel, { passive: false })
    root.addEventListener('pointerdown', onPointerDown)
    root.addEventListener('pointermove', onPointerMove)
    root.addEventListener('pointerup', onPointerUp)
    root.addEventListener('dblclick', onDouble)
    apply()
    return () => {
      root.removeEventListener('wheel', onWheel)
      root.removeEventListener('pointerdown', onPointerDown)
      root.removeEventListener('pointermove', onPointerMove)
      root.removeEventListener('pointerup', onPointerUp)
      root.removeEventListener('dblclick', onDouble)
    }
  }, [mode])

  useEffect(() => {
    const DUR = duration ?? 6
    let last = performance.now()
    let dir = 1
    let holdUntil = 0

    function frame(now: number) {
      rafRef.current = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      if (mode === 'preview') {
        // Gentle ping-pong loop with a brief hold at each end
        if (now < holdUntil) { /* hold */ }
        else {
          progRef.current += (dir * dt) / DUR
          if (progRef.current >= 1) { progRef.current = 1; dir = -1; holdUntil = now + 1400 }
          if (progRef.current <= 0) { progRef.current = 0; dir = 1;  holdUntil = now + 1400 }
        }
      } else {
        // Session: smoothly follow the real session progress (updates ~1×/sec).
        // The lerp only removes per-second stepping — the pace is set by `progress`.
        const target = Math.max(0, Math.min(1, targetRef.current))
        progRef.current += (target - progRef.current) * Math.min(1, dt * 2)
      }

      const p = progRef.current
      if (img2Ref.current) img2Ref.current.style.opacity = String(p)
      if (glowRef.current) {
        const g = Math.sin(Math.min(1, p) * Math.PI) // peaks mid-dissolve
        glowRef.current.style.opacity = String(g * 0.7)
        glowRef.current.style.transform = `scale(${0.9 + g * 0.35})`
      }
      if (captionRef.current && mode === 'session') {
        captionRef.current.textContent =
          p < 0.04 ? 'Resting state' : p > 0.96 ? 'Peak activation' : 'Activating…'
      }
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [mode, duration])

  const layer = (url: string, refEl?: React.Ref<HTMLDivElement>, opacity = 1): React.CSSProperties => ({
    position: 'absolute', inset: 0,
    backgroundImage: `url(${url})`,
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    opacity,
  })

  return (
    <div
      ref={rootRef}
      style={{
        position: 'absolute', inset: 0, overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 44%, #0a1220 0%, #05050c 72%)',
        touchAction: mode === 'session' ? 'none' : 'auto',
      }}
    >
      {/* Zoomable / pannable stage */}
      <div ref={stageRef} style={{ position: 'absolute', inset: 0, transformOrigin: 'center center', willChange: 'transform' }}>
        {/* Ambient warm bloom that swells during the dissolve */}
        <div
          ref={glowRef}
          aria-hidden
          style={{
            position: 'absolute', inset: '-8%', pointerEvents: 'none', opacity: 0,
            background: 'radial-gradient(circle at 50% 46%, rgba(255,110,50,0.28), rgba(90,232,220,0.05) 45%, transparent 70%)',
            filter: 'blur(20px)', mixBlendMode: 'screen',
          }}
        />
        {/* Resting scan (base) */}
        <div aria-hidden style={layer('/images/brain-1.png')} />
        {/* Activated scan (dissolves in) */}
        <div ref={img2Ref} aria-hidden style={layer('/images/brain-2.png', undefined, 0)} />
      </div>

      {/* State caption */}
      {mode === 'session' && (
        <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 5, pointerEvents: 'none' }}>
          <span
            ref={captionRef}
            className="glass"
            style={{ padding: '5px 14px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.02em' }}
          >
            Resting state
          </span>
        </div>
      )}

      {/* Zoom hint (fades in briefly while zooming) */}
      {mode === 'session' && (
        <div
          ref={hintRef}
          aria-hidden
          style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 5,
            pointerEvents: 'none', opacity: 0, transition: 'opacity 0.3s',
          }}
        >
          <span className="glass" style={{ padding: '4px 12px', borderRadius: 999, fontSize: '0.66rem', fontWeight: 600, color: 'var(--t3)' }}>
            Scroll / pinch to zoom · drag to pan · double-click to reset
          </span>
        </div>
      )}
    </div>
  )
}
