import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial, Vector3 } from 'three'
import { bus, type PacketRequest } from './interaction'
import { chapterGlow, damp, world } from '../lib/world'
import { LIVE } from './palette'

const TAIL = 30

const PACKET_VERT = /* glsl */ `
uniform float uSize;
uniform float uPixel;
uniform float uOpacity;
attribute float aA;
attribute float aHue;
varying float vA;
varying float vHue;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vA = aA * uOpacity;
  vHue = aHue;
  gl_PointSize = min(uSize * uPixel * (0.45 + aA) / max(0.7, -mv.z * 0.035 + 1.0), 30.0 * uPixel);
}
`

const PACKET_FRAG = /* glsl */ `
uniform vec3 uColA;
uniform vec3 uColB;
varying float vA;
varying float vHue;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float r2 = dot(uv, uv) * 4.0;
  if (r2 > 1.0) discard;
  float core = 1.0 - r2;
  float a = core * core * core;
  vec3 c = mix(uColA, uColB, vHue);
  gl_FragColor = vec4(c * (1.0 + vA * 2.6), a * vA);
}
`

interface Live {
  a: Vector3
  c: Vector3
  b: Vector3
  t: number
  speed: number
  hue: number
}

/**
 * Data in flight.
 *
 * Pressing a node on the network fires real transmissions: comets that arc
 * between machines along quadratic paths, each with a visible tail of the
 * bits that came before it.
 */
export function Packets({ max = 8, size = 3.6 }: { max?: number; size?: number }) {
  const pool = useRef<Live[]>([])
  const active = useRef<number[]>([])

  const count = max * TAIL

  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aA', new BufferAttribute(new Float32Array(count), 1))
    g.setAttribute('aHue', new BufferAttribute(new Float32Array(count), 1))
    g.setAttribute('aSeed', new BufferAttribute(new Float32Array(count), 1))
    g.boundingSphere = null
    return g
  }, [count])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: PACKET_VERT,
        fragmentShader: PACKET_FRAG,
        uniforms: {
          uSize: { value: size },
          uPixel: { value: 1 },
          uOpacity: { value: 0 },
          uColA: { value: new Color('#7fd0ff') },
          uColB: { value: new Color('#ffffff') },
        },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: AdditiveBlending,
      }),
    [size],
  )

  useEffect(() => {
    for (let i = 0; i < max; i++) {
      pool.current.push({
        a: new Vector3(),
        c: new Vector3(),
        b: new Vector3(),
        t: 1e9,
        speed: 1,
        hue: 0,
      })
    }
    bus.spawn = (reqs: PacketRequest[]) => {
      for (const r of reqs) {
        // Take the longest-idle packet slot.
        let slot = -1
        let best = -1
        for (let i = 0; i < pool.current.length; i++) {
          if (pool.current[i].t > best) {
            best = pool.current[i].t
            slot = i
          }
        }
        if (slot < 0) continue
        const p = pool.current[slot]
        p.a.copy(r.from)
        p.b.copy(r.to)
        // Control point pushes the arc away from the origin so packets sweep
        // through space rather than running along the surface.
        p.c.copy(r.from).add(r.to).multiplyScalar(0.5)
        const out = p.c.clone()
        if (out.lengthSq() < 1e-4) out.set(0, 1, 0)
        out.normalize().multiplyScalar(r.from.distanceTo(r.to) * 0.22 + 3)
        p.c.add(out)
        p.t = 0
        p.speed = r.speed
        p.hue = r.hue
        if (!active.current.includes(slot)) active.current.push(slot)
      }
    }
    return () => {
      bus.spawn = null
    }
  }, [max])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(({ gl }, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const pos = geometry.getAttribute('position') as BufferAttribute
    const aA = geometry.getAttribute('aA') as BufferAttribute
    const aHue = geometry.getAttribute('aHue') as BufferAttribute
    const arr = pos.array as Float32Array
    const aArr = aA.array as Float32Array
    const hArr = aHue.array as Float32Array

    material.uniforms.uPixel.value = Math.min(gl.getPixelRatio(), 1.75)
    material.uniforms.uOpacity.value = damp(
      material.uniforms.uOpacity.value as number,
      chapterGlow(world.seg, 3),
      3,
      dt,
    )
    ;(material.uniforms.uColA.value as Color).copy(LIVE.b)
    ;(material.uniforms.uColB.value as Color).copy(LIVE.c)

    const tmp = new Vector3()
    const tmp2 = new Vector3()

    for (let s = 0; s < pool.current.length; s++) {
      const p = pool.current[s]
      const base = s * TAIL
      if (p.t > 1) {
        for (let k = 0; k < TAIL; k++) {
          aArr[base + k] = 0
          hArr[base + k] = 0
        }
        continue
      }
      p.t += dt * p.speed

      for (let k = 0; k < TAIL; k++) {
        const u = Math.max(0, Math.min(1, p.t - k * 0.006))
        const iu = 1 - u
        tmp.set(0, 0, 0)
        tmp.x = iu * iu * p.a.x + 2 * iu * u * p.c.x + u * u * p.b.x
        tmp.y = iu * iu * p.a.y + 2 * iu * u * p.c.y + u * u * p.b.y
        tmp.z = iu * iu * p.a.z + 2 * iu * u * p.c.z + u * u * p.b.z
        // A little life: the tail wobbles as it travels.
        const w = k * 0.13 + world.time * 2.4
        tmp2.set(Math.sin(w) * 0.09, Math.cos(w * 1.3) * 0.09, Math.sin(w * 0.7) * 0.09)
        arr[(base + k) * 3] = tmp.x + tmp2.x
        arr[(base + k) * 3 + 1] = tmp.y + tmp2.y
        arr[(base + k) * 3 + 2] = tmp.z + tmp2.z
        // Head bright, tail fading, and everything dies at arrival.
        const fade = 1 - Math.max(0, (p.t - 0.72) / 0.28)
        aArr[base + k] = Math.exp(-k * 0.22) * fade
        hArr[base + k] = p.hue
      }
      if (p.t > 1) {
        for (let k = 0; k < TAIL; k++) aArr[base + k] = 0
      }
    }

    pos.needsUpdate = true
    aA.needsUpdate = true
    aHue.needsUpdate = true
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}
