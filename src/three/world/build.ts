import { mulberry32, type Rng } from '../../lib/rng'
import { buildGlyph, type GlyphSample } from './glyph'
import { buildLattice } from './lattice'
import { buildChip, type ChipData } from './chip'
import { buildNetwork, type NetworkData } from './network'
import { buildCore } from './core'
import { buildNeural, type NeuralData } from './neural'
import { buildGalaxy } from './galaxy'

export interface WorldData {
  n: number
  /** 8 morph targets, each n*3 */
  shapes: Float32Array[]
  /** emphasis for shapes 0..3, packed as vec4 */
  emphA: Float32Array
  /** emphasis for shapes 4..7, packed as vec4 */
  emphB: Float32Array
  /** (seed, size, hue, orbit radius) */
  meta: Float32Array
  /** (orbit speed, orbit phase) */
  orb2: Float32Array
  chip: ChipData
  network: NetworkData
  neural: NeuralData
}

export const SHAPE_NAMES = [
  'scatter',
  'glyph',
  'lattice',
  'chip',
  'network',
  'core',
  'neural',
  'galaxy',
] as const

const yieldFrame = () => new Promise<void>((r) => setTimeout(r, 0))

function empty(n: number): GlyphSample {
  return { points: new Float32Array(n * 3), emphasis: new Float32Array(n) }
}

/**
 * Builds the entire sculpture up front, on the main thread, but split across
 * frames so the loader's progress bar is honest rather than a fake timer.
 */
export async function buildWorld(
  n: number,
  onProgress?: (p: number, label: string) => void,
): Promise<WorldData> {
  const shapes: Float32Array[] = new Array(8)
  const emph: Float32Array[] = new Array(8)

  // Wait for the webfont before rasterising the numeral — otherwise the point
  // cloud is a picture of a fallback font.
  try {
    if (document.fonts?.ready) await document.fonts.ready
  } catch {
    /* not fatal */
  }

  const step = async (i: number, label: string, fn: (rng: Rng) => GlyphSample) => {
    onProgress?.(i / 8, label)
    await yieldFrame()
    const rng = mulberry32(0x9e3779b9 + i * 2654435761)
    const res = fn(rng)
    shapes[i] = res.points
    emph[i] = res.emphasis
    if (!shapes[i] || shapes[i].length !== n * 3) {
      const e = empty(n)
      shapes[i] = e.points
      emph[i] = e.emphasis
    }
  }

  // shape 0 — the darkness the piece begins inside
  await step(0, 'SEEDING VOID', (rng) => {
    const s = empty(n)
    for (let i = 0; i < n; i++) {
      const o = i * 3
      const r = 20 + Math.pow(rng(), 0.42) * 62
      const th = rng() * Math.PI * 2
      const ph = Math.acos(rng() * 2 - 1)
      s.points[o] = Math.sin(ph) * Math.cos(th) * r * 1.2
      s.points[o + 1] = Math.cos(ph) * r * 0.85
      s.points[o + 2] = Math.sin(ph) * Math.sin(th) * r
      s.emphasis[i] = 0.04 + rng() * 0.1
    }
    return s
  })

  await step(1, 'RASTERISING NUMERAL', (rng) =>
    buildGlyph(n, rng, '700 620px "Inter Variable", Inter, system-ui, sans-serif'),
  )

  await step(2, 'GROWING SILICON', (rng) => buildLattice(n, rng))

  let chip: ChipData | null = null
  onProgress?.(3 / 8, 'ROUTING DIE')
  await yieldFrame()
  chip = buildChip(n, mulberry32(0x51ed270b))
  shapes[3] = chip.points
  emph[3] = chip.emphasis

  let network: NetworkData | null = null
  onProgress?.(4 / 8, 'WIRING NETWORK')
  await yieldFrame()
  network = buildNetwork(n, mulberry32(0x2f1b3c4d))
  shapes[4] = network.points
  emph[4] = network.emphasis

  await step(5, 'SCHEDULING KERNEL', (rng) => buildCore(n, rng))

  let neural: NeuralData | null = null
  onProgress?.(6 / 8, 'WAKING THE MIND')
  await yieldFrame()
  neural = buildNeural(n, mulberry32(0x7a5c11f3))
  shapes[6] = neural.points
  emph[6] = neural.emphasis

  await step(7, 'COLLAPSING THE UNIVERSE', (rng) => buildGalaxy(n, rng))

  // --- per-particle invariants --------------------------------------
  // Packed to keep the vertex attribute count at 12 (WebGL2 guarantees 16).
  const meta = new Float32Array(n * 4)
  const orb2 = new Float32Array(n * 2)
  const emphA = new Float32Array(n * 4)
  const emphB = new Float32Array(n * 4)
  const rng = mulberry32(0x1234567)
  // The lattice's carrier band (see lattice.ts) gets real orbits, so the
  // crystal has something alive moving through it. Everything else only
  // shimmers.
  const carrierStart = Math.floor(n * 0.58)
  const carrierEnd = Math.floor(n * 0.78)

  for (let i = 0; i < n; i++) {
    const carrier = i >= carrierStart && i < carrierEnd
    meta[i * 4] = rng()
    meta[i * 4 + 1] = 0.6 + Math.pow(rng(), 3.4) * 2.7
    meta[i * 4 + 2] = Math.pow(rng(), 1.35)
    meta[i * 4 + 3] = carrier ? 0.3 + rng() * 0.5 : 0.02 + rng() * 0.06
    orb2[i * 2] = carrier ? 1.1 + rng() * 2.4 : 0.15 + rng() * 0.7
    orb2[i * 2 + 1] = rng() * Math.PI * 2
    emphA[i * 4] = emph[0][i]
    emphA[i * 4 + 1] = emph[1][i]
    emphA[i * 4 + 2] = emph[2][i]
    emphA[i * 4 + 3] = emph[3][i]
    emphB[i * 4] = emph[4][i]
    emphB[i * 4 + 1] = emph[5][i]
    emphB[i * 4 + 2] = emph[6][i]
    emphB[i * 4 + 3] = emph[7][i]
  }

  onProgress?.(1, 'READY')

  return {
    n,
    shapes,
    emphA,
    emphB,
    meta,
    orb2,
    chip: chip!,
    network: network!,
    neural: neural!,
  }
}

export type { ChipData, NetworkData, NeuralData }
