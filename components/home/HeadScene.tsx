'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface Props {
  /** Speakers mode: the tones sum in the room, so nothing reaches the olive. */
  speakers: boolean
  /** Accent for the live pathway. */
  tone: string
  beat: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   A wireframe head with a lit brain inside it.

   The flat diagram this replaces could show where the olive sits but never
   what it is like to be the head it sits in. Here the skull is a mesh you can
   see through, the brain hangs in it, and the two tones arrive as streams of
   light that travel down the auditory nerve and collide at one bright node.
   The claim of the section — that the beat is assembled at a place, inside —
   is the thing you are watching rather than the caption underneath.

   Built on the same additive-points technique as the studio's visualisers, so
   it costs about what one of those costs and idles the moment it leaves the
   screen.
   ═══════════════════════════════════════════════════════════════════════════ */

function smoothstep(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a || 1)))
  return t * t * (3 - 2 * t)
}

/**
 * Deform a unit sphere into a head. Stylised, but it has to carry the four
 * cues that make a head read as a head from any angle: a cranium wider than
 * the jaw, an occiput fuller than the face, a chin, and a nose.
 */
function shapeHead(x: number, y: number, z: number, out: Float32Array, o: number) {
  const t = (y + 1) / 2                                  // 0 at chin, 1 at crown

  // A jaw is narrower than a skull, but only by about a quarter. Tapering
  // harder than that turns the head into a teardrop.
  const taper = 0.70 + 0.30 * smoothstep(0.06, 0.62, t)
  const rx = 0.66 * taper
  // Faces are flat and occiputs are full; a head that ignores both is a ball.
  const rz = 0.84 * (0.82 + 0.18 * smoothstep(-0.05, 0.60, t)) * (z < 0 ? 1.14 : 0.86)

  let px = x * rx
  let py = y * 0.98
  let pz = z * rz

  // The distance from ear to chin is far shorter than ear to crown. Without
  // this compression the sphere's bottom pole stretches into a long point and
  // the whole thing reads as a light bulb.
  if (py < -0.28) py = -0.28 + (py + 0.28) * 0.50

  // Chin comes forward, not down.
  const chin = smoothstep(-0.28, -0.60, py)
  px *= 1 - 0.17 * chin
  if (z > 0) pz += 0.11 * chin

  // Brow, then the nose — the feature that fixes which way it faces.
  const brow = Math.max(0, 1 - Math.abs(py - 0.10) * 5.5) * Math.max(0, z)
  const nose = Math.max(0, 1 - Math.hypot(x * 4.2, (py + 0.02) * 3.4)) * Math.max(0, z)
  pz += brow * 0.034 + nose * 0.23

  out[o] = px; out[o+1] = py; out[o+2] = pz
}

/** A brain that fits inside that skull — lobed, fissured, flattened beneath. */
function brainPoint(out: Float32Array, o: number) {
  const hemi = Math.random() < 0.5 ? -1 : 1
  const u = Math.random() * Math.PI * 2
  const v = Math.acos(2 * Math.random() - 1)
  const sv = Math.sin(v)
  const x = sv * Math.cos(u), y = Math.cos(v), z = sv * Math.sin(u)

  let px = x * 0.52, py = y * 0.50, pz = z * 0.68 * (1 - 0.14 * z)

  // Gyri.
  const fold = Math.sin(px * 15 + Math.cos(pz * 12) * 2) * 0.5 + Math.sin(pz * 13 + py * 8) * 0.5
  const len = Math.hypot(px, py, pz) || 1
  px += (px / len) * fold * 0.035
  py += (py / len) * fold * 0.035
  pz += (pz / len) * fold * 0.035

  if (py < -0.21) py = -0.21 + (py + 0.21) * 0.5        // flat underside
  const fissure = 0.034 + 0.030 * smoothstep(0, 0.5, py)
  px = hemi * (Math.abs(px) * 0.88 + fissure)

  out[o] = px; out[o+1] = py + 0.10; out[o+2] = pz - 0.02
}

