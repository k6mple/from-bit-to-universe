import type { ReactNode } from 'react'

/* ------------------------------------------------------------------ *
 *  Body copy.
 *
 *  Whatever you write inside these — <strong>, <code>, <a>, <ul>/<ol> —
 *  is styled by tutorial.css, so content.tsx never carries a className.
 * ------------------------------------------------------------------ */

/** The line under the title: same voice, quieter colour. */
export function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="text-[17px] leading-[1.75] text-[color:var(--tut-muted)] text-pretty">
      {children}
    </p>
  )
}

/** Body paragraph. */
export function P({ children }: { children: ReactNode }) {
  return (
    <p className="my-4 text-[16px] leading-[1.75] text-[color:var(--tut-text)] text-pretty">
      {children}
    </p>
  )
}
