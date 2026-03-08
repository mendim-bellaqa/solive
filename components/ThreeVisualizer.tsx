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
  vizMode?: 'lissajous' | 'waveform'
}

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
    buf[i*3]   = Math.sin(a*t + phase)     * scale
    buf[i*3+1] = Math.sin(b*t)             * scale
    buf[i*3+2] = Math.sin(c*t + phase*0.4) * scale * 0.6
  }
}

function parseHex(hex:string): [number,number,number] {
  const c = hex.replace('#','')
  return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)]
}

function hexA(hex:string, alpha:number): string {
  const [r,g,b] = parseHex(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

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

function drawOscilloscope(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number,
  tdData: Uint8Array<ArrayBuffer> | null,
  colorHex: string,
  hz: number,
  t: number,
  alpha: number,
) {
  ctx.clearRect(0, 0, cw, ch)
  if (alpha < 0.01) return

  ctx.globalAlpha = alpha

  // Background
  ctx.fillStyle = '#05050c'
  ctx.fillRect(0, 0, cw, ch)

  // Grid
  ctx.strokeStyle = hexA('#ffffff', 0.04)
  ctx.lineWidth = 1
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(0, (i/4)*ch); ctx.lineTo(cw, (i/4)*ch); ctx.stroke()
  }
  for (let i = 1; i < 8; i++) {
    ctx.beginPath(); ctx.moveTo((i/8)*cw, 0); ctx.lineTo((i/8)*cw, ch); ctx.stroke()
  }

  // Center line
  ctx.strokeStyle = hexA('#ffffff', 0.1)
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, ch/2); ctx.lineTo(cw, ch/2); ctx.stroke()

  // Label
  ctx.fillStyle = hexA(colorHex, 0.4)
  ctx.font = '12px ui-monospace, monospace'
  ctx.fillText(`${hz} Hz  ·  Oscilloscope`, 14, ch - 14)

  const waveAmp = ch * 0.4
  const drawPath = (opacity: number, lineWidth: number, dataFn: (i: number) => number) => {
    ctx.strokeStyle = hexA(colorHex, opacity)
    ctx.lineWidth = lineWidth
    ctx.lineJoin = 'round'
    ctx.beginPath()
    for (let i = 0; i <= cw; i++) {
      const y = ch/2 + dataFn(i) * waveAmp
      if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y)
    }
    ctx.stroke()
  }

  if (tdData && tdData.length > 0) {
    const fn = (i: number) => (tdData[Math.floor(i / cw * tdData.length)] - 128) / 128
    drawPath(0.07, 8,   fn)
    drawPath(0.22, 3.5, fn)
    drawPath(0.9,  1.5, fn)
  } else {
    const cycles = hz > 600 ? 6 : hz > 400 ? 5 : hz > 200 ? 4 : 3
    const fn = (i: number) =>
      Math.sin((i/cw) * Math.PI * 2 * cycles + t * 1.4) * 0.72 +
      Math.sin((i/cw) * Math.PI * 2 * cycles * 2 + t * 0.9) * 0.07
    drawPath(0.07, 8,   fn)
    drawPath(0.22, 3.5, fn)
    drawPath(0.85, 1.5, fn)
  }

  ctx.globalAlpha = 1
}

