'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { attachPinchZoom } from '@/lib/attachZoom'

interface Props {
  isPlaying: boolean
  /** 'session' = activation tied to session progress; 'preview' = gentle looping pulse. */
  mode?: 'session' | 'preview'
  /** Session progress 0→1 (elapsed / total) — resting at 0, fully activated at 1. */
  progress?: number
  analyserRef?: React.MutableRefObject<AnalyserNode | null>
}

// ─── Cool → hot activation gradient ───────────────────────────────────────────
const HEAT: [number, [number, number, number]][] = [
  [0.00, [26, 44, 120]],   // indigo (deep rest)
  [0.20, [18, 130, 165]],  // teal
  [0.40, [20, 185, 135]],  // green
  [0.58, [150, 222, 62]],  // lime
  [0.72, [250, 210, 72]],  // yellow
  [0.85, [250, 120, 40]],  // orange
  [0.94, [236, 60, 55]],   // red
  [1.00, [255, 240, 222]], // white-hot
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

function glowSprite(): THREE.CanvasTexture {
  const s = 64
  const c = document.createElement('canvas'); c.width = c.height = s
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.3, 'rgba(255,255,255,0.7)')
  grd.addColorStop(0.7, 'rgba(255,255,255,0.15)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd; g.fillRect(0, 0, s, s)
  return new THREE.CanvasTexture(c)
}

export default function NeuralBrain({ isPlaying, mode = 'session', progress = 0, analyserRef }: Props) {
  const rootRef    = useRef<HTMLDivElement>(null)
  const captionRef = useRef<HTMLSpanElement>(null)
  const playingRef = useRef(isPlaying)
  const progRef    = useRef(progress)
  const frameRef   = useRef(0)

  useEffect(() => { playingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { progRef.current = progress }, [progress])

  useEffect(() => {
    if (!rootRef.current) return
    const root = rootRef.current
    const w = root.clientWidth || 320
    const h = root.clientHeight || 320
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#05050c')
    scene.fog = new THREE.FogExp2('#05050c', 0.12)

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)
    camera.position.set(0, 0, 4.4)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(w, h)
    renderer.setPixelRatio(dpr)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.5
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    root.appendChild(renderer.domElement)

    const tex = glowSprite()
    const group = new THREE.Group()
    scene.add(group)

    // ── Generate neurons in a two-hemisphere brain shape ───────────────────
    const N = mode === 'preview' ? 720 : 900
    const pos = new Float32Array(N * 3)
    const nCol = new Float32Array(N * 3)
    const th  = new Float32Array(N)         // activation threshold per neuron
    const HEMI = 0.34, RX = 0.55, RY = 0.62, RZ = 0.85

    for (let i = 0; i < N; i++) {
      const hemi = i < N / 2 ? -1 : 1
      const u = Math.random() * Math.PI * 2
      const v = Math.acos(2 * Math.random() - 1)
      const fold = Math.sin(u * 7 + v * 3) * 0.5 + Math.sin(v * 9 + u * 2) * 0.5
      const rr = (1 + 0.07 * fold) * (0.9 + Math.random() * 0.1)
      const x = hemi * HEMI + Math.sin(v) * Math.cos(u) * RX * rr
      let y = Math.cos(v) * RY * rr
      const z = Math.sin(v) * Math.sin(u) * RZ * rr
      if (y < -0.28) y = -0.28 + (y + 0.28) * 0.55   // flatten the underside
      pos[i*3] = x; pos[i*3+1] = y; pos[i*3+2] = z
      const distC = Math.hypot(x, y * 0.9, z * 0.75) / 1.05
      th[i] = Math.min(1, distC * 0.82 + Math.random() * 0.16)   // center fires first
    }

    // ── Synapses (nearby neuron connections) ───────────────────────────────
    const maxSyn = mode === 'preview' ? 1200 : 1600
    const sa: number[] = []   // endpoint index a
    const sb: number[] = []   // endpoint index b
    const D2 = 0.30 * 0.30
    outer: for (let i = 0; i < N; i++) {
      for (let k = 0; k < 6; k++) {
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

    // Neurons
    const nGeo = new THREE.BufferGeometry()
    nGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    nGeo.setAttribute('color', new THREE.BufferAttribute(nCol, 3))
    const nMat = new THREE.PointsMaterial({ size: 0.055, map: tex, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })
    const neurons = new THREE.Points(nGeo, nMat); group.add(neurons)
    // Halo
    const haloMat = new THREE.PointsMaterial({ size: 0.16, map: tex, vertexColors: true, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })
    group.add(new THREE.Points(nGeo, haloMat))

    // Synapses
    const sGeo = new THREE.BufferGeometry()
    sGeo.setAttribute('position', new THREE.BufferAttribute(segPos, 3))
    sGeo.setAttribute('color', new THREE.BufferAttribute(segCol, 3))
    const sMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })
    const synapses = new THREE.LineSegments(sGeo, sMat)
    const sColAttr = sGeo.getAttribute('color') as THREE.BufferAttribute
    group.add(synapses)

    // ── Signal pulses travelling along synapses ────────────────────────────
    const P = mode === 'preview' ? 44 : 70
    const pPos = new Float32Array(P * 3)
    const pCol = new Float32Array(P * 3)
    const pSyn = new Int32Array(P)
    const pT   = new Float32Array(P)
    const pSpd = new Float32Array(P)
    for (let i = 0; i < P; i++) { pSyn[i] = (Math.random()*S)|0; pT[i] = Math.random(); pSpd[i] = 0.5 + Math.random()*0.9 }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3))
    const pMat = new THREE.PointsMaterial({ size: 0.12, map: tex, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })
    const pulses = new THREE.Points(pGeo, pMat); group.add(pulses)

    // Core glow
    const coreMat = new THREE.PointsMaterial({ size: 1.4, map: tex, color: 0xff7a3c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    const coreGeo = new THREE.BufferGeometry()
    coreGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3))
    const core = new THREE.Points(coreGeo, coreMat); group.add(core)

    scene.add(new THREE.AmbientLight('#ffffff', 0.4))

    // ── Camera wheel / pinch zoom ──────────────────────────────────────────
    const baseZ = camera.position.z
    camera.position.z = baseZ * 2.2   // start fully zoomed out
    const applyZoom = (factor: number) => {
      camera.position.z = Math.max(baseZ * 0.45, Math.min(baseZ * 2.2, camera.position.z * factor))
    }
    const onWheel = (e: WheelEvent) => { e.preventDefault(); applyZoom(Math.exp(e.deltaY * 0.0015)) }
    if (mode === 'session') root.addEventListener('wheel', onWheel, { passive: false })
    const detachPinch = attachPinchZoom(root, applyZoom)   // pinch works in every mode

    // ── Animation ──────────────────────────────────────────────────────────
    let last = performance.now()
    let elapsed = 0
    let aSmooth = mode === 'preview' ? 0.3 : 0.08
    let dataArray: Uint8Array<ArrayBuffer> | null = null
    const nColAttr = nGeo.getAttribute('color') as THREE.BufferAttribute
    const tmp = new Float32Array(3)

    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now
      elapsed += dt
      const playing = playingRef.current

      // audio energy
      let rms = 0
      const an = analyserRef?.current
      if (an && playing) {
        if (!dataArray || dataArray.length !== an.fftSize) dataArray = new Uint8Array(an.fftSize) as Uint8Array<ArrayBuffer>
        an.getByteTimeDomainData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) { const d = (dataArray[i]-128)/128; sum += d*d }
        rms = Math.sqrt(sum / dataArray.length)
      }

      // global activation
      let target: number
      if (mode === 'preview') target = 0.2 + 0.8 * (0.5 - 0.5 * Math.cos(elapsed * 0.6))
      else target = Math.max(0.06, Math.min(1, progRef.current))
      aSmooth += (target - aSmooth) * Math.min(1, dt * 1.6)
      const A = aSmooth

      // neuron colours
      const shimmer = Math.sin(elapsed * 3) * 0.03
      for (let i = 0; i < N; i++) {
        const a = smoothstep(th[i] - 0.14, th[i] + 0.05, A)
        const hv = 0.08 + a * 0.9 + rms * 0.35 + shimmer * a
        heat(hv, tmp, 0)
        nCol[i*3] = tmp[0]; nCol[i*3+1] = tmp[1]; nCol[i*3+2] = tmp[2]
      }
      nColAttr.needsUpdate = true

      // synapse colours from endpoint activation (dim baseline)
      for (let s = 0; s < S; s++) {
        const a = sa[s], b = sb[s]
        const m = 0.5
        segCol[s*6]   = nCol[a*3]*m;   segCol[s*6+1] = nCol[a*3+1]*m; segCol[s*6+2] = nCol[a*3+2]*m
        segCol[s*6+3] = nCol[b*3]*m;   segCol[s*6+4] = nCol[b*3+1]*m; segCol[s*6+5] = nCol[b*3+2]*m
      }
      sColAttr.needsUpdate = true
      sMat.opacity = 0.28 + A * 0.28

      // pulses
      const pPosAttr = pGeo.getAttribute('position') as THREE.BufferAttribute
      const pColAttr = pGeo.getAttribute('color') as THREE.BufferAttribute
      for (let i = 0; i < P; i++) {
        pT[i] += pSpd[i] * dt * (0.6 + A)
        if (pT[i] >= 1) { pT[i] = 0; pSyn[i] = (Math.random()*S)|0 }
        const s = pSyn[i], a = sa[s], b = sb[s], t = pT[i]
        pPos[i*3]   = pos[a*3]   + (pos[b*3]   - pos[a*3])   * t
        pPos[i*3+1] = pos[a*3+1] + (pos[b*3+1] - pos[a*3+1]) * t
        pPos[i*3+2] = pos[a*3+2] + (pos[b*3+2] - pos[a*3+2]) * t
        const act = smoothstep(th[a] - 0.14, th[a] + 0.05, A)
        heat(0.6 + act * 0.4, tmp, 0)
        const bright = 0.2 + act * 0.8
        pCol[i*3] = tmp[0]*bright; pCol[i*3+1] = tmp[1]*bright; pCol[i*3+2] = tmp[2]*bright
      }
      pPosAttr.needsUpdate = true; pColAttr.needsUpdate = true

      coreMat.opacity = 0.08 + A * 0.35 + rms * 0.2
      core.scale.setScalar(0.8 + A * 0.6)

      group.rotation.y = Math.sin(elapsed * 0.18) * 0.5 + elapsed * 0.04
      group.rotation.x = Math.sin(elapsed * 0.13) * 0.08
      const breathe = 1 + Math.sin(elapsed * 0.9) * 0.015 + rms * 0.05
      group.scale.setScalar(1.32 * breathe)

      camera.position.x = Math.sin(elapsed * 0.2) * 0.15
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)

      if (captionRef.current && mode === 'session') {
        captionRef.current.textContent = A < 0.14 ? 'Resting state' : A > 0.9 ? 'Peak activation' : 'Activating…'
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
          <span ref={captionRef} className="glass" style={{ padding: '5px 14px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.02em' }}>
            Resting state
          </span>
        </div>
      )}
    </div>
  )
}
