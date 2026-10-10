import { gauss, range, type Rng } from '../../lib/rng'
import type { GlyphSample } from './glyph'

/**
 * The kernel.
 *
 * Not a machine — an orrery. Concentric rings at different inclinations, each
 * one a scheduler queue, turning at its own rate. The visual argument of this
 * chapter is that an operating system is order you can see from far away.
 */
export function buildCore(n: number, rng: Rng): GlyphSample {
  const points = new Float32Array(n * 3)
  const emphasis = new Float32Array(n)

  const rings = 7
  const ringParams: { r: number; tilt: number; roll: number; w: number }[] = []
  for (let k = 0; k < rings; k++) {
    ringParams.push({
      r: 5 + k * 1.72 + range(rng, -0.35, 0.35),
      tilt: range(rng, -1.25, 1.25),
      roll: range(rng, -0.9, 0.9),
      w: 0.1 + rng() * 0.22,
    })
  }

  const nCore = Math.floor(n * 0.16)
  const nRings = Math.floor(n * 0.62)

  let i = 0
  // dense luminous kernel
  while (i < nCore) {
    const o = i * 3
    const r = Math.pow(rng(), 2.2) * 2.6
    const th = rng() * Math.PI * 2
    const ph = Math.acos(rng() * 2 - 1)
    points[o] = Math.sin(ph) * Math.cos(th) * r
    points[o + 1] = Math.cos(ph) * r
    points[o + 2] = Math.sin(ph) * Math.sin(th) * r
    emphasis[i] = 0.85 * (1 - r / 3.2)
    i++
  }

  // rings
  const ringEnd = nCore + nRings
  while (i < ringEnd) {
    const rp = ringParams[(rng() * rings) | 0]
    const a = rng() * Math.PI * 2
    const rr = rp.r + gauss(rng) * rp.w
    const x = Math.cos(a) * rr
    const z = Math.sin(a) * rr
    const y = gauss(rng) * rp.w * 0.55
    // tilt about X then roll about Z
    const ct = Math.cos(rp.tilt)
    const st = Math.sin(rp.tilt)
    const y1 = y * ct - z * st
    const z1 = y * st + z * ct
    const cr = Math.cos(rp.roll)
    const sr = Math.sin(rp.roll)
    const o = i * 3
    points[o] = x * cr - y1 * sr
    points[o + 1] = x * sr + y1 * cr
    points[o + 2] = z1
    // brighten the part of each ring facing the camera plane
    emphasis[i] = 0.22 + 0.4 * Math.max(0, 1 - Math.abs(y1) * 1.4)
    i++
  }

  // halo — the memory space around the machine
  while (i < n) {
    const o = i * 3
    const r = 14 + Math.pow(rng(), 0.7) * 22
    const th = rng() * Math.PI * 2
    const ph = Math.acos(rng() * 2 - 1)
    points[o] = Math.sin(ph) * Math.cos(th) * r * 1.35
    points[o + 1] = Math.cos(ph) * r * 0.55
    points[o + 2] = Math.sin(ph) * Math.sin(th) * r
    emphasis[i] = 0.06
    i++
  }

  return { points, emphasis }
}
