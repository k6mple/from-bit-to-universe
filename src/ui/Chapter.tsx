import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { ChapterCopy } from '../content'
import { world } from '../lib/world'

gsap.registerPlugin(ScrollTrigger)

/**
 * The stage is a flex column, so `justify-*` is the vertical axis and
 * `items-*` is the horizontal one. Written justify-first throughout because
 * getting these the wrong way round is the easiest way to silently ruin a
 * chapter's composition.
 */
const ALIGN: Record<ChapterCopy['align'], string> = {
  center: 'justify-center items-center text-center',
  left: 'justify-center items-start text-left',
  right: 'justify-center items-end text-right',
  'bottom-left': 'justify-end items-start text-left pb-[13vh]',
  'top-left': 'justify-start items-start text-left pt-[17vh]',
  'top-center': 'justify-start items-center text-center pt-[15vh]',
  // panel chapters own the whole viewport height
  panel: 'justify-start items-stretch text-left pt-[11vh] pb-[7vh]',
  // the opening: numeral above, headline anchored to the lower third
  hero: 'justify-end items-center text-center pb-[6.5vh]',
}

export interface ChapterProps {
  chapter: ChapterCopy
  index: number
  children: ReactNode
  /** scroll fraction at which the block begins to leave */
  exitAt?: number
  /** the opening chapter reveals on a timer, not on scroll */
  hero?: boolean
  /** signal to start the hero reveal */
  play?: boolean
}

/**
 * One chapter = one pinned window.
 *
 * Entrance is scrubbed against the visitor's own scroll so they drive the
 * reveal; the rhythm inside the block is deliberately uneven (heading, then
 * the Chinese line, then the explanatory sentence) because a single uniform
 * fade is the fastest way to make an expensive page look cheap.
 */
export function Chapter({ chapter, index, children, exitAt = 0.88, hero = false, play = false }: ChapterProps) {
  const ref = useRef<HTMLElement>(null)
  const heroTl = useRef<gsap.core.Timeline | null>(null)

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return

    const ctx = gsap.context(() => {
      const masks = gsap.utils.toArray<HTMLElement>('.mask-i', root)
      const enter = gsap.utils.toArray<HTMLElement>('[data-r]', root)

      if (world.reduced) {
        gsap.set([...masks, ...enter], { opacity: 1, y: 0, yPercent: 0 })
        return
      }

      gsap.set(masks, { yPercent: 116, opacity: 0 })
      gsap.set(enter, { opacity: 0, y: 20 })

      // Only ever tween what is actually on the page — a chapter without a
      // lede or without extra furniture should not warn about missing targets.
      const at = (tl: gsap.core.Timeline, sel: string, vars: gsap.TweenVars, pos: number) => {
        const t = root.querySelectorAll<HTMLElement>(sel)
        if (t.length) tl.to(t, vars, pos)
      }

      if (hero) {
        const tl = gsap.timeline({ paused: true })
        tl.to(masks, { yPercent: 0, opacity: 1, duration: 1.25, stagger: 0.085, ease: 'expo.out' }, 0)
        at(tl, '[data-r="sub"]', { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' }, 0.42)
        at(tl, '[data-r="cue"]', { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' }, 0.95)
        heroTl.current = tl

        // On scroll the hero simply leaves; the particle field does the rest.
        gsap.to('[data-hero-block]', {
          opacity: 0,
          y: -70,
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.7,
          },
        })
        return
      }

      const tl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.85,
        },
      })
      const n = Math.max(1, masks.length)
      const step = Math.min(0.026, 0.16 / n)
      tl.to(masks, { yPercent: 0, opacity: 1, duration: 0.15, stagger: step }, 0.4)
      at(tl, '[data-r="sub"]', { opacity: 1, y: 0, duration: 0.13 }, 0.5)
      at(tl, '[data-r="lede"]', { opacity: 1, y: 0, duration: 0.13 }, 0.55)
      at(tl, '[data-r="extra"]', { opacity: 1, y: 0, duration: 0.12, stagger: 0.03 }, 0.58)
      at(tl, '[data-exit]', { opacity: 0, y: -48, duration: 1 - exitAt, ease: 'power2.in' }, exitAt)
    }, root)

    return () => {
      ctx.revert()
      heroTl.current = null
    }
  }, [hero, exitAt])

  useEffect(() => {
    if (!hero || !play) return
    heroTl.current?.play(0)
  }, [hero, play])

  return (
    <section
      id={chapter.id}
      data-chapter={index}
      ref={ref}
      className="chapter"
      style={{ height: `${chapter.vh}vh` }}
      aria-label={`Chapter ${chapter.index} — ${chapter.label}`}
    >
      <div className="stage">
        <div className={`stage-fill flex h-full w-full flex-col px-[var(--gutter)] ${ALIGN[chapter.align]}`}>
          {children}
        </div>
      </div>
    </section>
  )
}