export default function ThreeVisualizer({ hz, isPlaying, analyserRef, colorHex, focusMode, onDrag, vizMode = 'lissajous' }: Props) {
  const mountRef      = useRef<HTMLDivElement>(null)
  const waveCanvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef      = useRef<number>(0)
  const timeRef       = useRef<number>(0)
  const isPlayingRef  = useRef<boolean>(isPlaying)
  const vizModeRef    = useRef<'lissajous' | 'waveform'>(vizMode)
  const dragRef       = useRef<{ active:boolean; lastX:number; lastY:number }>({ active:false, lastX:0, lastY:0 })

  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { vizModeRef.current = vizMode }, [vizMode])

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

    // ── Waveform canvas setup ──────────────────────────────────────────────
    const wc = waveCanvasRef.current
    let waveCtx: CanvasRenderingContext2D | null = null
    if (wc) {
      wc.width  = Math.round(w * dpr)
      wc.height = Math.round(h * dpr)
      waveCtx = wc.getContext('2d')
      if (waveCtx) waveCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#05050c')
    scene.fog = new THREE.FogExp2('#05050c', 0.018)

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
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    renderer.domElement.style.transition = 'opacity 0.05s linear'
    mount.appendChild(renderer.domElement)

    const mainColor = new THREE.Color(colorHex)
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

    // ── Glow layers ────────────────────────────────────────────────────────
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

    // ── Chromatic aberration ───────────────────────────────────────────────
    const chromaOffset = 0.055
    const chromaColors = [
      new THREE.Color(`rgb(${r}, 20, 20)`),
      new THREE.Color(`rgb(20, ${g}, 20)`),
      new THREE.Color(`rgb(20, 20, ${bl})`),
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
      const offset = (i - 1) * chromaOffset
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

    // ── Particles ─────────────────────────────────────────────────────────
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
      color: mainColor, size: dpr >= 1.5 ? 0.09 : 0.07, map: spriteTexture,
      transparent:true, opacity:0.55, blending:THREE.AdditiveBlending,
      depthWrite:false, sizeAttenuation:true,
    })
    const particles = new THREE.Points(pGeo, pMat)
    scene.add(particles)

    // ── Nebula ────────────────────────────────────────────────────────────
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
    light1.position.set(0, 0, 4); scene.add(light1)
    const light2 = new THREE.PointLight(colorHex, 1.8, 16)
    light2.position.set(3, 4, -5); scene.add(light2)
    const light3 = new THREE.PointLight('#ffffff', 0.4, 12)
    light3.position.set(-4, -3, 3); scene.add(light3)

    let dataArray: Uint8Array<ArrayBuffer> | null = null
    let lissAlpha = vizModeRef.current === 'lissajous' ? 1 : 0

    // ── Animation loop ────────────────────────────────────────────────────
    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      timeRef.current += 0.007
      const t = timeRef.current
      const playing = isPlayingRef.current

      // Smooth blend toward target mode
      const targetAlpha = vizModeRef.current === 'lissajous' ? 1 : 0
      lissAlpha += (targetAlpha - lissAlpha) * 0.055
      const cL = Math.max(0, Math.min(1, lissAlpha))

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

      // ── Lissajous 3D ──────────────────────────────────────────────────
      renderer.domElement.style.opacity = String(cL)

      if (cL > 0.01) {
        const phase = t * phaseSpeed
        const scale = 2.6 * (1 + rms * 2.0)

        computeLissajous(lissBuf, N, a, b, c, loops, phase, scale)
        lissAttr.needsUpdate = true

        glowLayers.forEach(({ buf, attr, scale:s }) => {
          computeLissajous(buf, N, a, b, c, loops, phase, scale * s)
          attr.needsUpdate = true
        })
        chromaLayers.forEach(({ buf, attr, offset }) => {
          computeLissajous(buf, N, a, b, c, loops, phase, scale)
          for (let i = 0; i < N; i++) { buf[i*3] += offset }
          attr.needsUpdate = true
        })

        const rotY = t * 0.075, rotX = Math.sin(t * 0.048) * 0.16
        lissLine.rotation.y = rotY; lissLine.rotation.x = rotX
        glowLayers.forEach(({ line }) => { line.rotation.y = rotY; line.rotation.x = rotX })
        chromaLayers.forEach(({ line }) => { line.rotation.y = rotY; line.rotation.x = rotX })

        const wAttr  = waveLine.geometry.getAttribute('position') as THREE.BufferAttribute
        const pAttr2 = pulseLine.geometry.getAttribute('position') as THREE.BufferAttribute
        const waveR = 5.0, outerR = 6.2

        if (tdData) {
          for (let i = 0; i < waveN; i++) {
            const angle = (i / waveN) * Math.PI * 2
            const idx   = Math.floor(i * tdData.length / waveN)
            const amp   = ((tdData[idx] - 128) / 128) * 0.95
            wAttr.setXYZ(i, Math.cos(angle)*(waveR+amp), Math.sin(angle)*(waveR+amp), 0)
            const amp2 = ((tdData[(idx+32) % tdData.length] - 128) / 128) * 0.5
            pAttr2.setXYZ(i, Math.cos(angle)*(outerR+amp2), Math.sin(angle)*(outerR+amp2), 0)
          }
          waveMat.opacity  = 0.55 + rms * 0.4
          pulseMat.opacity = 0.12 + rms * 0.3
        } else {
          for (let i = 0; i < waveN; i++) {
            const angle = (i / waveN) * Math.PI * 2
            wAttr.setXYZ(i, Math.cos(angle)*(waveR + Math.sin(angle*a+t*1.05)*0.055), Math.sin(angle)*(waveR + Math.sin(angle*a+t*1.05)*0.055), 0)
            pAttr2.setXYZ(i, Math.cos(angle)*(outerR + Math.sin(angle*b+t*0.7)*0.03), Math.sin(angle)*(outerR + Math.sin(angle*b+t*0.7)*0.03), 0)
          }
          waveMat.opacity = 0.45; pulseMat.opacity = 0.10
        }
        wAttr.needsUpdate = true; pAttr2.needsUpdate = true
        waveLine.rotation.z  = t * 0.025; waveLine.rotation.y  = Math.sin(t * 0.045) * 0.12
        pulseLine.rotation.z = -t * 0.018; pulseLine.rotation.y = Math.sin(t * 0.038) * 0.08

        particles.rotation.y = t * 0.009; particles.rotation.x = t * 0.005
        nebula.rotation.y = -t * 0.004;   nebula.rotation.x = t * 0.003

        if (playing && rms > 0.03) {
          const pA   = particles.geometry.getAttribute('position') as THREE.BufferAttribute
          const pArr = pA.array as Float32Array
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

        light1.intensity = 4 + rms * 7
        light2.intensity = 1.8 + rms * 2
        camera.position.x = Math.sin(t * 0.028) * 1.0
        camera.position.y = Math.sin(t * 0.019) * 0.6
        camera.lookAt(0, 0, 0)
        renderer.render(scene, camera)
      }

      // ── Oscilloscope 2D ───────────────────────────────────────────────
      if (waveCtx && wc) {
        const cssW = wc.width / dpr
        const cssH = wc.height / dpr
        drawOscilloscope(waveCtx, cssW, cssH, tdData, colorHex, hz, t, 1 - cL)
      }
    }

    animate()

    // ── Resize ────────────────────────────────────────────────────────────
    function onResize() {
      const nw = mount.clientWidth, nh = mount.clientHeight
      camera.aspect = nw / nh
      camera.fov = nw / nh < 0.8 ? 60 : nw / nh < 1.2 ? 54 : 50
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
      if (wc && waveCtx) {
        wc.width  = Math.round(nw * dpr)
        wc.height = Math.round(nh * dpr)
        waveCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
    }
    window.addEventListener('resize', onResize)

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
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={waveCanvasRef}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          display: 'block',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
    </div>
  )
}
