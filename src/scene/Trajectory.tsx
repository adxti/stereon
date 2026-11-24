import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { lerp, type Vec3 } from '../lib/geometry'

type P = [number, number, number]

/** Split [0,1] into alternating clear / in-zone pieces from the zone intervals. */
function pieces(intervals: Array<[number, number]>): Array<{ t0: number; t1: number; zone: boolean }> {
  const out: Array<{ t0: number; t1: number; zone: boolean }> = []
  let t = 0
  for (const [a, b] of intervals) {
    if (a > t) out.push({ t0: t, t1: a, zone: false })
    out.push({ t0: a, t1: Math.max(a, b), zone: true })
    t = Math.max(a, b)
  }
  if (t < 1) out.push({ t0: t, t1: 1, zone: false })
  return out.filter((p) => p.t1 - p.t0 > 1e-4)
}

const UP = new THREE.Vector3(0, 1, 0)
// Low-poly, flat-shaded: legible at any zoom without modelling cost.
const ringMaterial = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true })
const tubeMaterial = new THREE.MeshLambertMaterial({ color: '#bdbdbd', flatShading: true })
const tipMaterial = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true })

/**
 * Entry marker aligned with the trajectory: a burr-hole ring on the skull
 * surface, a guide tube standing outside it, and a cone pointing in toward
 * the target. Local +y is the direction of travel.
 */
function EntryMarker({ entry, target }: { entry: Vec3; target: Vec3 }) {
  const quaternion = useMemo(() => {
    const dir = new THREE.Vector3(target[0] - entry[0], target[1] - entry[1], target[2] - entry[2]).normalize()
    return new THREE.Quaternion().setFromUnitVectors(UP, dir)
  }, [entry, target])

  return (
    <group position={entry as P} quaternion={quaternion}>
      {/* Burr hole: a six-sided ring lying on the skull surface. */}
      <mesh material={ringMaterial} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.5, 1, 4, 6]} />
      </mesh>
      {/* Guide tube outside the skull. */}
      <mesh material={tubeMaterial} position={[0, -9, 0]}>
        <cylinderGeometry args={[1.6, 1.6, 16, 6, 1]} />
      </mesh>
      {/* Collar where the tube meets the ring. */}
      <mesh material={ringMaterial} position={[0, -1.2, 0]}>
        <cylinderGeometry args={[3, 3, 1.4, 6, 1]} />
      </mesh>
      {/* Cone pointing into the brain along the trajectory. */}
      <mesh material={tipMaterial} position={[0, 3.5, 0]}>
        <coneGeometry args={[2.4, 5, 6, 1]} />
      </mesh>
    </group>
  )
}

/**
 * Entry-to-target trajectory: solid white where clear, dashed white where the
 * path runs through a structure's safety zone.
 */
export function Trajectory({ entry, target, intervals }: { entry: Vec3; target: Vec3; intervals: Array<[number, number]> }) {
  const parts = useMemo(() => pieces(intervals), [intervals])
  return (
    <group>
      {parts.map((p) => {
        const a = lerp(entry, target, p.t0) as P
        const b = lerp(entry, target, p.t1) as P
        return p.zone ? (
          <Line
            key={`z${p.t0}`}
            points={[a, b]}
            color="#ffffff"
            lineWidth={2}
            dashed
            dashSize={2.2}
            gapSize={1.8}
            renderOrder={4}
            depthTest={false}
          />
        ) : (
          <Line key={`c${p.t0}`} points={[a, b]} color="#ffffff" lineWidth={1.5} renderOrder={4} />
        )
      })}
      <EntryMarker entry={entry} target={target} />
    </group>
  )
}
