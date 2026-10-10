import { world } from './world'

let bound = false

/** One global pointer listener; every scene reads `world.pointer`. */
export function bindPointer() {
  if (bound || typeof window === 'undefined') return () => {}
  bound = true

  const set = (cx: number, cy: number) => {
    world.pointer.x = (cx / window.innerWidth) * 2 - 1
    world.pointer.y = -((cy / window.innerHeight) * 2 - 1)
  }

  const onMove = (e: PointerEvent) => set(e.clientX, e.clientY)
  const onLeave = () => {
    world.pointer.x = 0
    world.pointer.y = 0
  }
  const onTouch = (e: TouchEvent) => {
    if (e.touches.length) set(e.touches[0].clientX, e.touches[0].clientY)
  }

  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerleave', onLeave, { passive: true })
  window.addEventListener('touchmove', onTouch, { passive: true })

  return () => {
    bound = false
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerleave', onLeave)
    window.removeEventListener('touchmove', onTouch)
  }
}
