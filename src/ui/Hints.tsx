import { useEffect, useRef } from 'react'
import { chapterGlow, world } from '../lib/world'

/**
 * Interaction prompts, written to the DOM from the render loop.
 *
 * Chapter-specific because a single generic "scroll" hint is the tell of a
 * page that has not thought about what the visitor should be doing.
 */
export function Hints() {
  const die = useRef<HTMLDivElement>(null)
  const dieLabel = useRef<HTMLSpanElement>(null)
  const dieDetail = useRef<HTMLSpanElement>(null)
  const net = useRef<HTMLDivElement>(null)
  const lastLabel = useRef('__')

  useEffect(() => {
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const seg = world.seg

      // --- chapter 02 · die inspection ------------------------------
      if (die.current) {
        const o = chapterGlow(seg, 2)
        die.current.style.opacity = String(o)
        die.current.style.transform = `translateY(${(1 - o) * 14}px)`
        const has = world.hoverBlock >= 0
        if (dieLabel.current && world.hoverLabel !== lastLabel.current) {
          lastLabel.current = world.hoverLabel
          dieLabel.current.textContent = has ? world.hoverLabel : 'MOVE ACROSS THE DIE'
          if (dieDetail.current) {
            dieDetail.current.textContent = has
              ? world.hoverDetail
              : `${world.hoverBlock >= 0 ? '' : '36 functional regions'}`
          }
        }
      }

      // --- chapter 03 · the network --------------------------------
      if (net.current) {
        const o = chapterGlow(seg, 3)
        net.current.style.opacity = String(o)
        net.current.style.transform = `translateY(${(1 - o) * 14}px)`
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[clamp(22px,4.5vh,54px)] z-30 flex justify-center px-[var(--gutter)]">
      {/* die readout */}
      <div
        ref={die}
        className="absolute flex flex-col items-center gap-1.5"
        style={{ opacity: 0, transition: 'opacity 120ms linear' }}
      >
        <span className="mono flex items-center gap-2 text-[10px] tracking-[0.3em] text-ice uppercase">
          <span
            className="inline-block h-[5px] w-[5px] rounded-full bg-ice"
            style={{ boxShadow: '0 0 10px 1px rgba(143,216,255,0.9)' }}
          />
          <span ref={dieLabel} className="tabular-nums">
            MOVE ACROSS THE DIE
          </span>
        </span>
        <span
          ref={dieDetail}
          className="mono text-[9px] tracking-[0.2em] text-[rgba(232,238,245,0.36)] uppercase"
        />
      </div>

      {/* network prompt */}
      <div
        ref={net}
        className="absolute flex items-center gap-2.5"
        style={{ opacity: 0, transition: 'opacity 120ms linear' }}
      >
        <span
          className="inline-block h-[6px] w-[6px] rounded-full"
          style={{
            background: '#8fd8ff',
            boxShadow: '0 0 12px 2px rgba(143,216,255,0.8)',
            animation: 'breathe 2.2s ease-in-out infinite',
          }}
        />
        <span className="mono text-[10px] tracking-[0.34em] text-[rgba(143,216,255,0.85)] uppercase">
          Press a node
        </span>
      </div>
    </div>
  )
}
