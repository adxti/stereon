import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Prepare the anatomical brain mesh for the x-ray shader: weld UV-seam
 * duplicates so normals are smooth, then store a per-vertex concavity value
 * (`aGroove`, 0–1) so sulci can be drawn as faint lines across the surface.
 *
 * Concavity is the umbrella-operator Laplacian projected on the normal: a
 * vertex that sits below the average of its neighbours lies in a groove.
 */
export function prepareBrainGeometry(source: THREE.BufferGeometry): THREE.BufferGeometry {
  let geo = source.clone()
  for (const name of Object.keys(geo.attributes)) if (name !== 'position') geo.deleteAttribute(name)
  geo = mergeVertices(geo, 1e-3)
  geo.computeVertexNormals()

  const pos = geo.attributes.position as THREE.BufferAttribute
  const nor = geo.attributes.normal as THREE.BufferAttribute
  const index = geo.index!
  const count = pos.count
  const sum = new Float32Array(count * 3)
  const deg = new Uint16Array(count)
  let edgeTotal = 0
  let edgeCount = 0

  const addEdge = (a: number, b: number) => {
    sum[a * 3] += pos.getX(b)
    sum[a * 3 + 1] += pos.getY(b)
    sum[a * 3 + 2] += pos.getZ(b)
    deg[a]++
  }
  for (let t = 0; t < index.count; t += 3) {
    const a = index.getX(t)
    const b = index.getX(t + 1)
    const c = index.getX(t + 2)
    for (const [u, v] of [[a, b], [b, c], [c, a]] as const) {
      addEdge(u, v)
      addEdge(v, u)
      edgeTotal += Math.hypot(pos.getX(u) - pos.getX(v), pos.getY(u) - pos.getY(v), pos.getZ(u) - pos.getZ(v))
      edgeCount++
    }
  }
  const scale = 0.3 * (edgeTotal / Math.max(1, edgeCount))

  const raw = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    if (!deg[i]) continue
    const lx = sum[i * 3] / deg[i] - pos.getX(i)
    const ly = sum[i * 3 + 1] / deg[i] - pos.getY(i)
    const lz = sum[i * 3 + 2] / deg[i] - pos.getZ(i)
    raw[i] = (lx * nor.getX(i) + ly * nor.getY(i) + lz * nor.getZ(i)) / scale
  }

  // One smoothing pass so grooves read as continuous lines rather than speckle.
  const groove = new Float32Array(count)
  const acc = new Float32Array(count)
  const n = new Uint16Array(count)
  for (let t = 0; t < index.count; t += 3) {
    const tri = [index.getX(t), index.getX(t + 1), index.getX(t + 2)]
    for (const u of tri) for (const v of tri) if (u !== v) {
      acc[u] += raw[v]
      n[u]++
    }
  }
  for (let i = 0; i < count; i++) {
    const smoothed = (raw[i] + (n[i] ? acc[i] / n[i] : 0)) / 2
    groove[i] = Math.min(1, Math.max(0, smoothed))
  }

  geo.setAttribute('aGroove', new THREE.BufferAttribute(groove, 1))
  geo.computeBoundingSphere()
  return geo
}
