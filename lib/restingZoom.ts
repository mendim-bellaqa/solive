/**
 * Camera distance that remembers where it is supposed to sit.
 *
 * Pinch and wheel move the camera freely, but a viewport left at whatever
 * distance the last gesture happened to end on is not a composition — it is
 * wherever a finger slipped. After a few seconds of no input the distance eases
 * back to a framing that was actually designed, so every session starts and
 * settles at the same readable size.
 *
 * The resting distance is deliberately further out than the old default. The
 * previews were framed so tight that the subject ran to the edges of its box
 * with no air around it.
 */
export interface RestingZoom {
  /** Current camera distance. */
  readonly z: number
  /** Multiply the distance (>1 = further away). Restarts the idle countdown. */
  apply(factor: number): void
  /** Advance one frame; returns the distance to assign to the camera. */
  tick(dt: number): number
}

export function createRestingZoom(opts: {
  /** The framing to return to. */
  base: number
  min: number
  max: number
  /** Quiet time before the drift home begins. */
  idleMs?: number
}): RestingZoom {
  const idleMs = opts.idleMs ?? 5000
  let z = opts.base
  // -Infinity rather than now(): a viewport nobody has touched is already at
  // rest, so it must not spend its first five seconds "returning".
  let lastInput = -Infinity

  return {
    get z() { return z },
    apply(factor: number) {
      z = Math.max(opts.min, Math.min(opts.max, z * factor))
      lastInput = performance.now()
    },
    tick(dt: number) {
      if (performance.now() - lastInput < idleMs) return z
      // Ease rather than snap — a cut back to the resting distance reads as a
      // glitch, a glide reads as the camera settling.
      z += (opts.base - z) * Math.min(1, dt * 1.8)
      if (Math.abs(z - opts.base) < 0.002) z = opts.base
      return z
    },
  }
}
