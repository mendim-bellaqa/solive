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

function hexToThree(hex: string): THREE.Color {
  return new THREE.Color(hex)
}

// Per-frequency cymatic params — dual superimposed standing waves (physically inspired)
// n/m = primary nodal numbers, n2/m2 = secondary wave layer for complexity
// twist drives phase rotation over time; speed scales animation rate per band
function getCymaticParams(hz: number) {
  const level = getComplexityLevel(hz)
  const configs: Record<number, { n: number; m: number; n2: number; m2: number; twist: number; speed: number }> = {
    1: { n: 2, m: 2, n2: 1, m2: 3, twist: 0,    speed: 0.60 }, // 174–285 Hz: simple bilateral oval
    2: { n: 3, m: 2, n2: 2, m2: 4, twist: 0.08, speed: 0.70 }, // 396–417 Hz: three-petal
    3: { n: 4, m: 3, n2: 3, m2: 5, twist: 0.12, speed: 0.80 }, // 432–528 Hz: six-fold mandala
    4: { n: 6, m: 4, n2: 4, m2: 7, twist: 0.18, speed: 0.90 }, // 741 Hz: complex star
    5: { n: 8, m: 6, n2: 5, m2: 9, twist: 0.22, speed: 1.00 }, // 852–963 Hz: crystalline lattice
  }
  return configs[level]
}

