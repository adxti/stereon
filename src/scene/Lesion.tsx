import { useMemo } from 'react'
import { Billboard, Line } from '@react-three/drei'
import type { Vec3 } from '../lib/geometry'

function circle(r: number, n = 96): [number, number, number][] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return [Math.cos(a) * r, Math.sin(a) * r, 0]
  })
}

/** Solid white lesion with a camera-facing outline ring and an axis-aligned reticle. */
export function Lesion({ center, radius }: { center: Vec3; radius: number }) {
  const ring = useMemo(() => circle(radius + 2.2), [radius])
  const reach = radius + 14
  const gap = radius + 3.5
  const ticks = useMemo(() => {
    const segs: [number, number, number][] = []
    for (let axis = 0; axis < 3; axis++) {
      for (const sgn of [-1, 1]) {
        const a: [number, number, number] = [0, 0, 0]
        const b: [number, number, number] = [0, 0, 0]
        a[axis] = sgn * gap
        b[axis] = sgn * reach
        segs.push(a, b)
      }
    }
    return segs
  }, [gap, reach])

  return (
    <group position={center as [number, number, number]}>
      <mesh renderOrder={1}>
        <sphereGeometry args={[radius, 48, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Ring and reticle ignore depth so the target stays locatable inside other structures. */}
      <Billboard>
        <Line points={ring} color="#ffffff" lineWidth={1} depthTest={false} renderOrder={5} />
      </Billboard>
      <Line points={ticks} segments color="#8a8a8a" lineWidth={1} depthTest={false} renderOrder={5} />
    </group>
  )
}
