import { gauss, range, type Rng } from '../../lib/rng'
import type { GlyphSample } from './glyph'

/**
 * Inside the silicon.
 *
 * The single most important decision in this scene: a dense volumetric lattice
 * viewed from *inside* integrates ~25 units of depth into every pixel and
 * averages straight back into uniform noise. So the camera flies along a
 * crystal axis instead — the diamond-cubic rows line up into perspective
 * lines that recede to a vanishing point, and the lattice reads as a corridor
 * of light rather than a starfield.
 *
 * Everything is physically motivated:
 *  · a real diamond-cubic lattice — atoms at the correct 8-per-cell basis
 *  · the covalent bonds between them, drawn as threads of light
 *  · free carriers, spread through the cell and genuinely moving (see aOrb)
 *  · a faint gyroid membrane, sinXcosY + sinYcosZ + sinZcosX = 0
 */
const HALF = 9
// The single most important number in this scene. At A = 2.4 the lattice is so
// fine that 150k particles pack the ball solid and every trace of structure
// disappears into snow. At A = 3.2 the atoms sit ~140px apart on screen and the
// crystal finally reads as a crystal.
const A = 4.4

function gyroid(x: number, y: number, z: number) {
  return Math.sin(x) * Math.cos(y) + Math.sin(y) * Math.cos(z) + Math.sin(z) * Math.cos(x)
}

export function buildLattice(n: number, rng: Rng): GlyphSample {
  const points = new Float32Array(n * 3)
  const emphasis = new Float32Array(n)

  const nAtoms = Math.floor(n * 0.62)
  const nBonds = Math.floor(n * 0.3)
  const nMembrane = Math.floor(n * 0.04)
  const nCarriers = n - nAtoms - nBonds - nMembrane

  // --- the lattice ---------------------------------------------------
  const cells = Math.max(2, Math.floor(HALF / A))
  const basis: [number, number, number][] = [
    [0, 0, 0],
    [0, 0.5, 0.5],
    [0.5, 0, 0.5],
    [0.5, 0.5, 0],
    [0.25, 0.25, 0.25],
    [0.25, 0.75, 0.75],
    [0.75, 0.25, 0.75],
    [0.75, 0.75, 0.25],
  ]
  const atoms: [number, number, number][] = []
  for (let cx = -cells; cx <= cells; cx++) {
    for (let cy = -cells; cy <= cells; cy++) {
      for (let cz = -cells; cz <= cells; cz++) {
        for (const b of basis) {
          const x = (cx + b[0]) * A
          const y = (cy + b[1]) * A
          const z = (cz + b[2]) * A
          if (Math.sqrt(x * x + y * y + z * z) > HALF * 0.95) continue
          atoms.push([x, y, z])
        }
      }
    }
  }

  let i = 0
  // Each atom is a tight, hot cluster — the eye must read discrete matter,
  // not fog. This is what makes the structure legible.
  const perAtom = Math.max(1, Math.round(nAtoms / Math.max(1, atoms.length)))
  let ai = 0
  while (i < nAtoms) {
    const at = atoms[ai % atoms.length]
    ai++
    const r = Math.sqrt(at[0] * at[0] + at[1] * at[1] + at[2] * at[2]) / HALF
    const o = i * 3
    points[o] = at[0] + gauss(rng) * 0.26
    points[o + 1] = at[1] + gauss(rng) * 0.26
    points[o + 2] = at[2] + gauss(rng) * 0.14
    emphasis[i] = 0.98 * (1 - r * r * 0.55)
    i++
    if (ai > atoms.length * perAtom * 4) {
      // safety: never spin if the lattice is unexpectedly small
      while (i < nAtoms) {
        const o2 = i * 3
        const a2 = atoms[(rng() * atoms.length) | 0]
        points[o2] = a2[0] + gauss(rng) * 0.26
        points[o2 + 1] = a2[1] + gauss(rng) * 0.26
        points[o2 + 2] = a2[2] + gauss(rng) * 0.26
        emphasis[i] = 0.9
        i++
      }
    }
  }

  // --- covalent bonds ------------------------------------------------
  const tetra: [number, number, number][] = [
    [0.25, 0.25, 0.25],
    [0.25, -0.25, -0.25],
    [-0.25, 0.25, -0.25],
    [-0.25, -0.25, 0.25],
  ]
  const bondEnd = nAtoms + nBonds
  while (i < bondEnd) {
    const a = atoms[(rng() * atoms.length) | 0]
    const t = tetra[(rng() * 4) | 0]
    // Bias toward the ends so the joint with each atom stays bright.
    const s = rng() < 0.5 ? rng() * 0.34 : 0.66 + rng() * 0.34
    const o = i * 3
    points[o] = a[0] + t[0] * A * s + gauss(rng) * 0.03
    points[o + 1] = a[1] + t[1] * A * s + gauss(rng) * 0.03
    points[o + 2] = a[2] + t[2] * A * s + gauss(rng) * 0.03
    emphasis[i] = 0.42 + 0.3 * Math.sin(s * Math.PI)
    i++
  }

  // --- free carriers: the particles that actually move ---------------
  const carrierEnd = bondEnd + nCarriers
  while (i < carrierEnd) {
    const o = i * 3
    const r = Math.pow(rng(), 0.55) * HALF
    const th = rng() * Math.PI * 2
    const ph = Math.acos(rng() * 2 - 1)
    points[o] = Math.sin(ph) * Math.cos(th) * r
    points[o + 1] = Math.cos(ph) * r
    points[o + 2] = Math.sin(ph) * Math.sin(th) * r
    emphasis[i] = 0.14 + rng() * 0.22
    i++
  }

  // --- the membrane --------------------------------------------------
  const K = 1.05
  let guard = 0
  const limit = nMembrane * 90 + 200
  while (i < n) {
    guard++
    if (guard > limit) break
    const x = range(rng, -HALF, HALF)
    const y = range(rng, -HALF, HALF)
    const z = range(rng, -HALF, HALF)
    if (Math.abs(gyroid(x * K, y * K, z * K)) > 0.14) continue
    const o = i * 3
    points[o] = x
    points[o + 1] = y
    points[o + 2] = z
    const r = Math.sqrt(x * x + y * y + z * z) / HALF
    emphasis[i] = 0.14 * (1 - Math.min(1, r * r))
    i++
  }
  while (i < n) {
    const o = i * 3
    const r = Math.pow(rng(), 0.5) * HALF
    const th = rng() * Math.PI * 2
    const ph = Math.acos(rng() * 2 - 1)
    points[o] = Math.sin(ph) * Math.cos(th) * r
    points[o + 1] = Math.cos(ph) * r
    points[o + 2] = Math.sin(ph) * Math.sin(th) * r
    emphasis[i] = 0.07
    i++
  }

  return { points, emphasis }
}
