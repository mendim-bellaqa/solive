'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { attachPinchZoom } from '@/lib/attachZoom'
import { createRestingZoom } from '@/lib/restingZoom'
import type { BinauralBand } from '@/lib/frequencies'

interface Props {
  isPlaying: boolean
  /** 'session' = activation tied to session progress; 'preview' = gentle looping pulse. */
  mode?: 'session' | 'preview'
  /** Session progress 0→1 (elapsed / total) — resting at 0, fully activated at 1. */
  progress?: number
  /** Which rhythm is playing. Decides *where* the brain lights up, not just how much. */
  band?: BinauralBand
  analyserRef?: React.MutableRefObject<AnalyserNode | null>
}

/* ═══════════════════════════════════════════════════════════════════════════
   ANATOMY

   The old model was a single blurred ellipsoid of random points: it read as a
   glowing potato, and every frequency lit it identically. This one is built
   from the structures that actually carry the rhythms, so a delta session and
   a gamma session are visibly different events rather than the same animation
   in two colours.
   ═══════════════════════════════════════════════════════════════════════════ */

type Region =
  | 'frontal' | 'parietal' | 'temporal' | 'occipital'
  | 'cerebellum' | 'brainstem' | 'deep'

/**
 * Where each band is generated or most strongly expressed. These are the
 * textbook associations, not decoration:
 *
 *  delta  — slow-wave sleep: thalamocortical, strongest deep and frontal.
 *  theta  — hippocampal, in the medial temporal lobe.
 *  alpha  — Berger's rhythm: occipital, and it is why closing your eyes
 *           doubles it. Posterior dominant by definition.
 *  beta   — sensorimotor and frontal, the rhythm of engaged attention.
 *  gamma  — binding: distributed across cortex rather than local to one lobe.
 *
 * Weight 1 = the focus of that rhythm, 0.15 = quiet background activity.
 */
const BAND_FOCUS: Record<BinauralBand, Record<Region, number>> = {
  delta: { deep: 1.0, brainstem: 0.9, frontal: 0.7, parietal: 0.3, temporal: 0.3, occipital: 0.25, cerebellum: 0.35 },
  theta: { temporal: 1.0, deep: 0.8, frontal: 0.45, parietal: 0.3, occipital: 0.25, cerebellum: 0.2, brainstem: 0.3 },
  alpha: { occipital: 1.0, parietal: 0.75, temporal: 0.35, frontal: 0.25, deep: 0.3, cerebellum: 0.2, brainstem: 0.15 },
  beta:  { frontal: 1.0, parietal: 0.85, temporal: 0.45, occipital: 0.3, deep: 0.3, cerebellum: 0.4, brainstem: 0.2 },
  gamma: { frontal: 0.95, parietal: 0.95, temporal: 0.9, occipital: 0.85, deep: 0.6, cerebellum: 0.5, brainstem: 0.3 },
}

const REGION_LABEL: Record<Region, string> = {
  frontal: 'Frontal cortex',
  parietal: 'Parietal cortex',
  temporal: 'Temporal lobe · hippocampal',
  occipital: 'Occipital cortex',
  cerebellum: 'Cerebellum',
  brainstem: 'Brainstem',
  deep: 'Thalamus · deep structures',
}

/** The structure each band is named for, for the caption. */
const BAND_SEAT: Record<BinauralBand, Region> = {
  delta: 'deep', theta: 'temporal', alpha: 'occipital', beta: 'frontal', gamma: 'parietal',
}