export default function ThreeVisualizer({ hz, isPlaying, analyserRef, colorHex }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number>(0)
  const timeRef = useRef<number>(0)
  // Ref so the animation loop always reads the latest isPlaying without remounting
  const isPlayingRef = useRef<boolean>(isPlaying)

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    if (!mountRef.current) return
    const mount = mountRef.current
    const w = mount.clientWidth
    const h = mount.clientHeight

    // LOD: fewer segments on low-DPR (mobile) devices to maintain 60 fps
    const dpr = window.devicePixelRatio || 1
    const segments = dpr >= 2 ? 96 : dpr >= 1.5 ? 72 : 48
    const pCount = dpr >= 1.5 ? 800 : 500

    // ── Scene ─────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#06060e')
    scene.fog = new THREE.FogExp2('#06060e', 0.032)

    const camera = new THREE.PerspectiveCamera(52, w / h, 0.1, 100)
    camera.position.set(0, 0, 9)

    const renderer = new THREE.WebGLRenderer({ antialias: dpr < 2, alpha: false })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(dpr, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    mount.appendChild(renderer.domElement)

    const color = hexToThree(colorHex)
    const { n, m, n2, m2, twist, speed } = getCymaticParams(hz)

    // ── Cymatic wireframe sphere ──────────────────────────────────────────
    const geoSphere = new THREE.SphereGeometry(3, segments, segments)
    const posAttr = geoSphere.getAttribute('position')
    const originalPositions = new Float32Array(posAttr.array.length)
    originalPositions.set(posAttr.array as Float32Array)

    const matWire = new THREE.MeshStandardMaterial({
      color,
      emissive: color.clone().multiplyScalar(0.22),
      wireframe: true,
      transparent: true,
      opacity: 0.52,
      metalness: 0.2,
      roughness: 0.55,
    })
    const cymMesh = new THREE.Mesh(geoSphere, matWire)
    scene.add(cymMesh)

    // ── Translucent inner core ────────────────────────────────────────────
    const geoCore = new THREE.SphereGeometry(2.88, Math.floor(segments / 2), Math.floor(segments / 2))
    const matCore = new THREE.MeshStandardMaterial({
      color,
      emissive: color.clone().multiplyScalar(0.55),
      transparent: true,
      opacity: 0.10,
      metalness: 0.4,
      roughness: 0.5,
    })
    const coreMesh = new THREE.Mesh(geoCore, matCore)
    scene.add(coreMesh)

    // ── Equatorial glow ring ──────────────────────────────────────────────
    const geoRing1 = new THREE.RingGeometry(3.68, 3.72, 128)
    const matRing1 = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const ring1 = new THREE.Mesh(geoRing1, matRing1)
    ring1.rotation.x = Math.PI * 0.08
    scene.add(ring1)

    // Second tilted outer ring
    const geoRing2 = new THREE.RingGeometry(4.15, 4.19, 128)
    const matRing2 = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const ring2 = new THREE.Mesh(geoRing2, matRing2)
    ring2.rotation.x = -Math.PI * 0.38
    ring2.rotation.z = Math.PI * 0.14
    scene.add(ring2)

    // ── Audio waveform ring — equatorial ──────────────────────────────────
    const wavePoints = 256
    const waveGeo1 = new THREE.BufferGeometry()
    const wavePosArr1 = new Float32Array(wavePoints * 3)
    waveGeo1.setAttribute('position', new THREE.BufferAttribute(wavePosArr1, 3))
    const waveMat1 = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const waveLine1 = new THREE.LineLoop(waveGeo1, waveMat1)
    scene.add(waveLine1)

    // Audio waveform ring — meridional (rotated 90° around Y)
    const waveGeo2 = new THREE.BufferGeometry()
    const wavePosArr2 = new Float32Array(wavePoints * 3)
    waveGeo2.setAttribute('position', new THREE.BufferAttribute(wavePosArr2, 3))
    const waveMat2 = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const waveLine2 = new THREE.LineLoop(waveGeo2, waveMat2)
    waveLine2.rotation.y = Math.PI * 0.5
    scene.add(waveLine2)

    // ── Particle field ────────────────────────────────────────────────────
    const pGeo = new THREE.BufferGeometry()
    const pPos = new Float32Array(pCount * 3)
    const pBaseR = new Float32Array(pCount)
    const pTheta = new Float32Array(pCount)
    const pPhi = new Float32Array(pCount)
    for (let i = 0; i < pCount; i++) {
      const r = 5.5 + Math.random() * 7
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pBaseR[i] = r
      pTheta[i] = theta
      pPhi[i] = phi
      pPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pPos[i * 3 + 2] = r * Math.cos(phi)
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    const pMat = new THREE.PointsMaterial({
      color,
      size: 0.07,
      transparent: true,
      opacity: 0.50,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const particles = new THREE.Points(pGeo, pMat)
    scene.add(particles)

    // ── Lights ────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight('#ffffff', 0.4))
    const light1 = new THREE.PointLight(colorHex, 3.0, 22)
    light1.position.set(0, 0, 5)
    scene.add(light1)
    const light2 = new THREE.PointLight(colorHex, 1.8, 18)
    light2.position.set(0, 5, -5)
    scene.add(light2)
    const light3 = new THREE.PointLight('#ffffff', 0.5, 15)
    light3.position.set(-5, -3, 3)
    scene.add(light3)

    // ── FFT buffer (lazy-init on first audio data) ─────────────────────────
    let dataArray: Uint8Array<ArrayBuffer> | null = null

    // ── Animation loop ────────────────────────────────────────────────────
    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      timeRef.current += 0.008 * speed
      const t = timeRef.current
      const playing = isPlayingRef.current

      // Gather audio data
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
          for (let i = 0; i < td.length; i++) {
            const v = (td[i] - 128) / 128
            sum += v * v
          }
          rms = Math.sqrt(sum / td.length)
        }
      }

      // ── Cymatic vertex deformation (dual standing waves) ──────────────
      const posA = cymMesh.geometry.getAttribute('position')
      const count = posA.count
      const audioMod = 1 + rms * 3.0
      const breathe = Math.sin(t * 0.5) * 0.04

      for (let i = 0; i < count; i++) {
        const ox = originalPositions[i * 3]
        const oy = originalPositions[i * 3 + 1]
        const oz = originalPositions[i * 3 + 2]

        const len = Math.sqrt(ox * ox + oy * oy + oz * oz)
        const theta = Math.atan2(Math.sqrt(ox * ox + oz * oz), oy) // polar
        const phi   = Math.atan2(oz, ox)                            // azimuthal

        // Primary wave
        const wave1 = Math.sin(n  * theta + twist * t)       * Math.cos(m  * phi + twist * t * 0.6)
        // Secondary wave (subtly counter-rotating for organic motion)
        const wave2 = Math.sin(n2 * theta - twist * t * 0.5) * Math.cos(m2 * phi - twist * t * 0.4)
        const combined = (wave1 * 0.70 + wave2 * 0.30) * (0.16 + breathe) * audioMod

        const newLen = len + combined * len * 0.30

        posA.setXYZ(i,
          (ox / len) * newLen,
          (oy / len) * newLen,
          (oz / len) * newLen,
        )
      }
      posA.needsUpdate = true
      cymMesh.geometry.computeVertexNormals()

      // ── Rotations ─────────────────────────────────────────────────────
      cymMesh.rotation.y = t * 0.10
      cymMesh.rotation.x = Math.sin(t * 0.06) * 0.12

      coreMesh.rotation.y = -t * 0.07
      coreMesh.rotation.x = Math.sin(t * 0.05) * 0.08

      ring1.rotation.z = t * 0.04
      ring1.rotation.x = Math.PI * 0.08 + Math.sin(t * 0.04) * 0.04

      ring2.rotation.z = -t * 0.025
      ring2.rotation.y = t * 0.015

      particles.rotation.y = t * 0.012
      particles.rotation.x = t * 0.007

      // Audio-reactive particle "breathing" — expands with RMS energy
      if (playing && rms > 0.04) {
        const pPosAttr = particles.geometry.getAttribute('position') as THREE.BufferAttribute
        const pArr = pPosAttr.array as Float32Array
        const boost = 1 + rms * 0.45
        for (let i = 0; i < pCount; i++) {
          const r = pBaseR[i] * boost
          const ph = pPhi[i] + t * 0.002
          const th = pTheta[i] + t * 0.001
          pArr[i * 3]     = r * Math.sin(ph) * Math.cos(th)
          pArr[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th)
          pArr[i * 3 + 2] = r * Math.cos(ph)
        }
        pPosAttr.needsUpdate = true
      }

      // ── Waveform rings ────────────────────────────────────────────────
      const waveRadius = 4.5
      const wAttr1 = waveLine1.geometry.getAttribute('position') as THREE.BufferAttribute
      const wAttr2 = waveLine2.geometry.getAttribute('position') as THREE.BufferAttribute

      if (tdData) {
        for (let i = 0; i < wavePoints; i++) {
          const angle = (i / wavePoints) * Math.PI * 2
          const idx1 = Math.floor(i * tdData.length / wavePoints)
          const amp1 = ((tdData[idx1] - 128) / 128) * 1.0
          wAttr1.setXYZ(i, Math.cos(angle) * (waveRadius + amp1), Math.sin(angle) * (waveRadius + amp1), 0)

          const idx2 = Math.floor(((i + Math.floor(wavePoints / 2)) % wavePoints) * tdData.length / wavePoints)
          const amp2 = ((tdData[idx2] - 128) / 128) * 0.7
          const r2 = waveRadius - 0.4 + amp2
          wAttr2.setXYZ(i, Math.cos(angle) * r2, 0, Math.sin(angle) * r2)
        }
      } else {
        // Idle: nodal-count–aware sinusoidal animation
        for (let i = 0; i < wavePoints; i++) {
          const angle = (i / wavePoints) * Math.PI * 2
          const idle1 = Math.sin(angle * (n + 1) + t * 1.2) * 0.05
          wAttr1.setXYZ(i, Math.cos(angle) * (waveRadius + idle1), Math.sin(angle) * (waveRadius + idle1), 0)
          const idle2 = Math.sin(angle * (m + 1) - t * 0.9) * 0.04
          const r2 = waveRadius - 0.4 + idle2
          wAttr2.setXYZ(i, Math.cos(angle) * r2, 0, Math.sin(angle) * r2)
        }
      }
      wAttr1.needsUpdate = true
      wAttr2.needsUpdate = true

      // ── Light pulse ───────────────────────────────────────────────────
      light1.intensity = 3.0 + rms * 5.0
      light2.intensity = 1.8 + rms * 2.0

      // ── Camera gentle orbit ───────────────────────────────────────────
      camera.position.x = Math.sin(t * 0.033) * 1.0
      camera.position.y = Math.sin(t * 0.024) * 0.6
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }

    animate()

    // ── Resize handler ────────────────────────────────────────────────────
    function onResize() {
      const nw = mount.clientWidth
      const nh = mount.clientHeight
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)

    // ── Cleanup — dispose all GPU resources ───────────────────────────────
    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(frameRef.current)

      geoSphere.dispose()
      geoCore.dispose()
      geoRing1.dispose()
      geoRing2.dispose()
      waveGeo1.dispose()
      waveGeo2.dispose()
      pGeo.dispose()

      matWire.dispose()
      matCore.dispose()
      matRing1.dispose()
      matRing2.dispose()
      waveMat1.dispose()
      waveMat2.dispose()
      pMat.dispose()

      renderer.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hz, colorHex])

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', display: 'block', background: '#06060e' }}
    />
  )
}
