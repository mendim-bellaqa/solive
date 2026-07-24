'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface Props {
  colorHex: string
  isPlaying: boolean
  analyserRef?: React.MutableRefObject<AnalyserNode | null>
  quality?: 'preview' | 'full'
  /** Enable wheel/pinch camera zoom (studio only). */
  interactive?: boolean
}

// Front-view human silhouette as weighted ellipses (x horizontal, y vertical)
const BODY = [
  { cx: 0,     cy: 0.92,  rx: 0.15, ry: 0.19 }, // head
  { cx: 0,     cy: 0.66,  rx: 0.30, ry: 0.10 }, // shoulders
  { cx: 0,     cy: 0.44,  rx: 0.24, ry: 0.20 }, // chest
  { cx: 0,     cy: 0.18,  rx: 0.19, ry: 0.20 }, // abdomen
  { cx: 0,     cy: -0.02, rx: 0.22, ry: 0.12 }, // hips
  { cx: -0.30, cy: 0.42,  rx: 0.07, ry: 0.24 }, // L upper arm
  { cx: 0.30,  cy: 0.42,  rx: 0.07, ry: 0.24 }, // R upper arm
  { cx: -0.34, cy: 0.02,  rx: 0.06, ry: 0.24 }, // L forearm
  { cx: 0.34,  cy: 0.02,  rx: 0.06, ry: 0.24 }, // R forearm
  { cx: -0.12, cy: -0.42, rx: 0.10, ry: 0.32 }, // L thigh
  { cx: 0.12,  cy: -0.42, rx: 0.10, ry: 0.32 }, // R thigh
  { cx: -0.12, cy: -0.86, rx: 0.08, ry: 0.28 }, // L calf
  { cx: 0.12,  cy: -0.86, rx: 0.08, ry: 0.28 }, // R calf
]

