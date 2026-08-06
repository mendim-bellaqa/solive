'use client'

import { useEffect, useRef } from 'react'

interface Props {
  /** Beat frequency in Hz — sets how fast the drift animates. */
  beatHz: number
  /** How many complete beat cycles to fit across the window. */
  beatCycles: number
  colorHex: string
  playing?: boolean
}

const LEFT_CYCLES = 16

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '')
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ]
}

/**
 * The textbook beat figure, animated: two pure tones whose cycle counts differ
 * by exactly `beatCycles` across the window, and the interference that
 * difference produces.
 *
 * The carrier is compressed — 16 drawn cycles standing in for a couple hundred
 * real ones — because at true scale the traces would be a solid block. The
 * relationship the picture is actually about survives that compression intact:
 * the number of beats across the window *is* the difference in cycle count.
 */
export default function BeatCanvas({
  beatHz, beatCycles, colorHex, playing = false,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)
  // Read live values inside the loop so prop changes don't restart the phase.
  const props = useRef({ beatHz, beatCycles, colorHex, playing })
  props.current = { beatHz, beatCycles, colorHex, playing }

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let phase = 0
    let last = performance.now()

    const trace = (
      W: number, y: number, h: number, cycles: number,
      shift: number, rgb: [number, number, number], alpha: number,
    ) => {
      const path = new Path2D()
      for (let x = 0; x <= W; x += 1.5) {
        const t = x / W
        const py = y + Math.sin((t * cycles + shift) * Math.PI * 2) * h
        if (x === 0) path.moveTo(x, py)
        else path.lineTo(x, py)
      }
      const [r, g, b] = rgb
      // Cheap bloom: a wide soft pass under a tight bright one.
      ctx.lineWidth = 5
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.16})`
      ctx.stroke(path)
      ctx.lineWidth = 1.6
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
      ctx.stroke(path)
    }

    const draw = () => {
      raf.current = requestAnimationFrame(draw)
      const c = ref.current
      if (!c) return

      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      const p = props.current
      const rgb = hexToRgb(p.colorHex)
      // Drift speed tracks the real beat rate, scaled to stay watchable at
      // 40 Hz gamma without stalling at 2 Hz delta.
      if (!reduced) phase += dt * (p.playing ? 0.32 : 0.16) * Math.sqrt(p.beatHz)

      const W = c.offsetWidth
      const H = c.offsetHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (c.width !== W * dpr || c.height !== H * dpr) {
        c.width = W * dpr
        c.height = H * dpr
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
      ctx.clearRect(0, 0, W, H)

      // Each row reserves its upper strip for the caption, so traces sit low in
      // the band and never run through their own label.
      const rowH = H / 3
      const amp = Math.min(rowH * 0.24, 21)
      const mid = (row: number) => rowH * (row + 0.66)
      const rightCycles = LEFT_CYCLES + p.beatCycles

      // Rows 1 & 2 — what physically arrives at each ear.
      trace(W, mid(0), amp, LEFT_CYCLES, phase, [140, 190, 255], 0.8)
      trace(W, mid(1), amp, rightCycles, phase, [190, 150, 255], 0.8)

      // Row 3 — the interference. Envelope first, then the carrier inside it.
      const y3 = mid(2)
      const env = new Path2D()
      const envLower: [number, number][] = []
      for (let x = 0; x <= W; x += 2) {
        const t = x / W
        const e = Math.abs(Math.cos(t * p.beatCycles * Math.PI))
        const py = y3 - e * amp * 1.15
        if (x === 0) env.moveTo(x, py)
        else env.lineTo(x, py)
        envLower.push([x, y3 + e * amp * 1.15])
      }
      for (let i = envLower.length - 1; i >= 0; i--) env.lineTo(envLower[i][0], envLower[i][1])
      env.closePath()
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.13)`
      ctx.fill(env)
      ctx.lineWidth = 1
      ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.5)`
      ctx.stroke(env)

      const sum = new Path2D()
      for (let x = 0; x <= W; x += 1.5) {
        const t = x / W
        const a = Math.sin((t * LEFT_CYCLES + phase) * Math.PI * 2)
        const b = Math.sin((t * rightCycles + phase) * Math.PI * 2)
        const py = y3 + ((a + b) / 2) * amp * 1.15
        if (x === 0) sum.moveTo(x, py)
        else sum.lineTo(x, py)
      }
      ctx.lineWidth = 4
      ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.18)`
      ctx.stroke(sum)
      ctx.lineWidth = 1.5
      ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.95)`
      ctx.stroke(sum)
    }

    draw()
    return () => cancelAnimationFrame(raf.current)
  }, [])

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" aria-hidden />
}
