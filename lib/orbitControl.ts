/**
 * Drag to turn, pinch or wheel to zoom, for the 3D viewports.
 *
 * Two behaviours that are not the obvious defaults:
 *
 * A vertical drag scrolls the page rather than tilting the model. A viewport
 * that swallows vertical drags is a trap on a phone — the reader gets stuck
 * inside it and cannot get past. Horizontal intent turns the model, vertical
 * intent belongs to the document, and the first few pixels of a gesture decide
 * which one it was.
 *
 * Rotation is never taken back. Zoom eases home after a while, because a
 * viewport left at whatever scale a pinch ended on stops being a composition —
 * but the angle someone chose is a decision, and snapping away from it would
 * undo their look at the thing.
 */

export interface Orbit {
  /** Current yaw/pitch in radians, and camera distance. */
  readonly yaw: number
  readonly pitch: number
  readonly dist: number
  /** Advance one frame. Applies damping, idle spin and the zoom's drift home. */
  tick(dt: number): void
  detach(): void
}

export function createOrbit(el: HTMLElement, opts: {
  baseDist: number
  minDist: number
  maxDist: number
  /** Radians per second of unattended drift. */
  idleSpin?: number
  /** Quiet time before zoom eases back to baseDist. */
  zoomHomeMs?: number
  /** Opening angle. A model shown dead-on reads flat; three-quarters reads solid. */
  initialYaw?: number
  initialPitch?: number
}): Orbit {
  const idleSpin = opts.idleSpin ?? 0.16
  const zoomHomeMs = opts.zoomHomeMs ?? 8000
  const PITCH_LIMIT = 0.85          // stop short of the poles, where it gimbals

  let yaw = opts.initialYaw ?? 0, pitch = opts.initialPitch ?? 0, dist = opts.baseDist
  let velYaw = 0, velPitch = 0
  let lastZoom = -Infinity
  let dragging = false
  let decided: 'none' | 'rotate' | 'scroll' = 'none'
  let px = 0, py = 0, sx = 0, sy = 0
  let pinchDist = 0
  let pointerId: number | null = null

  const zoomBy = (f: number) => {
    dist = Math.max(opts.minDist, Math.min(opts.maxDist, dist * f))
    lastZoom = performance.now()
  }

  const onWheel = (e: WheelEvent) => { e.preventDefault(); zoomBy(Math.exp(e.deltaY * 0.0015)) }

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    dragging = true
    decided = e.pointerType === 'mouse' ? 'rotate' : 'none'
    pointerId = e.pointerId
    px = sx = e.clientX; py = sy = e.clientY
    velYaw = velPitch = 0
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging || (pointerId !== null && e.pointerId !== pointerId)) return
    const dx = e.clientX - px, dy = e.clientY - py

    // Touch: work out what the gesture is for before committing to it.
    if (decided === 'none') {
      const tx = Math.abs(e.clientX - sx), ty = Math.abs(e.clientY - sy)
      if (tx < 6 && ty < 6) return
      decided = tx > ty ? 'rotate' : 'scroll'
      if (decided === 'scroll') { dragging = false; return }
      try { el.setPointerCapture(e.pointerId) } catch { /* not capturable */ }
    }

    if (e.cancelable) e.preventDefault()
    yaw += dx * 0.0075
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch + dy * 0.005))
    velYaw = dx * 0.0075
    velPitch = dy * 0.005
    px = e.clientX; py = e.clientY
  }

  const endDrag = (e?: PointerEvent) => {
    dragging = false
    decided = 'none'
    pointerId = null
    if (e) { try { el.releasePointerCapture(e.pointerId) } catch { /* noop */ } }
  }

  // Pinch stays on touch events: two simultaneous pointers are simpler to read
  // here than reconstructing them from pointer events.
  const distOf = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
  const onTouchStart = (e: TouchEvent) => { if (e.touches.length === 2) { pinchDist = distOf(e.touches); dragging = false } }
  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 2) return
    e.preventDefault()
    const d = distOf(e.touches)
    if (pinchDist > 0 && d > 0) zoomBy(pinchDist / d)
    pinchDist = d
  }
  const onTouchEnd = (e: TouchEvent) => { if (e.touches.length < 2) pinchDist = 0 }
  const preventGesture = (e: Event) => e.preventDefault()

  el.addEventListener('wheel', onWheel, { passive: false })
  el.addEventListener('pointerdown', onPointerDown)
  el.addEventListener('pointermove', onPointerMove, { passive: false })
  el.addEventListener('pointerup', endDrag)
  el.addEventListener('pointercancel', endDrag)
  el.addEventListener('pointerleave', endDrag)
  el.addEventListener('touchstart', onTouchStart, { passive: false })
  el.addEventListener('touchmove', onTouchMove, { passive: false })
  el.addEventListener('touchend', onTouchEnd)
  el.addEventListener('gesturestart', preventGesture)
  el.addEventListener('gesturechange', preventGesture)

  return {
    get yaw() { return yaw },
    get pitch() { return pitch },
    get dist() { return dist },
    tick(dt: number) {
      if (!dragging) {
        // Carry the throw, then hand back to the slow drift.
        yaw += velYaw
        pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch + velPitch))
        velYaw *= 0.92
        velPitch *= 0.92
        if (Math.abs(velYaw) < 0.0004) { velYaw = 0; yaw += idleSpin * dt }
        if (Math.abs(velPitch) < 0.0004) velPitch = 0

        if (performance.now() - lastZoom > zoomHomeMs) {
          dist += (opts.baseDist - dist) * Math.min(1, dt * 1.1)
          if (Math.abs(dist - opts.baseDist) < 0.002) dist = opts.baseDist
        }
      }
    },
    detach() {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endDrag)
      el.removeEventListener('pointercancel', endDrag)
      el.removeEventListener('pointerleave', endDrag)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('gesturestart', preventGesture)
      el.removeEventListener('gesturechange', preventGesture)
    },
  }
}
