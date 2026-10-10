import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { damp, world } from '../lib/world'

/**
 * The grade. Applied to everything, everywhere, so seven scenes share one
 * photographic signature: bloom that respects highlights, a vignette that
 * keeps the frame edges black, and a faint grain so gradients never band.
 */
export function Effects() {
  const bloom = useRef<{ intensity: number }>(null)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const b = bloom.current
    if (!b) return
    // Bloom is per chapter: a volumetric fill that already covers the frame
    // needs almost none, a sparse galaxy needs a lot. Driving it globally from
    // one number is what turns dense chapters into white-out.
    b.intensity = damp(b.intensity, world.reduced ? world.bloom * 0.55 : world.bloom, 2, dt)
  })

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        ref={bloom as never}
        intensity={1.1}
        luminanceThreshold={0.26}
        luminanceSmoothing={0.34}
        mipmapBlur
        radius={0.78}
      />
      <Vignette offset={0.22} darkness={0.84} />
      <Noise opacity={0.018} blendFunction={BlendFunction.OVERLAY} />
    </EffectComposer>
  )
}
