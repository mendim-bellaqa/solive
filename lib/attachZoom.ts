// Two-finger pinch-to-zoom for a canvas/visualizer surface.
// Captures the gesture (preventDefault + iOS gesture events) so the browser
// zooms the 3D object instead of the whole page. `onZoom` receives a
// multiplicative factor (>1 = zoom out / farther, <1 = zoom in / closer).
export function attachPinchZoom(el: HTMLElement, onZoom: (factor: number) => void): () => void {
  let lastDist = 0
  const distOf = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)

  const onStart = (e: TouchEvent) => { if (e.touches.length === 2) lastDist = distOf(e.touches) }
  const onMove = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()                       // stop the page from pinch-zooming
      const d = distOf(e.touches)
      if (lastDist > 0 && d > 0) onZoom(lastDist / d)
      lastDist = d
    }
  }
  const onEnd = (e: TouchEvent) => { if (e.touches.length < 2) lastDist = 0 }
  const prevent = (e: Event) => e.preventDefault()   // iOS Safari page-zoom gesture

  el.addEventListener('touchstart', onStart, { passive: false })
  el.addEventListener('touchmove', onMove, { passive: false })
  el.addEventListener('touchend', onEnd)
  el.addEventListener('touchcancel', onEnd)
  el.addEventListener('gesturestart', prevent as EventListener)
  el.addEventListener('gesturechange', prevent as EventListener)

  return () => {
    el.removeEventListener('touchstart', onStart)
    el.removeEventListener('touchmove', onMove)
    el.removeEventListener('touchend', onEnd)
    el.removeEventListener('touchcancel', onEnd)
    el.removeEventListener('gesturestart', prevent as EventListener)
    el.removeEventListener('gesturechange', prevent as EventListener)
  }
}
