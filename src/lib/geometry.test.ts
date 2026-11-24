import { describe, expect, it } from 'vitest'
import {
  axisLimit,
  clampToEllipsoid,
  closestPointOnSegment,
  ellipsoidRadius,
  pointOnEllipsoid,
  pointSegmentDistance,
  radiusFromVolume,
  riskTier,
  segmentCapsuleClearance,
  segmentSegmentDistance,
  segmentSphereClearance,
  trajectoryAngles,
  zoneIntervals,
  type Vec3,
} from './geometry'

const O: Vec3 = [0, 0, 0]

describe('pointSegmentDistance', () => {
  const a: Vec3 = [0, 0, 0]
  const b: Vec3 = [10, 0, 0]

  it('measures perpendicular distance to the interior', () => {
    expect(pointSegmentDistance([5, 3, 4], a, b)).toBeCloseTo(5)
  })
  it('measures to the nearest endpoint beyond the ends', () => {
    expect(pointSegmentDistance([-3, 4, 0], a, b)).toBeCloseTo(5)
    expect(pointSegmentDistance([13, 0, 4], a, b)).toBeCloseTo(5)
  })
  it('is zero on the segment', () => {
    expect(pointSegmentDistance([7, 0, 0], a, b)).toBe(0)
  })
  it('handles a zero-length segment', () => {
    expect(pointSegmentDistance([3, 4, 0], a, a)).toBeCloseTo(5)
  })
  it('reports the parameter of the closest point', () => {
    expect(closestPointOnSegment([2.5, 9, 0], a, b).t).toBeCloseTo(0.25)
  })
})

describe('segmentSegmentDistance', () => {
  it('finds the gap between skew segments', () => {
    expect(segmentSegmentDistance([-5, 0, 0], [5, 0, 0], [0, -5, 3], [0, 5, 3])).toBeCloseTo(3)
  })
  it('is zero for crossing segments', () => {
    expect(segmentSegmentDistance([-5, 0, 0], [5, 0, 0], [0, -5, 0], [0, 5, 0])).toBeCloseTo(0)
  })
  it('handles parallel segments', () => {
    expect(segmentSegmentDistance([0, 0, 0], [10, 0, 0], [2, 4, 0], [8, 4, 0])).toBeCloseTo(4)
  })
  it('handles parallel, non-overlapping segments', () => {
    expect(segmentSegmentDistance([0, 0, 0], [10, 0, 0], [13, 4, 0], [20, 4, 0])).toBeCloseTo(5)
  })
  it('clamps to endpoints when the closest lines lie outside both segments', () => {
    expect(segmentSegmentDistance([0, 0, 0], [1, 0, 0], [3, 1, 0], [3, 5, 0])).toBeCloseTo(Math.hypot(2, 1))
  })
  it('handles degenerate segments', () => {
    expect(segmentSegmentDistance([0, 0, 0], [0, 0, 0], [3, 4, 0], [3, 4, 0])).toBeCloseTo(5)
    expect(segmentSegmentDistance([0, 3, 0], [0, 3, 0], [-5, 0, 0], [5, 0, 0])).toBeCloseTo(3)
    expect(segmentSegmentDistance([-5, 0, 0], [5, 0, 0], [0, 0, 2], [0, 0, 2])).toBeCloseTo(2)
  })
  it('is symmetric', () => {
    const p: [Vec3, Vec3, Vec3, Vec3] = [[1, 2, 3], [7, -1, 4], [-2, 5, 0], [3, 3, 9]]
    expect(segmentSegmentDistance(p[0], p[1], p[2], p[3])).toBeCloseTo(
      segmentSegmentDistance(p[2], p[3], p[0], p[1]),
    )
  })
})

describe('surface clearances', () => {
  const a: Vec3 = [0, 0, 0]
  const b: Vec3 = [0, 0, 100]

  it('sphere: segment-to-centre minus radius', () => {
    expect(segmentSphereClearance(a, b, [20, 0, 50], 12)).toBeCloseTo(8)
    expect(segmentSphereClearance(a, b, [5, 0, 50], 12)).toBeCloseTo(-7)
  })
  it('capsule: segment-to-axis minus radius', () => {
    expect(segmentCapsuleClearance(a, b, [10, -5, 40], [10, 5, 40], 4)).toBeCloseTo(6)
    expect(segmentCapsuleClearance(a, b, [-5, 0, 40], [5, 0, 40], 4)).toBeCloseTo(-4)
  })
})

