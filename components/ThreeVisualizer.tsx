'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { getComplexityLevel } from '@/lib/frequencies'

interface Props {
  hz: number
  isPlaying: boolean
  analyserRef: React.MutableRefObject<AnalyserNode | null>
  colorHex: string
}

// Convert hex color to THREE.Color
function hexToThree(hex: string): THREE.Color {
  return new THREE.Color(hex)
}

// Cymatic standing wave deformation
// Based on Chladni figures: height = sin(n*theta) * cos(m*phi) * amplitude
// n, m are nodal numbers derived from frequency complexity
function getCymaticParams(hz: number) {
  const level = getComplexityLevel(hz)
  const configs: Record<number, { n: number; m: number; twist: number }> = {
    1: { n: 2, m: 2, twist: 0 },      // 174–285 Hz: simple oval
    2: { n: 3, m: 2, twist: 0.1 },    // 396–417 Hz: three-fold petal
    3: { n: 4, m: 3, twist: 0.15 },   // 432–528 Hz: six-fold mandala
    4: { n: 6, m: 4, twist: 0.2 },    // 741 Hz: complex star
    5: { n: 8, m: 6, twist: 0.25 },   // 852–963 Hz: crystalline lattice
  }
  return configs[level]
}

export default function ThreeVisualizer({ hz, isPlaying, analyserRef, colorHex }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const frameRef = useRef<number>(0)
  const meshRef = useRef<THREE.Mesh | null>(null)
  const ringRef = useRef<THREE.Line | null>(null)
  const particlesRef = useRef<THREE.Points | null>(null)
  const timeRef = useRef<number>(0)
  const dataArrayRef = useRef<Uint8Array | null>(null)

  useEffect(() => {
    if (!mountRef.current) return
    const mount = mountRef.current
    const w = mount.clientWidth
    const h = mount.clientHeight

    // ── Scene setup ──────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#06060e')
    sceneRef.current = scene

    // Subtle fog
    scene.fog = new THREE.FogExp2('#06060e', 0.04)

    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100)
    camera.position.set(0, 0, 9)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const color = hexToThree(colorHex)
    const { n, m, twist } = getCymaticParams(hz)

    // ── Cymatic sphere mesh ───────────────────────────────────────────────
    // Uses a sphere geometry with custom vertex positions based on standing wave equations
    const segments = 96
    const geo = new THREE.SphereGeometry(3, segments, segments)
    const posAttr = geo.getAttribute('position')
    const originalPositions = new Float32Array(posAttr.array.length)
    originalPositions.set(posAttr.array as Float32Array)

    const mat = new THREE.MeshPhongMaterial({
      color,
      emissive: color.clone().multiplyScalar(0.15),
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    })

    const cymMesh = new THREE.Mesh(geo, mat)
    scene.add(cymMesh)
    meshRef.current = cymMesh

    // ── Solid core sphere ─────────────────────────────────────────────────
    const coreMat = new THREE.MeshPhongMaterial({
      color,
      emissive: color.clone().multiplyScalar(0.5),
      transparent: true,
      opacity: 0.12,
    })
    const core = new THREE.Mesh(new THREE.SphereGeometry(2.95, 32, 32), coreMat)
    scene.add(core)

    // ── Outer glow ring ───────────────────────────────────────────────────
    const ringGeo = new THREE.RingGeometry(3.6, 3.65, 128)
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI * 0.1
    scene.add(ring)

    // ── Audio waveform ring ───────────────────────────────────────────────
    const wavePoints = 256
    const waveGeo = new THREE.BufferGeometry()
    const wavePos = new Float32Array(wavePoints * 3)
    waveGeo.setAttribute('position', new THREE.BufferAttribute(wavePos, 3))
    const waveMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
    })
    const waveLine = new THREE.LineLoop(waveGeo, waveMat)
    scene.add(waveLine)
    ringRef.current = waveLine as unknown as THREE.Line

    // ── Particle field ────────────────────────────────────────────────────
    const pCount = 600
    const pGeo = new THREE.BufferGeometry()
    const pPos = new Float32Array(pCount * 3)
    for (let i = 0; i < pCount; i++) {
      const r = 5 + Math.random() * 8
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pPos[i * 3 + 2] = r * Math.cos(phi)
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    const pMat = new THREE.PointsMaterial({
      color,
      size: 0.06,
      transparent: true,
      opacity: 0.4,
    })
    const particles = new THREE.Points(pGeo, pMat)
    scene.add(particles)
    particlesRef.current = particles

    // ── Lights ────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight('#ffffff', 0.3))
    const pointLight = new THREE.PointLight(colorHex, 2.5, 20)
    pointLight.position.set(0, 0, 5)
    scene.add(pointLight)
    const pointLight2 = new THREE.PointLight(colorHex, 1.5, 15)
    pointLight2.position.set(0, 5, -5)
    scene.add(pointLight2)

    // ── FFT data array ────────────────────────────────────────────────────
    if (analyserRef.current) {
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount)
    }

    // ── Animation loop ────────────────────────────────────────────────────
    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      timeRef.current += 0.008

      const t = timeRef.current

      // Get audio data
      let rms = 0
      let fftData: Uint8Array<ArrayBuffer> | null = null
      if (analyserRef.current && isPlaying) {
        if (!dataArrayRef.current) {
          dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount)
        }
        fftData = dataArrayRef.current as Uint8Array<ArrayBuffer>
        analyserRef.current.getByteFrequencyData(fftData)
        // Compute RMS energy
        let sum = 0
        const td = new Uint8Array(analyserRef.current.fftSize) as Uint8Array<ArrayBuffer>
        analyserRef.current.getByteTimeDomainData(td)
        for (let i = 0; i < td.length; i++) {
          const v = (td[i] - 128) / 128
          sum += v * v
        }
        rms = Math.sqrt(sum / td.length)
      }

      // ── Cymatic mesh deformation ────────────────────────────────────
      const posAttr = cymMesh.geometry.getAttribute('position')
      const count = posAttr.count

      for (let i = 0; i < count; i++) {
        const ox = originalPositions[i * 3]
        const oy = originalPositions[i * 3 + 1]
        const oz = originalPositions[i * 3 + 2]

        // Spherical coordinates
        const len = Math.sqrt(ox*ox + oy*oy + oz*oz)
        const theta = Math.atan2(Math.sqrt(ox*ox + oz*oz), oy)  // polar
        const phi = Math.atan2(oz, ox)                            // azimuthal

        // Standing wave equation: Chladni-inspired
        // amplitude modulated by time and audio energy
        const audioMod = 1 + rms * 2.5
        const timeMod = Math.sin(t * 0.7) * 0.08

        const wave = Math.sin(n * theta + twist * t) *
                     Math.cos(m * phi + twist * t * 0.7) *
                     (0.18 + timeMod) * audioMod

        const newLen = len + wave * len * 0.3

        posAttr.setXYZ(i,
          (ox / len) * newLen,
          (oy / len) * newLen,
          (oz / len) * newLen
        )
      }
      posAttr.needsUpdate = true
      cymMesh.geometry.computeVertexNormals()

      // ── Slow rotation (cinematic) ────────────────────────────────────
      cymMesh.rotation.y = t * 0.12
      cymMesh.rotation.x = Math.sin(t * 0.07) * 0.15

      core.rotation.y = -t * 0.08

      ring.rotation.z = t * 0.05
      ring.rotation.x = Math.PI * 0.1 + Math.sin(t * 0.05) * 0.05

      particles.rotation.y = t * 0.015
      particles.rotation.x = t * 0.008

      // ── Audio waveform ring ───────────────────────────────────────────
      const waveRadius = 4.5
      const wavePos = waveLine.geometry.getAttribute('position') as THREE.BufferAttribute
      if (fftData && analyserRef.current) {
        const tdWave = new Uint8Array(analyserRef.current.fftSize) as Uint8Array<ArrayBuffer>
        analyserRef.current.getByteTimeDomainData(tdWave)
        for (let i = 0; i < wavePoints; i++) {
          const angle = (i / wavePoints) * Math.PI * 2
          const amp = ((tdWave[Math.floor(i * tdWave.length / wavePoints)] - 128) / 128) * 0.8
          const r = waveRadius + amp
          wavePos.setXYZ(i, Math.cos(angle) * r, Math.sin(angle) * r, 0)
        }
      } else {
        // Idle animation
        for (let i = 0; i < wavePoints; i++) {
          const angle = (i / wavePoints) * Math.PI * 2
          const idle = Math.sin(angle * 3 + t * 1.5) * 0.06
          const r = waveRadius + idle
          wavePos.setXYZ(i, Math.cos(angle) * r, Math.sin(angle) * r, 0)
        }
      }
      wavePos.needsUpdate = true

      // ── Point light pulse ────────────────────────────────────────────
      pointLight.intensity = 2.5 + rms * 4

      // ── Camera gentle orbit ──────────────────────────────────────────
      camera.position.x = Math.sin(t * 0.04) * 0.8
      camera.position.y = Math.sin(t * 0.03) * 0.5
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }

    animate()

    // ── Resize handler ────────────────────────────────────────────────────
    function onResize() {
      if (!mount) return
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(frameRef.current)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hz, colorHex])

  // Update isPlaying ref without remounting
  // (analyserRef is already a ref, so it's always current)

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', display: 'block', background: '#06060e' }}
    />
  )
}
