'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { createOrbit } from '@/lib/orbitControl'

interface Props {
  colorHex: string
  isPlaying: boolean
  analyserRef?: React.MutableRefObject<AnalyserNode | null>
  quality?: 'preview' | 'full'
  /** Enable wheel/pinch camera zoom (studio only). */
  interactive?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE FIGURE

   The old body was thirteen flat ellipses stamped into a plane — a snowman in
   a wire cage. It had no depth, no taper and no silhouette, which is exactly
   what made it read as clip art.

   This one is a capsule skeleton: each limb and section is a rounded segment
   with a radius at each end, sampled volumetrically. Radii taper the way a
   body does — wide at the shoulders, narrow at the wrist, thick at the thigh,
   fine at the ankle — and the sampling is surface-weighted so the outline
   stays crisp instead of dissolving into fog.
   ═══════════════════════════════════════════════════════════════════════════ */

interface Segment {
  /** Start point, end point, and the radius at each. */
  a: [number, number, number]
  b: [number, number, number]
  ra: number
  rb: number
}

const BODY: Segment[] = [
  // Head and neck
  { a: [0,  0.96, 0],     b: [0,  1.10, 0],     ra: 0.115, rb: 0.095 },
  { a: [0,  0.80, 0],     b: [0,  0.94, 0],     ra: 0.052, rb: 0.062 },
  // Torso — shoulders down to hips, tapering at the waist and flaring again
  { a: [0,  0.60, 0],     b: [0,  0.76, 0],     ra: 0.185, rb: 0.155 },
  { a: [0,  0.34, 0],     b: [0,  0.60, 0],     ra: 0.150, rb: 0.185 },
  { a: [0,  0.10, 0],     b: [0,  0.34, 0],     ra: 0.165, rb: 0.150 },
  // Arms — upper, fore, hand
  { a: [-0.19, 0.72, 0],  b: [-0.30, 0.42, 0],  ra: 0.070, rb: 0.055 },
  { a: [ 0.19, 0.72, 0],  b: [ 0.30, 0.42, 0],  ra: 0.070, rb: 0.055 },
  { a: [-0.30, 0.42, 0],  b: [-0.35, 0.12, 0],  ra: 0.055, rb: 0.040 },
  { a: [ 0.30, 0.42, 0],  b: [ 0.35, 0.12, 0],  ra: 0.055, rb: 0.040 },
  { a: [-0.35, 0.12, 0],  b: [-0.37, 0.02, 0],  ra: 0.040, rb: 0.030 },
  { a: [ 0.35, 0.12, 0],  b: [ 0.37, 0.02, 0],  ra: 0.040, rb: 0.030 },
  // Legs — thigh, calf, foot
  { a: [-0.10, 0.08, 0],  b: [-0.13,-0.36, 0],  ra: 0.105, rb: 0.072 },
  { a: [ 0.10, 0.08, 0],  b: [ 0.13,-0.36, 0],  ra: 0.105, rb: 0.072 },
  { a: [-0.13,-0.36, 0],  b: [-0.14,-0.78, 0],  ra: 0.072, rb: 0.045 },
  { a: [ 0.13,-0.36, 0],  b: [ 0.14,-0.78, 0],  ra: 0.072, rb: 0.045 },
  { a: [-0.14,-0.78, 0],  b: [-0.15,-0.86, 0.06], ra: 0.045, rb: 0.034 },
  { a: [ 0.14,-0.78, 0],  b: [ 0.15,-0.86, 0.06], ra: 0.045, rb: 0.034 },
]

/** Approximate volume, so points are shared between segments by size rather
 *  than spread evenly — otherwise a fingertip gets as many cells as a torso. */
function segVolume(s: Segment) {
  const len = Math.hypot(s.b[0]-s.a[0], s.b[1]-s.a[1], s.b[2]-s.a[2])
  const rm = (s.ra + s.rb) / 2
  return Math.PI * rm * rm * (len + rm)
}

/** Chakra column — the seven points, at anatomically sensible heights. */
const CHAKRA_Y = [-0.02, 0.16, 0.34, 0.50, 0.70, 0.94, 1.12]

function glowSprite(): THREE.CanvasTexture {
  const s = 64
  const c = document.createElement('canvas'); c.width = c.height = s
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.30, 'rgba(255,255,255,0.62)')
  grd.addColorStop(0.68, 'rgba(255,255,255,0.13)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd; g.fillRect(0, 0, s, s)
  return new THREE.CanvasTexture(c)
}

// Spindle torus ("apple") — the field shell.
const TR = 0.14, TT = 1.15
function torus(u: number, v: number, out: number[] | Float32Array, o: number) {
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
    const mobile = window.matchMedia('(max-width: 768px)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, preview || mobile ? 1.5 : 2)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#05050c')
    scene.fog = new THREE.FogExp2('#05050c', 0.11)
    const camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 100)
    camera.position.set(0, 0.05, 4.7)