describe('radiusFromVolume', () => {
  it('inverts the sphere volume formula', () => {
    // A 10 mm sphere has volume 4/3·π·1000 mm³ = 4.18879 cm³.
    expect(radiusFromVolume((4 / 3) * Math.PI)).toBeCloseTo(10)
  })
  it('covers the slider range', () => {
    expect(radiusFromVolume(0.5)).toBeCloseTo(4.924, 2)
    expect(radiusFromVolume(30)).toBeCloseTo(19.276, 2)
  })
})

describe('riskTier', () => {
  it('splits at zero and at the margin', () => {
    expect(riskTier(-1, 5)).toBe('intersection')
    expect(riskTier(0, 5)).toBe('intersection')
    expect(riskTier(0.01, 5)).toBe('caution')
    expect(riskTier(5, 5)).toBe('caution')
    expect(riskTier(5.01, 5)).toBe('clear')
  })
  it('with a zero margin, anything positive is clear', () => {
    expect(riskTier(0.1, 0)).toBe('clear')
  })
})

describe('trajectoryAngles', () => {
  it('vertical path: 90° to axial, 0° to sagittal', () => {
    const t = trajectoryAngles([0, 0, 60], O)
    expect(t.axial).toBeCloseTo(90)
    expect(t.sagittal).toBeCloseTo(0)
  })
  it('lateral horizontal path: 0° to axial, 90° to sagittal', () => {
    const t = trajectoryAngles([70, 0, 0], O)
    expect(t.axial).toBeCloseTo(0)
    expect(t.sagittal).toBeCloseTo(90)
  })
  it('45° oblique path', () => {
    const t = trajectoryAngles([10, 0, 10], O)
    expect(t.axial).toBeCloseTo(45)
    expect(t.sagittal).toBeCloseTo(45)
  })
})

describe('ellipsoid helpers', () => {
  const axes: Vec3 = [60, 80, 50]

  it('projects a direction onto the surface', () => {
    const p = pointOnEllipsoid([1, 1, 1], axes)
    expect(ellipsoidRadius(p, axes)).toBeCloseTo(1)
    expect(pointOnEllipsoid([0, 0, 2], axes)).toEqual([0, 0, 50])
  })
  it('clamps outside points to the surface and leaves inside points alone', () => {
    expect(clampToEllipsoid([10, 10, 10], axes)).toEqual([10, 10, 10])
    expect(ellipsoidRadius(clampToEllipsoid([100, 100, 100], axes), axes)).toBeCloseTo(1)
  })
  it('computes per-axis limits given the other coordinates', () => {
    expect(axisLimit(0, [0, 0, 0], axes)).toBeCloseTo(60)
    expect(axisLimit(2, [0, 40, 0], axes)).toBeCloseTo(50 * Math.sqrt(0.75))
    expect(axisLimit(0, [0, 90, 0], axes)).toBe(0)
  })
})

describe('zoneIntervals', () => {
  it('finds the slab of a segment inside a zone', () => {
    const iv = zoneIntervals([0, 0, 0], [0, 0, 100], (p) => p[2] >= 40 && p[2] <= 60, 100)
    expect(iv).toHaveLength(1)
    expect(iv[0][0]).toBeCloseTo(0.4)
    expect(iv[0][1]).toBeCloseTo(0.6)
  })
  it('returns several intervals and closes one that reaches the end', () => {
    const iv = zoneIntervals([0, 0, 0], [0, 0, 100], (p) => p[2] < 10 || p[2] > 90, 100)
    expect(iv).toEqual([
      [0, 0.09],
      [0.91, 1],
    ])
  })
  it('is empty when nothing is in a zone', () => {
    expect(zoneIntervals(O, [1, 1, 1], () => false)).toEqual([])
  })
})
