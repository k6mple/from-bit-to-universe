import type { ReactNode } from 'react'

/* ------------------------------------------------------------------ *
 *  The three heading levels.
 *
 *  Hierarchy is carried by size and weight alone — no rules, no icons,
 *  no anchor links. Fixed px rather than vw: a document is read at one
 *  size, and a heading that grows with the window breaks the rhythm the
 *  spacing below was tuned against.
 * ------------------------------------------------------------------ */

/** Page title. One per page. */
export function H1({ children }: { children: ReactNode }) {
  return (
    <h1 className="mb-3 text-[32px] leading-[1.22] font-semibold tracking-[0.012em] text-balance text-[color:var(--tut-heading)] sm:text-[38px]">
      {children}
    </h1>
  )
}

/** Section heading — one per step. */
export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-16 mb-3.5 text-[24px] leading-[1.35] font-semibold tracking-[0.01em] text-balance text-[color:var(--tut-heading)] sm:text-[26px]">
      {children}
    </h2>
  )
}

/** Sub-heading — a specific operation inside a step. */
export function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-10 mb-3 text-[19px] leading-[1.45] font-semibold tracking-[0.01em] text-[color:var(--tut-heading)]">
      {children}
    </h3>
  )
}
