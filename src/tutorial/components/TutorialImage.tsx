import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ImageIcon } from 'lucide-react'

/* ------------------------------------------------------------------ *
 *  TutorialImage — a screenshot in the flow of the text.
 *
 *    <TutorialImage src="tutorial/step-1.png" alt="终端里执行安装命令"
 *                   caption="图 1 · 安装完成" width={1600} height={900} />
 *
 *  Files live in `public/tutorial/` and are referenced as `tutorial/…`.
 *  Paths are kept relative on purpose: `base: './'` means the site can be
 *  deployed into a subdirectory, and a leading `/` would break there.
 *
 *  Leave `src` off and the frame draws itself as a placeholder, so the
 *  layout can be written before the screenshots exist.
 * ------------------------------------------------------------------ */

/** Absolute URLs and data URIs pass through; everything else goes relative. */
function resolve(src: string): string {
  if (/^(?:[a-z]+:)?\/\//i.test(src) || src.startsWith('data:')) return src
  return `./${src.replace(/^\.?\//, '')}`
}

export function TutorialImage({
  src,
  alt = '',
  caption,
  ratio = '16 / 9',
  width,
  height,
  maxWidth,
}: {
  /** e.g. "tutorial/step-1.png". Omit for a placeholder frame. */
  src?: string
  /** What the screenshot shows, for screen readers. */
  alt?: string
  /** Line under the frame. Omit for none. */
  caption?: ReactNode
  /** Shapes the placeholder only — a real image keeps its own ratio. */
  ratio?: string
  /** The file's real pixel size: lets the browser reserve the space, so
   *  the text below the image does not jump when it lands. */
  width?: number
  height?: number
  /** Cap the rendered width, in px, and centre the frame. A portrait
   *  screenshot stretched to the full column dwarfs the ones beside it;
   *  a cap of ~560 lands it at the same rendered size as a 16:9 shot. */
  maxWidth?: number
}) {
  const ref = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)

  // A cached image can finish before React attaches onLoad; without this
  // the fade would never start and the frame would stay blank.
  useEffect(() => {
    if (ref.current?.complete) setLoaded(true)
  }, [src])

  const url = src ? resolve(src) : undefined

  // A cap has to sit on the <figure>, not the <img>: the caption shares
  // the same measure, so the two stay one object.
  const frame = maxWidth ? { maxWidth, marginInline: 'auto' } : undefined

  return (
    <figure className="my-6" style={frame}>
      {url ? (
        <div className="overflow-hidden rounded-[10px] border border-[color:var(--tut-line)] bg-[color:var(--tut-surface)]">
          <img
            ref={ref}
            src={url}
            alt={alt}
            width={width}
            height={height}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            className={`block h-auto w-full transition-opacity duration-500 ease-out ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
      ) : (
        <div
          className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-white/15 bg-[color:var(--tut-surface)] px-6 py-10 text-center"
          style={{ aspectRatio: ratio }}
        >
          <ImageIcon size={18} strokeWidth={1.5} className="text-[color:var(--tut-faint)]" aria-hidden />
          <p className="text-[13px] text-[color:var(--tut-muted)]">在这里插入图片</p>
          <p className="mono text-[11px] leading-[1.7] text-[color:var(--tut-faint)]">
            截图放进 public/tutorial/，再写 src=&quot;tutorial/文件名.png&quot;
          </p>
        </div>
      )}

      {caption ? (
        <figcaption className="mt-3 text-[13px] leading-[1.7] text-[color:var(--tut-muted)]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )
}