function glowSprite(): THREE.CanvasTexture {
  const s = 64
  const c = document.createElement('canvas'); c.width = c.height = s
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  grd.addColorStop(0.7, 'rgba(255,255,255,0.12)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd; g.fillRect(0, 0, s, s)
  return new THREE.CanvasTexture(c)
}

// Spindle-torus ("apple") biofield point — hole nearly closed at the poles
const TR = 0.14, TT = 1.15
function torus(u: number, v: number, out: number[], o: number) {
  const ring = TR + TT * Math.cos(v)
  out[o]   = ring * Math.cos(u)
  out[o+1] = TT * Math.sin(v)
  out[o+2] = ring * Math.sin(u)
}

export default function Biofield({ colorHex, isPlaying, analyserRef, quality = 'full', interactive = false }: Props) {
  const rootRef    = useRef<HTMLDivElement>(null)
  const playingRef = useRef(isPlaying)
  const rafRef     = useRef(0)

  useEffect(() => { playingRef.current = isPlaying }, [isPlaying])

  useEffect(() => {
    if (!rootRef.current) return
    const root = rootRef.current
    const w = root.clientWidth || 360, h = root.clientHeight || 360
    const preview = quality === 'preview'
    const dpr = Math.min(window.devicePixelRatio || 1, preview ? 1.75 : 2)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#05050c')
    scene.fog = new THREE.FogExp2('#05050c', 0.12)
    const camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 100)
    camera.position.set(0, 0.05, 4.7)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(w, h); renderer.setPixelRatio(dpr)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.5
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    root.appendChild(renderer.domElement)

    const tex = glowSprite()
    const color = new THREE.Color(colorHex)
    const disposables: { dispose(): void }[] = []
    const reg = <T extends { dispose(): void }>(o: T): T => { disposables.push(o); return o }

    // ── Human silhouette (glowing point cloud) ─────────────────────────────
    const HN = preview ? 900 : 1500
    const hp = new Float32Array(HN * 3)
    const areas = BODY.map(b => b.rx * b.ry)
    const areaSum = areas.reduce((a, b) => a + b, 0)
    for (let i = 0; i < HN; i++) {
      let pick = Math.random() * areaSum, ri = 0
      while (ri < areas.length - 1 && pick > areas[ri]) { pick -= areas[ri]; ri++ }
      const b = BODY[ri]
      const ang = Math.random() * Math.PI * 2, rad = Math.sqrt(Math.random())
      const x = b.cx + Math.cos(ang) * rad * b.rx
      const y = b.cy + Math.sin(ang) * rad * b.ry
      const z = (Math.random() * 2 - 1) * 0.12 * Math.sqrt(Math.max(0, 1 - rad * rad))
      hp[i*3] = x; hp[i*3+1] = y; hp[i*3+2] = z
    }
    const humanGeo = reg(new THREE.BufferGeometry())
    humanGeo.setAttribute('position', new THREE.BufferAttribute(hp, 3))
    const human = new THREE.Points(humanGeo, reg(new THREE.PointsMaterial({
      color, size: preview ? 0.05 : 0.042, map: tex, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    })))
    const humanHalo = new THREE.Points(humanGeo, reg(new THREE.PointsMaterial({
      color, size: 0.13, map: tex, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    })))
    scene.add(human); scene.add(humanHalo)

    // ── Toroidal field cage (meridian loops + latitude rings) ──────────────
    const fieldGroup = new THREE.Group()
    const segs: number[] = []
    const p0 = [0,0,0], p1 = [0,0,0]
    const M = preview ? 22 : 30, VS = preview ? 40 : 52
    for (let m = 0; m < M; m++) {
      const u = (m / M) * Math.PI * 2
      for (let k = 0; k < VS; k++) {
        torus(u, (k/VS)*Math.PI*2, p0, 0); torus(u, ((k+1)/VS)*Math.PI*2, p1, 0)
        segs.push(p0[0],p0[1],p0[2], p1[0],p1[1],p1[2])
      }
    }
    const L = preview ? 9 : 12, US = preview ? 48 : 64
    for (let l = 1; l < L; l++) {
      const v = (l / L) * Math.PI * 2
      for (let k = 0; k < US; k++) {
        torus((k/US)*Math.PI*2, v, p0, 0); torus(((k+1)/US)*Math.PI*2, v, p1, 0)
        segs.push(p0[0],p0[1],p0[2], p1[0],p1[1],p1[2])
      }
    }
    const cageGeo = reg(new THREE.BufferGeometry())
    cageGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs), 3))
    const cageMat = reg(new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false }))
    fieldGroup.add(new THREE.LineSegments(cageGeo, cageMat))
    scene.add(fieldGroup)

    // ── Flowing energy particles (circulate through the torus) ─────────────
    const P = preview ? 90 : 150
    const fpU = new Float32Array(P), fpV = new Float32Array(P), fpS = new Float32Array(P)
    for (let i = 0; i < P; i++) { fpU[i] = Math.random()*Math.PI*2; fpV[i] = Math.random()*Math.PI*2; fpS[i] = 0.4 + Math.random()*0.8 }
    const fp = new Float32Array(P * 3)
    const flowGeo = reg(new THREE.BufferGeometry())
    flowGeo.setAttribute('position', new THREE.BufferAttribute(fp, 3))
    const flow = new THREE.Points(flowGeo, reg(new THREE.PointsMaterial({
      color, size: 0.09, map: tex, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    })))
    fieldGroup.add(flow)

    // ── Central channel + chakra glows ─────────────────────────────────────
    const colGeo = reg(new THREE.CylinderGeometry(0.01, 0.01, 2.5, 6, 1, true))
    const column = new THREE.Mesh(colGeo, reg(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })))
    scene.add(column)
    const chY = [-0.6, -0.15, 0.15, 0.42, 0.66, 0.9, 1.12]
    const chp = new Float32Array(chY.length * 3)
    chY.forEach((y, i) => { chp[i*3] = 0; chp[i*3+1] = y; chp[i*3+2] = 0.05 })
    const chGeo = reg(new THREE.BufferGeometry())
    chGeo.setAttribute('position', new THREE.BufferAttribute(chp, 3))
    const chakras = new THREE.Points(chGeo, reg(new THREE.PointsMaterial({ color: 0xffffff, size: 0.34, map: tex, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })))
    scene.add(chakras)
    const chMat = chakras.material as THREE.PointsMaterial

    scene.add(new THREE.AmbientLight('#ffffff', 0.4))
    const light = new THREE.PointLight(colorHex, 3, 12); light.position.set(0, 0.3, 2.5); scene.add(light)

    // Wheel zoom
    const baseZ = camera.position.z
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      camera.position.z = Math.max(baseZ * 0.5, Math.min(baseZ * 2.2, camera.position.z * Math.exp(e.deltaY * 0.0015)))
    }
    if (interactive) root.addEventListener('wheel', onWheel, { passive: false })

    // ── Animation ──────────────────────────────────────────────────────────
    const clock = new THREE.Clock()
    let t = 0, aSmooth = 0.55
    let dataArray: Uint8Array<ArrayBuffer> | null = null
    const flowAttr = flowGeo.getAttribute('position') as THREE.BufferAttribute
    const tp = [0, 0, 0]

    function animate() {
      rafRef.current = requestAnimationFrame(animate)
      const dt = Math.min(0.05, clock.getDelta()); t += dt
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

      const target = playing ? 1 : 0.62
      aSmooth += (target - aSmooth) * Math.min(1, dt * 1.2)
      const A = aSmooth
      const breathe = 0.5 + 0.5 * Math.sin(t * 0.7)

      // Field expands & brightens
      const scale = 0.82 + A * 0.32 + rms * 0.25 + breathe * 0.03
      fieldGroup.scale.set(scale, scale * 1.03, scale)
      fieldGroup.rotation.y = t * 0.14
      cageMat.opacity = 0.08 + A * 0.14 + rms * 0.12

      // Flowing particles circulate poloidally (up the centre, over, down outside)
      for (let i = 0; i < P; i++) {
        fpV[i] += fpS[i] * dt * (0.5 + A)
        torus(fpU[i], fpV[i], tp, 0)
        fp[i*3] = tp[0]; fp[i*3+1] = tp[1]; fp[i*3+2] = tp[2]
      }
      flowAttr.needsUpdate = true
      ;(flow.material as THREE.PointsMaterial).opacity = 0.5 + A * 0.4 + rms * 0.4

      // Human + chakras
      const hMat = human.material as THREE.PointsMaterial
      hMat.opacity = 0.7 + A * 0.25 + rms * 0.2
      chMat.size = 0.28 + 0.12 * breathe + rms * 0.4
      chMat.opacity = 0.7 + A * 0.25
      ;(column.material as THREE.MeshBasicMaterial).opacity = 0.28 + A * 0.25 + rms * 0.3
      light.intensity = 2.5 + A * 2 + rms * 3

      camera.position.x = Math.sin(t * 0.18) * 0.18
      camera.lookAt(0, 0.05, 0)
      renderer.render(scene, camera)
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
      if (interactive) root.removeEventListener('wheel', onWheel)
      cancelAnimationFrame(rafRef.current)
      tex.dispose()
      disposables.forEach(d => { try { d.dispose() } catch { /* noop */ } })
      renderer.dispose()
      if (root.contains(renderer.domElement)) root.removeChild(renderer.domElement)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorHex, quality, interactive])

  return <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#05050c' }} />
}
