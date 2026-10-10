import { gauss, range, type Rng } from '../../lib/rng'

export interface GlyphSample {
  points: Float32Array
  emphasis: Float32Array
}

/**
 * The numeral that opens the piece.
 *
 * Rasterised from the live font stack, then re-sampled as a point cloud with a
 * deliberate bias toward the silhouette: a digit drawn only by its outline and
 * its interior gradient reads as light, whereas a uniformly sampled one reads
 * as grey mush once additive blending stacks it up.
 */
export function buildGlyph(n: number, rng: Rng, cssFont: string): GlyphSample {
  const points = new Float32Array(n * 3)
  const emphasis = new Float32Array(n)

  const W = 460
  const H = 700
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d', { willReadFrequently: true })

  let mask: { x: number; y: number; edge: number }[] = []

  if (ctx) {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.font = cssFont
    ctx.fillText('1', W / 2, H * 0.82)

    const img = ctx.getImageData(0, 0, W, H).data
    const alphaAt = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return 0
      return img[(y * W + x) * 4]
    }

    // Bounding box so the digit can be normalised to a fixed world height.
    let minX = W
    let maxX = 0
    let minY = H
    let maxY = 0
    for (let y = 0; y < H; y += 2) {
      for (let x = 0; x < W; x += 2) {
        if (alphaAt(x, y) > 110) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    if (maxX > minX && maxY > minY) {
      // Sized so the numeral occupies the upper ~55% of the opening frame and
      // the headline can live beneath it without a scrim.
      const TARGET_H = 8.3
      // Canvas y grows downward; world y grows upward.
      const s = TARGET_H / (maxY - minY)
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      const list: { x: number; y: number; edge: number }[] = []
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (alphaAt(x, y) <= 110) continue
          const e =
            alphaAt(x - 2, y) < 110 ||
            alphaAt(x + 2, y) < 110 ||
            alphaAt(x, y - 2) < 110 ||
            alphaAt(x, y + 2) < 110
              ? 1
              : 0
          list.push({ x: (x - cx) * s, y: (cy - y) * s, edge: e })
        }
      }
      mask = list
    }
  }

  const ambient = Math.floor(n * 0.11)
  const body = n - ambient
  const edgeList = mask.filter((p) => p.edge === 1)
  const innerList = mask.filter((p) => p.edge === 0)

  for (let i = 0; i < body; i++) {
    const o = i * 3
    // Only a quarter of the mass goes to the contour. Push it higher and the
    // digit stops being a slab of light and becomes a hollow outline — the
    // single easiest way to make a point cloud look cheap.
    const fromEdge = edgeList.length > 0 && rng() < 0.24
    const src = fromEdge && edgeList.length ? edgeList : innerList.length ? innerList : mask
    let x = 0
    let y = 0
    if (src.length) {
      const p = src[(rng() * src.length) | 0]
      x = p.x + gauss(rng) * 0.03
      y = p.y + gauss(rng) * 0.03
    } else {
      x = range(rng, -3, 3)
      y = range(rng, -8, 8)
    }
    // A shallow relief field gives the slab of light real depth.
    const z =
      gauss(rng) * 0.17 + Math.sin(x * 0.62) * Math.cos(y * 0.41) * 0.34 + Math.sin(y * 0.9) * 0.09
    points[o] = x
    points[o + 1] = y
    points[o + 2] = z
    emphasis[i] = fromEdge ? 0.89 : 0.7
  }

  // Dust that never fully commits to the shape — it keeps the digit breathing.
  for (let i = body; i < n; i++) {
    const o = i * 3
    const r = 7.5 + Math.pow(rng(), 0.6) * 15
    const th = rng() * Math.PI * 2
    const ph = Math.acos(rng() * 2 - 1)
    points[o] = Math.sin(ph) * Math.cos(th) * r * 1.5
    points[o + 1] = Math.cos(ph) * r * 0.72
    points[o + 2] = Math.sin(ph) * Math.sin(th) * r
    emphasis[i] = 0.06
  }

  return { points, emphasis }
}
