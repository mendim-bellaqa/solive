'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// A glowing sphere of light whose surface ripples like sound on a membrane —
// standing-wave displacement + slow rotation + a colour that cycles through
// the frequency palette. Purely time-driven (no audio needed).
export default function HeroOrb() {
  const rootRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    if (!rootRef.current) return
    const root = rootRef.current
    const w = root.clientWidth || 480
    const h = root.clientHeight || 480
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const N = Math.min(w, h) < 380 ? 2000 : 3200

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)
    camera.position.set(0, 0, 4.6)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(dpr)
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.5
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    root.appendChild(renderer.domElement)

    // Glow sprite
    const cs = 64
    const cv = document.createElement('canvas'); cv.width = cv.height = cs
    const cx = cv.getContext('2d')!
    const grd = cx.createRadialGradient(cs/2, cs/2, 0, cs/2, cs/2, cs/2)
    grd.addColorStop(0, 'rgba(255,255,255,1)')
    grd.addColorStop(0.35, 'rgba(255,255,255,0.6)')
    grd.addColorStop(0.7, 'rgba(255,255,255,0.14)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    cx.fillStyle = grd; cx.fillRect(0, 0, cs, cs)
    const tex = new THREE.CanvasTexture(cv)

    // Fibonacci sphere
    const base = new Float32Array(N * 3)
    const uu = new Float32Array(N)   // azimuth
    const vv = new Float32Array(N)   // polar
    const GA = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const phi = i * GA
      const x = Math.cos(phi) * r, z = Math.sin(phi) * r
      base[i*3] = x; base[i*3+1] = y; base[i*3+2] = z
      uu[i] = Math.atan2(z, x); vv[i] = Math.acos(y)
    }

    const pos = new Float32Array(N * 3)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute

    const group = new THREE.Group(); scene.add(group)

    const coreMat = new THREE.PointsMaterial({ size: 0.045, map: tex, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })
    const haloMat = new THREE.PointsMaterial({ size: 0.16, map: tex, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })
    group.add(new THREE.Points(geo, coreMat))
    group.add(new THREE.Points(geo, haloMat))

    // Central glow
    const glowMat = new THREE.PointsMaterial({ size: 2.6, map: tex, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
    const glowGeo = new THREE.BufferGeometry()
    glowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0,0,0]), 3))
    const glow = new THREE.Points(glowGeo, glowMat); group.add(glow)

    const palette = ['#5CE8DC', '#4a90e8', '#8b5cf6', '#e0607a', '#e8a020', '#10b981'].map(c => new THREE.Color(c))
    const col = new THREE.Color()

    const clock = new THREE.Clock()
    let t = 0
    function animate() {
      rafRef.current = requestAnimationFrame(animate)
      t += Math.min(0.05, clock.getDelta())

      // ripple displacement (standing waves)
      let peak = 0
      for (let i = 0; i < N; i++) {
        const u = uu[i], v = vv[i]
        const d = (
          Math.sin(3 * u + t * 0.8) +
          Math.sin(5 * v - t * 0.7) +
          Math.sin(7 * (u + v) + t * 1.2) +
          Math.sin(4 * v + 2 * u - t)
        ) / 4
        const rr = 1.35 * (1 + 0.19 * d)
        pos[i*3]   = base[i*3]   * rr
        pos[i*3+1] = base[i*3+1] * rr
        pos[i*3+2] = base[i*3+2] * rr
        if (d > peak) peak = d
      }
      posAttr.needsUpdate = true

      // colour cycle
      const cyc = (t * 0.09) % palette.length
      const i0 = Math.floor(cyc), i1 = (i0 + 1) % palette.length
      const f = cyc - i0
      col.copy(palette[i0]).lerp(palette[i1], f * f * (3 - 2 * f))
      coreMat.color.copy(col); haloMat.color.copy(col); glowMat.color.copy(col)
      glowMat.opacity = 0.4 + peak * 0.2

      group.rotation.y = t * 0.18
      group.rotation.x = Math.sin(t * 0.25) * 0.18
      group.position.y = Math.sin(t * 0.6) * 0.08
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
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
      cancelAnimationFrame(rafRef.current)
      geo.dispose(); coreMat.dispose(); haloMat.dispose()
      glowGeo.dispose(); glowMat.dispose(); tex.dispose(); renderer.dispose()
      if (root.contains(renderer.domElement)) root.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={rootRef} style={{ position: 'absolute', inset: 0 }} />
}
