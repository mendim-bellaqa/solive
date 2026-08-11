'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { createOrbit } from '@/lib/orbitControl'
import type { BinauralBand } from '@/lib/frequencies'
import {
  BAND_SEAT, REGION_LABEL, regionWeights, stageFor, tonotopicPosition,
  type Region,
} from '@/lib/brainMap'

interface Props {
  isPlaying: boolean
  /** 'session' = tied to real elapsed time; 'preview' = a gentle looping demo. */
  mode?: 'session' | 'preview'
  /** Session progress 0→1, used for the overall heat. */
  progress?: number
  /** Seconds elapsed — decides how far entrainment has spread. */
  elapsedSeconds?: number
  /** The beat band: decides which regions are recruited. */
  band?: BinauralBand
  /** The carrier tone: decides where on the tonotopic map it lands. */
  hz?: number
  caption?: boolean
  analyserRef?: React.MutableRefObject<AnalyserNode | null>
}

/* ═══════════════════════════════════════════════════════════════════════════
   A glass brain with the session drawn inside it.

   Three separate things are being shown, and they move independently:

     · the tone lands at its own spot in auditory cortex, because auditory
       cortex is tonotopically mapped and that spot is a physical fact
     · the beat band recruits the regions that rhythm belongs to
     · elapsed time decides how far past auditory cortex any of it has spread,
       so a two-minute session and a twenty-minute one do not look the same

   Dendritic trees grow out of whichever regions are active, which is what
   makes it read as tissue doing something rather than a cloud being tinted.
   ═══════════════════════════════════════════════════════════════════════════ */

function smoothstep(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a || 1)))
  return t * t * (3 - 2 * t)
}

