import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'

/**
 * Shared entry-point boot for every page.
 *
 * Deliberately no StrictMode: double-invoked effects would build the
 * 120k-particle sculpture twice and mount two WebGL contexts in development.
 */
export function mount(node: ReactNode) {
  const el = document.getElementById('root')
  if (!el) return
  createRoot(el).render(node)

  // The pre-boot void is only needed until the app paints its own background.
  requestAnimationFrame(() => {
    document.querySelector('.boot-void')?.remove()
  })
}