// ─── Cool → hot activation gradient ───────────────────────────────────────────
const HEAT: [number, [number, number, number]][] = [
  [0.00, [18, 30, 96]],    // near-black indigo (resting)
  [0.18, [22, 96, 168]],   // blue
  [0.36, [16, 170, 158]],  // teal
  [0.52, [40, 196, 112]],  // green
  [0.66, [168, 220, 66]],  // lime
  [0.78, [250, 208, 70]],  // yellow
  [0.88, [248, 138, 44]],  // orange
  [0.95, [234, 62, 52]],   // red
  [1.00, [255, 244, 232]], // white-hot
]
function heat(t: number, out: Float32Array, o: number) {
  const v = t < 0 ? 0 : t > 1 ? 1 : t
  for (let i = 0; i < HEAT.length - 1; i++) {
    const [t0, c0] = HEAT[i], [t1, c1] = HEAT[i + 1]
    if (v <= t1) {
      const f = (v - t0) / (t1 - t0 || 1)
      out[o]   = (c0[0] + (c1[0] - c0[0]) * f) / 255
      out[o+1] = (c0[1] + (c1[1] - c0[1]) * f) / 255
      out[o+2] = (c0[2] + (c1[2] - c0[2]) * f) / 255
      return
    }
  }
  const l = HEAT[HEAT.length - 1][1]
  out[o] = l[0]/255; out[o+1] = l[1]/255; out[o+2] = l[2]/255
}
function smoothstep(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a || 1)))
  return t * t * (3 - 2 * t)
}

/** Cheap value noise — enough to fold a smooth surface into gyri. */
function fbm(x: number, y: number, z: number) {
  let v = 0, amp = 0.5, fx = x, fy = y, fz = z
  for (let i = 0; i < 3; i++) {
    v += amp * Math.sin(fx * 2.7 + Math.cos(fy * 3.1) * 1.7 + Math.sin(fz * 2.3) * 1.3)
    fx *= 1.9; fy *= 2.1; fz *= 1.8; amp *= 0.5
  }
  return v
}

function glowSprite(): THREE.CanvasTexture {
  const s = 64
  const c = document.createElement('canvas'); c.width = c.height = s
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.28, 'rgba(255,255,255,0.72)')
  grd.addColorStop(0.65, 'rgba(255,255,255,0.16)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd; g.fillRect(0, 0, s, s)
  return new THREE.CanvasTexture(c)
}

/**
 * A cerebrum point, in a shape that reads as a brain from any angle: longer
 * front-to-back than wide, tallest over the parietal ridge, tapering to the
 * frontal pole, undercut beneath the temporal lobes, and split by a
 * longitudinal fissure that stays visible while the model turns.
 */
function cerebrumPoint(out: Float32Array, o: number): Region {
  const hemi = Math.random() < 0.5 ? -1 : 1
  const u = Math.random() * Math.PI * 2
  const v = Math.acos(2 * Math.random() - 1)

  const sv = Math.sin(v)
  let x = sv * Math.cos(u)
  const y = Math.cos(v)
  const z = sv * Math.sin(u)

  // Egg taper: the frontal pole is narrower than the occipital mass.
  const taper = 1 - 0.16 * z
  x *= taper

  // Radii — deeper than wide, which is what stops it reading as a ball.
  let px = x * 0.50, py = y * 0.60, pz = z * 0.84

  // Cortical folding, strongest on the crown where gyri actually show.
  const fold = fbm(px * 3.4, py * 3.4, pz * 3.4) * 0.055 * (0.55 + 0.45 * smoothstep(-0.2, 0.7, py))
  const len = Math.hypot(px, py, pz) || 1
  px += (px / len) * fold; py += (py / len) * fold; pz += (pz / len) * fold

  // Flatten the underside — a brain sits on a base, it is not a sphere.
  if (py < -0.26) py = -0.26 + (py + 0.26) * 0.48
  // Temporal undercut: pull the lower lateral mass outward and forward.
  if (py < -0.05 && Math.abs(px) > 0.18) { px *= 1.16; pz = pz * 0.92 + 0.06 }

  // Split into hemispheres, with a fissure that widens toward the crown.
  const fissure = 0.055 + 0.045 * smoothstep(0.0, 0.8, py)
  px = hemi * (Math.abs(px) * 0.86 + fissure)

  out[o] = px; out[o+1] = py; out[o+2] = pz

  // Region by anatomical position rather than by index, so the boundaries sit
  // where the shape actually changes.
  if (pz > 0.30) return 'frontal'
  if (pz < -0.34) return 'occipital'
  if (py < -0.06 && Math.abs(px) > 0.24) return 'temporal'
  if (py > 0.16) return 'parietal'
  return Math.random() < 0.5 ? 'parietal' : 'temporal'
}

