import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { BitField } from './BitField'
import { Bit } from './Bit'
import { CoreMesh } from './CoreMesh'
import { Packets } from './Packets'
import { PulseLines } from './PulseLines'
import { Rig } from './Rig'
import { Effects } from './Effects'
import { bus, type PacketRequest } from './interaction'
import type { WorldData } from './world/build'
import type { DeviceProfile } from '../lib/device'
import { CHAPTER_COUNT, clamp, damp, inChapter, smoothstep, world } from '../lib/world'

/* ------------------------------------------------------------------ *
 *  Chapter atmosphere — drift, density and transparency per scene
 * ------------------------------------------------------------------ */

const STAGE = [
  { drift: 0.05, opacity: 0.82, ptr: 0.75, ref: 33, size: 2.5, em: 0.42, bloom: 0.55 }, // 00 the bit
  { drift: 0.13, opacity: 1.0, ptr: 1.0, ref: 20, size: 1.3, em: 0.075, bloom: 0.22 }, // 01 silicon
  { drift: 0.06, opacity: 1.0, ptr: 0.95, ref: 41, size: 2.7, em: 0.72, bloom: 0.6 }, // 02 processor
  { drift: 0.13, opacity: 1.0, ptr: 1.0, ref: 62, size: 2.6, em: 0.3, bloom: 0.5 }, // 03 network
  { drift: 0.05, opacity: 0.4, ptr: 0.7, ref: 40, size: 3.2, em: 0.8, bloom: 0.72 }, // 04 kernel
  { drift: 0.24, opacity: 1.0, ptr: 1.0, ref: 94, size: 2.3, em: 0.34, bloom: 0.26 }, // 05 mind
  { drift: 0.12, opacity: 1.0, ptr: 0.8, ref: 257, size: 1.9, em: 0.46, bloom: 0.2 }, // 06 cosmos
]

const _v = new Vector3()

/** What each region of the die actually does — one line, no lecture. */
const ROLE_COPY: Record<string, { label: string; detail: string }> = {
  core: { label: 'COMPUTE CORE', detail: 'Executes instructions' },
  cache: { label: 'CACHE', detail: 'Memory kept within reach' },
  io: { label: 'I/O CONTROLLER', detail: 'Where the world gets in' },
  mem: { label: 'MEMORY', detail: 'Everything, held' },
}

/* ------------------------------------------------------------------ *
 *  Director — the single place where scroll becomes cinema
 * ------------------------------------------------------------------ */

