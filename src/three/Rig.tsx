import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3, type PerspectiveCamera } from 'three'
import { clamp, damp, smoothstep, world } from '../lib/world'

interface CamStop {
  pos: [number, number, number]
  look: [number, number, number]
  fov: number
  /** yaw swept across the chapter, radians */
  yaw: number
  /** approach along the view axis across the chapter, fraction of distance */
  zoom: number
  /** vertical travel across the chapter, world units */
  rise: number
}

/**
 * Seven camera positions, one film.
 *
 * Between chapters the rig interpolates the *positions*, so it flies a real
 * path through the sculpture — out of the crystal, over the die, into the
 * network — instead of cutting. Inside a chapter each stop has its own slow
 * move (yaw, approach, rise) so the frame is never completely still.
 */
const STOPS: CamStop[] = [
  // 00 the bit — still and reverent. The look target sits well below the
  // numeral so it rides high in frame and leaves the lower third for type.
  { pos: [0, 1.2, 33], look: [0, -3.0, 0], fov: 34, yaw: 0.05, zoom: -0.14, rise: 0.4 },
  // 01 silicon — the camera is *inside* the lattice and drifting through it
  { pos: [0.4, 2.6, 22], look: [0, 0.2, -6], fov: 42, yaw: 0.12, zoom: -0.55, rise: 1.0 },
  // 02 processor — three-quarter view from above the die
  { pos: [4, 30, 36], look: [0, 1, 0], fov: 34, yaw: 0.16, zoom: -0.16, rise: -2.8 },
  // 03 network — backed off enough to read the whole graph
  { pos: [0, 3.5, 62], look: [0, 0, 0], fov: 35, yaw: 0.19, zoom: -0.26, rise: 2.8 },
  // 04 kernel — settled, the panel needs a calm backdrop
  { pos: [0, 4.4, 40], look: [0, 0.4, 0], fov: 35, yaw: 0.08, zoom: -0.1, rise: 0.8 },
  // 05 mind — drifting laterally across the layers
  { pos: [44, 32, 76], look: [0, 0, 0], fov: 36, yaw: 0.13, zoom: -0.18, rise: 1.6 },
  // 06 cosmos — the pull-back
  // Looking down the galaxy's own axis. Viewing a thin disc edge-on collapses
  // the spiral into a bright line, which is exactly what it looked like before.
  { pos: [34, 240, 82], look: [0, 0, 0], fov: 40, yaw: 0.1, zoom: -0.2, rise: 10 },
]

const pA = new Vector3()
const pB = new Vector3()
const lA = new Vector3()
const lB = new Vector3()
const wantPos = new Vector3()
const wantLook = new Vector3()
const curPos = new Vector3(0, 0.7, 33)
const curLook = new Vector3(0, 0.15, 0)
const dir = new Vector3()
const right = new Vector3()
const camUp = new Vector3()
const UP = new Vector3(0, 1, 0)

const TAU_OUT = Math.PI * 2

export function Rig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)

  // Wider framing on narrow screens: portrait crops the sculpture badly.
  const aspectK = useMemo(() => {
    const a = size.width / Math.max(1, size.height)
    return a < 0.85 ? 1.5 : a < 1.25 ? 1.18 : 1
  }, [size.width, size.height])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const seg = clamp(world.seg, 0, STOPS.length - 1)
    const i0 = Math.min(STOPS.length - 1, Math.floor(seg))
    const i1 = Math.min(STOPS.length - 1, i0 + 1)
    const f = clamp(seg - i0, 0, 1)
    // The rig *holds* at a chapter's stop for the first 60% of its window —
    // the arrival should coincide with the structure settling and the text
    // landing, not race ahead of it. The flight to the next stop happens in
    // the last 40%, so the pull-out plays behind the outgoing words.
    const fe = smoothstep(0.6, 1.0, f)

    const A = STOPS[i0]
    const B = STOPS[i1]

    pA.set(A.pos[0], A.pos[1], A.pos[2])
    pB.set(B.pos[0], B.pos[1], B.pos[2])
    lA.set(A.look[0], A.look[1], A.look[2])
    lB.set(B.look[0], B.look[1], B.look[2])

    wantPos.copy(pA).lerp(pB, fe)
    wantLook.copy(lA).lerp(lB, fe)

    // Chapter-local motion runs on its own clock so the slow drift inside a
    // chapter is independent of the hand-off timing.
    const localP = clamp(world.ch[i0] * (1 - f) + world.ch[i1] * f, 0, 1)
    const yaw = (A.yaw * (1 - fe) + B.yaw * fe) * localP * TAU_OUT * 0.32
    const zoom = A.zoom * (1 - fe) + B.zoom * fe
    const rise = A.rise * (1 - fe) + B.rise * fe

    dir.copy(wantPos).sub(wantLook)
    const dist = dir.length() || 1
    dir.divideScalar(dist)
    wantPos.copy(wantLook).addScaledVector(dir, dist * (1 + zoom * localP))
    wantPos.y += rise * localP

    // Orbit around the subject.
    const ca = Math.cos(yaw)
    const sa = Math.sin(yaw)
    const ox = wantPos.x - wantLook.x
    const oz = wantPos.z - wantLook.z
    wantPos.x = wantLook.x + ox * ca - oz * sa
    wantPos.z = wantLook.z + ox * sa + oz * ca

    // Pointer parallax — real translation, so depth is unambiguous.
    right.copy(dir).cross(UP).normalize()
    camUp.copy(right).cross(dir).normalize()
    const pk = world.reduced ? 0.25 : world.tier === 'low' ? 0.55 : 1
    wantPos.addScaledVector(right, world.pointerS.x * 0.95 * pk)
    wantPos.addScaledVector(camUp, world.pointerS.y * 0.62 * pk)
    wantLook.addScaledVector(right, world.pointerS.x * 0.4 * pk)
    wantLook.addScaledVector(camUp, world.pointerS.y * 0.26 * pk)

    // A slow breath so nothing is ever perfectly static.
    const b = world.reduced ? 0 : 1
    wantPos.y += Math.sin(world.time * 0.21) * 0.34 * b
    wantPos.x += Math.cos(world.time * 0.17) * 0.28 * b

    const lambda = world.reduced ? 12 : 3.2
    curPos.x = damp(curPos.x, wantPos.x, lambda, dt)
    curPos.y = damp(curPos.y, wantPos.y, lambda, dt)
    curPos.z = damp(curPos.z, wantPos.z, lambda, dt)
    curLook.x = damp(curLook.x, wantLook.x, lambda, dt)
    curLook.y = damp(curLook.y, wantLook.y, lambda, dt)
    curLook.z = damp(curLook.z, wantLook.z, lambda, dt)

    camera.position.copy(curPos)
    camera.up.set(0, 1, 0)
    camera.lookAt(curLook)

    // A whisper of roll, damped out on the intro so the opening is level.
    const roll = Math.sin(world.time * 0.13) * 0.006 * b * clamp(world.seg, 0, 1)
    camera.rotation.z += roll

    // The opening is a portrait of a single numeral, so it wants a tight lens
    // even on a phone; the wide structures that follow need the extra field.
    const wide = 1 + (aspectK - 1) * smoothstep(0.25, 1.15, seg)
    const wantFov = (A.fov * (1 - fe) + B.fov * fe) * wide
    if (Math.abs(camera.fov - wantFov) > 0.02) {
      camera.fov = damp(camera.fov, wantFov, 3, dt)
      camera.updateProjectionMatrix()
    }
  })

  return null
}
