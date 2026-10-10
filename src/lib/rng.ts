/** Deterministic RNG — the artwork must look identical on every load. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Rng = () => number

/** Uniform in [a,b) */
export const range = (r: Rng, a: number, b: number) => a + (b - a) * r()

/** Approximately gaussian, mean 0, sd ~1 (sum of uniforms). */
export function gauss(r: Rng) {
  return (r() + r() + r() + r() + r() + r() - 3) * 1.2247
}

/** Point on a unit sphere, uniform. */
export function onSphere(r: Rng, out: [number, number, number]) {
  const u = r() * 2 - 1
  const th = r() * Math.PI * 2
  const s = Math.sqrt(1 - u * u)
  out[0] = s * Math.cos(th)
  out[1] = u
  out[2] = s * Math.sin(th)
  return out
}
