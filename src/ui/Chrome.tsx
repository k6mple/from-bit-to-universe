import { useEffect, useRef } from 'react'
import { CHAPTERS } from '../content'
import { world } from '../lib/world'
import { scrollToChapter } from '../lib/scroll'

const LAST = CHAPTERS.length - 1

/**
 * The instrument chrome: a mark, a live readout, and a progress rail.
 *
 * Driven straight from the render loop with direct DOM writes — the readout
 * changes sixty times a second and re-rendering React for it would be an
 * absurd way to spend a frame budget.
 */
export function Chrome({ visible }: { visible: boolean }) {
  const fill = useRef<HTMLDivElement>(null)
  const readout = useRef<HTMLSpanElement>(null)
  const bars = useRef<(HTMLSpanElement | null)[]>([])
  const lastLabel = useRef('')
  const lastTick = useRef(-1)

  useEffect(() => {
    if (!visible) return
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const seg = world.seg

      if (fill.current) {
        fill.current.style.transform = `scaleY(${Math.max(0.006, seg / LAST)})`
      }

      const idx = Math.max(0, Math.min(LAST, Math.floor(seg)))
      if (idx !== lastTick.current) {
        lastTick.current = idx
        bars.current.forEach((el, i) => {
          if (!el) return
          const on = i === idx
          el.style.width = on ? '26px' : '12px'
          el.style.background = on ? '#8fd8ff' : 'rgba(232,238,245,0.2)'
          el.style.boxShadow = on ? '0 0 10px rgba(143,216,255,0.8)' : 'none'
        })
      }

      // The chapter name is dropped on narrow screens, where it collides with
      // the wordmark.
      const wide = window.innerWidth >= 640
      const label = wide
        ? `${CHAPTERS[idx].index} / ${CHAPTERS[LAST].index}   ${CHAPTERS[idx].label}`
        : `${CHAPTERS[idx].index} / ${CHAPTERS[LAST].index}`
      if (readout.current && label !== lastLabel.current) {
        lastLabel.current = label
        readout.current.textContent = label
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [visible])

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 transition-opacity duration-[1200ms]"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden={!visible}
    >
      {/* --- top bar ------------------------------------------------- */}
      <header className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-[var(--gutter)] py-[clamp(14px,2.4vh,26px)]">
        <div className="mono flex min-w-0 items-center gap-[0.7em] text-[10px] tracking-[0.34em] text-[rgba(232,238,245,0.52)] uppercase">
          <span
            className="inline-block h-[5px] w-[5px] shrink-0 rounded-full bg-ice"
            style={{
              boxShadow: '0 0 10px 1px rgba(143,216,255,0.9)',
              animation: 'breathe 3.6s ease-in-out infinite',
            }}
          />
          {/* The wordmark needs ~180px; below that it fights the readout. */}
          <span className="hidden whitespace-nowrap sm:inline">From Bit to Universe</span>
        </div>
        <div className="flex shrink-0 items-center gap-[clamp(10px,1.6vw,22px)]">
          <span
            ref={readout}
            className="mono shrink-0 text-right text-[10px] tracking-[0.3em] whitespace-nowrap text-[rgba(143,216,255,0.62)] tabular-nums"
          />
          <span className="h-[11px] w-px shrink-0 bg-[rgba(232,238,245,0.14)]" aria-hidden />
          {/* The one way out of the piece. Inert until the chrome fades in. */}
          <a
            href="./tutorial.html"
            tabIndex={visible ? 0 : -1}
            style={{ pointerEvents: visible ? 'auto' : 'none' }}
            className="linky mono shrink-0 text-[10px] tracking-[0.3em] whitespace-nowrap uppercase"
          >
            Tutorial
          </a>
        </div>
      </header>

      {/* --- progress rail ------------------------------------------- */}
      <nav
        className="pointer-events-auto absolute top-1/2 right-[max(0.75rem,calc(var(--gutter)*0.4))] hidden -translate-y-1/2 md:block"
        aria-label="Chapters"
      >
        <div className="relative h-[38vh] w-[132px]">
          {/* track */}
          <div className="absolute top-0 right-[7px] h-full w-[1px] bg-[rgba(232,238,245,0.08)]" />
          {/* filled portion, written by the render loop */}
          <div
            ref={fill}
            className="absolute top-0 right-[7px] h-full w-[1px] origin-top"
            style={{
              transform: 'scaleY(0.006)',
              background: 'linear-gradient(180deg, rgba(143,216,255,0.12), #8fd8ff)',
              boxShadow: '0 0 10px rgba(143,216,255,0.5)',
            }}
          />
          <ul className="relative z-10 flex h-full flex-col items-end justify-between">
            {CHAPTERS.map((c, i) => (
              <li key={c.id} className="group relative flex h-[16px] items-center">
                <span className="pointer-events-none absolute right-[22px] translate-x-1.5 whitespace-nowrap text-right opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100">
                  <span className="mono text-[9px] tracking-[0.28em] text-[rgba(143,216,255,0.8)] uppercase">
                    {c.index} {c.label}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => scrollToChapter(i)}
                  className="flex h-[16px] w-[40px] cursor-pointer items-center justify-end pr-[0px]"
                  aria-label={`Go to chapter ${c.index} ${c.label}`}
                >
                  <span
                    ref={(el) => {
                      bars.current[i] = el
                    }}
                    className="block h-[2px] rounded-full transition-[width,background,box-shadow] duration-500"
                    style={{ width: '12px', background: 'rgba(232,238,245,0.2)' }}
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  )
}
