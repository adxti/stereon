/**
 * Signed distance from a point to a closed triangle mesh. Pure, no Three.
 * Positive inside, negative outside. Used to check that eloquent structures
 * sit fully inside the brain mesh.
 */
import type { Vec3 } from './geometry'

export interface TriMesh {
  positions: ArrayLike<number>
  indices: ArrayLike<number>
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const madd = (a: Vec3, b: Vec3, s: number): Vec3 => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s]

/** Closest point on triangle abc to p (Ericson, Real-Time Collision Detection, §5.1.5). */
export function closestPointOnTriangle(p: Vec3, a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const ab = sub(b, a)
  const ac = sub(c, a)
  const ap = sub(p, a)
  const d1 = dot(ab, ap)
  const d2 = dot(ac, ap)
  if (d1 <= 0 && d2 <= 0) return a
  const bp = sub(p, b)
  const d3 = dot(ab, bp)
  const d4 = dot(ac, bp)
  if (d3 >= 0 && d4 <= d3) return b
  const vc = d1 * d4 - d3 * d2
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return madd(a, ab, d1 / (d1 - d3))
  const cp = sub(p, c)
  const d5 = dot(ab, cp)
  const d6 = dot(ac, cp)
  if (d6 >= 0 && d5 <= d6) return c
  const vb = d5 * d2 - d1 * d6
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return madd(a, ac, d2 / (d2 - d6))
  const va = d3 * d6 - d5 * d4
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6))
    return madd(b, sub(c, b), w)
  }
  const denom = 1 / (va + vb + vc)
  return madd(madd(a, ab, vb * denom), ac, vc * denom)
}

const vertex = (m: TriMesh, i: number): Vec3 => [m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2]]

/** Ray-parity inside test (ray along a slightly skewed axis to avoid edge hits). */
export function isInside(m: TriMesh, p: Vec3): boolean {
  const dir: Vec3 = [0.0123, 1, 0.0071]
  let hits = 0
  for (let t = 0; t < m.indices.length; t += 3) {
    const a = vertex(m, m.indices[t])
    const e1 = sub(vertex(m, m.indices[t + 1]), a)
    const e2 = sub(vertex(m, m.indices[t + 2]), a)
    const h = cross(dir, e2)
    const det = dot(e1, h)
    if (Math.abs(det) < 1e-12) continue
    const f = 1 / det
    const s = sub(p, a)
    const u = f * dot(s, h)
    if (u < 0 || u > 1) continue
    const q = cross(s, e1)
    const v = f * dot(dir, q)
    if (v < 0 || u + v > 1) continue
    if (f * dot(e2, q) > 0) hits++
  }
  return hits % 2 === 1
}

/** Nearest surface point and signed distance (positive inside). */
export function signedDistance(m: TriMesh, p: Vec3): { distance: number; nearest: Vec3 } {
  let best = Infinity
  let nearest: Vec3 = p
  for (let t = 0; t < m.indices.length; t += 3) {
    const q = closestPointOnTriangle(p, vertex(m, m.indices[t]), vertex(m, m.indices[t + 1]), vertex(m, m.indices[t + 2]))
    const d = sub(p, q)
    const d2 = dot(d, d)
    if (d2 < best) {
      best = d2
      nearest = q
    }
  }
  const dist = Math.sqrt(best)
  return { distance: isInside(m, p) ? dist : -dist, nearest }
}
