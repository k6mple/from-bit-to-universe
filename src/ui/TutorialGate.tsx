import { useEffect, useRef, type CSSProperties } from 'react'
import { clamp, smoothstep, world } from '../lib/world'

/**
 * The way out of the piece.
 *
 * Seven chapters have taught the visitor exactly one gesture, so the exit is
 * built out of it rather than out of a timer. The button rides the stage up
 * from below the fold on the visitor's own scrolling — it is never animated
 * into place — and the space around it comes apart as it settles: a feathered
 * frost, the one defocus in the film that is not part of the render.
 *
 * The section is a screenful taller than the viewport, and that extra
 * screenful is the whole mechanism. It is what the stage is sticky against,
 * so the rise costs nothing but a sticky child, and what it leaves over is
 * the hold — the beat where the door simply stands in the middle of an empty
 * cosmos before the visitor takes it.
 */
export function TutorialGate() {
  const root = useRef<HTMLElement>(null)
  const frost = useRef<HTMLDivElement>(null)
  const door = useRef<HTMLAnchorElement>(null)
  const reduced = world.reduced

  useEffect(() => {
    const el = root.current
    const veil = frost.current
    // Under reduced motion there is nothing to scrub: the composition is
    // already at rest, and only the page itself moves.
    if (!el || !veil || reduced) return

    // Geometry is sampled on a cadence, not per frame — this section's box
    // never moves once the fonts have settled, and reading layout inside the
    // loop would force a reflow on every tick.
    let enter = 0
    let span = 1
    let at = 0
    const measure = () => {
      const r = el.getBoundingClientRect()
      enter = r.top + window.scrollY - window.innerHeight
      span = Math.max(1, r.height)
    }
    const onResize = () => {
      at = 0
    }

    let lastBloom = -1
    let lastTab = -1
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const now = performance.now()
      if (now > at) {
        at = now + 400
        measure()
      }

      // How much of the exit section has gone past. 0 is the frame its top
      // crosses the fold, with the button still below it; 1 is the end of the
      // document, with the button held dead centre.
      const q = clamp((window.scrollY - enter) / span, 0, 1)
      // Deliberately overlapping the rise: the defocus has to be underway
      // while the door is still travelling, or it reads as a second,
      // unrelated event rather than the space responding to it.
      const bloom = smoothstep(0.16, 0.8, q)

      if (bloom !== lastBloom) {
        lastBloom = bloom
        veil.style.opacity = bloom.toFixed(3)
        veil.style.transform = `scale(${(0.62 + 0.38 * bloom).toFixed(4)})`
      }

      // Kept out of the tab order until it is genuinely on screen.
      const tab = q > 0.3 ? 0 : -1
      if (tab !== lastTab && door.current) {
        lastTab = tab
        door.current.tabIndex = tab
      }
    }
    raf = requestAnimationFrame(loop)
    window.addEventListener('resize', onResize, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [reduced])

  return (
    <section ref={root} className="gate">
      <div className="stage">
        <div className="stage-fill relative flex h-full w-full flex-col items-center justify-center">
          <div
            ref={frost}
            aria-hidden
            className={reduced ? 'gate-frost gate-frost-static' : 'gate-frost'}
            style={{ '--gate-blur': world.tier === 'high' ? '18px' : '12px' } as CSSProperties}
          />
          <a
            ref={door}
            href="./tutorial.html"
            className="gate-door"
            tabIndex={reduced ? 0 : -1}
          >
            <span className="gate-door-label">查看教程</span>
          </a>
        </div>
      </div>
    </section>
  )
}
