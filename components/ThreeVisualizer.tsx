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

// Lissajous parameters per frequency complexity
function getLissajousParams(hz: number) {
  const level = getComplexityLevel(hz)
  const configs: Record<number, { a:number; b:number; c:number; loops:number; phaseSpeed:number }> = {
    1: { a:1, b:2, c:1, loops:2,  phaseSpeed:0.22 },
    2: { a:2, b:3, c:2, loops:3,  phaseSpeed:0.28 },
    3: { a:3, b:4, c:3, loops:4,  phaseSpeed:0.36 },
    4: { a:4, b:5, c:3, loops:5,  phaseSpeed:0.44 },
    5: { a:5, b:7, c:4, loops:7,  phaseSpeed:0.52 },
  }
  return configs[level]
}

function computeLissajous(buf:Float32Array, n:number, a:number, b:number, c:number, loops:number, phase:number, scale:number) {
  const fullArc = Math.PI * 2 * loops
  for (let i = 0; i < n; i++) {
    const t = (i / n) * fullArc
    buf[i*3]   = Math.sin(a*t + phase)          * scale
    buf[i*3+1] = Math.sin(b*t)                  * scale
    buf[i*3+2] = Math.sin(c*t + phase*0.4)      * scale * 0.6
  }
}

// Parse hex to [r,g,b] 0-255
function parseHex(hex:string): [number,number,number] {
  const c = hex.replace('#','')
  return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)]
}

