import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferGeometry,
  EdgesGeometry,
  Group,
  IcosahedronGeometry,
  MeshBasicMaterial,
  TorusGeometry,
  LineBasicMaterial,
} from 'three'
import { chapterGlow, damp, world } from '../lib/world'
import { LIVE } from './palette'

/**
 * The kernel, as an object.
 *
 * Deliberately spare: a wireframe solid with three rings, sitting behind the
 * instrument panel of chapter 04. Its job is to hold the centre of the frame
 * while the DOM does the talking.
 */
export function CoreMesh() {
  const group = useRef<Group>(null)

  const geo = useMemo(() => {
    const solid = new EdgesGeometry(new IcosahedronGeometry(3.1, 1))
    const rings = [5.6, 7.4, 9.6].map((r) => new TorusGeometry(r, 0.014, 3, 160))
    return { solid, rings }
  }, [])

  const solidMat = useMemo(
    () =>
      new LineBasicMaterial({
        color: 0x9fc8ff,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [],
  )
  const ringMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: 0x8fb4ff,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        side: 2,
      }),
    [],
  )

  useEffect(
    () => () => {
      geo.solid.dispose()
      geo.rings.forEach((g: BufferGeometry) => g.dispose())
      solidMat.dispose()
      ringMat.dispose()
    },
    [geo, solidMat, ringMat],
  )

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const g = group.current
    if (!g) return

    const target = chapterGlow(world.seg, 4)
    const o = damp(solidMat.opacity, target * 0.5, 3, dt)
    solidMat.opacity = o
    ringMat.opacity = damp(ringMat.opacity, target * 0.34, 3, dt)
    solidMat.color.copy(LIVE.b)
    ringMat.color.copy(LIVE.a).lerp(LIVE.b, 0.5)

    g.visible = o > 0.004
    g.rotation.y += dt * 0.09
    g.rotation.x = Math.sin(world.time * 0.12) * 0.16
    if (g.children[1]) g.children[1].rotation.z += dt * 0.14
    if (g.children[2]) g.children[2].rotation.x += dt * 0.11
    if (g.children[3]) g.children[3].rotation.y -= dt * 0.07
  })

  return (
    <group ref={group}>
      <lineSegments geometry={geo.solid} material={solidMat} />
      {geo.rings.map((r: BufferGeometry, i: number) => (
        <mesh
          key={i}
          geometry={r}
          material={ringMat}
          rotation={[i * 1.1 + 0.4, i * 0.7, i * 0.9]}
        />
      ))}
    </group>
  )
}
