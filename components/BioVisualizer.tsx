'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export type BioMode = 'brain' | 'aura'

interface Props {
  mode: BioMode
  hz: number
  colorHex: string
  isPlaying: boolean
  analyserRef?: React.MutableRefObject<AnalyserNode | null>
  quality?: 'preview' | 'full'
}

// ─── Shared sprite texture ────────────────────────────────────────────────────
function createGlowTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
  grad.addColorStop(0,    'rgba(255,255,255,1)')
  grad.addColorStop(0.30, 'rgba(255,255,255,0.75)')
  grad.addColorStop(0.65, 'rgba(255,255,255,0.20)')
  grad.addColorStop(1,    'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

// ─── PET-scan heat gradient (cool → hot) ──────────────────────────────────────
const HEAT_STOPS: [number, [number, number, number]][] = [
  [0.00, [10, 30, 60]],     // deep blue (inactive)
  [0.15, [16, 120, 150]],   // teal
  [0.30, [16, 185, 129]],   // green
  [0.48, [163, 230, 53]],   // lime
  [0.64, [253, 224, 71]],   // yellow
  [0.80, [249, 115, 22]],   // orange
  [0.92, [239, 68, 68]],    // red
  [1.00, [255, 240, 210]],  // white-hot
]
function heat(t: number, out: { r: number; g: number; b: number }) {
  const v = t < 0 ? 0 : t > 1 ? 1 : t
  for (let i = 0; i < HEAT_STOPS.length - 1; i++) {
    const [t0, c0] = HEAT_STOPS[i]
    const [t1, c1] = HEAT_STOPS[i + 1]
    if (v <= t1) {
      const f = (v - t0) / (t1 - t0 || 1)
      out.r = (c0[0] + (c1[0] - c0[0]) * f) / 255
      out.g = (c0[1] + (c1[1] - c0[1]) * f) / 255
      out.b = (c0[2] + (c1[2] - c0[2]) * f) / 255
      return
    }
  }
  const last = HEAT_STOPS[HEAT_STOPS.length - 1][1]
  out.r = last[0] / 255; out.g = last[1] / 255; out.b = last[2] / 255
}

// Ellipse regions defining a sagittal brain silhouette
const BRAIN_REGIONS = [
  { cx: -0.05, cy: 0.20, rx: 1.15, ry: 0.82 }, // cerebrum
  { cx:  0.74, cy: -0.50, rx: 0.44, ry: 0.34 }, // cerebellum
  { cx:  0.52, cy: -0.92, rx: 0.13, ry: 0.30 }, // brainstem
]

export default function BioVisualizer({ mode, hz, colorHex, isPlaying, analyserRef, quality = 'full' }: Props) {
  const mountRef     = useRef<HTMLDivElement>(null)
  const frameRef     = useRef<number>(0)
  const timeRef      = useRef<number>(0)
  const isPlayingRef = useRef<boolean>(isPlaying)
  const actEnvRef    = useRef<number>(0)

  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  useEffect(() => {
    if (!mountRef.current) return
    const mount = mountRef.current
    const w = mount.clientWidth || 320
    const h = mount.clientHeight || 320
    const preview = quality === 'preview'

    const dpr = Math.min(window.devicePixelRatio || 1, preview ? 1.75 : 2.5)

    // ── Scene / camera / renderer ─────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#05050c')
    scene.fog = new THREE.FogExp2('#05050c', 0.02)

    const aspect = w / h
    const camera = new THREE.PerspectiveCamera(aspect < 0.85 ? 58 : 50, aspect, 0.1, 100)
    camera.position.set(0, 0, mode === 'aura' ? 5.4 : 4.6)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(dpr, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.35
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    mount.appendChild(renderer.domElement)

    // ── Touchpad / wheel zoom (camera dolly) ────────────────────────────────
    const baseZ = camera.position.z
    const minZ = baseZ * 0.42, maxZ = baseZ * 2.4
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = Math.exp(e.deltaY * 0.0015)
      camera.position.z = Math.max(minZ, Math.min(maxZ, camera.position.z * factor))
    }
    mount.addEventListener('wheel', onWheel, { passive: false })

    const tex = createGlowTexture()
    const mainColor = new THREE.Color(colorHex)

    scene.add(new THREE.AmbientLight('#ffffff', 0.4))

    // ── Disposables registry ───────────────────────────────────────────────
    const disposables: { dispose: () => void }[] = []
    const reg = <T extends { dispose: () => void }>(o: T): T => { disposables.push(o); return o }

    // ── Per-mode frame hook ────────────────────────────────────────────────
    let frameHook: (t: number, rms: number, act: number) => void = () => {}

    // ══════════════════════════════════════════════════════════════════════
    //  BRAIN — PET-scan activation cloud
    // ══════════════════════════════════════════════════════════════════════
    if (mode === 'brain') {
      const N = preview ? 3600 : 7000
      const pos  = new Float32Array(N * 3)
      const col  = new Float32Array(N * 3)
      const base = new Float32Array(N)      // base heat 0..1 per point
      const areas = BRAIN_REGIONS.map(r => r.rx * r.ry)
      const areaSum = areas.reduce((a, b) => a + b, 0)

      let filled = 0
      let guard = 0
      while (filled < N && guard < N * 40) {
        guard++
        // pick region by area
        let pick = Math.random() * areaSum, ri = 0
        while (ri < areas.length - 1 && pick > areas[ri]) { pick -= areas[ri]; ri++ }
        const reg = BRAIN_REGIONS[ri]
        // sample inside unit disc → ellipse
        const ang = Math.random() * Math.PI * 2
        const rad = Math.sqrt(Math.random())
        let x = reg.cx + Math.cos(ang) * rad * reg.rx
        let y = reg.cy + Math.sin(ang) * rad * reg.ry
        // flatten the underside of the cerebrum a touch
        if (ri === 0 && y < -0.35) { if (Math.random() < 0.5) continue }
        // depth: lens-shaped volume
        const d2 = rad * rad
        const zThick = 0.62 * Math.sqrt(Math.max(0, 1 - d2))
        const z = (Math.random() * 2 - 1) * zThick
        // gyri fold texture
        const fold = Math.sin(x * 7 + y * 5) * Math.cos(y * 6 - x * 4)
        x += fold * 0.012; y += fold * 0.012

        pos[filled*3]   = x
        pos[filled*3+1] = y
        pos[filled*3+2] = z

        // base heat: hotter toward deep-central structures + organic veins
        const distC = Math.hypot(x - 0.02, y - 0.02) / 1.25
        const vein  = 0.5 + 0.5 * Math.sin(x * 4.5 + y * 3.1) * Math.cos(y * 3.7 - z * 5)
        const b = (1 - distC) * 0.7 + vein * 0.35 + Math.random() * 0.12
        base[filled] = Math.max(0, Math.min(1, b))
        filled++
      }
      const brainN = filled

      const geo = reg(new THREE.BufferGeometry())
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
      const colAttr = geo.getAttribute('color') as THREE.BufferAttribute

      const core = new THREE.Points(geo, reg(new THREE.PointsMaterial({
        size: preview ? 0.06 : 0.055, map: tex, vertexColors: true,
        transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending,
        depthWrite: false, sizeAttenuation: true,
      })))
      // bloom halo shares the same geometry/colors
      const halo = new THREE.Points(geo, reg(new THREE.PointsMaterial({
        size: preview ? 0.17 : 0.16, map: tex, vertexColors: true,
        transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending,
        depthWrite: false, sizeAttenuation: true,
      })))
      const group = new THREE.Group()
      group.add(halo); group.add(core)
      group.scale.setScalar(1.28)
      scene.add(group)

      const c = { r: 0, g: 0, b: 0 }
      frameHook = (t, rms, act) => {
        // warm up: cool when idle, hot when active ("without" → "15 mins later")
        const lo = 0.42 + 0.85 * act
        for (let i = 0; i < brainN; i++) {
          const flick = 1 + Math.sin(t * 2.2 + i * 0.35) * 0.05
          const dh = base[i] * lo * flick + rms * 0.7
          heat(dh, c)
          colAttr.setXYZ(i, c.r, c.g, c.b)
        }
        colAttr.needsUpdate = true
        group.rotation.y = Math.sin(t * 0.18) * 0.28
        group.rotation.x = Math.sin(t * 0.13) * 0.06
        const br = 1.28 * (1 + rms * 0.12 + Math.sin(t * 0.9) * 0.01)
        group.scale.setScalar(br)
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  AURA — wireframe body + expanding biofield
    // ══════════════════════════════════════════════════════════════════════
    if (mode === 'aura') {
      const line = (opacity: number) => reg(new THREE.MeshBasicMaterial({
        color: mainColor, wireframe: true, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }))

      // Human figure (capsule + sphere parts)
      const human = new THREE.Group()
      const partMat = line(0.55)
      const addPart = (geoP: THREE.BufferGeometry, x: number, y: number, rz = 0) => {
        const m = new THREE.Mesh(reg(geoP), partMat)
        m.position.set(x, y, 0); m.rotation.z = rz
        human.add(m)
      }
      const seg = preview ? 10 : 14
      addPart(new THREE.SphereGeometry(0.19, seg + 4, seg), 0, 0.90)                 // head
      addPart(new THREE.CapsuleGeometry(0.25, 0.55, 6, seg), 0, 0.28)               // torso
      addPart(new THREE.CapsuleGeometry(0.18, 0.14, 5, seg), 0, -0.14)             // pelvis
      addPart(new THREE.CapsuleGeometry(0.075, 0.60, 5, seg),  0.33, 0.24,  0.14)  // arm L
      addPart(new THREE.CapsuleGeometry(0.075, 0.60, 5, seg), -0.33, 0.24, -0.14)  // arm R
      addPart(new THREE.CapsuleGeometry(0.10, 0.72, 5, seg),  0.11, -0.62)         // leg L
      addPart(new THREE.CapsuleGeometry(0.10, 0.72, 5, seg), -0.11, -0.62)         // leg R
      scene.add(human)

      // Central energy column
      const columnGeo = reg(new THREE.CylinderGeometry(0.012, 0.012, 2.5, 6, 1, true))
      const column = new THREE.Mesh(columnGeo, reg(new THREE.MeshBasicMaterial({
        color: mainColor, transparent: true, opacity: 0.35,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })))
      column.position.y = 0.05
      scene.add(column)

      // Chakra glow points along the spine
      const chakraY = [-0.62, -0.18, 0.14, 0.42, 0.66, 0.90, 1.12]
      const chGeo = reg(new THREE.BufferGeometry())
      const chPos = new Float32Array(chakraY.length * 3)
      chakraY.forEach((y, i) => { chPos[i*3] = 0; chPos[i*3+1] = y; chPos[i*3+2] = 0.02 })
      chGeo.setAttribute('position', new THREE.BufferAttribute(chPos, 3))
      const chakras = new THREE.Points(chGeo, reg(new THREE.PointsMaterial({
        color: 0xffffff, size: 0.42, map: tex, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
      })))
      scene.add(chakras)

      // Biofield — wireframe sphere (egg-shaped), expands when active
      const fieldGeo = reg(new THREE.SphereGeometry(1, preview ? 26 : 36, preview ? 18 : 26))
      const fieldMat = line(0.28)
      const field = new THREE.Mesh(fieldGeo, fieldMat)
      field.scale.set(1, 1.16, 1)
      scene.add(field)

      // Inner secondary field ring (toroidal flow band) — tilted for an elliptical read
      const ringGeo = reg(new THREE.TorusGeometry(0.9, 0.015, 8, preview ? 44 : 72))
      const ring = new THREE.Mesh(ringGeo, line(0.18))
      ring.rotation.x = 1.25
      scene.add(ring)

      // Ambient biofield particles
      const pCount = preview ? 260 : 460
      const pGeo = reg(new THREE.BufferGeometry())
      const pBuf = new Float32Array(pCount * 3)
      const pR   = new Float32Array(pCount)
      for (let i = 0; i < pCount; i++) {
        const r = 0.6 + Math.random() * 1.4
        const th = Math.random() * Math.PI * 2
        const ph = Math.acos(2 * Math.random() - 1)
        pR[i] = r
        pBuf[i*3]   = r * Math.sin(ph) * Math.cos(th)
        pBuf[i*3+1] = r * Math.cos(ph) * 1.15
        pBuf[i*3+2] = r * Math.sin(ph) * Math.sin(th)
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pBuf, 3))
      const particles = new THREE.Points(pGeo, reg(new THREE.PointsMaterial({
        color: mainColor, size: 0.06, map: tex, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
      })))
      scene.add(particles)

      const light = new THREE.PointLight(colorHex, 3, 12)
      light.position.set(0, 0.3, 2.5); scene.add(light)

      let fieldScale = 0.7
      frameHook = (t, rms, act) => {
        // biofield expands: small ("before") → large ("after")
        const target = 0.82 + act * 0.78 + rms * 0.35
        fieldScale += (target - fieldScale) * 0.06
        field.scale.set(fieldScale, fieldScale * 1.16, fieldScale)
        field.rotation.y = t * 0.10
        field.rotation.z = Math.sin(t * 0.12) * 0.05
        fieldMat.opacity = 0.16 + act * 0.16 + rms * 0.15

        ring.scale.setScalar(fieldScale * 0.82 + Math.sin(t * 1.4) * 0.03)
        ring.rotation.z = t * 0.25

        const chMat = chakras.material as THREE.PointsMaterial
        chMat.size = 0.34 + 0.14 * (0.5 + 0.5 * Math.sin(t * 1.6)) + rms * 0.5
        chMat.opacity = 0.75 + act * 0.2 + rms * 0.3

        column.scale.y = 1 + rms * 0.1
        ;(column.material as THREE.MeshBasicMaterial).opacity = 0.25 + act * 0.2 + rms * 0.3

        particles.rotation.y = -t * 0.05
        const pa = particles.geometry.getAttribute('position') as THREE.BufferAttribute
        for (let i = 0; i < pCount; i++) {
          const y0 = pBuf[i*3+1]
          pa.setY(i, y0 * fieldScale * (1 + Math.sin(t + i) * 0.01))
        }
        pa.needsUpdate = true

        human.rotation.y = Math.sin(t * 0.15) * 0.18
        column.rotation.y = human.rotation.y
      }
    }

    // ── Animation loop ─────────────────────────────────────────────────────
    // Seed the activation envelope so previews look alive immediately.
    actEnvRef.current = isPlayingRef.current ? 0.6 : 0.44
    let dataArray: Uint8Array<ArrayBuffer> | null = null
    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      timeRef.current += 0.008
      const t = timeRef.current
      const playing = isPlayingRef.current

      // activation envelope: ramps up while playing, settles to a warm idle glow
      const targetAct = playing ? 1 : 0.44
      actEnvRef.current += (targetAct - actEnvRef.current) * 0.012
      const act = actEnvRef.current

      let rms = 0
      const an = analyserRef?.current
      if (an && playing) {
        if (!dataArray || dataArray.length !== an.fftSize)
          dataArray = new Uint8Array(an.fftSize) as Uint8Array<ArrayBuffer>
        an.getByteTimeDomainData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) { const v = (dataArray[i]-128)/128; sum += v*v }
        rms = Math.sqrt(sum / dataArray.length)
      }

      frameHook(t, rms, act)

      camera.position.x = Math.sin(t * 0.12) * 0.25
      camera.lookAt(0, mode === 'aura' ? 0.05 : 0, 0)
      renderer.render(scene, camera)
    }
    animate()

    // ── Resize ─────────────────────────────────────────────────────────────
    function onResize() {
      const nw = mount.clientWidth, nh = mount.clientHeight
      if (!nw || !nh) return
      camera.aspect = nw / nh
      camera.fov = nw / nh < 0.85 ? 58 : 50
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)

    return () => {
      mount.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(frameRef.current)
      tex.dispose()
      disposables.forEach(d => { try { d.dispose() } catch { /* noop */ } })
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, hz, colorHex, quality])

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#05050c' }} />
  )
}
