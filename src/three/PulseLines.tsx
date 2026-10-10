import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial, Vector3 } from 'three'
import { LINE_FRAG, LINE_VERT } from './shaders/field'
import { chapterGlow, damp, world } from '../lib/world'

export interface Polyline {
  pts: [number, number, number][]
  weight: number
}

/**
 * Light with somewhere to be.
 *
 * A polyline is resampled into many short segments so a pulse can exist
 * *inside* it rather than interpolate between two endpoints. Used for the
 * processor's signal traces and, with different tuning, the network's links.
 */
function polylineGeometry(lines: Polyline[], sub: number): BufferGeometry {
  const pos: number[] = []
  const aT: number[] = []
  const aSeed: number[] = []

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]
    const seed = ((li * 2654435761) % 1000) / 1000

    // resample
    const P: [number, number, number][] = []
    const T: number[] = []
    let total = 0
    const lens: number[] = []
    for (let i = 0; i < line.pts.length - 1; i++) {
      const a = line.pts[i]
      const b = line.pts[i + 1]
      const l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
      lens.push(l)
      total += l
    }
    if (total < 1e-5) continue
    let acc = 0
    for (let i = 0; i < line.pts.length - 1; i++) {
      const a = line.pts[i]
      const b = line.pts[i + 1]
      const steps = Math.max(2, Math.round((lens[i] / total) * sub))
      for (let s = 0; s < steps; s++) {
        const u = s / steps
        P.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u])
        T.push((acc + lens[i] * u) / total)
      }
      acc += lens[i]
    }
    P.push(line.pts[line.pts.length - 1])
    T.push(1)

    for (let i = 0; i < P.length - 1; i++) {
      pos.push(P[i][0], P[i][1], P[i][2], P[i + 1][0], P[i + 1][1], P[i + 1][2])
      aT.push(T[i], T[i + 1])
      aSeed.push(seed, seed)
    }
  }

  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setAttribute('aT', new BufferAttribute(new Float32Array(aT), 1))
  g.setAttribute('aSeed', new BufferAttribute(new Float32Array(aSeed), 1))
  g.computeBoundingSphere()
  return g
}

export interface PulseLinesProps {
  lines: Polyline[]
  sub?: number
  speed?: number
  width?: number
  colorA: string
  colorB: string
  /** which chapter index (float) this layer belongs to */
  at: number
  reactToNode?: boolean
}

export function PulseLines({
  lines,
  sub = 26,
  speed = 0.1,
  width = 20,
  colorA,
  colorB,
  at,
  reactToNode = false,
}: PulseLinesProps) {
  const geometry = useMemo(() => polylineGeometry(lines, sub), [lines, sub])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: LINE_VERT,
        fragmentShader: LINE_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uSpeed: { value: speed },
          uWidth: { value: width },
          uColA: { value: new Color(colorA) },
          uColB: { value: new Color(colorB) },
          uActivate: { value: 0 },
          uNodePos: { value: new Vector3(999, 999, 999) },
          uNodeWave: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: AdditiveBlending,
      }),
    [speed, width, colorA, colorB],
  )

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const u = material.uniforms
    u.uTime.value = world.time

    // Keyed on the chapter's own progress, so the traces arrive with the
    // structure they belong to instead of half a chapter early.
    const g = chapterGlow(world.seg, at)
    const target = world.reduced ? (g > 0 ? 0.8 : 0) : g * 0.9
    u.uOpacity.value = damp(u.uOpacity.value as number, target, 4, dt)

    const np = u.uNodePos.value as Vector3
    if (reactToNode && world.netActive >= 0) {
      np.set(world.netPos[0], world.netPos[1], world.netPos[2])
      u.uNodeWave.value = damp(u.uNodeWave.value as number, world.netWave, 3, dt)
    } else {
      np.set(999, 999, 999)
      u.uNodeWave.value = damp(u.uNodeWave.value as number, 0, 3, dt)
    }
  })

  if (lines.length === 0) return null
  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />
}
