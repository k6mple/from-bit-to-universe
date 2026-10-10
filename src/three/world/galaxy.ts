import { gauss, type Rng } from '../../lib/rng'
import type { GlyphSample } from './glyph'

/**
 * The universe.
 *
 * A three-armed logarithmic spiral. Everything the visitor has passed through
 * — bits, atoms, cores, packets, thoughts — is the same matter here, which is
 * the only ending that makes the argument of the piece.
 */
export function buildGalaxy(n: number, rng: Rng): GlyphSample {
  const points = new Float32Array(n * 3)
  const emphasis = new Float32Array(n)

  const ARMS = 3
  const RMIN = 14
  const RMAX = 72
  const B = 0.235 // winding tightness
  const ARM_OFFSET = (Math.PI * 2) / ARMS

  const nArm = Math.floor(n * 0.95)
  const nBulge = Math.floor(n * 0.015)

  let i = 0
  while (i < nArm) {
    const arm = (rng() * ARMS) | 0
    const t = Math.pow(rng(), 0.62)
    const r = RMIN + t * (RMAX - RMIN)
    const theta = Math.log(r / RMIN) / B + arm * ARM_OFFSET
    const spread = 0.3 + r * 0.022
    const rr = r + gauss(rng) * spread * 2.4
    const th = theta + gauss(rng) * (spread / Math.max(r, 1)) * 0.9
    const o = i * 3
    points[o] = Math.cos(th) * rr
    points[o + 1] = gauss(rng) * (1.0 + rr * 0.055)
    points[o + 2] = Math.sin(th) * rr
    const edge = Math.min(1, r / RMAX)
    emphasis[i] = (0.72 + 0.2 * (1 - edge)) * (0.76 + rng() * 0.24)
    i++
  }

  const bulgeEnd = nArm + nBulge
  while (i < bulgeEnd) {
    const o = i * 3
    const r = Math.pow(rng(), 0.85) * 20
    const th = rng() * Math.PI * 2
    const ph = Math.acos(rng() * 2 - 1)
    points[o] = Math.sin(ph) * Math.cos(th) * r
    points[o + 1] = Math.cos(ph) * r * 0.62
    points[o + 2] = Math.sin(ph) * Math.sin(th) * r
    emphasis[i] = 0.95 * (1 - r / 26)
    i++
  }

  while (i < n) {
    const o = i * 3
    const r = RMIN + Math.pow(rng(), 0.5) * (RMAX * 1.25 - RMIN)
    const th = rng() * Math.PI * 2
    const ph = Math.acos(rng() * 2 - 1)
    points[o] = Math.sin(ph) * Math.cos(th) * r
    points[o + 1] = Math.cos(ph) * r * 0.85
    points[o + 2] = Math.sin(ph) * Math.sin(th) * r
    emphasis[i] = 0.04 + rng() * 0.1
    i++
  }

  return { points, emphasis }
}
