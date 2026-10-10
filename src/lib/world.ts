/**
 * The single source of truth shared between the DOM world and the WebGL world.
 *
 * Nothing in here is React state on purpose. Scroll and pointer events write
 * into it from the outside; the render loop reads it once per frame. That keeps
 * a 140k-particle scene at 60fps with zero React re-renders during motion.
 */

export const CHAPTER_COUNT = 7

/** Shape slots inside the master particle field. Index === morph target id. */
export const enum Shape {
  Scatter = 0,
  Glyph = 1,
  Lattice = 2,
  Chip = 3,
  Network = 4,
  Core = 5,
  Neural = 6,
  Galaxy = 7,
}

export type Tier = 'high' | 'low'

export interface WorldState {
  /** Overall page scroll, 0..1 */
  scroll: number
  /** Continuous chapter position, 0 .. CHAPTER_COUNT-1 */
  seg: number
  /**
   * Structure coordinate. Holds at c+1 through chapter c's pinned window and
   * advances c+1 → c+2 across the following hand-off, so shapes transform
   * during the page transition rather than freezing through it.
   */
  rise: number
  /** Per-chapter local progress, 0..1 */
  ch: Float32Array
  /** Raw pointer, -1..1, origin at viewport centre */
  pointer: { x: number; y: number }
  /** Damped pointer actually used for parallax */
  pointerS: { x: number; y: number }
  /** Morph pair + interpolation */
  morphFrom: number
  morphTo: number
  morphT: number
  /** Radial dispersion applied on top of the morph (hero exit, finale) */
  scatter: number
  /** Idle shimmer amplitude */
  drift: number
  /** Global opacity of the particle field */
  opacity: number
  /** Depth reference used for point-size perspective, per chapter */
  refDist: number
  /** Base point size, per chapter */
  ptSize: number
  /** Bloom strength, per chapter — a dense fill needs far less than a sparse one */
  bloom: number
  /** Thought wave for the AI chapter: x position, power, seed */
  thinkX: number
  thinkPower: number
  thinkSeed: number
  /** Thought wave driver, advanced by the render loop */
  thinkT: number
  thinkOn: boolean
  thinkAmp: number
  /** Network chapter interaction */
  netActive: number
  netWave: number
  /** World-space position of the most recently pressed node. */
  netPos: [number, number, number]
  /** Die inspection: which functional block the pointer is over */
  hoverPos: [number, number, number]
  hoverAmt: number
  hoverBlock: number
  hoverLabel: string
  hoverDetail: string
  /** Intro timeline progress, 0..1 (drives hero morph) */
  intro: number
  introDone: boolean
  /** Seconds since boot, capped so audio-free idles stay stable */
  time: number
  reduced: boolean
  tier: Tier
  ready: boolean
}

export const world: WorldState = {
  scroll: 0,
  seg: 0,
  rise: 1,
  ch: new Float32Array(CHAPTER_COUNT),
  pointer: { x: 0, y: 0 },
  pointerS: { x: 0, y: 0 },
  morphFrom: Shape.Scatter,
  morphTo: Shape.Glyph,
  morphT: 1,
  scatter: 0,
  drift: 0.12,
  opacity: 1,
  refDist: 33,
  ptSize: 3.4,
  bloom: 0.9,
  thinkX: 9999,
  thinkPower: 0,
  thinkSeed: 0,
  thinkT: 0,
  thinkOn: false,
  thinkAmp: 1,
  netActive: -1,
  netWave: 0,
  netPos: [999, 999, 999],
  hoverPos: [999, 999, 999],
  hoverAmt: 0,
  hoverBlock: -1,
  hoverLabel: '',
  hoverDetail: '',
  intro: 0,
  introDone: false,
  time: 0,
  reduced: false,
  tier: 'high',
  ready: false,
}

/** Frame-rate independent exponential smoothing. */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

export function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v
}

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Remap a normalised value from [a0,a1] to [0,1], clamped, with ease. */
export function window01(x: number, a0: number, a1: number) {
  return smoothstep(a0, a1, x)
}

/**
 * How present chapter `c`'s own scenery should be (its traces, links, core,
 * packets) — 0..1, keyed on that chapter's OWN progress, not on distance from
 * its index.
 *
 * The difference matters. `1 - |seg - c|` peaks at exactly seg = c, which is
 * the hand-off — the moment when the previous chapter's structure is still on
 * screen. Scenery keyed that way lights up half a chapter early: the die's
 * signal traces appear over the silicon lattice, before the die exists.
 * Chapter c is on stage for seg ∈ [c, c+1) and nothing earlier.
 */
export function chapterGlow(seg: number, c: number): number {
  const p = seg - c
  if (p <= 0 || p >= 1) return 0
  // arrives with the structure, leaves with the words
  return smoothstep(0.04, 0.46, p) * (1 - smoothstep(0.87, 1, p))
}

/** Chapters are interactive only while they are actually on stage. */
export function inChapter(seg: number, c: number, lo = 0.12, hi = 0.95): boolean {
  const p = seg - c
  return p >= lo && p <= hi
}

export interface MorphState {
  from: number
  to: number
  t: number
}

/**
 * Shape pair + blend for a value of `world.rise`.
 *
 * `rise` is the coordinate the structure transforms on. It holds steady while
 * a chapter is pinned and advances by exactly 1 across each hand-off — so the
 * shape change happens *during* the page transition instead of being frozen
 * by it. (Keying the morph to `seg` meant that the moment a chapter's stage
 * unpinned, every seg-derived value stopped changing for a full viewport of
 * scrolling: the field hung, fully dispersed, and then reassembled in a rush.)
 *
 * This is a pure function of ONE continuous value. A boundary flips the pair
 * from (c, c+1) to (c+1, c+2) and resets t from 1 to 0 in the same instant;
 * both sides describe shape c+1 only if all three move together. A *damped* t
 * left dangling at 1 means `to`, so the next chapter's structure flashes up on
 * every transition. Damp the position, never the blend.
 */
export function morphAt(rise: number, out: MorphState): MorphState {
  if (!world.introDone) {
    // The opening is owned by the intro timeline, not by scroll.
    out.from = Shape.Scatter
    out.to = Shape.Glyph
    out.t = world.intro
    return out
  }
  const r = clamp(rise, 1, CHAPTER_COUNT - 0.0001)
  const i = Math.floor(r)
  out.from = i
  out.to = i + 1
  out.t = smoothstep(0.06, 0.94, r - i)
  return out
}
