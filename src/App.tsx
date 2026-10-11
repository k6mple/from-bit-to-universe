import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { RotateCcw } from 'lucide-react'

import { CHAPTERS } from './content'
import { detectDevice, type DeviceProfile } from './lib/device'
import { bindPointer } from './lib/pointer'
import { chapterIndexFromHash, initScroll, scrollToChapter, type ScrollRig } from './lib/scroll'
import { world } from './lib/world'
import { buildWorld, type WorldData } from './three/world/build'
import { SceneCanvas } from './three/Scene'

import { Preloader } from './ui/Preloader'
import { Chrome } from './ui/Chrome'
import { Chapter } from './ui/Chapter'
import { ChapterText } from './ui/ChapterText'
import { CjkHeadline } from './ui/Split'
import { KernelPanel } from './ui/KernelPanel'
import { MindPanel } from './ui/MindPanel'
import { Hints } from './ui/Hints'
import { Magnetic } from './ui/Magnetic'
import { TutorialGate } from './ui/TutorialGate'

const HEAD_GLOW =
  '0 0 12px rgba(4,6,11,0.8), 0 0 46px rgba(4,6,11,0.9), 0 0 110px rgba(74,43,184,0.22)'

export default function App() {
  const profile: DeviceProfile = useMemo(() => {
    const p = detectDevice()
    // Set before any chapter mounts so reveal timelines read the right flags.
    world.reduced = p.reduced
    world.tier = p.tier
    return p
  }, [])

  const [data, setData] = useState<WorldData | null>(null)
  const [booted, setBooted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const intro = useRef<gsap.core.Timeline | null>(null)
  const rig = useRef<ScrollRig | null>(null)
  const deepLink = useRef<number | null>(null)

  /* ---------------------------------------------------------------- *
   *  Global wiring
   * ---------------------------------------------------------------- */
  useEffect(() => {
    document.documentElement.classList.toggle('no-anim', profile.reduced)
    return bindPointer()
  }, [profile])

  useEffect(() => {
    document.body.classList.add('is-locked')
    let cancelled = false
    buildWorld(profile.particles, (p, label) => {
      ;(window as unknown as { __fbtuProgress?: (p: number, l: string) => void }).__fbtuProgress?.(
        p,
        label,
      )
    }).then((d) => {
      if (cancelled) return
      setData(d)
      ;(window as unknown as { __fbtuReady?: boolean }).__fbtuReady = true
    })
    return () => {
      cancelled = true
    }
  }, [profile])

  // Deliberately keyed on `data` alone: the rig must survive the preloader
  // handing off, because that is exactly when scrolling becomes meaningful.
  useEffect(() => {
    if (!data) return
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'))
    if (!els.length) return

    // Deep links let a chapter be shared, and let the piece be entered in the
    // middle. Landing on one skips the overture and goes straight there.
    const target = chapterIndexFromHash(els)
    if (target !== null && target > 0) {
      deepLink.current = target
    }

    rig.current = initScroll(els, (idx) => {
      const id = els[idx]?.id
      if (id) window.history.replaceState(null, '', `#${id}`)
    })

    return () => {
      rig.current?.dispose()
      rig.current = null
    }
  }, [data])

  // ScrollTrigger measured the page while the preloader was still up; give it
  // fresh geometry once the document is final and scrollable.
  useEffect(() => {
    if (!booted) return
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 60)
    return () => window.clearTimeout(id)
  }, [booted])

  /* ---------------------------------------------------------------- *
   *  The opening sequence
   * ---------------------------------------------------------------- */
  const finishIntro = useCallback(() => {
    world.intro = 1
    world.introDone = true
    setPlaying(true)
  }, [])

  useEffect(() => {
    if (!booted) return

    if (deepLink.current !== null) {
      const i = deepLink.current
      deepLink.current = null
      finishIntro()
      // Two frames so the browser has laid out the full 1500vh document.
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToChapter(i, false, 0.35)))
      return
    }

    if (profile.reduced) {
      finishIntro()
      return
    }

    const tl = gsap.timeline()
    tl.to(world, { intro: 1, duration: 2.5, ease: 'power2.inOut' }, 0.5)
      .add(() => setPlaying(true), 2.3)
      .add(() => {
        world.introDone = true
      }, 2.95)
    intro.current = tl

    // The visitor can cut the overture short at any time.
    const skip = () => {
      if (!intro.current) return
      intro.current.progress(1).kill()
      intro.current = null
      world.introDone = true
      setPlaying(true)
    }
    window.addEventListener('wheel', skip, { passive: true, once: true })
    window.addEventListener('touchstart', skip, { passive: true, once: true })
    window.addEventListener('keydown', skip, { once: true })

    return () => {
      tl.kill()
      window.removeEventListener('wheel', skip)
      window.removeEventListener('touchstart', skip)
      window.removeEventListener('keydown', skip)
    }
  }, [booted, profile.reduced, finishIntro])

  /* ---------------------------------------------------------------- */

  const [hero, ...rest] = CHAPTERS
  const cosmos = CHAPTERS[CHAPTERS.length - 1]

  return (
    <>
      {data ? <SceneCanvas data={data} profile={profile} /> : null}

      <Chrome visible={booted} />
      <Hints />

      <main className="relative z-10">
        {/* ---------- 00 · THE BIT ---------------------------------- */}
        <Chapter chapter={hero} index={0} hero play={playing}>
          <div data-hero-block className="flex flex-col items-center">
            <span data-r="eyebrow" className="eyebrow mb-[clamp(14px,2.3vh,28px)]">
              Chapter 00 · The Bit
            </span>
            <h1
              className="headline headline-xl max-w-[min(1080px,88vw)] text-ink"
              style={{ textShadow: HEAD_GLOW }}
            >
              <CjkHeadline text={hero.zh} />
            </h1>
            <p data-r="sub" className="subhead mt-[clamp(16px,2.5vh,30px)]">
              {hero.en}
            </p>
          </div>

          {/* Vertical, bottom-left: out of the composition's way. */}
          <div className="absolute bottom-[7vh] left-[var(--gutter)]">
            <div data-r="cue" className="flex flex-col items-center gap-3">
              <span
                className="relative block h-[58px] w-px overflow-hidden bg-[rgba(232,238,245,0.14)]"
                aria-hidden
              >
                <span
                  className="absolute inset-x-0 top-0 block h-[16px]"
                  style={{
                    background: 'linear-gradient(180deg, transparent, #8fd8ff 55%, transparent)',
                    animation: 'scan 2.8s cubic-bezier(0.65,0.05,0,1) infinite',
                  }}
                />
              </span>
              <span
                className="mono text-[9px] tracking-[0.42em] text-[rgba(232,238,245,0.42)] uppercase"
                style={{ writingMode: 'vertical-rl' }}
              >
                Scroll
              </span>
            </div>
          </div>
        </Chapter>

        {/* ---------- 01 · THE TRANSISTOR ---------------------------- */}
        <Chapter chapter={rest[0]} index={1}>
          <ChapterText c={rest[0]} />
        </Chapter>

        {/* ---------- 02 · THE PROCESSOR ----------------------------- */}
        <Chapter chapter={rest[1]} index={2}>
          <ChapterText c={rest[1]} />
        </Chapter>

        {/* ---------- 03 · THE NETWORK ------------------------------- */}
        <Chapter chapter={rest[2]} index={3}>
          <ChapterText c={rest[2]} />
        </Chapter>

        {/* ---------- 04 · THE OPERATING SYSTEM ---------------------- */}
        <Chapter chapter={rest[3]} index={4} exitAt={0.9}>
          <ChapterText c={rest[3]} compact>
            <div data-r="extra" className="mt-[clamp(14px,2.4vh,30px)] w-full">
              <KernelPanel />
            </div>
          </ChapterText>
        </Chapter>

        {/* ---------- 05 · THE MIND ---------------------------------- */}
        <Chapter chapter={rest[4]} index={5}>
          <ChapterText c={rest[4]}>
            <MindPanel />
          </ChapterText>
        </Chapter>

        {/* ---------- 06 · THE COSMOS -------------------------------- */}
        <Chapter chapter={cosmos} index={6} exitAt={0.99}>
          <ChapterText c={cosmos}>
            <div
              data-r="extra"
              className="mt-[clamp(30px,5vh,64px)] flex flex-col items-center gap-[clamp(18px,3vh,34px)]"
            >
              <span className="mono text-[11px] tracking-[0.42em] text-[rgba(143,216,255,0.6)] tabular-nums">
                00000001 → ∞
              </span>

              <Magnetic strength={0.34} radius={150}>
                <button
                  type="button"
                  onClick={() => scrollToChapter(0)}
                  className="group flex cursor-pointer items-center gap-2.5 rounded-full border border-[rgba(143,216,255,0.22)] px-5 py-2.5 transition-colors duration-700 hover:border-[rgba(143,216,255,0.62)] hover:bg-[rgba(143,216,255,0.06)]"
                >
                  <RotateCcw
                    size={13}
                    className="text-[rgba(143,216,255,0.7)] transition-transform duration-700 group-hover:-rotate-[50deg]"
                  />
                  <span className="mono text-[10px] tracking-[0.3em] text-[rgba(232,238,245,0.72)] uppercase transition-colors duration-700 group-hover:text-ice">
                    Begin again
                  </span>
                </button>
              </Magnetic>

              <div className="mt-[clamp(10px,2vh,26px)] flex flex-col items-center gap-2">
                <span className="h-[1px] w-[min(320px,54vw)] bg-[linear-gradient(90deg,transparent,rgba(143,216,255,0.28),transparent)]" />
                <span className="mono text-[9px] tracking-[0.42em] text-[rgba(232,238,245,0.28)] uppercase">
                  From Bit to Universe
                </span>
                <span className="mono text-[8.5px] tracking-[0.28em] text-[rgba(232,238,245,0.16)] uppercase">
                  从比特到数字宇宙
                </span>
              </div>
            </div>
          </ChapterText>
        </Chapter>

        {/* ---------- the way out ------------------------------------ */}
        {/* Deliberately not a `[data-chapter]`: it is past the last shape,
            and the rig must not treat it as an eighth chapter. */}
        <TutorialGate />
      </main>

      {!booted ? <Preloader onDone={() => setBooted(true)} /> : null}
    </>
  )
}
