import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, Mesh, ShaderMaterial } from 'three'
import { BIT_FRAG, BIT_VERT } from './shaders/field'
import { damp, smoothstep, world } from '../lib/world'
import { LIVE } from './palette'

/**
 * The first thing the visitor ever sees: one point of light in a black field.
 * It answers the pointer. Everything downstream comes out of it.
 */
export function Bit() {
  const ref = useRef<Mesh>(null)

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: BIT_VERT,
        fragmentShader: BIT_FRAG,
        uniforms: {
          uOpacity: { value: 0 },
          uTime: { value: 0 },
          uColor: { value: new Color('#cfe9ff') },
        },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: AdditiveBlending,
      }),
    [],
  )

  useEffect(() => () => material.dispose(), [material])

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const m = ref.current
    if (!m) return

    material.uniforms.uTime.value = world.time
    ;(material.uniforms.uColor.value as Color).copy(LIVE.c).lerp(LIVE.b, 0.45)

    // Lives only in the opening; it dissolves once the visitor moves on.
    const fade = 1 - smoothstep(0.03, 0.2, world.seg)
    material.uniforms.uOpacity.value = damp(
      material.uniforms.uOpacity.value as number,
      fade * (world.introDone ? 0.85 : 0.35),
      4,
      dt,
    )

    m.quaternion.copy(camera.quaternion)

    // The pointer leans it very slightly — presence, not a joystick.
    const px = world.pointerS.x * 0.5
    const py = world.pointerS.y * 0.34
    m.position.x = damp(m.position.x, px, 3, dt)
    m.position.y = damp(m.position.y, py, 3, dt)

    const breathe = 1 + Math.sin(world.time * 0.9) * 0.06 + Math.sin(world.time * 2.31) * 0.02
    const s = damp(m.scale.x, 0.86 * breathe, 3, dt)
    m.scale.setScalar(s)
  })

  return (
    <mesh ref={ref} position={[0, 0, 0]} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
