import type { Tier } from './world'

export interface DeviceProfile {
  tier: Tier
  reduced: boolean
  /** particle count for the master field */
  particles: number
  dpr: [number, number]
  post: boolean
  isTouch: boolean
  isMobile: boolean
}

/**
 * Conservative capability read. We would rather ship a flawless low tier than
 * a stuttering high tier — the art direction survives at 1/6 the particles
 * because everything is the same glow.
 */
export function detectDevice(): DeviceProfile {
  if (typeof window === 'undefined') {
    return {
      tier: 'low',
      reduced: false,
      particles: 24000,
      dpr: [1, 1.5],
      post: false,
      isTouch: false,
      isMobile: false,
    }
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches
  const w = window.innerWidth
  const isMobile = isTouch || w < 820

  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8
  const cores = navigator.hardwareConcurrency ?? 4
  const smallGPU = isMobile || cores <= 4 || mem <= 4

  const tier: Tier = smallGPU ? 'low' : 'high'

  return {
    tier,
    reduced,
    particles: reduced ? 16000 : tier === 'high' ? 150000 : 26000,
    dpr: tier === 'high' ? [1, 2] : [1, 1.6],
    post: tier === 'high' && !reduced,
    isTouch,
    isMobile,
  }
}