// Create a soft circular sprite texture for particles
function createCircleTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
  grad.addColorStop(0,   'rgba(255,255,255,1)')
  grad.addColorStop(0.35,'rgba(255,255,255,0.7)')
  grad.addColorStop(0.7, 'rgba(255,255,255,0.2)')
  grad.addColorStop(1,   'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

export default function ThreeVisualizer({ hz, isPlaying, analyserRef, colorHex, focusMode, onDrag }: Props) {
  const mountRef     = useRef<HTMLDivElement>(null)
  const frameRef     = useRef<number>(0)
  const timeRef      = useRef<number>(0)
  const isPlayingRef = useRef<boolean>(isPlaying)
  const dragRef      = useRef<{ active:boolean; lastX:number; lastY:number }>({ active:false, lastX:0, lastY:0 })

  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  useEffect(() => {
    if (!mountRef.current) return
    const mount = mountRef.current
    const w = mount.clientWidth
    const h = mount.clientHeight

    const dpr    = Math.min(window.devicePixelRatio || 1, 2.5)
    const N      = dpr >= 1.5 ? 3200 : 2400
    const pCount = dpr >= 1.5 ? 700 : 500
    const { a, b, c, loops, phaseSpeed } = getLissajousParams(hz)

    const [r, g, bl] = parseHex(colorHex)

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#05050c')
    scene.fog = new THREE.FogExp2('#05050c', 0.018)

    // Camera — adjust position based on aspect ratio for mobile
    const aspect = w / h
    const fov    = aspect < 0.8 ? 60 : aspect < 1.2 ? 54 : 50
    const camZ   = aspect < 0.8 ? 10 : 9
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100)
    camera.position.set(0, 0, camZ)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(dpr, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.4
    mount.appendChild(renderer.domElement)

    const mainColor = new THREE.Color(colorHex)

    // ── Circle sprite texture ──────────────────────────────────────────────
    const spriteTexture = createCircleTexture()

    // ── Main Lissajous line ────────────────────────────────────────────────
    const lissBuf  = new Float32Array(N * 3)
    const lissGeo  = new THREE.BufferGeometry()
    const lissAttr = new THREE.BufferAttribute(lissBuf, 3)
    lissGeo.setAttribute('position', lissAttr)
    const lissMat = new THREE.LineBasicMaterial({
      color: mainColor, transparent:true, opacity:0.94,
      blending:THREE.AdditiveBlending, depthWrite:false,
    })
    const lissLine = new THREE.LineLoop(lissGeo, lissMat)
    scene.add(lissLine)

    // ── Glow layers (x3 sizes) ─────────────────────────────────────────────
    const glowLayers = [
      { scale:1.016, opacity:0.28 },
      { scale:1.038, opacity:0.14 },
      { scale:1.065, opacity:0.06 },
    ].map(({ scale, opacity }) => {
      const geo  = new THREE.BufferGeometry()
      const buf  = new Float32Array(N * 3)
      const attr = new THREE.BufferAttribute(buf, 3)
      geo.setAttribute('position', attr)
      const mat = new THREE.LineBasicMaterial({
        color:mainColor, transparent:true, opacity,
        blending:THREE.AdditiveBlending, depthWrite:false,
      })
      const line = new THREE.LineLoop(geo, mat)
      scene.add(line)
      return { geo, buf, attr, mat, line, scale }
    })

    // ── Chromatic aberration layers (RGB split) ────────────────────────────
    const chromaOffset = 0.055
    const chromaColors = [
      new THREE.Color(`rgb(${r}, 20, 20)`),   // R channel
      new THREE.Color(`rgb(20, ${g}, 20)`),   // G channel
      new THREE.Color(`rgb(20, 20, ${bl})`),  // B channel
    ]
    const chromaLayers = chromaColors.map((col, i) => {
      const geo  = new THREE.BufferGeometry()
      const buf  = new Float32Array(N * 3)
      const attr = new THREE.BufferAttribute(buf, 3)
      geo.setAttribute('position', attr)
      const mat = new THREE.LineBasicMaterial({
        color:col, transparent:true, opacity:0.06,
        blending:THREE.AdditiveBlending, depthWrite:false,
      })
      const line = new THREE.LineLoop(geo, mat)
      const offset = (i - 1) * chromaOffset  // -0.055, 0, +0.055
      scene.add(line)
      return { geo, buf, attr, mat, line, offset }
    })

    // ── Audio waveform ring ────────────────────────────────────────────────
    const waveN   = 256
    const waveGeo = new THREE.BufferGeometry()
    const waveBuf = new Float32Array(waveN * 3)
    waveGeo.setAttribute('position', new THREE.BufferAttribute(waveBuf, 3))
    const waveMat = new THREE.LineBasicMaterial({
      color:mainColor, transparent:true, opacity:0.5,
      blending:THREE.AdditiveBlending, depthWrite:false,
    })
    const waveLine = new THREE.LineLoop(waveGeo, waveMat)
    scene.add(waveLine)

    // ── Outer pulse ring ──────────────────────────────────────────────────
    const pulseGeo = new THREE.BufferGeometry()
    const pulseBuf = new Float32Array(waveN * 3)
    pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulseBuf, 3))
    const pulseMat = new THREE.LineBasicMaterial({
      color:mainColor, transparent:true, opacity:0.18,
      blending:THREE.AdditiveBlending, depthWrite:false,
    })
    const pulseLine = new THREE.LineLoop(pulseGeo, pulseMat)
    scene.add(pulseLine)

    // ── Particle field (circular sprites) ─────────────────────────────────
    const pGeo   = new THREE.BufferGeometry()
    const pBuf   = new Float32Array(pCount * 3)
    const pBaseR = new Float32Array(pCount)
    const pTheta = new Float32Array(pCount)
    const pPhi   = new Float32Array(pCount)
    for (let i = 0; i < pCount; i++) {
      const ri = 7.5 + Math.random() * 9
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      pBaseR[i] = ri; pTheta[i] = th; pPhi[i] = ph
      pBuf[i*3]   = ri * Math.sin(ph) * Math.cos(th)
      pBuf[i*3+1] = ri * Math.sin(ph) * Math.sin(th)
      pBuf[i*3+2] = ri * Math.cos(ph)
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pBuf, 3))
    const pMat = new THREE.PointsMaterial({
      color: mainColor,
      size: dpr >= 1.5 ? 0.09 : 0.07,
      map: spriteTexture,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
    const particles = new THREE.Points(pGeo, pMat)
    scene.add(particles)

    // ── Deep nebula particles (far, very faint) ────────────────────────────
    const nebCount = 200
    const nebGeo   = new THREE.BufferGeometry()
    const nebBuf   = new Float32Array(nebCount * 3)
    for (let i = 0; i < nebCount; i++) {
      const ri = 18 + Math.random() * 15
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      nebBuf[i*3]   = ri * Math.sin(ph) * Math.cos(th)
      nebBuf[i*3+1] = ri * Math.sin(ph) * Math.sin(th)
      nebBuf[i*3+2] = ri * Math.cos(ph)
    }
    nebGeo.setAttribute('position', new THREE.BufferAttribute(nebBuf, 3))
    const nebMat = new THREE.PointsMaterial({
      color: mainColor, size: 0.15, map: spriteTexture,
      transparent:true, opacity:0.18, blending:THREE.AdditiveBlending,
      depthWrite:false, sizeAttenuation:true,
    })
    const nebula = new THREE.Points(nebGeo, nebMat)
    scene.add(nebula)

    // ── Lights ────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight('#ffffff', 0.25))
    const light1 = new THREE.PointLight(colorHex, 4, 22)
    light1.position.set(0, 0, 4)
    scene.add(light1)
    const light2 = new THREE.PointLight(colorHex, 1.8, 16)
    light2.position.set(3, 4, -5)
    scene.add(light2)
    const light3 = new THREE.PointLight('#ffffff', 0.4, 12)
    light3.position.set(-4, -3, 3)
    scene.add(light3)

    let dataArray: Uint8Array<ArrayBuffer> | null = null

    // ── Animation ─────────────────────────────────────────────────────────
    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      timeRef.current += 0.007
      const t = timeRef.current
      const playing = isPlayingRef.current

      let rms = 0
      let tdData: Uint8Array<ArrayBuffer> | null = null

      if (analyserRef.current) {
        if (!dataArray) dataArray = new Uint8Array(analyserRef.current.frequencyBinCount) as Uint8Array<ArrayBuffer>
        if (playing) {
          analyserRef.current.getByteFrequencyData(dataArray)
          const td = new Uint8Array(analyserRef.current.fftSize) as Uint8Array<ArrayBuffer>
          analyserRef.current.getByteTimeDomainData(td)
          tdData = td
          let sum = 0
          for (let i = 0; i < td.length; i++) { const v = (td[i]-128)/128; sum += v*v }
          rms = Math.sqrt(sum / td.length)
        }
      }

      // ── Lissajous main ──────────────────────────────────────────────────
      const phase = t * phaseSpeed
      const scale = 2.6 * (1 + rms * 2.0)

      computeLissajous(lissBuf, N, a, b, c, loops, phase, scale)
      lissAttr.needsUpdate = true

      // Glow layers (scaled out)
      glowLayers.forEach(({ buf, attr, scale:s }) => {
        computeLissajous(buf, N, a, b, c, loops, phase, scale * s)
        attr.needsUpdate = true
      })

      // Chromatic aberration (slight X offset)
      chromaLayers.forEach(({ buf, attr, offset }) => {
        computeLissajous(buf, N, a, b, c, loops, phase, scale)
        // Shift X channel
        for (let i = 0; i < N; i++) { buf[i*3] += offset }
        attr.needsUpdate = true
      })

      // Rotation
      const rotY = t * 0.075, rotX = Math.sin(t * 0.048) * 0.16
      lissLine.rotation.y = rotY; lissLine.rotation.x = rotX
      glowLayers.forEach(({ line }) => { line.rotation.y = rotY; line.rotation.x = rotX })
      chromaLayers.forEach(({ line }) => { line.rotation.y = rotY; line.rotation.x = rotX })

      // ── Audio waveform ring ─────────────────────────────────────────────
      const wAttr  = waveLine.geometry.getAttribute('position') as THREE.BufferAttribute
      const pAttr2 = pulseLine.geometry.getAttribute('position') as THREE.BufferAttribute
      const waveR  = 5.0
      const outerR = 6.2

      if (tdData) {
        for (let i = 0; i < waveN; i++) {
          const angle = (i / waveN) * Math.PI * 2
          const idx   = Math.floor(i * tdData.length / waveN)
          const amp   = ((tdData[idx] - 128) / 128) * 0.95
          wAttr.setXYZ(i, Math.cos(angle)*(waveR+amp), Math.sin(angle)*(waveR+amp), 0)
          // Outer pulse ring
          const amp2 = ((tdData[(idx+32) % tdData.length] - 128) / 128) * 0.5
          pAttr2.setXYZ(i, Math.cos(angle)*(outerR+amp2), Math.sin(angle)*(outerR+amp2), 0)
        }
        waveMat.opacity  = 0.55 + rms * 0.4
        pulseMat.opacity = 0.12 + rms * 0.3
      } else {
        for (let i = 0; i < waveN; i++) {
          const angle = (i / waveN) * Math.PI * 2
          const idle  = Math.sin(angle * a + t * 1.05) * 0.055
          wAttr.setXYZ(i, Math.cos(angle)*(waveR+idle), Math.sin(angle)*(waveR+idle), 0)
          const idle2 = Math.sin(angle * b + t * 0.7) * 0.03
          pAttr2.setXYZ(i, Math.cos(angle)*(outerR+idle2), Math.sin(angle)*(outerR+idle2), 0)
        }
        waveMat.opacity  = 0.45
        pulseMat.opacity = 0.10
      }
      wAttr.needsUpdate  = true
      pAttr2.needsUpdate = true

      waveLine.rotation.z  = t * 0.025
      waveLine.rotation.y  = Math.sin(t * 0.045) * 0.12
      pulseLine.rotation.z = -t * 0.018
      pulseLine.rotation.y = Math.sin(t * 0.038) * 0.08

      // ── Particles ──────────────────────────────────────────────────────
      particles.rotation.y = t * 0.009
      particles.rotation.x = t * 0.005
      nebula.rotation.y    = -t * 0.004
      nebula.rotation.x    = t * 0.003

      if (playing && rms > 0.03) {
        const pA    = particles.geometry.getAttribute('position') as THREE.BufferAttribute
        const pArr  = pA.array as Float32Array
        const boost = 1 + rms * 0.55
        for (let i = 0; i < pCount; i++) {
          const ri = pBaseR[i] * boost
          pArr[i*3]   = ri * Math.sin(pPhi[i]) * Math.cos(pTheta[i])
          pArr[i*3+1] = ri * Math.sin(pPhi[i]) * Math.sin(pTheta[i])
          pArr[i*3+2] = ri * Math.cos(pPhi[i])
        }
        pA.needsUpdate = true
        pMat.opacity = Math.min(0.75, 0.55 + rms * 0.5)
      } else {
        pMat.opacity = 0.45 + Math.sin(t * 0.8) * 0.08
      }

      // ── Light pulse ────────────────────────────────────────────────────
      light1.intensity = 4 + rms * 7
      light2.intensity = 1.8 + rms * 2

      // ── Camera orbit ──────────────────────────────────────────────────
      camera.position.x = Math.sin(t * 0.028) * 1.0
      camera.position.y = Math.sin(t * 0.019) * 0.6
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }

    animate()

    // ── Resize ────────────────────────────────────────────────────────────
    function onResize() {
      const nw = mount.clientWidth, nh = mount.clientHeight
      camera.aspect = nw / nh
      camera.fov = nw / nh < 0.8 ? 60 : nw / nh < 1.2 ? 54 : 50
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(frameRef.current)
      lissGeo.dispose(); lissMat.dispose()
      glowLayers.forEach(({ geo, mat }) => { geo.dispose(); mat.dispose() })
      chromaLayers.forEach(({ geo, mat }) => { geo.dispose(); mat.dispose() })
      waveGeo.dispose(); waveMat.dispose()
      pulseGeo.dispose(); pulseMat.dispose()
      pGeo.dispose(); pMat.dispose()
      nebGeo.dispose(); nebMat.dispose()
      spriteTexture.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hz, colorHex])

  // ── Pointer events ────────────────────────────────────────────────────────
  function onPointerDown(e: React.PointerEvent) {
    if (!focusMode) return
    dragRef.current = { active:true, lastX:e.clientX, lastY:e.clientY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!focusMode || !dragRef.current.active) return
    const dx = e.clientX - dragRef.current.lastX
    const dy = e.clientY - dragRef.current.lastY
    dragRef.current.lastX = e.clientX; dragRef.current.lastY = e.clientY
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
        width: '100%', height: '100%', display: 'block',
        background: '#05050c',
        cursor: focusMode ? 'ew-resize' : 'default',
        touchAction: focusMode ? 'none' : 'auto',
      }}
    />
  )
}