function Director({ data, profile }: { data: WorldData; profile: DeviceProfile }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const clockAcc = useRef(0)

  // --- node picking -------------------------------------------------
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      // Only meaningful while the network is on stage.
      if (!inChapter(world.seg, 3)) return
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1
      const ndcY = -((e.clientY / window.innerHeight) * 2 - 1)
      const aspect = window.innerWidth / Math.max(1, window.innerHeight)

      let best = -1
      let bestD = 0.085
      const nodes = data.network.nodes
      for (let i = 0; i < nodes.length; i++) {
        _v.set(nodes[i].p[0], nodes[i].p[1], nodes[i].p[2])
        _v.project(camera)
        if (_v.z > 1) continue
        const dx = (_v.x - ndcX) * aspect
        const dy = _v.y - ndcY
        const d = Math.hypot(dx, dy)
        // Hubs are easier to hit — they are drawn bigger.
        const bias = d - nodes[i].tier * 0.012
        if (bias < bestD) {
          bestD = bias
          best = i
        }
      }
      if (best < 0) return
      fireNode(best)
    }
    window.addEventListener('pointerdown', onDown, { passive: true })
    return () => window.removeEventListener('pointerdown', onDown)
  }, [camera, data])

  const fireNode = (index: number) => {
    const nodes = data.network.nodes
    const src = nodes[index]
    world.netActive = index
    world.netPos = [src.p[0], src.p[1], src.p[2]]
    world.netWave = 1

    // Pick destinations that are far enough to read as a journey.
    const reqs: PacketRequest[] = []
    const used = new Set<number>([index])
    const tries = profile.tier === 'high' ? 5 : 3
    for (let k = 0; k < tries; k++) {
      let pick = -1
      for (let a = 0; a < 24; a++) {
        const c = (Math.random() * nodes.length) | 0
        if (used.has(c)) continue
        const dx = nodes[c].p[0] - src.p[0]
        const dy = nodes[c].p[1] - src.p[1]
        const dz = nodes[c].p[2] - src.p[2]
        if (dx * dx + dy * dy + dz * dz > 90) {
          pick = c
          break
        }
      }
      if (pick < 0) continue
      used.add(pick)
      reqs.push({
        from: new Vector3(src.p[0], src.p[1], src.p[2]),
        to: new Vector3(nodes[pick].p[0], nodes[pick].p[1], nodes[pick].p[2]),
        hue: 0.3 + Math.random() * 0.7,
        speed: 0.42 + Math.random() * 0.3,
      })
    }
    bus.spawn?.(reqs)
  }

  useFrame((_, delta) => {
    const dt = Math.min(delta, world.reduced ? 0 : 1 / 30)
    world.time += dt

    // Pointer, damped once for the whole application.
    const pk = world.reduced ? 0.35 : 1
    world.pointerS.x = damp(world.pointerS.x, world.pointer.x * pk, 3.0, dt)
    world.pointerS.y = damp(world.pointerS.y, world.pointer.y * pk, 3.0, dt)

    // --- chapter atmosphere ------------------------------------------
    // Chapter i occupies [i, i+1) in seg-space, so the LAST chapter's
    // progress lives in the fractional part of a value the lookup tables
    // clamp. (Clamping it before the morph froze the finale on the previous
    // chapter's shape; the morph now lives in BitField and reads world.seg
    // unclamped.)
    const seg = clamp(world.seg, 0, CHAPTER_COUNT - 1)
    const i0 = Math.min(CHAPTER_COUNT - 1, Math.floor(seg))
    const i1 = Math.min(CHAPTER_COUNT - 1, i0 + 1)
    const f = clamp(seg - i0, 0, 1)
    const fe = f * f * (3 - 2 * f)
    const A = STAGE[i0]
    const B = STAGE[i1]

    world.drift = damp(world.drift, A.drift * (1 - fe) + B.drift * fe, 2.5, dt)
    world.refDist = damp(world.refDist, A.ref * (1 - fe) + B.ref * fe, 2.5, dt)
    world.ptSize = damp(world.ptSize, A.size * (1 - fe) + B.size * fe, 2.5, dt)
    world.bloom = damp(world.bloom, A.bloom * (1 - fe) + B.bloom * fe, 2.2, dt)

    const gate = world.introDone ? 1 : smoothstep(0.06, 0.5, world.intro)
    // `em` is the per-chapter emission level: a volumetric fill needs far less
    // light than a shape with empty space in it, or sRGB gamma turns the frame
    // white long before the structure is legible.
    const targetOpacity =
      (A.opacity * A.em * (1 - fe) + B.opacity * B.em * fe) * gate
    world.opacity = damp(world.opacity, targetOpacity, 2.4, dt)

    // The numeral explodes on the way out of the hero, and everything
    // breathes outward once more at the very end.
    //
    // The decay is keyed to `rise`, not `seg`: during the hand-off `seg` is
    // pinned, so a seg-keyed decay would hold the field at full dispersion for
    // a whole viewport and then snap it back. Keyed to `rise`, the debris
    // reassembles across exactly the same window in which the lattice forms.
    // The dispersion has to resolve *before* the morph finishes, or the two
    // overlap and every in-between frame is a cloud wider than the lens —
    // smooth, but featureless. Resolving early splits the hand-off into two
    // readable beats: the cloud gathers, then the lattice assembles.
    const scatter =
      smoothstep(0.52, 0.96, seg) * (1 - smoothstep(1.04, 1.56, world.rise)) +
      smoothstep(6.55, 7.0, seg) * 0.4
    world.scatter = damp(world.scatter, world.reduced ? 0 : scatter, 4, dt)

    // --- thought wave ------------------------------------------------
    if (world.thinkOn) {
      world.thinkT += dt
      const p = clamp(world.thinkT / 2.7, 0, 1)
      world.thinkX = -22 + p * 44
      world.thinkPower = Math.sin(p * Math.PI) * world.thinkAmp
      if (p >= 1) {
        world.thinkOn = false
        world.thinkPower = 0
        world.thinkX = 9999
      }
    } else {
      world.thinkPower = damp(world.thinkPower, 0, 2, dt)
    }

    // --- network activation decay ------------------------------------
    world.netWave = damp(world.netWave, 0, 1.35, dt)

    // --- die inspection (chapter 02) ---------------------------------
    // Project every functional block and light whichever one the pointer is
    // over, so the floorplan explains itself without a legend.
    if (inChapter(seg, 2) && !profile.isTouch) {
      const ndcX = world.pointer.x
      const ndcY = world.pointer.y
      const aspect = size.width / Math.max(1, size.height)
      const blocks = data.chip.blocks
      let best = -1
      let bestD = 0.11
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i]
        _v.set(b.x, b.h, b.z).project(camera)
        if (_v.z > 1) continue
        const d = Math.hypot((_v.x - ndcX) * aspect, _v.y - ndcY)
        if (d < bestD) {
          bestD = d
          best = i
        }
      }
      if (best !== world.hoverBlock) {
        world.hoverBlock = best
        if (best >= 0) {
          const b = blocks[best]
          const role = ROLE_COPY[b.role]
          world.hoverLabel = role.label
          world.hoverDetail = role.detail
          world.hoverPos = [b.x, b.h + 0.4, b.z]
        } else {
          world.hoverLabel = ''
          world.hoverDetail = ''
        }
      }
      world.hoverAmt = damp(world.hoverAmt, best >= 0 ? 1 : 0, 7, dt)
    } else if (world.hoverAmt > 0.001) {
      world.hoverAmt = damp(world.hoverAmt, 0, 6, dt)
      if (world.hoverAmt < 0.01) {
        world.hoverBlock = -1
        world.hoverLabel = ''
        world.hoverDetail = ''
      }
    }

    // Touch devices never hover, so the network performs on its own.
    if (profile.isTouch && inChapter(world.seg, 3, 0.15, 0.85)) {
      clockAcc.current += dt
      if (clockAcc.current > 4.6) {
        clockAcc.current = 0
        fireNode((Math.random() * data.network.nodes.length) | 0)
      }
    }
  })

  const chipLines = useMemo(() => data.chip.traces, [data])

  const netLines = useMemo(() => {
    const nodes = data.network.nodes
    return data.network.edges.map((e) => ({
      pts: [nodes[e.a].p.slice() as [number, number, number], nodes[e.b].p.slice() as [number, number, number]],
      weight: e.weight,
    }))
  }, [data])

  return (
    <>
      <Rig />
      <BitField data={data} />
      <Bit />
      <CoreMesh />
      <PulseLines
        lines={chipLines}
        colorA="#2f7fd8"
        colorB="#ffe6b0"
        speed={0.13}
        width={26}
        at={2}
      />
      <PulseLines
        lines={netLines}
        colorA="#2f6fd8"
        colorB="#9fe4ff"
        speed={0.075}
        width={30}
        at={3}
        reactToNode
      />
      <Packets max={profile.tier === 'high' ? 8 : 4} size={profile.tier === 'high' ? 3.6 : 4.6} />
      {profile.post && <Effects />}
    </>
  )
}

/* ------------------------------------------------------------------ *
 *  Canvas
 * ------------------------------------------------------------------ */

export function SceneCanvas({ data, profile }: { data: WorldData; profile: DeviceProfile }) {
  return (
    <Canvas
      className="stage-canvas"
      dpr={profile.dpr}
      frameloop="always"
      gl={{
        antialias: !profile.post,
        alpha: false,
        stencil: false,
        depth: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      }}
      camera={{ position: [0, 0.7, 33], fov: 34, near: 0.5, far: 600 }}
      onCreated={({ gl }) => {
        gl.setClearColor('#04060b', 1)
      }}
    >
      <Director data={data} profile={profile} />
    </Canvas>
  )
}
