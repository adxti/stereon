/** Risk engine: turns a plan into per-structure clearances, tiers and deficits. Pure. */
import {
  STRUCTURES,
  BRAIN_AXES,
  deficitFor,
  entryPoint,
  type ApproachId,
  type Side,
  type Structure,
} from './anatomy'
import {
  clampToEllipsoid,
  distance,
  pointSegmentDistance,
  radiusFromVolume,
  riskTier,
  segmentCapsuleClearance,
  segmentSphereClearance,
  trajectoryAngles,
  zoneIntervals,
  type RiskTier,
  type Vec3,
} from './geometry'

export interface Plan {
  target: Vec3
  volumeCm3: number
  approach: ApproachId
  side: Side
  marginMm: number
  visible: Record<string, boolean>
}

export const VOLUME_RANGE = { min: 0.5, max: 30 } as const
export const MARGIN_RANGE = { min: 0, max: 20 } as const
/** Keep the lesion surface at least this far inside the brain ellipsoid. */
export const LESION_INSET_MM = 2

export const DEFAULT_PLAN: Plan = {
  target: [-28, 18, 8],
  volumeCm3: 4,
  approach: 'kocher',
  side: 'left',
  marginMm: 5,
  visible: Object.fromEntries(STRUCTURES.map((s) => [s.id, true])),
}

export interface StructureAssessment {
  structure: Structure
  visible: boolean
  /** Signed clearance from the trajectory to the structure surface (mm). */
  clearance: number
  tier: RiskTier
  deficit: string
  /** Signed gap between lesion surface and structure surface (mm). Negative = overlap depth. */
  lesionClearance: number
  /** Lesion itself overlaps the structure. */
  lesionOverlap: boolean
}

export interface Assessment {
  entry: Vec3
  target: Vec3
  lesionRadius: number
  lengthMm: number
  angles: { axial: number; sagittal: number }
  rows: StructureAssessment[]
  /** Visible structures in Caution or Intersection, closest first. */
  affected: StructureAssessment[]
  lesionOverlaps: StructureAssessment[]
  highRisk: boolean
  /** Parameter intervals of the trajectory that lie inside a safety zone. */
  zoneIntervals: Array<[number, number]>
}

/** Inner ellipsoid the lesion centre must stay within for a lesion of radius r. */
export const lesionBounds = (r: number): Vec3 => [
  Math.max(1, BRAIN_AXES[0] - r - LESION_INSET_MM),
  Math.max(1, BRAIN_AXES[1] - r - LESION_INSET_MM),
  Math.max(1, BRAIN_AXES[2] - r - LESION_INSET_MM),
]

export const clampTarget = (p: Vec3, volumeCm3: number): Vec3 =>
  clampToEllipsoid(p, lesionBounds(radiusFromVolume(volumeCm3)))

export function trajectoryClearance(s: Structure, a: Vec3, b: Vec3): number {
  return s.shape === 'sphere'
    ? segmentSphereClearance(a, b, s.center, s.radius)
    : segmentCapsuleClearance(a, b, s.a, s.b, s.radius)
}

/** Signed distance from a point to the structure surface. */
export function pointClearance(s: Structure, p: Vec3): number {
  return s.shape === 'sphere'
    ? distance(p, s.center) - s.radius
    : pointSegmentDistance(p, s.a, s.b) - s.radius
}

export function assessPlan(plan: Plan): Assessment {
  const entry = entryPoint(plan.approach, plan.side)
  const target = plan.target
  const lesionRadius = radiusFromVolume(plan.volumeCm3)

  const rows: StructureAssessment[] = STRUCTURES.map((structure) => {
    const clearance = trajectoryClearance(structure, entry, target)
    const lesionClearance = pointClearance(structure, target) - lesionRadius
    return {
      structure,
      visible: plan.visible[structure.id] !== false,
      clearance,
      tier: riskTier(clearance, plan.marginMm),
      deficit: deficitFor(structure),
      lesionClearance,
      lesionOverlap: lesionClearance <= 0,
    }
  }).sort((x, y) => x.clearance - y.clearance)

  const visibleRows = rows.filter((r) => r.visible)
  const affected = visibleRows.filter((r) => r.tier !== 'clear')
  const lesionOverlaps = visibleRows.filter((r) => r.lesionOverlap)
  const zoneStructures = visibleRows.map((r) => r.structure)

  return {
    entry,
    target,
    lesionRadius,
    lengthMm: distance(entry, target),
    angles: trajectoryAngles(entry, target),
    rows,
    affected,
    lesionOverlaps,
    highRisk: affected.length > 0,
    zoneIntervals: zoneIntervals(entry, target, (p) =>
      zoneStructures.some((s) => pointClearance(s, p) <= plan.marginMm),
    ),
  }
}

export const TIER_LABEL: Record<RiskTier, string> = {
  clear: 'Clear',
  caution: 'Caution',
  intersection: 'Intersection',
}
