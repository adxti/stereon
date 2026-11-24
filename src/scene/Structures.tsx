import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { Structure } from '../lib/anatomy'
import type { StructureAssessment } from '../lib/risk'
import { createHatchMaterial } from './materials'

const UP = new THREE.Vector3(0, 1, 0)

function shapeGeometry(s: Structure, grow: number): THREE.BufferGeometry {
  if (s.shape === 'sphere') return new THREE.SphereGeometry(s.radius + grow, 40, 28)
  const len = new THREE.Vector3(...s.b).distanceTo(new THREE.Vector3(...s.a))
  return new THREE.CapsuleGeometry(s.radius + grow, len, 10, 28)
}

function placement(s: Structure): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
  if (s.shape === 'sphere') return { position: new THREE.Vector3(...s.center), quaternion: new THREE.Quaternion() }
  const a = new THREE.Vector3(...s.a)
  const b = new THREE.Vector3(...s.b)
  const dir = b.clone().sub(a).normalize()
  return { position: a.add(b).multiplyScalar(0.5), quaternion: new THREE.Quaternion().setFromUnitVectors(UP, dir) }
}

// Shared materials: one per hatch density and outline state.
const hatchCaution = createHatchMaterial(7)
const hatchIntersection = createHatchMaterial(4)
const outlineQuiet = new THREE.MeshBasicMaterial({ color: '#000000', side: THREE.BackSide })
const outlineAlert = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.BackSide })

const selectedFill = new THREE.MeshLambertMaterial({ color: '#ffffff' })

/** Pointer travel (px) above which a press counts as an orbit drag, not a click. */
const CLICK_SLOP = 5

function StructureMesh({
  row,
  selected,
  onSelect,
}: {
  row: StructureAssessment
  selected: boolean
  onSelect: (id: string) => void
}) {
  const s = row.structure
  const affected = row.tier !== 'clear'
  const { body, hull, alertHull, selectHull, fill } = useMemo(
    () => ({
      body: shapeGeometry(s, 0),
      hull: shapeGeometry(s, 0.7),
      alertHull: shapeGeometry(s, 1.2),
      selectHull: shapeGeometry(s, 2),
      fill: new THREE.MeshLambertMaterial({ color: s.tone }),
    }),
    [s],
  )
  useEffect(
    () => () => {
      body.dispose()
      hull.dispose()
      alertHull.dispose()
      selectHull.dispose()
      fill.dispose()
    },
    [body, hull, alertHull, selectHull, fill],
  )
  const { position, quaternion } = useMemo(() => placement(s), [s])

  return (
    <group position={position} quaternion={quaternion}>
      <mesh
        geometry={body}
        material={selected ? selectedFill : fill}
        onClick={(e) => {
          if (e.delta > CLICK_SLOP) return
          e.stopPropagation()
          onSelect(s.id)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      />
      <mesh
        geometry={selected ? selectHull : affected ? alertHull : hull}
        material={selected || affected ? outlineAlert : outlineQuiet}
      />
      {affected && (
        <mesh
          geometry={body}
          material={row.tier === 'intersection' ? hatchIntersection : hatchCaution}
          renderOrder={3}
        />
      )}
    </group>
  )
}

export function Structures({
  rows,
  selectedId,
  onSelect,
}: {
  rows: StructureAssessment[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <group>
      {rows
        .filter((r) => r.visible)
        .map((r) => (
          <StructureMesh key={r.structure.id} row={r} selected={r.structure.id === selectedId} onSelect={onSelect} />
        ))}
    </group>
  )
}
