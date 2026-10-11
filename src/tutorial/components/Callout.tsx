import type { ReactNode } from 'react'
import { Info, TriangleAlert } from 'lucide-react'

/* ------------------------------------------------------------------ *
 *  Callout — an aside the reader must not skim past.
 *
 *    <Callout>普通提示</Callout>
 *
 *    <Callout type="warning" title="注意">
 *      警告内容
 *    </Callout>
 *
 *  Grey rather than coloured: the left rule and the icon are the only
 *  things that change, so a warning reads as one without a slab of
 *  saturated colour landing in the middle of a black page.
 * ------------------------------------------------------------------ */

export function Callout({
  children,
  title,
  type = 'note',
}: {
  children: ReactNode
  /** Optional emphasised first line. */
  title?: string
  /** `note` (default) or `warning`. */
  type?: 'note' | 'warning'
}) {
  const warning = type === 'warning'
  const Icon = warning ? TriangleAlert : Info

  return (
    <aside
      className={`my-6 rounded-r-[10px] rounded-l-[2px] border-l-2 py-3.5 pr-4 pl-4 ${
        warning
          ? 'border-l-[color:var(--tut-warn)] bg-[color:var(--tut-warn-tint)]'
          : 'border-l-white/25 bg-[color:var(--tut-surface-2)]'
      }`}
    >
      <div className="flex gap-2.5">
        <Icon
          size={15}
          strokeWidth={1.75}
          aria-hidden
          className={`mt-[3px] shrink-0 ${
            warning ? 'text-[color:var(--tut-warn)]' : 'text-[color:var(--tut-faint)]'
          }`}
        />

        <div className="min-w-0 flex-1">
          {title ? (
            <p className="mb-1 text-[14.5px] font-semibold text-[color:var(--tut-heading)]">
              {title}
            </p>
          ) : null}
          <div className="text-[14.5px] leading-[1.75] text-[color:var(--tut-text)]">{children}</div>
        </div>
      </div>
    </aside>
  )
}
