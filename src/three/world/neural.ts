import { gauss, type Rng } from '../../lib/rng'
import type { GlyphSample } from './glyph'

export interface NeuralLayer {
  x: number
  neurons: [number, number][]
  size: number
}

export interface NeuralConn {
  /** [layerIndex, neuronIndex] */
  a: [number, number]
  b: [number, number]
  w: number
}

export interface NeuralData extends GlyphSample {
  layers: NeuralLayer[]
  conns: NeuralConn[]
  spanX: [number, number]
}

const LAYER_COUNT = 6
const COUNTS = [16, 46, 68, 68, 42, 14]

/**
 * The mind.
 *
 * Six layers, widening then narrowing — an encoder and a decoder, which is what
 * a network that has learned to hold meaning actually looks like. Connections
 * are short-range biased so the mesh has grain rather than uniform static.
 */
export function buildNeural(n: number, rng: Rng): NeuralData {
  const points = new Float32Array(n * 3)
  const emphasis = new Float32Array(n)

  const layers: NeuralLayer[] = []
  const spread = 38
  for (let l = 0; l < LAYER_COUNT; l++) {
    const x = -spread / 2 + (l / (LAYER_COUNT - 1)) * spread
    const c = COUNTS[l]
    const R = 3.4 + Math.sqrt(c) * 1.62
    const neurons: [number, number][] = []
    // sunflower placement: even coverage without the grid look
    const GA = Math.PI * (3 - Math.sqrt(5))
    for (let k = 0; k < c; k++) {
      const rr = Math.sqrt((k + 0.5) / c) * R
      const a = k * GA + l * 1.1
      neurons.push([Math.cos(a) * rr * 1.12, Math.sin(a) * rr])
    }
    layers.push({ x, neurons, size: R })
  }

  const conns: NeuralConn[] = []
  for (let l = 0; l < LAYER_COUNT - 1; l++) {
    const A = layers[l]
    const B = layers[l + 1]
    for (let i = 0; i < A.neurons.length; i++) {
      const fan = 3 + ((rng() * 3) | 0)
      const used = new Set<number>()
      for (let f = 0; f < fan; f++) {
        const j = (rng() * B.neurons.length) | 0
        if (used.has(j)) continue
        used.add(j)
        conns.push({ a: [l, i], b: [l + 1, j], w: 0.25 + rng() * 0.75 })
      }
    }
  }

  const nAtNode = Math.floor(n * 0.13)
  const nAtConn = Math.floor(n * 0.71)
  const rest = n - nAtNode - nAtConn

  const nPos = (li: number, ni: number): [number, number, number] => {
    const L = layers[li]
    const [y, z] = L.neurons[ni]
    return [L.x, y, z]
  }

  let i = 0
  while (i < nAtNode) {
    const li = (rng() * LAYER_COUNT) | 0
    const L = layers[li]
    const ni = (rng() * L.neurons.length) | 0
    const [x, y, z] = nPos(li, ni)
    const o = i * 3
    points[o] = x + gauss(rng) * 0.24
    points[o + 1] = y + gauss(rng) * 0.3
    points[o + 2] = z + gauss(rng) * 0.3
    emphasis[i] = 0.95
    i++
  }

  const connEnd = nAtNode + nAtConn
  while (i < connEnd) {
    const c = conns[(rng() * conns.length) | 0]
    const a = nPos(c.a[0], c.a[1])
    const b = nPos(c.b[0], c.b[1])
    const s = rng()
    const o = i * 3
    // slight bow so the wiring reads as curves, not rulers
    const bow = Math.sin(s * Math.PI) * 0.5
    points[o] = a[0] + (b[0] - a[0]) * s + gauss(rng) * 0.09
    points[o + 1] = a[1] + (b[1] - a[1]) * s + gauss(rng) * 0.1 + bow * Math.sin(a[1] + b[1])
    points[o + 2] = a[2] + (b[2] - a[2]) * s + gauss(rng) * 0.1 + bow * Math.cos(a[2] - b[2])
    emphasis[i] = 0.1 + 0.28 * c.w
    i++
  }

  while (i < n) {
    const o = i * 3
    const li = (rng() * LAYER_COUNT) | 0
    const x = layers[li].x + gauss(rng) * 3.2
    const rr = 4 + Math.pow(rng(), 0.6) * 16
    const a = rng() * Math.PI * 2
    points[o] = x
    points[o + 1] = Math.cos(a) * rr
    points[o + 2] = Math.sin(a) * rr
    emphasis[i] = 0.05
    i++
  }
  void rest

  return { points, emphasis, layers, conns, spanX: [-spread / 2, spread / 2] }
}

export const NEURAL_LAYER_COUNT = LAYER_COUNT