export default function NeuralBrain({
  isPlaying, mode = 'session', progress = 0, band = 'alpha', analyserRef,
}: Props) {
  const rootRef    = useRef<HTMLDivElement>(null)
  const captionRef = useRef<HTMLSpanElement>(null)
  const playingRef = useRef(isPlaying)
  const progRef    = useRef(progress)
  const bandRef    = useRef(band)
  const frameRef   = useRef(0)

  useEffect(() => { playingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { progRef.current = progress }, [progress])
  useEffect(() => { bandRef.current = band }, [band])

  useEffect(() => {
    if (!rootRef.current) return
    const root = rootRef.current
    const w = root.clientWidth || 320
    const h = root.clientHeight || 320
    const mobile = window.matchMedia('(max-width: 768px)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#05050c')
    scene.fog = new THREE.FogExp2('#05050c', 0.10)

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)
    camera.position.set(0, 0, 4.4)

    const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false })
    renderer.setSize(w, h)
    renderer.setPixelRatio(dpr)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.45
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    root.appendChild(renderer.domElement)

    const tex = glowSprite()
    const group = new THREE.Group()
    scene.add(group)

    // ── Build the cell population ──────────────────────────────────────────
    // Denser than before because the detail is the point, but still trimmed on
    // phones where the fill rate, not the maths, is the limit.
    const N = mode === 'preview' ? (mobile ? 1500 : 2200) : (mobile ? 2000 : 3200)
    const pos    = new Float32Array(N * 3)
    const nCol   = new Float32Array(N * 3)
    const nSize  = new Float32Array(N)
    const region: Region[] = new Array(N)
    const th     = new Float32Array(N)   // per-cell firing threshold
    const jitter = new Float32Array(N)   // per-cell phase, so they never fire in unison

    const tmp3 = new Float32Array(3)
    for (let i = 0; i < N; i++) {
      const r = Math.random()
      let reg: Region
      if (r < 0.80) {
        reg = cerebrumPoint(pos, i * 3)
      } else if (r < 0.90) {
        // Cerebellum — a distinct smaller mass tucked under the occipital pole,
        // with its own tighter foliation.
        const u = Math.random() * Math.PI * 2, v = Math.acos(2 * Math.random() - 1)
        const sv = Math.sin(v)
        const cx = sv * Math.cos(u) * 0.40
        const cy = Math.cos(v) * 0.20 - 0.42
        const cz = sv * Math.sin(u) * 0.26 - 0.52
        const f = fbm(cx * 9, cy * 9, cz * 9) * 0.02
        pos[i*3] = cx + f; pos[i*3+1] = cy; pos[i*3+2] = cz + f
        reg = 'cerebellum'
      } else if (r < 0.945) {
        // Brainstem — a tapering column, the route everything ascends through.
        const t = Math.random()
        const rad = 0.085 * (1 - t * 0.35)
        const a = Math.random() * Math.PI * 2
        pos[i*3]   = Math.cos(a) * rad
        pos[i*3+1] = -0.30 - t * 0.55
        pos[i*3+2] = Math.sin(a) * rad - 0.16
        reg = 'brainstem'
      } else {
        // Deep structures — thalamus and around it, where delta is generated.
        const u = Math.random() * Math.PI * 2, v = Math.acos(2 * Math.random() - 1)
        const sv = Math.sin(v), rr = Math.cbrt(Math.random())
        pos[i*3]   = sv * Math.cos(u) * 0.20 * rr
        pos[i*3+1] = Math.cos(v) * 0.15 * rr - 0.04
        pos[i*3+2] = sv * Math.sin(u) * 0.24 * rr - 0.02
        reg = 'deep'
      }
      region[i] = reg
      th[i]     = Math.random() * 0.55            // spread so a region lights progressively
      jitter[i] = Math.random() * Math.PI * 2
      nSize[i]  = 0.028 + Math.random() * 0.026
    }

    // ── Synapses: prefer near neighbours, and connect across the midline ────
    const maxSyn = mode === 'preview' ? (mobile ? 900 : 1500) : (mobile ? 1200 : 2100)
    const sa: number[] = [], sb: number[] = []
    const D2 = 0.26 * 0.26
    outer: for (let i = 0; i < N; i++) {
      for (let k = 0; k < 5; k++) {
        const j = (Math.random() * N) | 0
        if (j === i) continue
        const dx = pos[i*3]-pos[j*3], dy = pos[i*3+1]-pos[j*3+1], dz = pos[i*3+2]-pos[j*3+2]
        if (dx*dx + dy*dy + dz*dz < D2) {
          sa.push(i); sb.push(j)
          if (sa.length >= maxSyn) break outer
        }
      }
    }
    const S = sa.length
    const segPos = new Float32Array(S * 6)
    const segCol = new Float32Array(S * 6)
    for (let s = 0; s < S; s++) {
      const a = sa[s], b = sb[s]
      segPos[s*6]   = pos[a*3];   segPos[s*6+1] = pos[a*3+1]; segPos[s*6+2] = pos[a*3+2]
      segPos[s*6+3] = pos[b*3];   segPos[s*6+4] = pos[b*3+1]; segPos[s*6+5] = pos[b*3+2]
    }

    const nGeo = new THREE.BufferGeometry()
    nGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    nGeo.setAttribute('color', new THREE.BufferAttribute(nCol, 3))
    // Varying the point size breaks the uniform-dot look that made the old
    // model read as static rather than tissue.
    nGeo.setAttribute('size', new THREE.BufferAttribute(nSize, 1))
    const nMat = new THREE.PointsMaterial({
      size: 0.05, map: tex, vertexColors: true, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    })
    group.add(new THREE.Points(nGeo, nMat))

    // A soft second pass at large size gives the mass a body instead of a
    // scatter of separate sparks.
    const haloMat = new THREE.PointsMaterial({
      size: 0.15, map: tex, vertexColors: true, transparent: true, opacity: 0.13,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    })
    group.add(new THREE.Points(nGeo, haloMat))

    const sGeo = new THREE.BufferGeometry()
    sGeo.setAttribute('position', new THREE.BufferAttribute(segPos, 3))
    sGeo.setAttribute('color', new THREE.BufferAttribute(segCol, 3))
    const sMat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.34,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    const sColAttr = sGeo.getAttribute('color') as THREE.BufferAttribute
    group.add(new THREE.LineSegments(sGeo, sMat))

    // ── Travelling signals ─────────────────────────────────────────────────
    const P = mode === 'preview' ? (mobile ? 30 : 52) : (mobile ? 44 : 84)
    const pPos = new Float32Array(P * 3)
    const pCol = new Float32Array(P * 3)
    const pSyn = new Int32Array(P)
    const pT   = new Float32Array(P)
    const pSpd = new Float32Array(P)
    for (let i = 0; i < P; i++) { pSyn[i] = (Math.random()*S)|0; pT[i] = Math.random(); pSpd[i] = 0.5 + Math.random()*0.9 }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3))
    const pMat = new THREE.PointsMaterial({
      size: 0.10, map: tex, vertexColors: true, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    })
    group.add(new THREE.Points(pGeo, pMat))

    // Core glow, sitting in the deep structures rather than at the origin.
    const coreMat = new THREE.PointsMaterial({
      size: 1.25, map: tex, color: 0xff8a44, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    const coreGeo = new THREE.BufferGeometry()
    coreGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -0.04, -0.02]), 3))
    const core = new THREE.Points(coreGeo, coreMat)
    group.add(core)

    scene.add(new THREE.AmbientLight('#ffffff', 0.4))

    // ── Camera ─────────────────────────────────────────────────────────────
    const baseZ = camera.position.z
    const zoom = createRestingZoom({
      base: mode === 'preview' ? baseZ * 1.18 : baseZ * 1.28,
      min: baseZ * 0.45,
      max: baseZ * 2.2,
    })
    camera.position.z = zoom.z
    const onWheel = (e: WheelEvent) => { e.preventDefault(); zoom.apply(Math.exp(e.deltaY * 0.0015)) }
    if (mode === 'session') root.addEventListener('wheel', onWheel, { passive: false })
    const detachPinch = attachPinchZoom(root, f => zoom.apply(f))

    let onScreen = true
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting }, { rootMargin: '100px' })
    io.observe(root)

    // ── Animation ──────────────────────────────────────────────────────────
    let last = performance.now()
    let elapsed = 0
    let aSmooth = mode === 'preview' ? 0.3 : 0.08
    // Region activation is eased rather than switched, so changing band looks
    // like the rhythm migrating across the brain instead of a hard cut.
    const regSmooth: Record<Region, number> = {
      frontal: 0.2, parietal: 0.2, temporal: 0.2, occipital: 0.2,
      cerebellum: 0.2, brainstem: 0.2, deep: 0.2,
    }
    let dataArray: Uint8Array<ArrayBuffer> | null = null
    const nColAttr = nGeo.getAttribute('color') as THREE.BufferAttribute
    const tmp = tmp3

    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      if (!onScreen || document.hidden) { last = performance.now(); return }
      const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now
      elapsed += dt
      const playing = playingRef.current

      let rms = 0
      const an = analyserRef?.current
      if (an && playing) {
        if (!dataArray || dataArray.length !== an.fftSize) dataArray = new Uint8Array(an.fftSize) as Uint8Array<ArrayBuffer>
        an.getByteTimeDomainData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) { const d = (dataArray[i]-128)/128; sum += d*d }
        rms = Math.sqrt(sum / dataArray.length)
      }

      // Global drive
      let target: number
      if (mode === 'preview') target = 0.28 + 0.72 * (0.5 - 0.5 * Math.cos(elapsed * 0.6))
      else target = Math.max(0.06, Math.min(1, progRef.current))
      aSmooth += (target - aSmooth) * Math.min(1, dt * 1.6)
      const A = aSmooth

      // Ease each region toward the focus profile of the current band.
      const focus = BAND_FOCUS[bandRef.current] ?? BAND_FOCUS.alpha
      for (const k of Object.keys(regSmooth) as Region[]) {
        regSmooth[k] += (focus[k] - regSmooth[k]) * Math.min(1, dt * 1.1)
      }

      // The band's own rhythm, visible as a travelling pulse through the tissue
      // rather than a uniform brightness — 2 Hz delta genuinely looks slower
      // than 40 Hz gamma.
      const beatHz = { delta: 2, theta: 6, alpha: 9, beta: 18, gamma: 40 }[bandRef.current] ?? 9
      const beatPhase = elapsed * Math.min(beatHz, 12) * 1.4

      for (let i = 0; i < N; i++) {
        const rw = regSmooth[region[i]]
        // A cell fires when the drive, weighted by how much this rhythm
        // recruits its region, clears its own threshold.
        const local = A * rw
        const a = smoothstep(th[i] - 0.12, th[i] + 0.10, local)
        const ripple = 0.06 * Math.sin(beatPhase + jitter[i]) * a
        const hv = 0.05 + a * 0.86 + rms * 0.30 + ripple
        heat(hv, tmp, 0)
        nCol[i*3] = tmp[0]; nCol[i*3+1] = tmp[1]; nCol[i*3+2] = tmp[2]
      }
      nColAttr.needsUpdate = true

      for (let s = 0; s < S; s++) {
        const a = sa[s], b = sb[s], m = 0.45
        segCol[s*6]   = nCol[a*3]*m;   segCol[s*6+1] = nCol[a*3+1]*m; segCol[s*6+2] = nCol[a*3+2]*m
        segCol[s*6+3] = nCol[b*3]*m;   segCol[s*6+4] = nCol[b*3+1]*m; segCol[s*6+5] = nCol[b*3+2]*m
      }
      sColAttr.needsUpdate = true
      sMat.opacity = 0.22 + A * 0.26

      const pPosAttr = pGeo.getAttribute('position') as THREE.BufferAttribute
      const pColAttr = pGeo.getAttribute('color') as THREE.BufferAttribute
      for (let i = 0; i < P; i++) {
        pT[i] += pSpd[i] * dt * (0.6 + A)
        if (pT[i] >= 1) { pT[i] = 0; pSyn[i] = (Math.random()*S)|0 }
        const s = pSyn[i], a = sa[s], b = sb[s], t = pT[i]
        pPos[i*3]   = pos[a*3]   + (pos[b*3]   - pos[a*3])   * t
        pPos[i*3+1] = pos[a*3+1] + (pos[b*3+1] - pos[a*3+1]) * t
        pPos[i*3+2] = pos[a*3+2] + (pos[b*3+2] - pos[a*3+2]) * t
        const act = smoothstep(th[a] - 0.12, th[a] + 0.10, A * regSmooth[region[a]])
        heat(0.62 + act * 0.38, tmp, 0)
        const bright = 0.18 + act * 0.82
        pCol[i*3] = tmp[0]*bright; pCol[i*3+1] = tmp[1]*bright; pCol[i*3+2] = tmp[2]*bright
      }
      pPosAttr.needsUpdate = true; pColAttr.needsUpdate = true

      coreMat.opacity = (0.05 + A * 0.30 + rms * 0.18) * regSmooth.deep
      core.scale.setScalar(0.7 + A * 0.5)

      group.rotation.y = Math.sin(elapsed * 0.16) * 0.55 + elapsed * 0.035
      group.rotation.x = Math.sin(elapsed * 0.12) * 0.07
      const breathe = 1 + Math.sin(elapsed * 0.9) * 0.012 + rms * 0.04
      group.scale.setScalar(1.30 * breathe)

      camera.position.z = zoom.tick(dt)
      camera.position.x = Math.sin(elapsed * 0.2) * 0.14
      camera.lookAt(0, -0.02, 0)
      renderer.render(scene, camera)

      if (captionRef.current && mode === 'session') {
        const seat = REGION_LABEL[BAND_SEAT[bandRef.current] ?? 'occipital']
        captionRef.current.textContent =
          A < 0.14 ? `Resting · ${seat}`
          : A > 0.9 ? `Peak · ${seat}`
          : `Entraining · ${seat}`
      }
    }
    animate()

    function onResize() {
      const nw = root.clientWidth, nh = root.clientHeight
      if (!nw || !nh) return
      camera.aspect = nw / nh; camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      io.disconnect()
      if (mode === 'session') root.removeEventListener('wheel', onWheel)
      detachPinch()
      cancelAnimationFrame(frameRef.current)
      nGeo.dispose(); nMat.dispose(); haloMat.dispose()
      sGeo.dispose(); sMat.dispose()
      pGeo.dispose(); pMat.dispose()
      coreGeo.dispose(); coreMat.dispose()
      tex.dispose(); renderer.dispose()
      if (root.contains(renderer.domElement)) root.removeChild(renderer.domElement)
    }
  }, [mode, analyserRef])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', touchAction: 'pan-y', background: 'radial-gradient(circle at 50% 45%, #0a1024 0%, #05050c 72%)' }}>
      {mode === 'session' && (
        <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 5, pointerEvents: 'none' }}>
          <span ref={captionRef} className="glass" style={{ padding: '5px 14px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
            Resting state
          </span>
        </div>
      )}
    </div>
  )
}
