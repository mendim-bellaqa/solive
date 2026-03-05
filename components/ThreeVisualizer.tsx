'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { getComplexityLevel } from '@/lib/frequencies'

interface Props {
  hz: number
  isPlaying: boolean
  analyserRef: React.MutableRefObject<AnalyserNode | null>
  colorHex: string
  focusMode?: boolean
  onDrag?: (dx: number, dy: number) => void
}

// Lissajous parameters per complexity level
// x(t) = sin(a·t + δ)  y(t) = sin(b·t)  z(t) = sin(c·t + δ·0.4)
// a:b ratio determines the figure topology, matching frequency relationship
function getLissajousParams(hz: number) {
  const level = getComplexityLevel(hz)
  const configs: Record<number, { a: number; b: number; c: number; loops: number; phaseSpeed: number }> = {
    1: { a: 1, b: 2, c: 1, loops: 2,  phaseSpeed: 0.25 }, // 174–285 Hz: figure-8, simple
    2: { a: 2, b: 3, c: 2, loops: 3,  phaseSpeed: 0.30 }, // 396–417 Hz: trefoil knot
    3: { a: 3, b: 4, c: 3, loops: 4,  phaseSpeed: 0.38 }, // 432–528 Hz: 4-lobe mandala
    4: { a: 4, b: 5, c: 3, loops: 5,  phaseSpeed: 0.46 }, // 741 Hz:  star knot
    5: { a: 5, b: 7, c: 4, loops: 7,  phaseSpeed: 0.55 }, // 852–963 Hz: crystalline
  }
  return configs[level]
}

// Populate a Float32Array with Lissajous positions
function computeLissajous(
  buf: Float32Array,
  n: number,
  a: number, b: number, c: number,
  loops: number,
  phase: number,
  scale: number,
) {
  const fullArc = Math.PI * 2 * loops
  for (let i = 0; i < n; i++) {
    const t = (i / n) * fullArc
    buf[i * 3]     = Math.sin(a * t + phase)  * scale
    buf[i * 3 + 1] = Math.sin(b * t)          * scale
    buf[i * 3 + 2] = Math.sin(c * t + phase * 0.4) * scale * 0.65
  }
}