    const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false })
    renderer.setSize(w, h); renderer.setPixelRatio(dpr)
    renderer.toneMapping = THREE.NoToneMapping
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    root.appendChild(renderer.domElement)

    const tex = glowSprite()
    const color = new THREE.Color(colorHex)
    const disposables: { dispose(): void }[] = []
    const reg = <T extends { dispose(): void }>(o: T): T => { disposables.push(o); return o }

    // ── The figure ─────────────────────────────────────────────────────────
    const HN = preview ? 2200 : (mobile ? 2600 : 4200)
    const hp   = new Float32Array(HN * 3)
    const hRim = new Float32Array(HN)      // 1 = on the silhouette, 0 = interior
    const vols = BODY.map(segVolume)
    const volSum = vols.reduce((a, b) => a + b, 0)

    for (let i = 0; i < HN; i++) {
      // Pick a segment proportionally to its volume.
      let pick = Math.random() * volSum, si = 0
      while (si < vols.length - 1 && pick > vols[si]) { pick -= vols[si]; si++ }
      const s = BODY[si]

      const t = Math.random()
      const cx = s.a[0] + (s.b[0] - s.a[0]) * t
      const cy = s.a[1] + (s.b[1] - s.a[1]) * t
      const cz = s.a[2] + (s.b[2] - s.a[2]) * t
      const r  = s.ra + (s.rb - s.ra) * t

      // Surface-biased radius: cube root fills a volume evenly, so pushing the
      // exponent up crowds cells toward the skin and keeps the outline sharp.
      const rr = Math.pow(Math.random(), 0.34)
      const ang = Math.random() * Math.PI * 2
      // Bodies are deeper than they are wide only slightly; 0.72 keeps the
      // figure readable in profile without turning it into a cylinder.
      hp[i*3]   = cx + Math.cos(ang) * rr * r
      hp[i*3+1] = cy + (Math.random() - 0.5) * 0.012
      hp[i*3+2] = cz + Math.sin(ang) * rr * r * 0.72
      hRim[i]   = rr
    }
    const humanGeo = reg(new THREE.BufferGeometry())
    humanGeo.setAttribute('position', new THREE.BufferAttribute(hp, 3))
    const human = new THREE.Points(humanGeo, reg(new THREE.PointsMaterial({
      color, size: preview ? 0.030 : 0.026, map: tex, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    })))
    // Two extra passes build the body up as a lit volume rather than a dot
    // cloud: a tight bright core and a wide soft bloom around it.
    const humanHalo = new THREE.Points(humanGeo, reg(new THREE.PointsMaterial({
      color, size: 0.10, map: tex, transparent: true, opacity: 0.085,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    })))
    const humanBloom = new THREE.Points(humanGeo, reg(new THREE.PointsMaterial({
      color, size: 0.26, map: tex, transparent: true, opacity: 0.035,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    })))
    scene.add(human); scene.add(humanHalo); scene.add(humanBloom)

    // ── Field shells ───────────────────────────────────────────────────────
    // Three nested torus cages at slightly different scales read as a field
    // with depth; a single wire cage read as a prop.
    const fieldGroup = new THREE.Group()
    const cageMats: THREE.LineBasicMaterial[] = []
    const SHELLS = preview ? 2 : 3
    for (let sh = 0; sh < SHELLS; sh++) {
      const segs: number[] = []
      const p0 = [0,0,0], p1 = [0,0,0]
      const M = preview ? 18 : 26, VS = preview ? 34 : 46
      for (let m = 0; m < M; m++) {
        const u = (m / M) * Math.PI * 2
        for (let k = 0; k < VS; k++) {
          torus(u, (k/VS)*Math.PI*2, p0, 0); torus(u, ((k+1)/VS)*Math.PI*2, p1, 0)
          segs.push(p0[0],p0[1],p0[2], p1[0],p1[1],p1[2])
        }
      }
      const L = preview ? 7 : 10, US = preview ? 40 : 56
      for (let l = 1; l < L; l++) {
        const v = (l / L) * Math.PI * 2
        for (let k = 0; k < US; k++) {
          torus((k/US)*Math.PI*2, v, p0, 0); torus(((k+1)/US)*Math.PI*2, v, p1, 0)
          segs.push(p0[0],p0[1],p0[2], p1[0],p1[1],p1[2])
        }
      }
      const cageGeo = reg(new THREE.BufferGeometry())
      cageGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs), 3))
      const mat = reg(new THREE.LineBasicMaterial({
        color, transparent: true, opacity: 0.10 - sh * 0.028,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }))
      cageMats.push(mat)
      const mesh = new THREE.LineSegments(cageGeo, mat)
      mesh.scale.setScalar(1 + sh * 0.13)
      fieldGroup.add(mesh)
    }
    scene.add(fieldGroup)

    // ── Circulating energy ─────────────────────────────────────────────────
    const P = preview ? 110 : (mobile ? 140 : 240)
    const fpU = new Float32Array(P), fpV = new Float32Array(P), fpS = new Float32Array(P)
    const fpR = new Float32Array(P)     // which shell each particle rides
    for (let i = 0; i < P; i++) {
      fpU[i] = Math.random()*Math.PI*2; fpV[i] = Math.random()*Math.PI*2
      fpS[i] = 0.4 + Math.random()*0.8; fpR[i] = 1 + Math.random() * 0.28
    }
    const fp = new Float32Array(P * 3)
    const flowGeo = reg(new THREE.BufferGeometry())
    flowGeo.setAttribute('position', new THREE.BufferAttribute(fp, 3))
    const flow = new THREE.Points(flowGeo, reg(new THREE.PointsMaterial({
      color, size: 0.075, map: tex, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    })))
    fieldGroup.add(flow)

    // ── Central channel + chakras ──────────────────────────────────────────
    const colGeo = reg(new THREE.CylinderGeometry(0.008, 0.008, 2.3, 6, 1, true))
    const column = new THREE.Mesh(colGeo, reg(new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false,
    })))
    column.position.y = 0.10
    scene.add(column)

    const chp = new Float32Array(CHAKRA_Y.length * 3)
    CHAKRA_Y.forEach((y, i) => { chp[i*3] = 0; chp[i*3+1] = y; chp[i*3+2] = 0.03 })
    const chGeo = reg(new THREE.BufferGeometry())
    chGeo.setAttribute('position', new THREE.BufferAttribute(chp, 3))
    const chakras = new THREE.Points(chGeo, reg(new THREE.PointsMaterial({
      color: 0xffffff, size: 0.26, map: tex, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    })))
    scene.add(chakras)
    const chMat = chakras.material as THREE.PointsMaterial

    scene.add(new THREE.AmbientLight('#ffffff', 0.4))
    const light = new THREE.PointLight(colorHex, 3, 12); light.position.set(0, 0.3, 2.5); scene.add(light)

    // ── Camera ─────────────────────────────────────────────────────────────
    const baseZ = camera.position.z
    const orbit = createOrbit(root, {
      baseDist: preview ? baseZ * 1.16 : baseZ * 1.26,
      minDist: baseZ * 0.45,
      maxDist: baseZ * 2.2,
      idleSpin: 0.12,
      // Three-quarters: face-on, a symmetrical figure reads as a flat cut-out.
      initialYaw: -0.55, initialPitch: 0.05,
    })
    renderer.domElement.style.cursor = 'grab'

    let onScreen = true
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting }, { rootMargin: '100px' })
    io.observe(root)

    // ── Animation ──────────────────────────────────────────────────────────
    let last = performance.now()
    let t = 0, aSmooth = 0.55
    let dataArray: Uint8Array<ArrayBuffer> | null = null
    const flowAttr = flowGeo.getAttribute('position') as THREE.BufferAttribute
    const tp = [0, 0, 0]

    function animate() {
      rafRef.current = requestAnimationFrame(animate)
      if (!onScreen || document.hidden) { last = performance.now(); return }
      const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt
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
      const breathe = 0.5 + 0.5 * Math.sin(t * 0.62)

      const scale = 0.84 + A * 0.28 + rms * 0.22 + breathe * 0.028
      fieldGroup.scale.set(scale, scale * 1.03, scale)
      fieldGroup.rotation.y = t * 0.12
      cageMats.forEach((m, i) => { m.opacity = (0.075 + A * 0.10 + rms * 0.09) * (1 - i * 0.28) })

      for (let i = 0; i < P; i++) {
        fpV[i] += fpS[i] * dt * (0.5 + A)
        torus(fpU[i], fpV[i], tp, 0)
        fp[i*3] = tp[0] * fpR[i]; fp[i*3+1] = tp[1] * fpR[i]; fp[i*3+2] = tp[2] * fpR[i]
      }
      flowAttr.needsUpdate = true
      ;(flow.material as THREE.PointsMaterial).opacity = 0.45 + A * 0.4 + rms * 0.35

      const hMat = human.material as THREE.PointsMaterial
      hMat.opacity = 0.38 + A * 0.24 + rms * 0.16
      ;(humanHalo.material as THREE.PointsMaterial).opacity = 0.06 + A * 0.05 + rms * 0.06
      ;(humanBloom.material as THREE.PointsMaterial).opacity = 0.025 + A * 0.03 + rms * 0.05
      // The body breathes on its own axis, slightly out of step with the field,
      // so the two do not pulse as one rigid object.
      const bodyBreathe = 1 + Math.sin(t * 0.62 + 0.9) * 0.010 + rms * 0.02
      human.scale.setScalar(bodyBreathe)
      humanHalo.scale.setScalar(bodyBreathe)
      humanBloom.scale.setScalar(bodyBreathe)

      chMat.size = 0.20 + 0.10 * breathe + rms * 0.3
      chMat.opacity = 0.6 + A * 0.3
      ;(column.material as THREE.MeshBasicMaterial).opacity = 0.22 + A * 0.22 + rms * 0.26
      light.intensity = 2.5 + A * 2 + rms * 3

      orbit.tick(dt)
      scene.rotation.y = orbit.yaw
      scene.rotation.x = orbit.pitch
      camera.position.set(0, 0.05, orbit.dist)
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
      io.disconnect()
      orbit.detach()
      cancelAnimationFrame(rafRef.current)
      tex.dispose()
      disposables.forEach(d => { try { d.dispose() } catch { /* noop */ } })
      renderer.dispose()
      if (root.contains(renderer.domElement)) root.removeChild(renderer.domElement)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorHex, quality, interactive])

  return <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', touchAction: 'pan-y', background: '#05050c' }} />
}
