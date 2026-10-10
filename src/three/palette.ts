import { Color } from 'three'

export interface Palette {
  a: Color
  b: Color
  c: Color
  /** background fog / haze tint */
  fog: Color
}

/**
 * The temperature of the piece shifts as you descend. It is the cheapest way
 * to make seven scenes feel like one film: the same three roles — shadow,
 * body, highlight — re-cast for each chapter.
 *
 * 0 bit · 1 silicon · 2 processor · 3 network · 4 kernel · 5 mind · 6 cosmos
 */
const RAW: [string, string, string, string][] = [
  ['#0a1c3d', '#7fd0ff', '#ffffff', '#03060c'], // the bit          — cold, pure
  ['#123a6b', '#63c8ff', '#d8f0ff', '#03060f'], // silicon          — crystal blue
  ['#1a2c6e', '#7fb4ff', '#ffe6b8', '#04060d'], // processor        — gold bond wire
  ['#0f2e6e', '#66d0ff', '#c9e8ff', '#03060e'], // network          — signal blue
  ['#241a6e', '#93a8ff', '#eef2ff', '#04050c'], // kernel           — instrument lilac
  ['#4a2bb8', '#b08cff', '#ffeaff', '#05040e'], // mind             — violet
  ['#2b1f7a', '#6f9dff', '#e6dcff', '#020409'], // cosmos           — deep indigo
]

export const PALETTES: Palette[] = RAW.map(([a, b, c, f]) => ({
  a: new Color(a),
  b: new Color(b),
  c: new Color(c),
  fog: new Color(f),
}))

export const LIVE: Palette = {
  a: PALETTES[0].a.clone(),
  b: PALETTES[0].b.clone(),
  c: PALETTES[0].c.clone(),
  fog: PALETTES[0].fog.clone(),
}

const _tmpA = new Color()
const _tmpB = new Color()

/** Blend the live palette toward the chapter's, so the grade always moves. */
export function blendPalette(seg: number, k: number) {
  const i = Math.max(0, Math.min(PALETTES.length - 2, Math.floor(seg)))
  const t = Math.max(0, Math.min(1, seg - i))
  const p0 = PALETTES[i]
  const p1 = PALETTES[i + 1]
  LIVE.a.lerp(_tmpA.copy(p0.a).lerp(p1.a, t), k)
  LIVE.b.lerp(_tmpB.copy(p0.b).lerp(p1.b, t), k)
  LIVE.c.lerp(_tmpA.copy(p0.c).lerp(p1.c, t), k)
  LIVE.fog.lerp(_tmpB.copy(p0.fog).lerp(p1.fog, t), k)
}