const HEAT: [number, [number, number, number]][] = [
  [0.00, [16, 28, 90]],
  [0.18, [22, 96, 168]],
  [0.36, [16, 172, 160]],
  [0.52, [40, 198, 112]],
  [0.66, [170, 222, 66]],
  [0.78, [250, 208, 70]],
  [0.88, [248, 138, 44]],
  [0.95, [236, 62, 52]],
  [1.00, [255, 246, 236]],
]
function heat(t: number, out: Float32Array | number[], o: number) {
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

/** The cerebral surface: longer than wide, tapering forward, undercut beneath
 *  the temporal lobes, flat below, split by a fissure that stays visible. */
function cerebrum(u: number, v: number, hemi: number, out: Float32Array, o: number) {
  const sv = Math.sin(v)
  let x = sv * Math.cos(u)
  const y = Math.cos(v)
  const z = sv * Math.sin(u)

  x *= 1 - 0.16 * z
  let px = x * 0.50, py = y * 0.60, pz = z * 0.84

  const fold = fbm(px * 3.6, py * 3.6, pz * 3.6) * 0.055 * (0.55 + 0.45 * smoothstep(-0.2, 0.7, py))
  const len = Math.hypot(px, py, pz) || 1
  px += (px / len) * fold; py += (py / len) * fold; pz += (pz / len) * fold

  if (py < -0.26) py = -0.26 + (py + 0.26) * 0.48
  if (py < -0.05 && Math.abs(px) > 0.18) { px *= 1.16; pz = pz * 0.92 + 0.06 }

  const fissure = 0.055 + 0.045 * smoothstep(0.0, 0.8, py)
  px = hemi * (Math.abs(px) * 0.86 + fissure)
  out[o] = px; out[o+1] = py; out[o+2] = pz
}

function regionOf(px: number, py: number, pz: number): Region {
  // Auditory cortex: superior temporal, just above and behind the ear.
  if (py > -0.16 && py < 0.06 && Math.abs(px) > 0.30 && pz > -0.30 && pz < 0.22) return 'auditory'
  if (pz > 0.30) return 'frontal'
  if (pz < -0.34) return 'occipital'
  if (py < -0.06 && Math.abs(px) > 0.24) return 'temporal'
  if (py > 0.16) return 'parietal'
  return 'temporal'
}

export default function NeuralBrain({
  isPlaying, mode = 'session', progress = 0, elapsedSeconds = 0,
  band = 'alpha', hz = 528, caption = true, analyserRef,
}: Props) {
  const rootRef    = useRef<HTMLDivElement>(null)
  const captionRef = useRef<HTMLSpanElement>(null)
  const playingRef = useRef(isPlaying)
  const progRef    = useRef(progress)
  const elapsedRef = useRef(elapsedSeconds)
  const bandRef    = useRef(band)
  const hzRef      = useRef(hz)
  const frameRef   = useRef(0)

  useEffect(() => { playingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { progRef.current = progress }, [progress])
  useEffect(() => { elapsedRef.current = elapsedSeconds }, [elapsedSeconds])
  useEffect(() => { bandRef.current = band }, [band])
  useEffect(() => { hzRef.current = hz }, [hz])

  useEffect(() => {
    if (!rootRef.current) return
    const root = rootRef.current
    const w = root.clientWidth || 320, h = root.clientHeight || 320
    const mobile = window.matchMedia('(max-width: 768px)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#05050c')
    scene.fog = new THREE.FogExp2('#05050c', 0.09)
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)

    const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false })
    renderer.setSize(w, h); renderer.setPixelRatio(dpr)
    // Hue is the reading here, so no filmic curve to wash it out.
    renderer.toneMapping = THREE.NoToneMapping
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    renderer.domElement.style.cursor = 'grab'
    root.appendChild(renderer.domElement)

    const tex = glowSprite()
    const disposables: { dispose(): void }[] = []
    const reg = <T extends { dispose(): void }>(x: T): T => { disposables.push(x); return x }
    const group = new THREE.Group(); scene.add(group)

    // ── Glass shell ────────────────────────────────────────────────────────
    // A translucent surface over the cells, so the model has a silhouette to
    // read against instead of dissolving at its edges.
    const SU = mobile ? 44 : 64, SV = mobile ? 26 : 36
    const shellPos: number[] = [], shellIdx: number[] = []
    const tmpArr = new Float32Array(3)
    for (const hemi of [-1, 1]) {
      const base = shellPos.length / 3
      for (let iv = 0; iv <= SV; iv++) {
        for (let iu = 0; iu <= SU; iu++) {
          cerebrum((iu / SU) * Math.PI * 2, (iv / SV) * Math.PI, hemi, tmpArr, 0)
          shellPos.push(tmpArr[0], tmpArr[1], tmpArr[2])
        }
      }
      for (let iv = 0; iv < SV; iv++) {
        for (let iu = 0; iu < SU; iu++) {
          const a = base + iv * (SU + 1) + iu, b = a + 1, c = a + SU + 1, d = c + 1
          shellIdx.push(a, c, b, b, c, d)
        }
      }
    }
    const shellGeo = reg(new THREE.BufferGeometry())
    shellGeo.setAttribute('position', new THREE.Float32BufferAttribute(shellPos, 3))
    shellGeo.setIndex(shellIdx)
    shellGeo.computeVertexNormals()
    const shellMat = reg(new THREE.MeshBasicMaterial({
      color: 0x8fb6e8, transparent: true, opacity: 0.055,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    }))
    group.add(new THREE.Mesh(shellGeo, shellMat))

    // ── Cells ──────────────────────────────────────────────────────────────
    const N = mode === 'preview' ? (mobile ? 900 : 1300) : (mobile ? 1100 : 1800)
    const pos = new Float32Array(N * 3)
    const col = new Float32Array(N * 3)
    const cellRegion: Region[] = new Array(N)
    const th = new Float32Array(N)
    const jitter = new Float32Array(N)
    const tono = new Float32Array(N)      // 0…1 along the auditory axis

    for (let i = 0; i < N; i++) {
      const r = Math.random()
      if (r < 0.86) {
        cerebrum(Math.random() * Math.PI * 2, Math.acos(2 * Math.random() - 1),
                 Math.random() < 0.5 ? -1 : 1, pos, i * 3)
        cellRegion[i] = regionOf(pos[i*3], pos[i*3+1], pos[i*3+2])
      } else if (r < 0.93) {
        const u = Math.random() * Math.PI * 2, v = Math.acos(2 * Math.random() - 1), sv = Math.sin(v)
        pos[i*3] = sv * Math.cos(u) * 0.40
        pos[i*3+1] = Math.cos(v) * 0.20 - 0.42
        pos[i*3+2] = sv * Math.sin(u) * 0.26 - 0.52
        cellRegion[i] = 'cerebellum'
      } else if (r < 0.965) {
        const q = Math.random(), rad = 0.085 * (1 - q * 0.35), a = Math.random() * Math.PI * 2
        pos[i*3] = Math.cos(a) * rad
        pos[i*3+1] = -0.30 - q * 0.55
        pos[i*3+2] = Math.sin(a) * rad - 0.16
        cellRegion[i] = 'brainstem'
      } else {
        const u = Math.random() * Math.PI * 2, v = Math.acos(2 * Math.random() - 1)
        const sv = Math.sin(v), rr = Math.cbrt(Math.random())
        pos[i*3] = sv * Math.cos(u) * 0.20 * rr
        pos[i*3+1] = Math.cos(v) * 0.15 * rr - 0.04
        pos[i*3+2] = sv * Math.sin(u) * 0.24 * rr - 0.02
        cellRegion[i] = 'thalamus'
      }
      // Along the auditory strip, front is low and back is high — the axis a
      // pitch actually travels as it rises.
      tono[i] = Math.max(0, Math.min(1, (0.24 - pos[i*3+2]) / 0.5))
      th[i] = Math.random() * 0.5
      jitter[i] = Math.random() * Math.PI * 2
    }

    const cellGeo = reg(new THREE.BufferGeometry())
    cellGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    cellGeo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const cellMat = reg(new THREE.PointsMaterial({
      size: 0.026, map: tex, vertexColors: true, transparent: true, opacity: 0.42,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }))
    group.add(new THREE.Points(cellGeo, cellMat))
    const haloMat = reg(new THREE.PointsMaterial({
      size: 0.13, map: tex, vertexColors: true, transparent: true, opacity: 0.045,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }))
    group.add(new THREE.Points(cellGeo, haloMat))

    // ── Dendritic trees ────────────────────────────────────────────────────
    // Recursive branches grown from seed cells. This is the difference between
    // a dust cloud and something that looks like tissue: real neurons branch,
    // and the branching is what the eye reads as biology.
    const TREES = mobile ? 70 : 130
    const treeSeg: number[] = []
    const treeCol: number[] = []
    const treeRegion: Region[] = []
    const treeSegRegion: number[] = []
    for (let t = 0; t < TREES; t++) {
      const seed = (Math.random() * N) | 0
      const reg0 = cellRegion[seed]
      treeRegion.push(reg0)
      const ti = treeRegion.length - 1
      const grow = (x: number, y: number, z: number, dx: number, dy: number, dz: number, len: number, depth: number) => {
        if (depth > 3 || len < 0.02) return
        const nx = x + dx * len, ny = y + dy * len, nz = z + dz * len
        treeSeg.push(x, y, z, nx, ny, nz)
        treeCol.push(0, 0, 0, 0, 0, 0)
        treeSegRegion.push(ti)
        const branches = depth < 2 ? 2 : 1
        for (let b = 0; b < branches; b++) {
          const jx = dx + (Math.random() - 0.5) * 1.1
          const jy = dy + (Math.random() - 0.5) * 1.1
          const jz = dz + (Math.random() - 0.5) * 1.1
          const m = Math.hypot(jx, jy, jz) || 1
          grow(nx, ny, nz, jx / m, jy / m, jz / m, len * 0.62, depth + 1)
        }
      }
      // Grow inward. Seeded in a random direction the arbors burst out through
      // the surface and the brain stops looking like it contains them.
      const sx0 = pos[seed*3], sy0 = pos[seed*3+1], sz0 = pos[seed*3+2]
      const m0 = Math.hypot(sx0, sy0, sz0) || 1
      const a = Math.random() * Math.PI * 2, e = Math.acos(2 * Math.random() - 1)
      const rx0 = Math.sin(e) * Math.cos(a), ry0 = Math.cos(e), rz0 = Math.sin(e) * Math.sin(a)
      // Two parts inward to one part random: still organic, still contained.
      const dx0 = -sx0 / m0 * 0.7 + rx0 * 0.3
      const dy0 = -sy0 / m0 * 0.7 + ry0 * 0.3
      const dz0 = -sz0 / m0 * 0.7 + rz0 * 0.3
      const dm = Math.hypot(dx0, dy0, dz0) || 1
      grow(sx0, sy0, sz0, dx0 / dm, dy0 / dm, dz0 / dm, 0.085, 0)
    }
    const treeGeo = reg(new THREE.BufferGeometry())
    treeGeo.setAttribute('position', new THREE.Float32BufferAttribute(treeSeg, 3))
    treeGeo.setAttribute('color', new THREE.Float32BufferAttribute(treeCol, 3))
    const treeMat = reg(new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }))
    group.add(new THREE.LineSegments(treeGeo, treeMat))
    const treeColAttr = treeGeo.getAttribute('color') as THREE.BufferAttribute
    const treeColArr = treeColAttr.array as Float32Array

    // ── Travelling signals ─────────────────────────────────────────────────
    const P = mode === 'preview' ? (mobile ? 26 : 44) : (mobile ? 40 : 72)
    const pPos = new Float32Array(P * 3), pCol = new Float32Array(P * 3)
    const pA = new Int32Array(P), pB = new Int32Array(P)
    const pT = new Float32Array(P), pSpd = new Float32Array(P)
    for (let i = 0; i < P; i++) {
      pA[i] = (Math.random() * N) | 0; pB[i] = (Math.random() * N) | 0
      pT[i] = Math.random(); pSpd[i] = 0.4 + Math.random() * 0.8
    }
    const sigGeo = reg(new THREE.BufferGeometry())
    sigGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    sigGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3))
    const sigMat = reg(new THREE.PointsMaterial({
      size: 0.075, map: tex, vertexColors: true, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }))
    group.add(new THREE.Points(sigGeo, sigMat))

    // ── Tonotopic marker: where this pitch lands ───────────────────────────
    const markGeo = reg(new THREE.BufferGeometry())
    markGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    const markMat = reg(new THREE.PointsMaterial({
      size: 0.30, map: tex, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }))
    group.add(new THREE.Points(markGeo, markMat))
    const markAttr = markGeo.getAttribute('position') as THREE.BufferAttribute

    scene.add(new THREE.AmbientLight('#ffffff', 0.4))

    // ── Controls ───────────────────────────────────────────────────────────
    const baseDist = mode === 'preview' ? 3.9 : 4.1
    const orbit = createOrbit(root, {
      baseDist, minDist: 1.8, maxDist: 9,
      idleSpin: mode === 'preview' ? 0.2 : 0.13,
      // Open on three-quarters: dead-on the frontal pole the two hemispheres
      // foreshorten into a narrow sliver.
      initialYaw: -0.85, initialPitch: 0.12,
    })
    const onDown = () => { renderer.domElement.style.cursor = 'grabbing' }
    const onUp = () => { renderer.domElement.style.cursor = 'grab' }
    root.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)

    let onScreen = true
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting }, { rootMargin: '100px' })
    io.observe(root)

    // ── Animation ──────────────────────────────────────────────────────────
    let last = performance.now(), elapsed = 0
    let aSmooth = mode === 'preview' ? 0.3 : Math.max(0.06, Math.min(1, progRef.current))
    const regSmooth: Record<Region, number> =
      { ...regionWeights(bandRef.current, mode === 'preview' ? 0 : elapsedRef.current) }
    let dataArray: Uint8Array<ArrayBuffer> | null = null
    const colAttr = cellGeo.getAttribute('color') as THREE.BufferAttribute
    const tmp = new Float32Array(3)

    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      if (!onScreen || document.hidden) { last = performance.now(); return }
      const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now
      elapsed += dt

      let rms = 0
      const an = analyserRef?.current
      if (an && playingRef.current) {
        if (!dataArray || dataArray.length !== an.fftSize) dataArray = new Uint8Array(an.fftSize) as Uint8Array<ArrayBuffer>
        an.getByteTimeDomainData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) { const d = (dataArray[i]-128)/128; sum += d*d }
        rms = Math.sqrt(sum / dataArray.length)
      }

      const target = mode === 'preview'
        ? 0.28 + 0.72 * (0.5 - 0.5 * Math.cos(elapsed * 0.6))
        : Math.max(0.06, Math.min(1, progRef.current))
      aSmooth += (target - aSmooth) * Math.min(1, dt * 1.6)
      const A = aSmooth

      // Preview has no clock, so it walks a session's worth of time on a loop.
      const secs = mode === 'preview' ? (elapsed * 60) % 900 : elapsedRef.current
      const want = regionWeights(bandRef.current, secs)
      for (const k of Object.keys(regSmooth) as Region[]) {
        regSmooth[k] += (want[k] - regSmooth[k]) * Math.min(1, dt * 1.1)
      }

      const beatHz = { delta: 2, theta: 6, alpha: 9, beta: 18, gamma: 40 }[bandRef.current] ?? 9
      const beatPhase = elapsed * Math.min(beatHz, 12) * 1.4
      const env = 0.5 + 0.5 * Math.sin(beatPhase)
      const tpos = tonotopicPosition(hzRef.current)

      for (let i = 0; i < N; i++) {
        const rw = regSmooth[cellRegion[i]]
        let local = A * rw
        // The tonotopic band: cells near this pitch's place run hotter than
        // their neighbours, and the band is narrow.
        if (cellRegion[i] === 'auditory') {
          const near = 1 - Math.min(1, Math.abs(tono[i] - tpos) / 0.16)
          local = Math.max(local, (0.35 + 0.65 * A) * near)
        }
        const a = smoothstep(th[i] - 0.12, th[i] + 0.10, local)
        const ripple = 0.06 * Math.sin(beatPhase + jitter[i]) * a
        heat(0.05 + a * 0.70 + rms * 0.22 + ripple, tmp, 0)
        col[i*3] = tmp[0]; col[i*3+1] = tmp[1]; col[i*3+2] = tmp[2]
      }
      colAttr.needsUpdate = true

      // Trees take the colour of the region they grew from.
      for (let s = 0; s < treeSegRegion.length; s++) {
        const rw = regSmooth[treeRegion[treeSegRegion[s]]]
        heat(0.15 + A * rw * 0.85 + rms * 0.2, tmp, 0)
        const b = 0.55 + 0.45 * rw
        for (let e2 = 0; e2 < 2; e2++) {
          const o = s * 6 + e2 * 3
          treeColArr[o] = tmp[0] * b; treeColArr[o+1] = tmp[1] * b; treeColArr[o+2] = tmp[2] * b
        }
      }
      treeColAttr.needsUpdate = true
      treeMat.opacity = 0.55 + A * 0.35

      const sigPosAttr = sigGeo.getAttribute('position') as THREE.BufferAttribute
      const sigColAttr = sigGeo.getAttribute('color') as THREE.BufferAttribute
      for (let i = 0; i < P; i++) {
        pT[i] += pSpd[i] * dt * (0.5 + A)
        if (pT[i] >= 1) { pT[i] = 0; pA[i] = (Math.random()*N)|0; pB[i] = (Math.random()*N)|0 }
        const a = pA[i], b = pB[i], u = pT[i]
        pPos[i*3]   = pos[a*3]   + (pos[b*3]   - pos[a*3])   * u
        pPos[i*3+1] = pos[a*3+1] + (pos[b*3+1] - pos[a*3+1]) * u
        pPos[i*3+2] = pos[a*3+2] + (pos[b*3+2] - pos[a*3+2]) * u
        heat(0.62 + regSmooth[cellRegion[a]] * 0.38, tmp, 0)
        pCol[i*3] = tmp[0]; pCol[i*3+1] = tmp[1]; pCol[i*3+2] = tmp[2]
      }
      sigPosAttr.needsUpdate = true; sigColAttr.needsUpdate = true

      // Marker sits on both auditory strips at this pitch's position.
      const mz = 0.24 - tpos * 0.5
      markAttr.setXYZ(0, -0.46, -0.05, mz)
      markAttr.setXYZ(1,  0.46, -0.05, mz)
      markAttr.needsUpdate = true
      heat(0.72 + 0.28 * env, tmp, 0)
      markMat.color.setRGB(tmp[0], tmp[1], tmp[2])
      markMat.opacity = 0.35 + 0.45 * env * (0.4 + 0.6 * A)

      shellMat.opacity = 0.045 + A * 0.03

      orbit.tick(dt)
      group.rotation.y = orbit.yaw
      group.rotation.x = orbit.pitch
      const breathe = 1 + Math.sin(elapsed * 0.9) * 0.012 + rms * 0.04
      group.scale.setScalar(1.30 * breathe)
      camera.position.set(0, 0.02, orbit.dist)
      camera.lookAt(0, -0.02, 0)
      renderer.render(scene, camera)

      if (captionRef.current) {
        const seat = REGION_LABEL[BAND_SEAT[bandRef.current] ?? 'occipital']
        const st = stageFor(secs)
        captionRef.current.textContent = `${st.label} · ${seat}`
      }
    }
    animate()

    function onResize() {
      const nw = root.clientWidth, nh = root.clientHeight
      if (!nw || !nh) return
      camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointerup', onUp)
      root.removeEventListener('pointerdown', onDown)
      io.disconnect()
      orbit.detach()
      cancelAnimationFrame(frameRef.current)
      tex.dispose()
      disposables.forEach(d => { try { d.dispose() } catch { /* noop */ } })
      renderer.dispose()
      if (root.contains(renderer.domElement)) root.removeChild(renderer.domElement)
    }
  }, [mode, analyserRef])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'radial-gradient(circle at 50% 45%, #0a1024 0%, #05050c 72%)' }}>
      {mode === 'session' && caption && (
        <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 5, pointerEvents: 'none' }}>
          <span ref={captionRef} className="glass" style={{ padding: '5px 14px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
            Arrival
          </span>
        </div>
      )}
    </div>
  )
}
