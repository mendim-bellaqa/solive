'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { freqToColor, freqToSlider, sliderToFreq } from '@/lib/frequencies'

interface ThreeVisualizerProps {
  analyserRef: React.MutableRefObject<AnalyserNode | null>
  isPlaying: boolean
  frequency: number
  volume: number
  is8D: boolean
  rotationAngleRef: React.MutableRefObject<number>
  onFrequencyChange: (freq: number) => void
  onVolumeChange: (vol: number) => void
}

interface Ripple {
  mesh: THREE.Mesh
  t: number
}

export default function ThreeVisualizer({
  analyserRef,
  isPlaying,
  frequency,
  volume,
  is8D,
  rotationAngleRef,
  onFrequencyChange,
  onVolumeChange,
}: ThreeVisualizerProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number>(0)

  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = useCallback(() => {
    const el = mountRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Keep latest prop values accessible inside the animation loop without re-mounting
  const freqRef = useRef(frequency)
  const volRef = useRef(volume)
  const isPlayingRef = useRef(isPlaying)
  const is8DRef = useRef(is8D)
  const onFreqRef = useRef(onFrequencyChange)
  const onVolRef = useRef(onVolumeChange)

  useEffect(() => { freqRef.current = frequency }, [frequency])
  useEffect(() => { volRef.current = volume }, [volume])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { is8DRef.current = is8D }, [is8D])
  useEffect(() => { onFreqRef.current = onFrequencyChange }, [onFrequencyChange])
  useEffect(() => { onVolRef.current = onVolumeChange }, [onVolumeChange])

  useEffect(() => {
    if (!mountRef.current) return
    const container = mountRef.current
    let W = container.clientWidth
    let H = container.clientHeight

    // ─── Scene ────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x05050f)

    // ─── Camera ───────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000)
    camera.position.set(0, 0, 11)

    // ─── Renderer ─────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // ─── Nebula background spheres ────────────────────────────
    const nebulaData = [
      { color: 0x1a0040, r: 6, pos: [-4, 2, -5] },
      { color: 0x001a40, r: 5, pos: [5, -2, -6] },
      { color: 0x001010, r: 7, pos: [0, 0, -8] },
    ]
    nebulaData.forEach(({ color, r, pos }) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 16),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, side: THREE.BackSide })
      )
      mesh.position.set(pos[0], pos[1], pos[2])
      scene.add(mesh)
    })

    // ─── Waveform ring ────────────────────────────────────────
    const WAVE_SEGS = 256
    const wavePositions = new Float32Array(WAVE_SEGS * 3)
    const waveGeo = new THREE.BufferGeometry()
    waveGeo.setAttribute('position', new THREE.BufferAttribute(wavePositions, 3))
    const waveMat = new THREE.LineBasicMaterial({ color: 0x00d4ff, linewidth: 2 })
    const waveRing = new THREE.LineLoop(waveGeo, waveMat)
    scene.add(waveRing)

    // ─── Second ghost ring ────────────────────────────────────
    const ghostPositions = new Float32Array(WAVE_SEGS * 3)
    const ghostGeo = new THREE.BufferGeometry()
    ghostGeo.setAttribute('position', new THREE.BufferAttribute(ghostPositions, 3))
    const ghostMat = new THREE.LineBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.3 })
    const ghostRing = new THREE.LineLoop(ghostGeo, ghostMat)
    scene.add(ghostRing)

    // ─── Frequency bars ───────────────────────────────────────
    const NUM_BARS = 80
    const BAR_RADIUS = 4.7
    const bars: THREE.Mesh[] = []
    const barMats: THREE.MeshBasicMaterial[] = []
    for (let i = 0; i < NUM_BARS; i++) {
      const angle = (i / NUM_BARS) * Math.PI * 2
      const geo = new THREE.BoxGeometry(0.055, 0.4, 0.02)
      const mat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.5 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(Math.cos(angle) * BAR_RADIUS, Math.sin(angle) * BAR_RADIUS, 0)
      mesh.rotation.z = angle + Math.PI / 2
      scene.add(mesh)
      bars.push(mesh)
      barMats.push(mat)
    }

    // ─── Decorative orbit rings ───────────────────────────────
    const orbitTori: THREE.Mesh[] = []
    const orbitData = [
      { r: 4.2, tube: 0.012, color: 0x8b5cf6, opacity: 0.35 },
      { r: 5.2, tube: 0.008, color: 0x00d4ff, opacity: 0.18 },
    ]
    orbitData.forEach(({ r, tube, color, opacity }) => {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(r, tube, 8, 128),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
      )
      scene.add(mesh)
      orbitTori.push(mesh)
    })

    // ─── Central sphere (multi-layer glow) ────────────────────
    const sphereLayers: THREE.Mesh[] = []
    const sphereData = [
      { r: 0.55, opacity: 1.0 },
      { r: 0.75, opacity: 0.25 },
      { r: 1.0, opacity: 0.1 },
    ]
    sphereData.forEach(({ r, opacity }) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(r, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity })
      )
      scene.add(mesh)
      sphereLayers.push(mesh)
    })

    // ─── Particle system ──────────────────────────────────────
    const PARTICLE_COUNT = 700
    const pInitPos = new Float32Array(PARTICLE_COUNT * 3)   // home positions
    const pCurrPos = new Float32Array(PARTICLE_COUNT * 3)   // current positions
    const pVel = new Float32Array(PARTICLE_COUNT * 3)       // velocities
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 5.5 + Math.random() * 4.5
      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = (Math.random() - 0.5) * 1.5
      pInitPos[i * 3] = x; pInitPos[i * 3 + 1] = y; pInitPos[i * 3 + 2] = z
      pCurrPos[i * 3] = x; pCurrPos[i * 3 + 1] = y; pCurrPos[i * 3 + 2] = z
    }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(pCurrPos, 3))
    const pMat = new THREE.PointsMaterial({ color: 0x8b5cf6, size: 0.055, transparent: true, opacity: 0.7 })
    const particles = new THREE.Points(pGeo, pMat)
    scene.add(particles)

    // ─── 8D sound dot ─────────────────────────────────────────
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xec4899 })
    const soundDot = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), dotMat)
    scene.add(soundDot)

    // ─── Mouse indicator sphere ───────────────────────────────
    const mouseIndicatorMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
    const mouseIndicator = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), mouseIndicatorMat)
    scene.add(mouseIndicator)

    // ─── Ripples ──────────────────────────────────────────────
    const ripples: Ripple[] = []

    // ─── Audio buffers ────────────────────────────────────────
    let timeDomainBuf: Uint8Array<ArrayBuffer> | null = null
    let freqDomainBuf: Uint8Array<ArrayBuffer> | null = null

    // ─── Mouse state ──────────────────────────────────────────
    const mouseWorld = new THREE.Vector3()
    const raycaster = new THREE.Raycaster()
    const mouse2D = new THREE.Vector2()
    const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    let isDragging = false
    let dragStartX = 0
    let dragStartY = 0
    let dragStartFreq = freqRef.current
    let dragStartVol = volRef.current
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let lastInteractionHint = ''

    const updateMouseWorld = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect()
      mouse2D.x = ((clientX - rect.left) / rect.width) * 2 - 1
      mouse2D.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse2D, camera)
      raycaster.ray.intersectPlane(interactionPlane, mouseWorld)
    }

    // Mouse move: particle repulsion + indicator
    const onMouseMove = (e: MouseEvent) => {
      updateMouseWorld(e.clientX, e.clientY)
      mouseIndicatorMat.opacity = 0.35

      if (isDragging) {
        container.style.cursor = 'grabbing'
        const dx = e.clientX - dragStartX
        const dy = e.clientY - dragStartY

        // Horizontal drag → frequency
        const startSlider = freqToSlider(dragStartFreq)
        const newSlider = Math.max(0, Math.min(1000, startSlider + dx * 1.2))
        const newFreq = sliderToFreq(Math.round(newSlider))
        freqRef.current = newFreq
        onFreqRef.current(newFreq)

        // Vertical drag → volume (drag up = louder)
        if (Math.abs(dy) > 3) {
          const rect = container.getBoundingClientRect()
          const newVol = Math.max(0, Math.min(1, dragStartVol - dy / rect.height * 2))
          volRef.current = newVol
          onVolRef.current(parseFloat(newVol.toFixed(2)))
        }

        lastInteractionHint = `${freqRef.current} Hz`
      } else {
        container.style.cursor = 'grab'
      }
    }

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      isDragging = true
      dragStartX = e.clientX
      dragStartY = e.clientY
      dragStartFreq = freqRef.current
      dragStartVol = volRef.current
      container.style.cursor = 'grabbing'
    }

    const onMouseUp = () => {
      isDragging = false
      container.style.cursor = 'grab'
      lastInteractionHint = ''
    }

    // Scroll: change frequency
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const step = e.deltaY > 0 ? -6 : 6
      const currentSlider = freqToSlider(freqRef.current)
      const newSlider = Math.max(0, Math.min(1000, currentSlider + step))
      const newFreq = sliderToFreq(newSlider)
      freqRef.current = newFreq
      onFreqRef.current(newFreq)
      lastInteractionHint = `${newFreq} Hz`
    }

    // Double click: burst ripple + particle explosion
    const onDblClick = (e: MouseEvent) => {
      updateMouseWorld(e.clientX, e.clientY)

      // Create ripples
      for (let i = 0; i < 3; i++) {
        const rGeo = new THREE.RingGeometry(0.1, 0.18, 64)
        const rMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(freqToColor(freqRef.current)),
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
        })
        const rMesh = new THREE.Mesh(rGeo, rMat)
        rMesh.position.copy(mouseWorld)
        rMesh.scale.setScalar(1 + i * 0.3)
        scene.add(rMesh)
        ripples.push({ mesh: rMesh, t: i * 0.15 })
      }

      // Explode particles outward
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3
        const dx = pCurrPos[ix] - mouseWorld.x
        const dy = pCurrPos[ix + 1] - mouseWorld.y
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.1
        const force = Math.max(0, (6 - dist) / 6) * 0.4
        pVel[ix] += (dx / dist) * force
        pVel[ix + 1] += (dy / dist) * force
      }
    }

    // Click: single ripple
    const onClick = (e: MouseEvent) => {
      if (Math.abs(e.clientX - dragStartX) > 4 || Math.abs(e.clientY - dragStartY) > 4) return
      updateMouseWorld(e.clientX, e.clientY)
      const rGeo = new THREE.RingGeometry(0.1, 0.16, 64)
      const rMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(freqToColor(freqRef.current)),
        transparent: true, opacity: 0.8, side: THREE.DoubleSide,
      })
      const rMesh = new THREE.Mesh(rGeo, rMat)
      rMesh.position.copy(mouseWorld)
      scene.add(rMesh)
      ripples.push({ mesh: rMesh, t: 0 })
    }

    // Mouse leave
    const onMouseLeave = () => {
      mouseIndicatorMat.opacity = 0
      isDragging = false
      container.style.cursor = 'default'
    }

    container.addEventListener('mousemove', onMouseMove)
    container.addEventListener('mousedown', onMouseDown)
    container.addEventListener('mouseup', onMouseUp)
    container.addEventListener('wheel', onWheel, { passive: false })
    container.addEventListener('dblclick', onDblClick)
    container.addEventListener('click', onClick)
    container.addEventListener('mouseleave', onMouseLeave)
    container.style.cursor = 'grab'

    // ─── Animation loop ───────────────────────────────────────
    let t = 0
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      t += 0.008

      const analyser = analyserRef.current
      const playing = isPlayingRef.current
      const freq = freqRef.current
      const color = new THREE.Color(freqToColor(freq))

      // Sync material colors
      waveMat.color = color
      sphereLayers.forEach((s) => {
        ;(s.material as THREE.MeshBasicMaterial).color.copy(color)
      })

      // ── Audio-driven updates ────────────────────────────────
      let audioEnergy = 0

      if (analyser && playing) {
        if (!timeDomainBuf || timeDomainBuf.length !== analyser.fftSize) {
          timeDomainBuf = new Uint8Array(analyser.fftSize) as Uint8Array<ArrayBuffer>
          freqDomainBuf = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>
        }
        analyser.getByteTimeDomainData(timeDomainBuf)
        analyser.getByteFrequencyData(freqDomainBuf!)

        // Energy (RMS)
        audioEnergy = timeDomainBuf.reduce((s, v) => s + Math.abs(v - 128), 0) / timeDomainBuf.length / 128

        // Waveform ring
        const wPos = waveGeo.attributes.position as THREE.BufferAttribute
        const gPos = ghostGeo.attributes.position as THREE.BufferAttribute
        const count = Math.min(WAVE_SEGS, timeDomainBuf.length)
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2
          const amp = (timeDomainBuf[i] / 128.0 - 1.0) * 1.5
          const r = 3 + amp
          const rg = 3.4 + amp * 0.6
          wPos.setXYZ(i, Math.cos(angle) * r, Math.sin(angle) * r, 0)
          gPos.setXYZ(i, Math.cos(angle) * rg, Math.sin(angle) * rg, Math.sin(angle * 2 + t) * 0.1)
        }
        wPos.needsUpdate = true
        gPos.needsUpdate = true

        // Frequency bars
        freqDomainBuf!.forEach((val, _i) => {
          if (_i >= bars.length) return
          const v = val / 255
          bars[_i].scale.y = 0.4 + v * 5
          barMats[_i].opacity = 0.15 + v * 0.85
          const h = 0.55 - v * 0.45
          barMats[_i].color.setHSL(h, 1, 0.55)
        })

        // Central sphere pulse
        const scale = 1 + audioEnergy * 2
        sphereLayers[0].scale.setScalar(scale)
        sphereLayers[1].scale.setScalar(scale * 1.15)
        sphereLayers[2].scale.setScalar(scale * 1.45)

      } else {
        // Idle: gentle sine animation
        const wPos = waveGeo.attributes.position as THREE.BufferAttribute
        const gPos = ghostGeo.attributes.position as THREE.BufferAttribute
        for (let i = 0; i < WAVE_SEGS; i++) {
          const angle = (i / WAVE_SEGS) * Math.PI * 2
          const amp = Math.sin(angle * 4 + t * 2) * 0.12
          const r = 3 + amp
          wPos.setXYZ(i, Math.cos(angle) * r, Math.sin(angle) * r, 0)
          gPos.setXYZ(i, Math.cos(angle) * 3.4, Math.sin(angle) * 3.4, Math.sin(angle * 2 + t) * 0.05)
        }
        wPos.needsUpdate = true
        gPos.needsUpdate = true

        // Idle sphere pulse
        const idleScale = 1 + Math.sin(t * 2) * 0.06
        sphereLayers[0].scale.setScalar(idleScale)
        sphereLayers[1].scale.setScalar(idleScale * 1.15)
        sphereLayers[2].scale.setScalar(idleScale * 1.45)

        // Idle bars
        bars.forEach((bar, _i) => {
          const angle = (_i / bars.length) * Math.PI * 2
          const v = (Math.sin(angle * 3 + t * 1.5) + 1) / 2 * 0.2
          bar.scale.y = 0.2 + v
          barMats[_i].opacity = 0.1 + v * 0.5
          barMats[_i].color.setHSL(0.55, 1, 0.5)
        })
      }

      // ── Particles with velocity + mouse repulsion ───────────
      const mouseX = mouseWorld.x
      const mouseY = mouseWorld.y
      const pPos = pGeo.attributes.position as THREE.BufferAttribute

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3, iy = ix + 1, iz = ix + 2

        // Return to home position (spring)
        pVel[ix] += (pInitPos[ix] - pCurrPos[ix]) * 0.006
        pVel[iy] += (pInitPos[iy] - pCurrPos[iy]) * 0.006
        pVel[iz] += (pInitPos[iz] - pCurrPos[iz]) * 0.006

        // Mouse repulsion
        const mdx = pCurrPos[ix] - mouseX
        const mdy = pCurrPos[iy] - mouseY
        const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy)
        if (mouseDist < 2.5 && mouseDist > 0.01) {
          const force = ((2.5 - mouseDist) / 2.5) * 0.06
          pVel[ix] += (mdx / mouseDist) * force
          pVel[iy] += (mdy / mouseDist) * force
        }

        // Audio energy burst
        if (audioEnergy > 0.3) {
          const nx = pInitPos[ix], ny = pInitPos[iy]
          const nd = Math.sqrt(nx * nx + ny * ny) + 0.01
          pVel[ix] += (nx / nd) * audioEnergy * 0.02
          pVel[iy] += (ny / nd) * audioEnergy * 0.02
        }

        // Damping
        pVel[ix] *= 0.92
        pVel[iy] *= 0.92
        pVel[iz] *= 0.94

        pCurrPos[ix] += pVel[ix]
        pCurrPos[iy] += pVel[iy]
        pCurrPos[iz] += pVel[iz]

        pPos.setXYZ(i, pCurrPos[ix], pCurrPos[iy], pCurrPos[iz])
      }
      pPos.needsUpdate = true

      // ── Ripples ─────────────────────────────────────────────
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]
        r.t += 0.018
        r.mesh.scale.setScalar(1 + r.t * 8)
        ;(r.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - r.t)
        if (r.t >= 1) {
          scene.remove(r.mesh)
          ripples.splice(i, 1)
        }
      }

      // ── Orbit rings ─────────────────────────────────────────
      orbitTori[0].rotation.z = t * 0.25
      orbitTori[0].rotation.x = Math.sin(t * 0.1) * 0.3
      orbitTori[1].rotation.z = -t * 0.15
      orbitTori[1].rotation.y = t * 0.08

      // ── 8D dot ──────────────────────────────────────────────
      if (is8DRef.current) {
        const a = rotationAngleRef.current
        soundDot.position.set(Math.sin(a) * 4, Math.cos(a) * 1.5, Math.cos(a) * 2)
        soundDot.visible = true
        // Trail ring at dot position
        ;(orbitTori[0].material as THREE.MeshBasicMaterial).color.setHex(0xec4899)
      } else {
        soundDot.visible = false
        ;(orbitTori[0].material as THREE.MeshBasicMaterial).color.setHex(0x8b5cf6)
      }

      // ── Mouse indicator ──────────────────────────────────────
      mouseIndicator.position.copy(mouseWorld)
      ;(mouseIndicatorMat).color.copy(color)

      // ── Slow camera drift ────────────────────────────────────
      camera.position.x = Math.sin(t * 0.12) * 0.5
      camera.position.y = Math.cos(t * 0.09) * 0.3
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }
    animate()

    // ─── Resize ────────────────────────────────────────────────
    const onResize = () => {
      W = container.clientWidth
      H = container.clientHeight
      camera.aspect = W / H
      camera.updateProjectionMatrix()
      renderer.setSize(W, H)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('mousedown', onMouseDown)
      container.removeEventListener('mouseup', onMouseUp)
      container.removeEventListener('wheel', onWheel)
      container.removeEventListener('dblclick', onDblClick)
      container.removeEventListener('click', onClick)
      container.removeEventListener('mouseleave', onMouseLeave)
      cancelAnimationFrame(frameRef.current)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
        background: '#05050f',
      }}
    >
      {/* Fullscreen button */}
      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 50,
          width: 36,
          height: 36,
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(5, 5, 20, 0.7)',
          backdropFilter: 'blur(8px)',
          color: 'rgba(255,255,255,0.7)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          transition: 'all 0.2s',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0,212,255,0.5)'
          e.currentTarget.style.color = '#00d4ff'
          e.currentTarget.style.boxShadow = '0 0 12px rgba(0,212,255,0.3)'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
          e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        {isFullscreen ? '⛶' : '⛶'}
        <span style={{ fontSize: 13 }}>{isFullscreen ? '✕' : '⤢'}</span>
      </button>

      {/* Fullscreen frequency display (only visible in fullscreen) */}
      {isFullscreen && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          padding: '6px 20px',
          background: 'rgba(5,5,20,0.7)',
          backdropFilter: 'blur(8px)',
          borderRadius: 30,
          border: '1px solid rgba(0,212,255,0.2)',
          color: '#00d4ff',
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 1,
          pointerEvents: 'none',
        }}>
          {frequency} Hz
        </div>
      )}

      {/* Interaction hints overlay */}
      <div style={{
        position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 10, pointerEvents: 'none', flexWrap: 'wrap', justifyContent: 'center',
      }}>
        <span style={{ padding: '3px 10px', background: 'rgba(0,0,0,0.5)', borderRadius: 20, fontSize: 10, color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
          🖱 Scroll — frequency
        </span>
        <span style={{ padding: '3px 10px', background: 'rgba(0,0,0,0.5)', borderRadius: 20, fontSize: 10, color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
          ↔ Drag — scrub freq
        </span>
        <span style={{ padding: '3px 10px', background: 'rgba(0,0,0,0.5)', borderRadius: 20, fontSize: 10, color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
          ↕ Drag — volume
        </span>
        <span style={{ padding: '3px 10px', background: 'rgba(0,0,0,0.5)', borderRadius: 20, fontSize: 10, color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
          ✦ Double-click — burst
        </span>
        {is8D && (
          <span style={{ padding: '3px 10px', background: 'rgba(236,72,153,0.15)', borderRadius: 20, fontSize: 10, color: '#f472b6', border: '1px solid rgba(236,72,153,0.3)' }}>
            ⊕ 8D SPATIAL ACTIVE
          </span>
        )}
      </div>
    </div>
  )
}
