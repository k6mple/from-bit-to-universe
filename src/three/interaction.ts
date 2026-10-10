import type { Vector3 } from 'three'

export interface PacketRequest {
  from: Vector3
  to: Vector3
  hue: number
  speed: number
}

type Spawner = (reqs: PacketRequest[]) => void

/** Imperative bridge from the DOM/interaction layer into the WebGL packets. */
export const bus: { spawn: Spawner | null } = { spawn: null }