export default function ThreeVisualizer({ hz, isPlaying, analyserRef, colorHex, focusMode, onDrag }: Props) {
  const mountRef     = useRef<HTMLDivElement>(null)
  const frameRef     = useRef<number>(0)
  const timeRef      = useRef<number>(0)
  const isPlayingRef = useRef<boolean>(isPlaying)
  const dragRef      = useRef<{ active: boolean; lastX: number; lastY: number }>({ active: false, lastX: 0, lastY: 0 })

  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  useEffect(() => {
    if (!mountRef.current) return
    const mount = mountRef.current
    const w = mount.clientWidth
    const h = mount.clientHeight

    const dpr      = window.devicePixelRatio || 1
    const N        = dpr >= 1.5 ? 3000 : 2000   // Lissajous resolution
    const pCount   = dpr >= 1.5 ? 600 : 400
    const { a, b, c, loops, phaseSpeed } = getLissajousParams(hz)

    // ── Scene ─────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#06060e')
    scene.fog = new THREE.FogExp2('#06060e', 0.022)

    const camera = new THREE.PerspectiveCamera(52, w / h, 0.1, 100)
    camera.position.set(0, 0, 9)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(dpr, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.3
    mount.appendChild(renderer.domElement)

    const color = new THREE.Color(colorHex)

    // ── 3D Lissajous — inner bright line ─────────────────────────────────
    const lissBuf  = new Float32Array(N * 3)
    const lissGeo  = new THREE.BufferGeometry()
    const lissAttr = new THREE.BufferAttribute(lissBuf, 3)
    lissGeo.setAttribute('position', lissAttr)

    const lissMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const lissLine = new THREE.LineLoop(lissGeo, lissMat)
    scene.add(lissLine)

    // ── Lissajous — glow layer 1 (slightly larger, lower opacity) ─────────
    const glowBuf1  = new Float32Array(N * 3)
    const glowGeo1  = new THREE.BufferGeometry()
    const glowAttr1 = new THREE.BufferAttribute(glowBuf1, 3)
    glowGeo1.setAttribute('position', glowAttr1)
    const glowMat1 = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.30,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const glowLine1 = new THREE.LineLoop(glowGeo1, glowMat1)
    scene.add(glowLine1)

    // ── Lissajous — glow layer 2 (largest, faintest) ──────────────────────
    const glowBuf2  = new Float32Array(N * 3)
    const glowGeo2  = new THREE.BufferGeometry()
    const glowAttr2 = new THREE.BufferAttribute(glowBuf2, 3)
    glowGeo2.setAttribute('position', glowAttr2)
    const glowMat2 = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const glowLine2 = new THREE.LineLoop(glowGeo2, glowMat2)
    scene.add(glowLine2)

    // ── Audio waveform ring ───────────────────────────────────────────────
    const waveN   = 256
    const waveGeo = new THREE.BufferGeometry()
    const waveBuf = new Float32Array(waveN * 3)
    waveGeo.setAttribute('position', new THREE.BufferAttribute(waveBuf, 3))
    const waveMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const waveLine = new THREE.LineLoop(waveGeo, waveMat)
    scene.add(waveLine)

    // ── Particle field ────────────────────────────────────────────────────
    const pGeo = new THREE.BufferGeometry()
    const pBuf = new Float32Array(pCount * 3)
    const pBaseR = new Float32Array(pCount)
    const pTheta = new Float32Array(pCount)
    const pPhi   = new Float32Array(pCount)
    for (let i = 0; i < pCount; i++) {
      const r = 7 + Math.random() * 8
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      pBaseR[i] = r; pTheta[i] = theta; pPhi[i] = phi
      pBuf[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pBuf[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pBuf[i * 3 + 2] = r * Math.cos(phi)
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pBuf, 3))
    const pMat = new THREE.PointsMaterial({
      color,
      size: 0.05,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const particles = new THREE.Points(pGeo, pMat)
    scene.add(particles)

    // ── Lights ────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight('#ffffff', 0.3))
    const light1 = new THREE.PointLight(colorHex, 3.5, 20)
    light1.position.set(0, 0, 4)
    scene.add(light1)
    const light2 = new THREE.PointLight(colorHex, 1.5, 15)
    light2.position.set(3, 4, -5)
    scene.add(light2)

    // ── FFT buffer ────────────────────────────────────────────────────────
    let dataArray: Uint8Array<ArrayBuffer> | null = null

    // ── Animation loop ────────────────────────────────────────────────────
    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      timeRef.current += 0.008
      const t = timeRef.current
      const playing = isPlayingRef.current

      // Audio data
      let rms = 0
      let tdData: Uint8Array<ArrayBuffer> | null = null
      if (analyserRef.current) {
        if (!dataArray) {
          dataArray = new Uint8Array(analyserRef.current.frequencyBinCount) as Uint8Array<ArrayBuffer>
        }
        if (playing) {
          analyserRef.current.getByteFrequencyData(dataArray)
          const td = new Uint8Array(analyserRef.current.fftSize) as Uint8Array<ArrayBuffer>
          analyserRef.current.getByteTimeDomainData(td)
          tdData = td
          let sum = 0
          for (let i = 0; i < td.length; i++) { const v = (td[i] - 128) / 128; sum += v * v }
          rms = Math.sqrt(sum / td.length)
        }
      }

      // ── Compute Lissajous positions ───────────────────────────────────
      const phase = t * phaseSpeed
      const scale = 2.8 * (1 + rms * 1.8)

      computeLissajous(lissBuf,  N, a, b, c, loops, phase,        scale)
      computeLissajous(glowBuf1, N, a, b, c, loops, phase,        scale * 1.014)
      computeLissajous(glowBuf2, N, a, b, c, loops, phase,        scale * 1.038)

      lissAttr.needsUpdate  = true
      glowAttr1.needsUpdate = true
      glowAttr2.needsUpdate = true

      // Slow rotation around Y axis — cinematic orbit
      lissLine.rotation.y  = t * 0.08
      lissLine.rotation.x  = Math.sin(t * 0.055) * 0.18
      glowLine1.rotation.y = lissLine.rotation.y
      glowLine1.rotation.x = lissLine.rotation.x
      glowLine2.rotation.y = lissLine.rotation.y
      glowLine2.rotation.x = lissLine.rotation.x

      // ── Audio waveform ring ───────────────────────────────────────────
      const wAttr = waveLine.geometry.getAttribute('position') as THREE.BufferAttribute
      const waveR = 5.2
      if (tdData) {
        for (let i = 0; i < waveN; i++) {
          const angle = (i / waveN) * Math.PI * 2
          const idx   = Math.floor(i * tdData.length / waveN)
          const amp   = ((tdData[idx] - 128) / 128) * 0.9
          wAttr.setXYZ(i, Math.cos(angle) * (waveR + amp), Math.sin(angle) * (waveR + amp), 0)
        }
      } else {
        // Idle: Lissajous-like idle wave using a/b nodal parameters
        for (let i = 0; i < waveN; i++) {
          const angle = (i / waveN) * Math.PI * 2
          const idle  = Math.sin(angle * a + t * 1.1) * 0.06
          wAttr.setXYZ(i, Math.cos(angle) * (waveR + idle), Math.sin(angle) * (waveR + idle), 0)
        }
      }
      wAttr.needsUpdate = true

      waveLine.rotation.z = t * 0.03
      waveLine.rotation.y = Math.sin(t * 0.05) * 0.15

      // ── Particles ────────────────────────────────────────────────────
      particles.rotation.y = t * 0.010
      particles.rotation.x = t * 0.006

      if (playing && rms > 0.04) {
        const pAttr = particles.geometry.getAttribute('position') as THREE.BufferAttribute
        const pArr  = pAttr.array as Float32Array
        const boost = 1 + rms * 0.5
        for (let i = 0; i < pCount; i++) {
          const r = pBaseR[i] * boost
          pArr[i * 3]     = r * Math.sin(pPhi[i]) * Math.cos(pTheta[i])
          pArr[i * 3 + 1] = r * Math.sin(pPhi[i]) * Math.sin(pTheta[i])
          pArr[i * 3 + 2] = r * Math.cos(pPhi[i])
        }
        pAttr.needsUpdate = true
      }

      // ── Light pulse ───────────────────────────────────────────────────
      light1.intensity = 3.5 + rms * 6.0

      // ── Camera orbit ──────────────────────────────────────────────────
      camera.position.x = Math.sin(t * 0.032) * 1.2
      camera.position.y = Math.sin(t * 0.021) * 0.7
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }

    animate()

    // ── Resize ────────────────────────────────────────────────────────────
    function onResize() {
      const nw = mount.clientWidth, nh = mount.clientHeight
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(frameRef.current)
      lissGeo.dispose(); glowGeo1.dispose(); glowGeo2.dispose()
      waveGeo.dispose(); pGeo.dispose()
      lissMat.dispose(); glowMat1.dispose(); glowMat2.dispose()
      waveMat.dispose(); pMat.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hz, colorHex])

  // ── Pointer event handlers for interactive drag ───────────────────────────
  function onPointerDown(e: React.PointerEvent) {
    if (!focusMode) return
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!focusMode || !dragRef.current.active) return
    const dx = e.clientX - dragRef.current.lastX
    const dy = e.clientY - dragRef.current.lastY
    dragRef.current.lastX = e.clientX
    dragRef.current.lastY = e.clientY
    onDrag?.(dx, dy)
  }

  function onPointerUp(e: React.PointerEvent) {
    dragRef.current.active = false
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  return (
    <div
      ref={mountRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        background: '#06060e',
        cursor: focusMode ? 'ew-resize' : 'default',
        touchAction: focusMode ? 'none' : 'auto',
      }}
    />
  )
}
