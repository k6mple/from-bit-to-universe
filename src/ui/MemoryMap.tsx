import { useEffect, useRef } from 'react'

const COLS = 32
const ROWS = 12
const TOTAL = COLS * ROWS

/** Hard ceiling on the backing store. On a runaway layout a canvas that sizes
 *  itself from its own rect will double forever; this is the circuit breaker. */
const MAX_EDGE = 2400

interface Cell {
  v: number
  target: number
  hue: number
}

/**
 * Physical memory, drawn rather than described.
 *
 * Pages are claimed and released in contiguous runs because that is how an
 * allocator actually behaves — scattered single-page noise would read as
 * decoration instead of a system.
 *
 * The canvas is absolutely positioned inside a fixed-height frame so its
 * intrinsic aspect ratio can never feed back into layout.
 */
export function MemoryMap({ active = true }: { active?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const cells = useRef<Cell[]>([])
  const raf = useRef(0)
  const tick = useRef(0)

  useEffect(() => {
    cells.current = Array.from({ length: TOTAL }, () => ({
      v: Math.random() < 0.42 ? 1 : 0,
      target: 0,
      hue: Math.random(),
    }))
    cells.current.forEach((c) => (c.target = c.v))
  }, [])

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    let lastW = -1
    let lastH = -1

    const resize = () => {
      const host = cv.parentElement
      if (!host) return
      const r = host.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = Math.max(1, Math.round(r.width))
      h = Math.max(1, Math.round(r.height))
      if (w === lastW && h === lastH) return
      lastW = w
      lastH = h
      cv.width = Math.min(MAX_EDGE, Math.round(w * dpr))
      cv.height = Math.min(MAX_EDGE, Math.round(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    // Observe the *host*, not the canvas — the host's size is set by CSS and
    // cannot be influenced by what we paint into the bitmap.
    const ro = new ResizeObserver(resize)
    if (cv.parentElement) ro.observe(cv.parentElement)

    let last = performance.now()
    const loop = (now: number) => {
      raf.current = requestAnimationFrame(loop)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!active || w < 2 || h < 2) return

      // ---- mutate the allocator -----------------------------------
      tick.current += dt
      if (tick.current > 0.16) {
        tick.current = 0
        const list = cells.current
        const runs = 2 + ((Math.random() * 3) | 0)
        for (let r = 0; r < runs; r++) {
          const start = (Math.random() * TOTAL) | 0
          const len = 1 + ((Math.random() * 7) | 0)
          const freeing = Math.random() < 0.45
          for (let k = 0; k < len; k++) {
            const c = list[(start + k) % TOTAL]
            c.target = freeing ? 0 : 0.55 + Math.random() * 0.45
            c.hue = Math.random()
          }
        }
        // The kernel's own pages never move.
        for (let k = 0; k < 26; k++) list[k].target = 1
      }

      // ---- draw ----------------------------------------------------
      ctx.clearRect(0, 0, w, h)
      const gap = 2
      const cw = (w - gap * (COLS - 1)) / COLS
      const ch = (h - gap * (ROWS - 1)) / ROWS
      const k = 1 - Math.exp(-7 * dt)

      for (let i = 0; i < TOTAL; i++) {
        const c = cells.current[i]
        c.v += (c.target - c.v) * k
        const x = (i % COLS) * (cw + gap)
        const y = ((i / COLS) | 0) * (ch + gap)
        const kernel = i < 26

        if (c.v < 0.01) {
          ctx.fillStyle = 'rgba(232,238,245,0.035)'
        } else if (kernel) {
          ctx.fillStyle = `rgba(155,123,255,${0.28 + c.v * 0.5})`
        } else {
          const r = 90 + c.hue * 60
          const g = 170 + c.hue * 60
          ctx.fillStyle = `rgba(${r | 0},${g | 0},255,${0.1 + c.v * 0.72})`
        }
        ctx.fillRect(x, y, Math.max(1, cw), Math.max(1, ch))
      }

      // a slow sweep, so the map is never a still image
      const sy = ((now * 0.035) % (h + 60)) - 30
      const grad = ctx.createLinearGradient(0, sy - 22, 0, sy + 22)
      grad.addColorStop(0, 'rgba(143,216,255,0)')
      grad.addColorStop(0.5, 'rgba(143,216,255,0.09)')
      grad.addColorStop(1, 'rgba(143,216,255,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, sy - 22, w, 44)
    }
    raf.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf.current)
      ro.disconnect()
    }
  }, [active])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <canvas ref={ref} className="absolute inset-0 block h-full w-full" aria-hidden />
    </div>
  )
}
