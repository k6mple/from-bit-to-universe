import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
  Sphere,
  Vector3,
} from 'three'
import { FIELD_FRAG, FIELD_VERT } from './shaders/field'
import type { WorldData } from './world/build'
import { damp, morphAt, world, type MorphState } from '../lib/world'
import { LIVE, blendPalette } from './palette'

/**
 * Every structure in the exhibition, in one draw call.
 * The component itself owns no geometry logic — it binds the baked shape
 * attributes and pumps the uniforms from `world` each frame.
 */
export function BitField({ data }: { data: WorldData }) {
  const gl = useThree((s) => s.gl)

  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(data.shapes[0], 3))
    for (let i = 1; i < 8; i++) {
      g.setAttribute(`aS${i}`, new BufferAttribute(data.shapes[i], 3))
    }
    g.setAttribute('aE0', new BufferAttribute(data.emphA, 4))
    g.setAttribute('aE1', new BufferAttribute(data.emphB, 4))
    g.setAttribute('aMeta', new BufferAttribute(data.meta, 4))
    g.setAttribute('aOrb', new BufferAttribute(data.orb2, 2))
    g.boundingSphere = new Sphere(new Vector3(), 200)
    return g
  }, [data])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: FIELD_VERT,
        fragmentShader: FIELD_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uFrom: { value: 0 },
          uTo: { value: 1 },
          uT: { value: 0 },
          uScatter: { value: 0 },
          uDrift: { value: 0.12 },
          uOrbAmt: { value: 1 },
          uSize: { value: 3.4 },
          uPixel: { value: 1 },
          uRefDist: { value: 33 },
          uOpacity: { value: 0 },
          uPointerAmt: { value: 0.9 },
          uPointer: { value: [0, 0] },
          uColA: { value: new Color('#0a1c3d') },
          uColB: { value: new Color('#7fd0ff') },
          uColC: { value: new Color('#ffffff') },
          uThinkX: { value: 9999 },
          uThinkPower: { value: 0 },
          uNetPos: { value: [999, 999, 999] },
          uNetWave: { value: 0 },
          uHoverPos: { value: [999, 999, 999] },
          uHoverAmt: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: AdditiveBlending,
      }),
    [],
  )

  const sizeRef = useRef(3.4)
  const riseS = useRef(world.rise)
  const morph = useRef<MorphState>({ from: 0, to: 1, t: 0 })

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
    u.uPixel.value = Math.min(gl.getPixelRatio(), 1.75)

    // Morph. The damped quantity is the structure POSITION, then from/to/t are
    // all derived from it together — see morphAt() for why damping `t` alone
    // makes the next chapter's shape flash up on every boundary.
    riseS.current = damp(riseS.current, world.rise, 8, dt)
    const m = morphAt(riseS.current, morph.current)
    u.uFrom.value = m.from
    u.uTo.value = m.to
    u.uT.value = m.t
    // Published for observability (and so tooling can read the live state).
    world.morphFrom = m.from
    world.morphTo = m.to
    world.morphT = m.t

    u.uScatter.value = damp(u.uScatter.value as number, world.scatter, 5, dt)
    u.uDrift.value = damp(u.uDrift.value as number, world.drift, 3, dt)
    u.uOpacity.value = damp(u.uOpacity.value as number, world.opacity, 6, dt)
    u.uOrbAmt.value = world.reduced ? 0.25 : 1
    u.uRefDist.value = world.refDist

    // Pointer, damped, and converted to a world-space-ish offset.
    u.uPointer.value[0] = world.pointerS.x
    u.uPointer.value[1] = world.pointerS.y
    u.uPointerAmt.value = world.reduced || world.tier === 'low' ? 0.55 : 1.05

    // The grade travels with the story.
    blendPalette(world.seg, 1 - Math.exp(-1.6 * dt))
    ;(u.uColA.value as Color).copy(LIVE.a)
    ;(u.uColB.value as Color).copy(LIVE.b)
    ;(u.uColC.value as Color).copy(LIVE.c)

    // Thought wave (AI chapter)
    u.uThinkX.value = world.thinkX
    u.uThinkPower.value = damp(u.uThinkPower.value as number, world.thinkPower, 4, dt)

    // Network activation blast
    const nv = u.uNetPos.value as number[]
    nv[0] = damp(nv[0], world.netPos[0], 8, dt)
    nv[1] = damp(nv[1], world.netPos[1], 8, dt)
    nv[2] = damp(nv[2], world.netPos[2], 8, dt)
    u.uNetWave.value = damp(u.uNetWave.value as number, world.netWave, 3.2, dt)

    // Die inspection
    const hv = u.uHoverPos.value as number[]
    hv[0] = damp(hv[0], world.hoverPos[0], 9, dt)
    hv[1] = damp(hv[1], world.hoverPos[1], 9, dt)
    hv[2] = damp(hv[2], world.hoverPos[2], 9, dt)
    u.uHoverAmt.value = damp(u.uHoverAmt.value as number, world.hoverAmt, 6, dt)

    // Larger points on the low tier: fewer particles have to carry the image.
    const targetSize = world.ptSize * (world.tier === 'high' ? 1 : 1.35)
    sizeRef.current = damp(sizeRef.current, targetSize, 3, dt)
    u.uSize.value = sizeRef.current
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}
