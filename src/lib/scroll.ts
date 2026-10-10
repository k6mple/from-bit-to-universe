import { CHAPTER_COUNT, world } from './world'

export interface ScrollRig {
  dispose: () => void
}

/**
 * Maps raw scroll position onto the film's timeline.
 *
 * Every chapter is a section of `H` viewport-heights containing a sticky
 * stage. The stage is pinned for exactly `H - 1` viewport-heights of scroll —
 * that window *is* the chapter. Between two pinned windows the outgoing stage
 * slides up while the next slides in; the shape holds steady through it, which
 * is what makes the transitions read as continuous rather than cut.
 */
export function initScroll(
  sections: HTMLElement[],
  onChange?: (chapterIndex: number) => void,
): ScrollRig {
  let bounds: { start: number; end: number }[] = []
  let lastChapter = -1
  let measureAt = 0

  const measure = () => {
    const vh = window.innerHeight
    bounds = sections.map((el) => {
      const start = el.offsetTop
      const end = Math.max(start + 1, start + el.offsetHeight - vh)
      return { start, end }
    })
  }

  const apply = () => {
    const y = window.scrollY || window.pageYOffset || 0
    const doc = document.documentElement
    const max = Math.max(1, doc.scrollHeight - window.innerHeight)
    world.scroll = y / max

    if (!bounds.length) return

    let seg = CHAPTER_COUNT - 1
    if (y <= bounds[0].start) {
      seg = 0
    } else {
      let found = false
      for (let i = 0; i < bounds.length; i++) {
        const b = bounds[i]
        if (y >= b.start && y < b.end) {
          seg = i + (y - b.start) / (b.end - b.start)
          found = true
          break
        }
      }
      if (!found) {
        // Inside a hand-off between two pinned windows: hold the incoming
        // chapter's shape so nothing flickers mid-transition.
        seg = CHAPTER_COUNT - 1
        for (let i = 0; i < bounds.length - 1; i++) {
          if (y >= bounds[i].end && y < bounds[i + 1].start) {
            seg = i + 1
            break
          }
        }
      }
    }

    // --- structure coordinate ----------------------------------------
    // Holds at c+1 through chapter c's pinned window, advances c+1 → c+2
    // across the hand-off that follows it. The hand-off is the only place the
    // page has room for the transformation: during a pinned window `seg`
    // already carries the chapter's own progress, and pinning `rise` there is
    // what keeps the structure settled while the words arrive.
    let rise = CHAPTER_COUNT
    for (let i = 0; i < bounds.length; i++) {
      const b = bounds[i]
      if (y < b.end) {
        rise = i + 1
        break
      }
      const nextTop = i + 1 < bounds.length ? bounds[i + 1].start : b.end
      if (y < nextTop) {
        const span = Math.max(1, nextTop - b.end)
        rise = i + 1 + (y - b.end) / span
        break
      }
    }
    world.rise = Math.max(1, Math.min(CHAPTER_COUNT - 0.0001, rise))

    // Guard against pathological layouts.
    //
    // `seg` is continuous: chapter i occupies [i, i+1), so the valid range is
    // [0, CHAPTER_COUNT) and NOT [0, CHAPTER_COUNT-1]. Clamping to the last
    // chapter *index* silently flattens the final chapter's progress to zero,
    // which left the whole finale rendering the previous chapter's shape.
    if (!Number.isFinite(seg)) seg = 0
    world.seg = Math.max(0, Math.min(CHAPTER_COUNT - 0.0001, seg))

    for (let i = 0; i < CHAPTER_COUNT; i++) {
      const b = bounds[i]
      if (!b) continue
      world.ch[i] = Math.max(0, Math.min(1, (y - b.start) / (b.end - b.start)))
    }

    if (onChange) {
      const idx = Math.round(world.seg)
      if (idx !== lastChapter) {
        lastChapter = idx
        onChange(idx)
      }
    }
  }

  let raf = 0
  const schedule = () => {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      const now = performance.now()
      if (now > measureAt) {
        measureAt = now + 300
        measure()
      }
      apply()
    })
  }

  const onResize = () => {
    measureAt = 0
    schedule()
  }

  measure()
  apply()

  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
  window.addEventListener('orientationchange', onResize, { passive: true })

  // Late layout shifts (webfont swap, mobile URL bar) — re-measure a few times.
  const t1 = window.setTimeout(onResize, 250)
  const t2 = window.setTimeout(onResize, 1200)
  const t3 = window.setTimeout(onResize, 3000)

  return {
    dispose: () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      if (raf) cancelAnimationFrame(raf)
    },
  }
}

/**
 * Scroll to a chapter's pinned window.
 * `at` nudges within the chapter — 0 is its opening frame, 0.5 its midpoint.
 */
export function scrollToChapter(index: number, smooth = true, at = 0.12) {
  if (typeof document === 'undefined') return
  const sections = document.querySelectorAll<HTMLElement>('[data-chapter]')
  const el = sections[index]
  if (!el) return
  const vh = window.innerHeight
  const span = Math.max(1, el.offsetHeight - vh)
  const target = el.offsetTop + span * at
  window.scrollTo({ top: target, behavior: smooth ? 'smooth' : 'auto' })
}

/** Chapter id → index, for deep links like `#processor`. */
export function chapterIndexFromHash(sections: HTMLElement[]): number | null {
  if (typeof window === 'undefined') return null
  const id = window.location.hash.replace('#', '').trim()
  if (!id) return null
  const i = sections.findIndex((el) => el.id === id)
  return i >= 0 ? i : null
}
