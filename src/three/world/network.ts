import { gauss, range, type Rng } from '../../lib/rng'
import type { GlyphSample } from './glyph'

export interface NetNode {
  p: [number, number, number]
  /** relative size — hubs are bigger and brighter */
  tier: number
}

export interface NetEdge {
  a: number
  b: number
  weight: number
}

export interface NetworkData extends GlyphSample {
  nodes: NetNode[]
  edges: NetEdge[]
  radius: number
}

const R = 18.5

/**
 * The network.
 *
 * Nodes are placed with a Fibonacci distribution over a slightly flattened
 * sphere so the graph reads as a planet of machines rather than a blob, then
 * wired to their nearest neighbours. Long-haul links are added so the mesh has
 * visible structure at a distance instead of even local noise.
 */
export function buildNetwork(n: number, rng: Rng): NetworkData {
  const points = new Float32Array(n * 3)
  const emphasis = new Float32Array(n)

  const nodeCount = Math.max(44, Math.min(190, Math.round(n / 950)))
  const nodes: NetNode[] = []
  const GA = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < nodeCount; i++) {
    const y = 1 - (i / (nodeCount - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const th = GA * i + range(rng, -0.16, 0.16)
    // Two thirds hug the surface, one third drifts inside — gives parallax.
    const depth = rng() < 0.66 ? 0.88 + rng() * 0.14 : 0.28 + rng() * 0.55
    nodes.push({
      p: [
        Math.cos(th) * r * R * depth + gauss(rng) * 0.5,
        y * R * 0.7 * depth + gauss(rng) * 0.5,
        Math.sin(th) * r * R * depth + gauss(rng) * 0.5,
      ],
      tier: rng() < 0.09 ? 1 : rng() < 0.35 ? 0.6 : 0.3,
    })
  }

  const dist = (a: NetNode, b: NetNode) => {
    const dx = a.p[0] - b.p[0]
    const dy = a.p[1] - b.p[1]
    const dz = a.p[2] - b.p[2]
    return dx * dx + dy * dy + dz * dz
  }

  const seen = new Set<number>()
  const edges: NetEdge[] = []
  const addEdge = (a: number, b: number, weight: number) => {
    if (a === b) return
    const key = a < b ? a * 4096 + b : b * 4096 + a
    if (seen.has(key)) return
    seen.add(key)
    edges.push({ a, b, weight })
  }

  for (let i = 0; i < nodes.length; i++) {
    const near = nodes
      .map((nd, j) => ({ j, d: dist(nodes[i], nd) }))
      .filter((x) => x.j !== i)
      .sort((x, y) => x.d - y.d)
      .slice(0, 3 + (rng() < 0.4 ? 2 : 0))
    for (const x of near) addEdge(i, x.j, 0.9 - x.d / (R * R * 6))
  }
  // long haul
  const extra = Math.floor(nodes.length * 0.55)
  for (let k = 0; k < extra; k++) {
    const a = (rng() * nodes.length) | 0
    const b = (rng() * nodes.length) | 0
    if (dist(nodes[a], nodes[b]) > R * R * 0.9) addEdge(a, b, 0.45)
  }

  // --- points --------------------------------------------------------
  const nAtNode = Math.floor(n * 0.42)
  const nAtEdge = Math.floor(n * 0.4)
  const rest = n - nAtNode - nAtEdge

  let i = 0
  while (i < nAtNode) {
    const nd = nodes[(rng() * nodes.length) | 0]
    const o = i * 3
    const s = 0.42 + nd.tier * 0.3
    points[o] = nd.p[0] + gauss(rng) * s
    points[o + 1] = nd.p[1] + gauss(rng) * s
    points[o + 2] = nd.p[2] + gauss(rng) * s
    emphasis[i] = 0.55 + nd.tier * 0.45
    i++
  }
  const edgeEnd = nAtNode + nAtEdge
  while (i < edgeEnd) {
    const e = edges[(rng() * edges.length) | 0]
    const a = nodes[e.a].p
    const b = nodes[e.b].p
    const s = rng()
    const o = i * 3
    points[o] = a[0] + (b[0] - a[0]) * s + gauss(rng) * 0.1
    points[o + 1] = a[1] + (b[1] - a[1]) * s + gauss(rng) * 0.1
    points[o + 2] = a[2] + (b[2] - a[2]) * s + gauss(rng) * 0.1
    emphasis[i] = 0.1 + 0.2 * e.weight
    i++
  }
  while (i < n) {
    const o = i * 3
    const r = R * (0.35 + Math.pow(rng(), 0.5) * 0.85)
    const th = rng() * Math.PI * 2
    const ph = Math.acos(rng() * 2 - 1)
    points[o] = Math.sin(ph) * Math.cos(th) * r
    points[o + 1] = Math.cos(ph) * r * 0.7
    points[o + 2] = Math.sin(ph) * Math.sin(th) * r
    emphasis[i] = 0.05
    i++
  }
  void rest

  return { points, emphasis, nodes, edges, radius: R }
}
