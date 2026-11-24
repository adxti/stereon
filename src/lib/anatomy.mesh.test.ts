import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { STRUCTURES } from './anatomy'
import { lerp, type Vec3 } from './geometry'
import { closestPointOnTriangle, isInside, signedDistance, type TriMesh } from './meshDistance'

/** Minimal GLB reader for the baked brain: POSITION accessor 0, indices accessor 2. */
function loadBrain(): TriMesh {
  const buf = readFileSync(new URL('../../public/models/brain.glb', import.meta.url))
  const jsonLen = buf.readUInt32LE(12)
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'))
  const bin = buf.subarray(20 + jsonLen + 8)
  const view = (i: number) => json.bufferViews[json.accessors[i].bufferView]
  const count = (i: number) => json.accessors[i].count as number
  const copy = (offset: number, bytes: number) => bin.buffer.slice(bin.byteOffset + offset, bin.byteOffset + offset + bytes)
  const positions = new Float32Array(copy(view(0).byteOffset, count(0) * 12))
  const idxType = json.accessors[2].componentType
  const indices =
    idxType === 5123
      ? new Uint16Array(copy(view(2).byteOffset, count(2) * 2))
      : new Uint32Array(copy(view(2).byteOffset, count(2) * 4))
  return { positions, indices }
}

/** A unit cube from -1 to 1, as 12 outward-wound triangles. */
const cube: TriMesh = {
  positions: [-1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1],
  indices: [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 2, 3, 7, 2, 7, 6, 1, 2, 6, 1, 6, 5, 3, 0, 4, 3, 4, 7],
}

describe('meshDistance', () => {
  it('finds the closest point on a triangle face, edge and vertex', () => {
    const a: Vec3 = [0, 0, 0]
    const b: Vec3 = [4, 0, 0]
    const c: Vec3 = [0, 4, 0]
    expect(closestPointOnTriangle([1, 1, 5], a, b, c)).toEqual([1, 1, 0])
    expect(closestPointOnTriangle([2, -3, 0], a, b, c)).toEqual([2, 0, 0])
    expect(closestPointOnTriangle([-2, -2, 1], a, b, c)).toEqual([0, 0, 0])
  })
  it('signs distance by inside / outside', () => {
    expect(isInside(cube, [0, 0, 0])).toBe(true)
    expect(isInside(cube, [0, 3, 0])).toBe(false)
    expect(signedDistance(cube, [0.5, 0, 0]).distance).toBeCloseTo(0.5)
    expect(signedDistance(cube, [0, 0, 3]).distance).toBeCloseTo(-2)
  })
})

describe('eloquent structures against the anatomical brain mesh', () => {
  const brain = loadBrain()
  const MIN_COVER_MM = 1

  for (const s of STRUCTURES) {
    it(`${s.id} lies wholly inside the brain with at least ${MIN_COVER_MM} mm of cover`, () => {
      const samples: Vec3[] = s.shape === 'sphere' ? [s.center] : Array.from({ length: 11 }, (_, i) => lerp(s.a, s.b, i / 10))
      for (const p of samples) {
        expect(signedDistance(brain, p).distance - s.radius).toBeGreaterThanOrEqual(MIN_COVER_MM)
      }
    })
  }
})