function glowSprite(): THREE.CanvasTexture {
  const s = 64
  const c = document.createElement('canvas'); c.width = c.height = s
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.3, 'rgba(255,255,255,0.66)')
  grd.addColorStop(0.7, 'rgba(255,255,255,0.14)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd; g.fillRect(0, 0, s, s)
  return new THREE.CanvasTexture(c)
}

export default function HeadScene({ speakers, tone, beat }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const speakersRef = useRef(speakers)
  const rafRef = useRef(0)

  useEffect(() => { speakersRef.current = speakers }, [speakers])

  useEffect(() => {
    if (!rootRef.current) return
    const root = rootRef.current
    const w = root.clientWidth || 640, h = root.clientHeight || 420
    const mobile = window.matchMedia('(max-width: 768px)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2)

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2('#05050c', 0.16)
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100)
    camera.position.set(0.30, 0.05, 2.75)

    const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: true })
    renderer.setSize(w, h); renderer.setPixelRatio(dpr)
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.5
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    root.appendChild(renderer.domElement)

    const tex = glowSprite()
    const disposables: { dispose(): void }[] = []
    const reg = <T extends { dispose(): void }>(x: T): T => { disposables.push(x); return x }

    const group = new THREE.Group()
    group.rotation.y = -0.34          // three-quarter view: reads as a head, not a mask
    scene.add(group)

    const COOL = new THREE.Color('#5f8fd8')
    // The skull reads on a phone in daylight, which the muted blue at 5% did
    // not. WebGL ignores linewidth on lines, so presence has to come from
    // value and from the vertices rather than from stroke weight.
    const BONE = new THREE.Color('#cfe0f5')
    const accent = new THREE.Color(tone)
    const WARM = new THREE.Color('#e0a060')

    // ── Skull mesh ─────────────────────────────────────────────────────────
    // Icosahedron rather than a UV sphere: even triangles, no pole pinching,
    // and the low-poly facets are the look the references are built on.
    const src = new THREE.IcosahedronGeometry(1, mobile ? 3 : 4)
    const srcPos = src.getAttribute('position') as THREE.BufferAttribute
    const headPos = new Float32Array(srcPos.count * 3)
    for (let i = 0; i < srcPos.count; i++) {
      shapeHead(srcPos.getX(i), srcPos.getY(i), srcPos.getZ(i), headPos, i * 3)
    }
    const headGeo = reg(new THREE.BufferGeometry())
    headGeo.setAttribute('position', new THREE.BufferAttribute(headPos, 3))
    headGeo.setIndex(src.getIndex())
    src.dispose()

    const wire = reg(new THREE.WireframeGeometry(headGeo))
    const wireMat = reg(new THREE.LineBasicMaterial({
      color: BONE, transparent: true, opacity: 0.13,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }))
    group.add(new THREE.LineSegments(wire, wireMat))

    const vertMat = reg(new THREE.PointsMaterial({
      color: BONE, size: 0.017, map: tex, transparent: true, opacity: 0.46,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }))
    group.add(new THREE.Points(headGeo, vertMat))

    // ── Brain ──────────────────────────────────────────────────────────────
    const BN = mobile ? 1400 : 2400
    const bPos = new Float32Array(BN * 3)
    const bPhase = new Float32Array(BN)
    for (let i = 0; i < BN; i++) { brainPoint(bPos, i * 3); bPhase[i] = Math.random() * Math.PI * 2 }
    const brainGeo = reg(new THREE.BufferGeometry())
    brainGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3))
    const brainMat = reg(new THREE.PointsMaterial({
      size: 0.023, map: tex, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }))
    const brain = new THREE.Points(brainGeo, brainMat)
    group.add(brain)
    // Neuron filaments between near neighbours. This is what gives the
    // references their sense of a living network rather than a dust cloud.
    const fil: number[] = []
    const FD2 = 0.10 * 0.10
    outer: for (let i = 0; i < BN; i++) {
      for (let k = 0; k < 4; k++) {
        const j = (Math.random() * BN) | 0
        if (j === i) continue
        const dx = bPos[i*3]-bPos[j*3], dy = bPos[i*3+1]-bPos[j*3+1], dz = bPos[i*3+2]-bPos[j*3+2]
        if (dx*dx + dy*dy + dz*dz < FD2) {
          fil.push(bPos[i*3], bPos[i*3+1], bPos[i*3+2], bPos[j*3], bPos[j*3+1], bPos[j*3+2])
          if (fil.length / 6 >= (mobile ? 900 : 1800)) break outer
        }
      }
    }
    const filGeo = reg(new THREE.BufferGeometry())
    filGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(fil), 3))
    const filMat = reg(new THREE.LineBasicMaterial({
      transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false,
    }))
    group.add(new THREE.LineSegments(filGeo, filMat))

    // Brainstem: a tapering column so the pathway has somewhere to arrive.
    const SN = mobile ? 140 : 240
    const sPos = new Float32Array(SN * 3)
    for (let i = 0; i < SN; i++) {
      const q = Math.random()
      const rad = 0.055 * (1 - q * 0.35) * Math.sqrt(Math.random())
      const a = Math.random() * Math.PI * 2
      sPos[i*3] = Math.cos(a) * rad
      sPos[i*3+1] = -0.14 - q * 0.34
      sPos[i*3+2] = Math.sin(a) * rad - 0.05
    }
    const stemGeo = reg(new THREE.BufferGeometry())
    stemGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3))
    const stemMat = reg(new THREE.PointsMaterial({
      size: 0.026, map: tex, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }))
    group.add(new THREE.Points(stemGeo, stemMat))

    const brainHalo = new THREE.Points(brainGeo, reg(new THREE.PointsMaterial({
      size: 0.10, map: tex, transparent: true, opacity: 0.075,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    })))
    group.add(brainHalo)

    // ── Firing nodes: a sparse subset that flashes, like the references ────
    const FN = mobile ? 40 : 70
    const fIdx = new Int32Array(FN)
    const fPos = new Float32Array(FN * 3)
    for (let i = 0; i < FN; i++) fIdx[i] = (Math.random() * BN) | 0
    const fireGeo = reg(new THREE.BufferGeometry())
    fireGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3))
    const fireMat = reg(new THREE.PointsMaterial({
      size: 0.085, map: tex, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }))
    group.add(new THREE.Points(fireGeo, fireMat))

    // ── Tone streams ───────────────────────────────────────────────────────
    // Two curves per side: the direct route into the near ear, and the long way
    // round the head that only exists once speakers put both tones in the air.
    const earL = new THREE.Vector3(-0.60, -0.04, 0.02)
    const earR = new THREE.Vector3( 0.60, -0.04, 0.02)
    const olive = new THREE.Vector3(0, -0.30, -0.05)

    const direct = (from: THREE.Vector3, ear: THREE.Vector3) =>
      new THREE.QuadraticBezierCurve3(from, from.clone().lerp(ear, 0.55).setY(0.16), ear)
    const around = (from: THREE.Vector3, ear: THREE.Vector3) =>
      new THREE.CubicBezierCurve3(from, new THREE.Vector3(from.x * 0.6, 1.25, 0.1),
                                  new THREE.Vector3(ear.x * 0.6, 1.25, 0.1), ear)
    const nerve = (ear: THREE.Vector3) =>
      new THREE.QuadraticBezierCurve3(ear, new THREE.Vector3(ear.x * 0.55, -0.24, -0.02), olive)

    const srcL = new THREE.Vector3(-1.55, 0.34, 0.62)
    const srcR = new THREE.Vector3( 1.55, 0.34, 0.62)

    interface Stream { curve: THREE.Curve<THREE.Vector3>; color: THREE.Color; onlySpeakers?: boolean; nerve?: boolean }
    const streams: Stream[] = [
      { curve: direct(srcL, earL), color: new THREE.Color('#7db4ff') },
      { curve: direct(srcR, earR), color: new THREE.Color('#b98cff') },
      { curve: around(srcL, earR), color: WARM, onlySpeakers: true },
      { curve: around(srcR, earL), color: WARM, onlySpeakers: true },
      { curve: nerve(earL), color: new THREE.Color('#7db4ff'), nerve: true },
      { curve: nerve(earR), color: new THREE.Color('#b98cff'), nerve: true },
    ]

    // A faint guide line per stream, so the route is legible even between pulses.
    const guideMats: THREE.LineBasicMaterial[] = []
    streams.forEach(s => {
      const pts = s.curve.getPoints(48)
      const g = reg(new THREE.BufferGeometry().setFromPoints(pts))
      const m = reg(new THREE.LineBasicMaterial({
        color: s.color, transparent: true, opacity: 0.32,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }))
      guideMats.push(m)
      group.add(new THREE.Line(g, m))
    })

    const PER = mobile ? 8 : 14
    const P = streams.length * PER
    const pPos = new Float32Array(P * 3)
    const pCol = new Float32Array(P * 3)
    const pT = new Float32Array(P)
    for (let i = 0; i < P; i++) pT[i] = (i % PER) / PER
    const partGeo = reg(new THREE.BufferGeometry())
    partGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    partGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3))
    const partMat = reg(new THREE.PointsMaterial({
      size: 0.085, map: tex, vertexColors: true, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }))
    group.add(new THREE.Points(partGeo, partMat))

    // A node at each ear, so the stream lands somewhere rather than fading out.
    const earGeo = reg(new THREE.BufferGeometry())
    earGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      earL.x, earL.y, earL.z, earR.x, earR.y, earR.z,
    ]), 3))
    const earMat = reg(new THREE.PointsMaterial({
      size: 0.13, map: tex, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }))
    group.add(new THREE.Points(earGeo, earMat))

    // ── The olive, and the beat leaving it ─────────────────────────────────
    const oliveGeo = reg(new THREE.BufferGeometry())
    oliveGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([olive.x, olive.y, olive.z]), 3))
    const oliveMat = reg(new THREE.PointsMaterial({
      size: 0.46, map: tex, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }))
    group.add(new THREE.Points(oliveGeo, oliveMat))

    const AN = 26
    const aPos = new Float32Array(AN * 3)
    const aT = new Float32Array(AN)
    for (let i = 0; i < AN; i++) aT[i] = i / AN
    const ascGeo = reg(new THREE.BufferGeometry())
    ascGeo.setAttribute('position', new THREE.BufferAttribute(aPos, 3))
    const ascMat = reg(new THREE.PointsMaterial({
      size: 0.07, map: tex, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }))
    group.add(new THREE.Points(ascGeo, ascMat))
    const ascend = new THREE.QuadraticBezierCurve3(
      olive, new THREE.Vector3(0, 0.14, -0.04), new THREE.Vector3(0, 0.44, -0.02))

    let onScreen = true
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting }, { rootMargin: '120px' })
    io.observe(root)

    // ── Animation ──────────────────────────────────────────────────────────
    let last = performance.now(), t = 0
    let mix = speakers ? 1 : 0     // 0 = binaural, 1 = summed in air
    const tmp = new THREE.Vector3()
    const partPosAttr = partGeo.getAttribute('position') as THREE.BufferAttribute
    const partColAttr = partGeo.getAttribute('color') as THREE.BufferAttribute
    const firePosAttr = fireGeo.getAttribute('position') as THREE.BufferAttribute
    const ascPosAttr = ascGeo.getAttribute('position') as THREE.BufferAttribute

    function animate() {
      rafRef.current = requestAnimationFrame(animate)
      if (!onScreen || document.hidden) { last = performance.now(); return }
      const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now
      if (!reduced) t += dt

      // Ease between the two modes so flipping the switch is a transition of
      // the same scene, not a swap between two of them.
      mix += ((speakersRef.current ? 1 : 0) - mix) * Math.min(1, dt * 3)
      const neural = 1 - mix

      // Beat envelope — the brain brightens at the beat rate, but only when a
      // beat is actually being assembled.
      const env = 0.5 + 0.5 * Math.sin(t * Math.min(beat, 12) * 1.1)

      brainMat.color.copy(COOL).lerp(accent, neural * (0.55 + 0.45 * env))
      brainMat.opacity = 0.55 + neural * 0.40 * (0.6 + 0.4 * env)
      ;(brainHalo.material as THREE.PointsMaterial).color.copy(brainMat.color)
      ;(brainHalo.material as THREE.PointsMaterial).opacity = 0.03 + neural * 0.07
      wireMat.opacity = 0.12 + neural * 0.05
      filMat.color.copy(brainMat.color)
      filMat.opacity = 0.10 + neural * 0.15 * (0.5 + 0.5 * env)
      stemMat.color.copy(brainMat.color)
      stemMat.opacity = 0.35 + neural * 0.35

      // Firing nodes hop to new cells and flash.
      fireMat.color.copy(accent).lerp(WARM, mix)
      fireMat.opacity = (0.35 + 0.55 * env) * (0.35 + 0.65 * neural)
      for (let i = 0; i < FN; i++) {
        if (Math.random() < dt * 2.6) fIdx[i] = (Math.random() * BN) | 0
        const j = fIdx[i]
        fPos[i*3] = bPos[j*3]; fPos[i*3+1] = bPos[j*3+1]; fPos[i*3+2] = bPos[j*3+2]
      }
      firePosAttr.needsUpdate = true

      // Streams
      for (let s = 0; s < streams.length; s++) {
        const st = streams[s]
        const vis = st.onlySpeakers ? mix : st.nerve ? 1 : 1
        guideMats[s].opacity = 0.42 * vis
        for (let k = 0; k < PER; k++) {
          const i = s * PER + k
          pT[i] += dt * 0.30
          if (pT[i] > 1) pT[i] -= 1
          st.curve.getPoint(pT[i], tmp)
          pPos[i*3] = tmp.x; pPos[i*3+1] = tmp.y; pPos[i*3+2] = tmp.z
          // A nerve carrying summed sound is just traffic; carrying two
          // separable tones it is the thing that makes the beat.
          const c = st.nerve
            ? (st.color as THREE.Color).clone().lerp(WARM, mix)
            : (st.color as THREE.Color)
          const b = vis * (st.nerve ? 0.55 + 0.45 * env : 1)
          pCol[i*3] = c.r * b; pCol[i*3+1] = c.g * b; pCol[i*3+2] = c.b * b
        }
      }
      partPosAttr.needsUpdate = true; partColAttr.needsUpdate = true

      // The olive: lit and pulsing when it has two ears to compare, dark when
      // both ears carry the same thing.
      earMat.color.copy(COOL).lerp(WARM, mix)
      earMat.opacity = 0.42 + 0.2 * env
      oliveMat.color.copy(accent)
      oliveMat.opacity = 0.10 + neural * (0.45 + 0.55 * env)
      oliveMat.size = 0.34 + neural * 0.24 * env

      for (let i = 0; i < AN; i++) {
        aT[i] += dt * 0.5
        if (aT[i] > 1) aT[i] -= 1
        ascend.getPoint(aT[i], tmp)
        aPos[i*3] = tmp.x; aPos[i*3+1] = tmp.y; aPos[i*3+2] = tmp.z
      }
      ascPosAttr.needsUpdate = true
      ascMat.color.copy(accent)
      ascMat.opacity = neural * 0.85

      // A slow sway rather than a spin — the face should stay readable.
      group.rotation.y = -0.34 + Math.sin(t * 0.22) * 0.30
      group.rotation.x = Math.sin(t * 0.17) * 0.055
      camera.lookAt(0, 0.02, 0)
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
      cancelAnimationFrame(rafRef.current)
      tex.dispose()
      disposables.forEach(d => { try { d.dispose() } catch { /* noop */ } })
      renderer.dispose()
      if (root.contains(renderer.domElement)) root.removeChild(renderer.domElement)
    }
  // Rebuilt only on tone/beat; `speakers` rides a ref so flipping the switch
  // transitions the running scene instead of tearing it down.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tone, beat])

  return <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} />
}
