/**
 * Anatomical model data. RAS millimetres, origin at brain centre.
 * Positions are adapted from MNI-space landmarks shifted so the cerebrum's
 * bounding box is centred on the origin (MNI + [0, 17, -15]). They are
 * approximations for teaching, not patient data.
 *
 * The rendered brain is an anatomical mesh baked into this same frame by
 * scripts/prepare-brain.mjs (cerebrum bounding box centred, 170 mm A–P).
 * Every structure lies wholly inside that mesh, at least 1.5 mm beneath
 * its surface.
 */
import { pointOnEllipsoid, type Vec3 } from './geometry'

export type Side = 'left' | 'right'

/**
 * Semi-axes of the ellipsoid that bounds lesion placement (L–R, A–P, S–I).
 * It follows the cerebrum's extent and deliberately includes the skull-base
 * region below the frontal lobes, where sellar targets for the transnasal
 * approach sit.
 */
export const BRAIN_AXES: Vec3 = [68, 85, 62]
/** Semi-axes of the outer skull shell: encloses the mesh's cerebrum with ~2 mm clearance. */
export const SKULL_AXES: Vec3 = [86, 104, 80]

export type StructureKind = 'motor' | 'broca' | 'wernicke' | 'visual' | 'capsule'

interface StructureBase {
  id: string
  kind: StructureKind
  name: string
  short: string
  side: Side
  radius: number
  /** Fill value from the grey scale, used in the 3D view. */
  tone: string
}

export interface SphereStructure extends StructureBase {
  shape: 'sphere'
  center: Vec3
}

export interface CapsuleStructure extends StructureBase {
  shape: 'capsule'
  a: Vec3
  b: Vec3
}

export type Structure = SphereStructure | CapsuleStructure

const mirror = (p: Vec3): Vec3 => [-p[0], p[1], p[2]]

const capsuleLA: Vec3 = [-20, 12, -16]
const capsuleLB: Vec3 = [-26, 2, 6]

/**
 * Centres were started at the MNI-derived landmarks, then moved inward along
 * the mesh's surface normal until each whole sphere or capsule sits at least
 * 1.5 mm beneath the brain surface (verified by anatomy.mesh.test.ts). The
 * mesh is not perfectly symmetric, so left and right are fitted separately.
 */
export const STRUCTURES: readonly Structure[] = [
  { id: 'motor-l', kind: 'motor', shape: 'sphere', name: 'Primary motor cortex', short: 'Motor cortex', side: 'left', center: [-32.5, -6, 34], radius: 10, tone: '#bdbdbd' },
  { id: 'motor-r', kind: 'motor', shape: 'sphere', name: 'Primary motor cortex', short: 'Motor cortex', side: 'right', center: [33, -6.5, 34], radius: 10, tone: '#bdbdbd' },
  { id: 'broca', kind: 'broca', shape: 'sphere', name: "Broca's area", short: "Broca's area", side: 'left', center: [-45, 37, -5], radius: 8, tone: '#8a8a8a' },
  { id: 'wernicke', kind: 'wernicke', shape: 'sphere', name: "Wernicke's area", short: "Wernicke's area", side: 'left', center: [-54, -31, 0], radius: 8, tone: '#5c5c5c' },
  { id: 'visual-l', kind: 'visual', shape: 'sphere', name: 'Visual cortex', short: 'Visual cortex', side: 'left', center: [-10.5, -74, -13], radius: 8, tone: '#8a8a8a' },
  { id: 'visual-r', kind: 'visual', shape: 'sphere', name: 'Visual cortex', short: 'Visual cortex', side: 'right', center: [10, -74, -12.5], radius: 8, tone: '#8a8a8a' },
  { id: 'capsule-l', kind: 'capsule', shape: 'capsule', name: 'Internal capsule', short: 'Internal capsule', side: 'left', a: capsuleLA, b: capsuleLB, radius: 4, tone: '#bdbdbd' },
  { id: 'capsule-r', kind: 'capsule', shape: 'capsule', name: 'Internal capsule', short: 'Internal capsule', side: 'right', a: mirror(capsuleLA), b: mirror(capsuleLB), radius: 4, tone: '#bdbdbd' },
]

export const structureLabel = (s: Structure): string =>
  `${s.name}, ${s.side === 'left' ? 'L' : 'R'}`

/** Point used for floating labels and centre-based checks. */
export const structureAnchor = (s: Structure): Vec3 =>
  s.shape === 'sphere'
    ? s.center
    : [(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2, (s.a[2] + s.b[2]) / 2]

const contra = (side: Side): string => (side === 'left' ? 'right' : 'left')

/** Expected deficit if the structure is injured. Lateralisation follows the crossed motor and visual pathways. */
export function deficitFor(s: Structure): string {
  switch (s.kind) {
    case 'motor':
      return `Contralateral (${contra(s.side)}) hemiparesis`
    case 'broca':
      return 'Expressive (non-fluent) aphasia'
    case 'wernicke':
      return 'Receptive (fluent) aphasia'
    case 'visual':
      return `Contralateral (${contra(s.side)}) homonymous hemianopia`
    case 'capsule':
      return `Contralateral (${contra(s.side)}) hemiparesis / hemisensory loss`
  }
}

export type ApproachId = 'kocher' | 'pterional' | 'transnasal' | 'parietal'

export interface Approach {
  id: ApproachId
  name: string
  detail: string
  lateralised: boolean
  /** Direction from the origin for the left side; mirrored for right. Projected onto the skull. */
  directionLeft: Vec3
}

export const APPROACHES: readonly Approach[] = [
  {
    id: 'kocher',
    name: 'Frontal burr hole',
    detail: "Kocher's point · 3 cm lateral to midline, 1 cm anterior to coronal suture",
    lateralised: true,
    directionLeft: [-30, 22, 64],
  },
  {
    id: 'pterional',
    name: 'Pterional',
    detail: 'Frontotemporal · at the pterion over the sphenoid ridge',
    lateralised: true,
    directionLeft: [-70, 40, 6],
  },
  {
    id: 'transnasal',
    name: 'Transnasal endoscopic',
    detail: 'Midline · endonasal corridor through the anterior skull base',
    lateralised: false,
    directionLeft: [0, 52, -62],
  },
  {
    id: 'parietal',
    name: 'Parietal',
    detail: 'Posterior parietal · superior to the parietal eminence',
    lateralised: true,
    directionLeft: [-42, -52, 58],
  },
]

export const approachById = (id: ApproachId): Approach => {
  const a = APPROACHES.find((x) => x.id === id)
  if (!a) throw new Error(`Unknown approach ${id}`)
  return a
}

/** Entry point on the skull shell for an approach and side. Midline approaches ignore side. */
export function entryPoint(id: ApproachId, side: Side): Vec3 {
  const a = approachById(id)
  const dir = a.lateralised && side === 'right' ? mirror(a.directionLeft) : a.directionLeft
  return pointOnEllipsoid(dir, SKULL_AXES)
}
