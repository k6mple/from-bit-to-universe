import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

/**
 * The loader is part of the piece, not a gate in front of it.
 *
 * It reports the real work (eight structures are being generated on the main
 * thread) with a binary counter and a hairline that fills. When it finishes,
 * the hairline collapses into the point of light that opens the film.
 */
export function Preloader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const [pct, setPct] = useState(0)
  const [label, setLabel] = useState('INITIALISING')
  const [bits, setBits] = useState('0000 0000')
  const doneRef = useRef(false)

  useEffect(() => {
    const onProgress = (p: number, l: string) => {
      setPct(Math.round(p * 100))
      setLabel(l)
      if (bar.current) bar.current.style.transform = `scaleX(${Math.max(0.02, p)})`
    }
    ;(window as unknown as { __fbtuProgress?: typeof onProgress }).__fbtuProgress = onProgress
    return () => {
      delete (window as unknown as { __fbtuProgress?: typeof onProgress }).__fbtuProgress
    }
  }, [])

  // A little machine counting to itself while it waits.
  useEffect(() => {
    const id = window.setInterval(() => {
      const v = (Math.random() * 65535) | 0
      setBits(v.toString(2).padStart(16, '0').replace(/(.{4})(?=.)/g, '$1 '))
    }, 90)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const check = window.setInterval(() => {
      const w = window as unknown as { __fbtuReady?: boolean }
      if (w.__fbtuReady && !doneRef.current) {
        doneRef.current = true
        window.clearInterval(check)
        setPct(100)
        setLabel('READY')
        const tl = gsap.timeline({
          onComplete: () => {
            document.body.classList.remove('is-locked')
            onDone()
          },
        })
        tl.to(bar.current, { scaleX: 1, duration: 0.24, ease: 'power2.out' })
          .to('[data-pl="label"]', { opacity: 0, duration: 0.3 }, 0.18)
          .to(bar.current, { scaleX: 0, duration: 0.7, ease: 'expo.inOut' }, 0.42)
          .to(
            root.current,
            { opacity: 0, duration: 0.85, ease: 'power2.inOut' },
            0.75,
          )
      }
    }, 120)
    return () => window.clearInterval(check)
  }, [onDone])

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-void px-6"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="flex w-full max-w-[min(340px,72vw)] flex-col items-center gap-5">
        <div
          data-pl="label"
          className="mono flex w-full items-center justify-between text-[10px] tracking-[0.28em] text-[rgba(143,216,255,0.62)] uppercase"
        >
          <span>{label}</span>
          <span className="tabular-nums text-[rgba(232,238,245,0.4)]">
            {String(pct).padStart(3, '0')}
          </span>
        </div>

        <div className="relative h-[1px] w-full overflow-hidden bg-[rgba(232,238,245,0.1)]">
          <span
            ref={bar}
            className="absolute inset-0 origin-left bg-[linear-gradient(90deg,#2e7dd1,#8fd8ff_60%,#ffffff)]"
            style={{ transform: 'scaleX(0.02)', boxShadow: '0 0 12px rgba(143,216,255,0.75)' }}
          />
        </div>

        <div
          data-pl="label"
          className="mono text-[10px] tracking-[0.42em] text-[rgba(232,238,245,0.22)] tabular-nums"
        >
          {bits}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-[8vh] flex justify-center">
        <p
          data-pl="label"
          className="mono text-[9px] tracking-[0.5em] text-[rgba(232,238,245,0.16)] uppercase"
        >
          From Bit to Universe
        </p>
      </div>
    </div>
  )
}
