import { useEffect, useRef, type ReactNode } from 'react'
import { world } from '../lib/world'

/**
 * A button that leans toward the hand.
 *
 * Radial, not axis-aligned: the pull only begins inside a radius around the
 * element and eases off with distance, which is what separates a considered
 * micro-interaction from a element that just follows the cursor.
 */
export function Magnetic({
  children,
  strength = 0.3,
  radius = 130,
  className = '',
}: {
  children: ReactNode
  strength?: number
  radius?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (world.reduced || world.tier === 'low') return
    if (window.matchMedia('(hover: none)').matches) return

    let raf = 0
    let tx = 0
    let ty = 0
    let cx = 0
    let cy = 0
    let inside = false

    const tick = () => {
      raf = requestAnimationFrame(tick)
      tx += (cx - tx) * 0.14
      ty += (cy - ty) * 0.14
      el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`
    }
    raf = requestAnimationFrame(tick)

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const ex = r.left + r.width / 2
      const ey = r.top + r.height / 2
      const dx = e.clientX - ex
      const dy = e.clientY - ey
      const d = Math.hypot(dx, dy)
      const reach = radius + Math.max(r.width, r.height) / 2
      if (d < reach) {
        inside = true
        const falloff = 1 - d / reach
        cx = dx * strength * falloff
        cy = dy * strength * falloff
        el.style.willChange = 'transform'
      } else if (inside) {
        inside = false
        cx = 0
        cy = 0
        el.style.willChange = ''
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [strength, radius])

  return (
    <span ref={ref} className={`inline-block ${className}`}>
      {children}
    </span>
  )
}
