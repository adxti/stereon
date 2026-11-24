/**
 * Pure geometry for trajectory planning. No React, no Three.
 * Coordinate frame: RAS (x = right, y = anterior, z = superior), millimetres,
 * origin at the geometric centre of the brain.
 */

export type Vec3 = readonly [number, number, number]

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const length = (a: Vec3): number => Math.sqrt(dot(a, a))
export const distance = (a: Vec3, b: Vec3): number => length(sub(a, b))
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => add(a, scale(sub(b, a), t))
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

const RAD_TO_DEG = 180 / Math.PI

/** Closest point to `p` on segment [a, b], with its parameter t in [0, 1]. */
export function closestPointOnSegment(p: Vec3, a: Vec3, b: Vec3): { point: Vec3; t: number } {
  const ab = sub(b, a)
  const len2 = dot(ab, ab)
  if (len2 === 0) return { point: a, t: 0 }
  const t = clamp(dot(sub(p, a), ab) / len2, 0, 1)
  return { point: lerp(a, b, t), t }
}

/** Euclidean distance from point `p` to segment [a, b]. */
export function pointSegmentDistance(p: Vec3, a: Vec3, b: Vec3): number {
  return distance(p, closestPointOnSegment(p, a, b).point)
}

/**
 * Minimum distance between segments [p1, q1] and [p2, q2].
 * Ericson, Real-Time Collision Detection, §5.1.9. Handles degenerate
 * (zero-length) and parallel segments.
 */
export function segmentSegmentDistance(p1: Vec3, q1: Vec3, p2: Vec3, q2: Vec3): number {
  const EPS = 1e-12
  const d1 = sub(q1, p1)
  const d2 = sub(q2, p2)
  const r = sub(p1, p2)
  const a = dot(d1, d1)
  const e = dot(d2, d2)
  const f = dot(d2, r)
  let s: number
  let t: number

  if (a <= EPS && e <= EPS) return distance(p1, p2)
  if (a <= EPS) {
    s = 0
    t = clamp(f / e, 0, 1)
  } else {
    const c = dot(d1, r)
    if (e <= EPS) {
      t = 0
      s = clamp(-c / a, 0, 1)
    } else {
      const b = dot(d1, d2)
      const denom = a * e - b * b
      s = denom > EPS ? clamp((b * f - c * e) / denom, 0, 1) : 0
      t = (b * s + f) / e
      if (t < 0) {
        t = 0
        s = clamp(-c / a, 0, 1)
      } else if (t > 1) {
        t = 1
        s = clamp((b - c) / a, 0, 1)
      }
    }
  }
  return distance(add(p1, scale(d1, s)), add(p2, scale(d2, t)))
}

/** Signed clearance from a segment to a sphere's surface. Negative = penetration depth. */
export function segmentSphereClearance(a: Vec3, b: Vec3, center: Vec3, radius: number): number {
  return pointSegmentDistance(center, a, b) - radius
}

/** Signed clearance from a segment to a capsule's surface. */
export function segmentCapsuleClearance(
  a: Vec3,
  b: Vec3,
  capA: Vec3,
  capB: Vec3,
  radius: number,
): number {
  return segmentSegmentDistance(a, b, capA, capB) - radius
}

/** Lesion radius in mm from volume in cm³: r = cbrt(3V / 4π), with V converted to mm³. */
export function radiusFromVolume(volumeCm3: number): number {
  const mm3 = volumeCm3 * 1000
  return Math.cbrt((3 * mm3) / (4 * Math.PI))
}

export type RiskTier = 'clear' | 'caution' | 'intersection'

/** Clear: > margin. Caution: 0 < d ≤ margin. Intersection: d ≤ 0. */
export function riskTier(clearance: number, margin: number): RiskTier {
  if (clearance <= 0) return 'intersection'
  if (clearance <= margin) return 'caution'
  return 'clear'
}

/**
 * Trajectory angles in degrees.
 * - axial: angle between the trajectory and the axial (horizontal, x–y) plane.
 * - sagittal: angle between the trajectory and the mid-sagittal (y–z) plane.
 * Both are in [0, 90]. A purely vertical path is 90° to axial and 0° to sagittal.
 */
export function trajectoryAngles(entry: Vec3, target: Vec3): { axial: number; sagittal: number } {
  const d = sub(target, entry)
  const len = length(d)
  if (len === 0) return { axial: 0, sagittal: 0 }
  return {
    axial: Math.asin(clamp(Math.abs(d[2]) / len, 0, 1)) * RAD_TO_DEG,
    sagittal: Math.asin(clamp(Math.abs(d[0]) / len, 0, 1)) * RAD_TO_DEG,
  }
}

/** Point where the ray from the origin along `dir` meets the ellipsoid with semi-axes `axes`. */
export function pointOnEllipsoid(dir: Vec3, axes: Vec3): Vec3 {
  const k = Math.sqrt((dir[0] / axes[0]) ** 2 + (dir[1] / axes[1]) ** 2 + (dir[2] / axes[2]) ** 2)
  if (k === 0) throw new Error('pointOnEllipsoid: zero direction')
  return scale(dir, 1 / k)
}

/** Normalised ellipsoid radius: < 1 inside, 1 on the surface, > 1 outside. */
export function ellipsoidRadius(p: Vec3, axes: Vec3): number {
  return Math.sqrt((p[0] / axes[0]) ** 2 + (p[1] / axes[1]) ** 2 + (p[2] / axes[2]) ** 2)
}

/** Pull `p` radially toward the origin until it lies inside the ellipsoid. */
export function clampToEllipsoid(p: Vec3, axes: Vec3): Vec3 {
  const r = ellipsoidRadius(p, axes)
  return r <= 1 ? p : scale(p, 1 / r)
}

/**
 * Largest |value| allowed on one axis while keeping the other two coordinates
 * fixed and staying inside the ellipsoid. Returns 0 if the others are already outside.
 */
export function axisLimit(axis: 0 | 1 | 2, p: Vec3, axes: Vec3): number {
  let rest = 0
  for (let i = 0; i < 3; i++) if (i !== axis) rest += (p[i] / axes[i]) ** 2
  return rest >= 1 ? 0 : axes[axis] * Math.sqrt(1 - rest)
}

/**
 * Sample the segment and return the parameter intervals [t0, t1] where
 * `inZone(point)` is true. Used to draw the trajectory dashed through safety zones.
 */
export function zoneIntervals(
  a: Vec3,
  b: Vec3,
  inZone: (p: Vec3) => boolean,
  samples = 400,
): Array<[number, number]> {
  const out: Array<[number, number]> = []
  let start: number | null = null
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const inside = inZone(lerp(a, b, t))
    if (inside && start === null) start = t
    if (!inside && start !== null) {
      out.push([start, (i - 1) / samples])
      start = null
    }
  }
  if (start !== null) out.push([start, 1])
  return out
}
