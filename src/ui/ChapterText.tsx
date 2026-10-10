import type { ReactNode } from 'react'
import type { ChapterCopy } from '../content'
import { CjkHeadline } from './Split'

const SIZE: Record<ChapterCopy['size'], string> = {
  xl: 'headline-xl',
  lg: 'headline-lg',
  md: 'headline-md',
}

const WIDTH: Record<ChapterCopy['size'], string> = {
  xl: 'max-w-[min(1180px,88vw)]',
  lg: 'max-w-[min(1020px,86vw)]',
  md: 'max-w-[min(880px,84vw)]',
}

/**
 * The words of a chapter. Deliberately few of them.
 *
 * Order of arrival is fixed and intentional: chapter mark, then the headline
 * word by word, then the Chinese line, then the one sentence that explains
 * anything at all. Three beats, never a single fade.
 */
/**
 * Where the type sits, the light gets out of its way.
 *
 * These are cinematographer's gradients, not glass panels: a soft falloff that
 * protects the letterforms over a bright structure without ever reading as a
 * card. Tuned per alignment, because the light behind type is never uniform.
 */
const SCRIM: Record<ChapterCopy['align'], string> = {
  // Every scrim is radial and anchored on the type, so its own bounding box
  // falls inside the transparent tail — a linear gradient leaves visible
  // horizontal seams where the element ends.
  center:
    'radial-gradient(58% 52% at 50% 50%, rgba(4,6,11,0.92) 0%, rgba(4,6,11,0.6) 42%, rgba(4,6,11,0) 74%)',
  'top-center':
    'radial-gradient(56% 48% at 50% 32%, rgba(4,6,11,0.92) 0%, rgba(4,6,11,0.58) 42%, rgba(4,6,11,0) 76%)',
  left: 'radial-gradient(60% 70% at 4% 50%, rgba(4,6,11,0.985) 0%, rgba(4,6,11,0.9) 30%, rgba(4,6,11,0.44) 58%, rgba(4,6,11,0) 82%)',
  'bottom-left':
    'radial-gradient(62% 62% at 6% 78%, rgba(4,6,11,0.985) 0%, rgba(4,6,11,0.88) 32%, rgba(4,6,11,0.42) 60%, rgba(4,6,11,0) 84%)',
  'top-left':
    'radial-gradient(60% 54% at 6% 26%, rgba(4,6,11,0.92) 0%, rgba(4,6,11,0.62) 38%, rgba(4,6,11,0) 74%)',
  right:
    'radial-gradient(60% 66% at 96% 50%, rgba(4,6,11,0.985) 0%, rgba(4,6,11,0.88) 32%, rgba(4,6,11,0.42) 60%, rgba(4,6,11,0) 84%)',
  panel:
    'radial-gradient(80% 50% at 8% 22%, rgba(4,6,11,0.9) 0%, rgba(4,6,11,0.5) 40%, rgba(4,6,11,0) 76%)',
  hero: 'radial-gradient(62% 40% at 50% 90%, rgba(4,6,11,0.94) 0%, rgba(4,6,11,0.56) 42%, rgba(4,6,11,0) 78%)',
}

export function ChapterText({
  c,
  children,
  compact = false,
}: {
  c: ChapterCopy
  children?: ReactNode
  compact?: boolean
}) {
  const isCenter = c.align === 'center' || c.align === 'top-center'
  const isRight = c.align === 'right'

  return (
    <div
      data-exit
      className={`relative flex w-full flex-col ${isCenter ? 'items-center' : isRight ? 'items-end' : 'items-start'}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{ inset: '-45% -60%', background: SCRIM[c.align] }}
      />
      <div
        className={`flex flex-col ${WIDTH[c.size]} ${
          isCenter ? 'items-center' : isRight ? 'items-end' : 'items-start'
        }`}
      >
        <span data-r="eyebrow" className="eyebrow mb-[clamp(13px,2.2vh,24px)]">
          Chapter {c.index} · {c.label}
        </span>

        <h2
          className={`headline ${SIZE[c.size]} text-ink`}
          style={{
            textShadow:
              '0 0 10px rgba(4,6,11,0.85), 0 0 44px rgba(4,6,11,0.92), 0 0 100px rgba(74,43,184,0.2)',
          }}
        >
          <CjkHeadline text={c.zh} />
        </h2>

        {c.en ? (
          <p data-r="sub" className="subhead mt-[clamp(14px,2.2vh,26px)]">
            {c.en}
          </p>
        ) : null}

        {c.lede && !compact ? (
          <p data-r="lede" className="lede mt-[clamp(13px,2vh,22px)]">
            {c.lede}
          </p>
        ) : null}
      </div>

      {children}
    </div>
  )
}
