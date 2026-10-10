import { gauss, range, type Rng } from '../../lib/rng'
import type { GlyphSample } from './glyph'

export interface Trace {
  pts: [number, number, number][]
  weight: number
}

export interface ChipData extends GlyphSample {
  traces: Trace[]
  blocks: Block[]
}

export interface Block {
  x: number
  z: number
  w: number
  d: number
  h: number
  role: 'core' | 'cache' | 'io' | 'mem'
}

/**
 * The processor.
 *
 * A floorplan, not a box. Cores surrounded by cache surrounded by I/O, each
 * block raised to its own height so the die reads in three dimensions, with
 * signal traces running in the channels between them — the same traces the
 * light pulses travel along in <Traces/>.
 */
export function buildChip(n: number, rng: Rng): ChipData {
  const points = new Float32Array(n * 3)
  const emphasis = new Float32Array(n)

  const G = 5
  const CELL = 4.55
  const GAP = 1.45
  const PITCH = CELL + GAP
  const span = G * PITCH - GAP

  const blocks: Block[] = []
  for (let gx = 0; gx < G; gx++) {
    for (let gz = 0; gz < G; gz++) {
      const edge = gx === 0 || gz === 0 || gx === G - 1 || gz === G - 1
      const centre = gx >= 1 && gx <= 3 && gz >= 1 && gz <= 3
      const cx = (gx - (G - 1) / 2) * PITCH
      const cz = (gz - (G - 1) / 2) * PITCH
      const role: Block['role'] = edge ? 'io' : centre ? 'core' : 'cache'
      const h =
        role === 'core'
          ? 2.1 + rng() * 0.3
          : role === 'cache'
            ? 1.25 + rng() * 0.22
            : 0.5 + rng() * 0.14
      blocks.push({ x: cx, z: cz, w: CELL, d: CELL, h, role })
    }
  }

  // --- signal traces: Manhattan routing through the channels ---------
  const traces: Trace[] = []
  const chan = (gx: number) => (gx - (G - 1) / 2) * PITCH + PITCH / 2
  const node = (gx: number, gz: number) => ({
    x: (gx - (G - 1) / 2) * PITCH,
    z: (gz - (G - 1) / 2) * PITCH,
  })

  const route = (
    a: { x: number; z: number },
    b: { x: number; z: number },
    y: number,
    seedAxis: 0 | 1,
  ) => {
    const mid =
      seedAxis === 0 ? { x: b.x, z: a.z } : { x: a.x, z: b.z }
    traces.push({
      pts: [
        [a.x, y, a.z],
        [mid.x, y, mid.z],
        [b.x, y, b.z],
      ],
      weight: 0.55 + rng() * 0.45,
    })
  }

  // backbone: outer ring of channels
  for (let gx = 0; gx < G - 1; gx++) {
    route({ x: chan(gx), z: chan(0) }, { x: chan(gx + 1), z: chan(0) }, 0.1, 0)
    route({ x: chan(gx), z: chan(G - 1) }, { x: chan(gx + 1), z: chan(G - 1) }, 0.1, 0)
  }
  for (let gz = 0; gz < G - 1; gz++) {
    route({ x: chan(0), z: chan(gz) }, { x: chan(0), z: chan(gz + 1) }, 0.1, 1)
    route({ x: chan(G - 1), z: chan(gz) }, { x: chan(G - 1), z: chan(gz + 1) }, 0.1, 1)
  }
  // radials reaching the core, plus cross-links
  for (let k = 1; k < G - 1; k++) {
    route({ x: chan(0), z: chan(k) }, node(1, k), 0.24, 1)
    route({ x: chan(G - 1), z: chan(k) }, node(G - 2, k), 0.24, 1)
    route({ x: chan(k), z: chan(0) }, node(k, 1), 0.24, 0)
    route({ x: chan(k), z: chan(G - 1) }, node(k, G - 2), 0.24, 0)
  }
  for (let k = 0; k < G - 1; k++) {
    route({ x: chan(k), z: chan(0.5 + k) }, { x: chan(k + 1), z: chan(0.5 + k) }, 0.18, 0)
  }
  for (let k = 0; k < 5; k++) {
    route(
      { x: range(rng, -span / 2, span / 2), z: chan(0) },
      { x: range(rng, -span / 2, span / 2), z: chan(G - 1) },
      0.16,
      1,
    )
  }

  // --- point distribution -------------------------------------------
  const nPads = Math.floor(n * 0.1)
  const nTraces = Math.floor(n * 0.26)
  const nEdge = Math.floor(n * 0.06)
  const nSurf = n - nPads - nTraces - nEdge

  let i = 0
  // interior of every block, plus its side walls
  const perBlock = Math.max(1, Math.floor(nSurf / blocks.length))
  for (const b of blocks) {
    const dst = 0.34
    const nx = Math.max(1, Math.floor(b.w / dst))
    const nz = Math.max(1, Math.floor(b.d / dst))
    const density = b.role === 'core' ? 1 : b.role === 'cache' ? 0.8 : 0.55
    for (let ix = 0; ix < nx && i < nSurf; ix++) {
      for (let iz = 0; iz < nz && i < nSurf; iz++) {
        if (rng() > density) continue
        const px = b.x - b.w / 2 + ((ix + 0.5) / nx) * b.w + gauss(rng) * 0.05
        const pz = b.z - b.d / 2 + ((iz + 0.5) / nz) * b.d + gauss(rng) * 0.05
        const o = i * 3
        const onRim =
          ix < 1 || iz < 1 || ix > nx - 2 || iz > nz - 2
        points[o] = px
        points[o + 1] = b.h + gauss(rng) * 0.02
        points[o + 2] = pz
        emphasis[i] = onRim ? 0.62 : b.role === 'core' ? 0.52 : 0.3
        i++
      }
    }
    // walls so the blocks have mass
    for (let k = 0; k < perBlock * 0.1 && i < nSurf; k++) {
      const o = i * 3
      const side = rng()
      const along = rng()
      points[o] = b.x + (side < 0.5 ? -b.w / 2 : b.w / 2)
      points[o + 1] = b.h * along
      points[o + 2] = b.z + range(rng, -b.d / 2, b.d / 2)
      emphasis[i] = 0.22
      i++
    }
  }
  while (i < nSurf) {
    const o = i * 3
    const b = blocks[(rng() * blocks.length) | 0]
    points[o] = b.x + gauss(rng) * b.w * 0.5
    points[o + 1] = b.h + gauss(rng) * 0.03
    points[o + 2] = b.z + gauss(rng) * b.d * 0.5
    emphasis[i] = 0.2
    i++
  }

  // traces
  const traceEnd = nSurf + nTraces
  while (i < traceEnd) {
    const t = traces[(rng() * traces.length) | 0]
    const seg = (rng() * (t.pts.length - 1)) | 0
    const a = t.pts[seg]
    const b = t.pts[seg + 1]
    const s = rng()
    const o = i * 3
    points[o] = a[0] + (b[0] - a[0]) * s + gauss(rng) * 0.035
    points[o + 1] = a[1] + gauss(rng) * 0.02
    points[o + 2] = a[2] + (b[2] - a[2]) * s + gauss(rng) * 0.035
    emphasis[i] = 0.72 * t.weight
    i++
  }

  // perimeter I/O pads
  const padEnd = traceEnd + nPads
  const outer = span / 2 + 0.55
  while (i < padEnd) {
    const o = i * 3
    const side = (rng() * 4) | 0
    const s = range(rng, -outer, outer)
    if (side === 0) {
      points[o] = s
      points[o + 2] = -outer
    } else if (side === 1) {
      points[o] = s
      points[o + 2] = outer
    } else if (side === 2) {
      points[o] = -outer
      points[o + 2] = s
    } else {
      points[o] = outer
      points[o + 2] = s
    }
    points[o + 1] = -0.35 + gauss(rng) * 0.03
    emphasis[i] = 0.85
    i++
  }

  // underside / edge glow
  while (i < n) {
    const o = i * 3
    points[o] = range(rng, -outer, outer)
    points[o + 1] = -0.85 + gauss(rng) * 0.05
    points[o + 2] = range(rng, -outer, outer)
    emphasis[i] = 0.14
    i++
  }

  return { points, emphasis, traces, blocks }
}
