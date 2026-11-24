/**
 * Bake a source brain GLB into the simulator's RAS millimetre frame.
 *
 *   node scripts/prepare-brain.mjs <source.glb> [out.glb]
 *
 * Source: "human-brain" by Yash_Dandavate (Sketchfab), CC-BY-4.0.
 * The source mesh is +x anterior, +y superior, +z right (glTF, Y-up), with an
 * identity node chain. We map it to RAS (R, A, S) = (z, x, y), a proper
 * rotation, then scale so the cerebrum spans 170 mm anterior to posterior, and
 * translate so the cerebrum's bounding box (excluding brainstem and
 * cerebellum below the temporal lobes) is centred on the origin.
 *
 * Output keeps only POSITION, NORMAL and indices; textures and UVs are dropped.
 */
import fs from 'node:fs'
import path from 'node:path'

const [src, out = 'public/models/brain.glb'] = process.argv.slice(2)
if (!src) {
  console.error('usage: node scripts/prepare-brain.mjs <source.glb> [out.glb]')
  process.exit(1)
}

const AP_LENGTH_MM = 170
/** Model-space y below which vertices belong to brainstem / cerebellum, not cerebrum. */
const CEREBRUM_FLOOR_Y = -0.5

function readGlb(file) {
  const buf = fs.readFileSync(file)
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB file')
  const jsonLen = buf.readUInt32LE(12)
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'))
  const binStart = 20 + jsonLen + 8
  const bin = buf.subarray(binStart, binStart + buf.readUInt32LE(20 + jsonLen))
  return { json, bin }
}

function readAccessor({ json, bin }, index) {
  const acc = json.accessors[index]
  const bv = json.bufferViews[acc.bufferView]
  const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type]
  const size = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[acc.componentType]
  const stride = bv.byteStride || comps * size
  const base = (bv.byteOffset || 0) + (acc.byteOffset || 0)
  const out = new Float64Array(acc.count * comps)
  for (let i = 0; i < acc.count; i++) {
    for (let c = 0; c < comps; c++) {
      const o = base + i * stride + c * size
      out[i * comps + c] =
        acc.componentType === 5126 ? bin.readFloatLE(o)
        : acc.componentType === 5125 ? bin.readUInt32LE(o)
        : acc.componentType === 5123 ? bin.readUInt16LE(o)
        : bin.readUInt8(o)
    }
  }
  return out
}

const glb = readGlb(src)
const prim = glb.json.meshes[0].primitives[0]
const pos = readAccessor(glb, prim.attributes.POSITION)
const nrm = readAccessor(glb, prim.attributes.NORMAL)
const idx = readAccessor(glb, prim.indices)
const n = pos.length / 3

// Cerebrum bounding box in model space.
const lo = [Infinity, Infinity, Infinity]
const hi = [-Infinity, -Infinity, -Infinity]
for (let i = 0; i < n; i++) {
  if (pos[i * 3 + 1] < CEREBRUM_FLOOR_Y) continue
  for (let k = 0; k < 3; k++) {
    lo[k] = Math.min(lo[k], pos[i * 3 + k])
    hi[k] = Math.max(hi[k], pos[i * 3 + k])
  }
}
const centre = lo.map((v, k) => (v + hi[k]) / 2)
const scale = AP_LENGTH_MM / (hi[0] - lo[0])

const outPos = new Float32Array(n * 3)
const outNrm = new Float32Array(n * 3)
const min = [Infinity, Infinity, Infinity]
const max = [-Infinity, -Infinity, -Infinity]
for (let i = 0; i < n; i++) {
  const x = pos[i * 3] - centre[0]
  const y = pos[i * 3 + 1] - centre[1]
  const z = pos[i * 3 + 2] - centre[2]
  const p = [z * scale, x * scale, y * scale]
  const q = [nrm[i * 3 + 2], nrm[i * 3], nrm[i * 3 + 1]]
  for (let k = 0; k < 3; k++) {
    outPos[i * 3 + k] = p[k]
    outNrm[i * 3 + k] = q[k]
    min[k] = Math.min(min[k], p[k])
    max[k] = Math.max(max[k], p[k])
  }
}
const outIdx = n <= 65535 ? Uint16Array.from(idx) : Uint32Array.from(idx)

// Assemble a minimal GLB.
const pad4 = (b) => (b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4))]) : b)
const parts = [Buffer.from(outPos.buffer), Buffer.from(outNrm.buffer), pad4(Buffer.from(outIdx.buffer))]
let offset = 0
const views = parts.map((p, i) => {
  const v = { buffer: 0, byteOffset: offset, byteLength: i === 2 ? outIdx.byteLength : p.length, target: i === 2 ? 34963 : 34962 }
  offset += p.length
  return v
})
const json = {
  asset: {
    version: '2.0',
    generator: 'neuropath-3d/scripts/prepare-brain.mjs',
    extras: {
      title: 'human-brain',
      author: 'Yash_Dandavate (https://sketchfab.com/Yash_Dandavate)',
      license: 'CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)',
      source: 'https://sketchfab.com/3d-models/human-brain-e073c2590bc24daaa7323f4daa5b7784',
      changes: 'Reoriented to RAS, rescaled to millimetres, recentred; textures and UVs removed.',
    },
  },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ name: 'brain', mesh: 0 }],
  meshes: [{ name: 'brain', primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, mode: 4 }] }],
  buffers: [{ byteLength: offset }],
  bufferViews: views,
  accessors: [
    { bufferView: 0, componentType: 5126, count: n, type: 'VEC3', min, max },
    { bufferView: 1, componentType: 5126, count: n, type: 'VEC3' },
    { bufferView: 2, componentType: outIdx instanceof Uint16Array ? 5123 : 5125, count: outIdx.length, type: 'SCALAR' },
  ],
}
const jsonBuf = Buffer.from(JSON.stringify(json))
const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc((4 - (jsonBuf.length % 4)) % 4, 0x20)])
const binChunk = Buffer.concat(parts)
const header = Buffer.alloc(12)
header.writeUInt32LE(0x46546c67, 0)
header.writeUInt32LE(2, 4)
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8)
const chunkHead = (len, type) => {
  const b = Buffer.alloc(8)
  b.writeUInt32LE(len, 0)
  b.writeUInt32LE(type, 4)
  return b
}
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, Buffer.concat([header, chunkHead(jsonChunk.length, 0x4e4f534a), jsonChunk, chunkHead(binChunk.length, 0x004e4942), binChunk]))

console.log(`wrote ${out}: ${n} vertices, ${outIdx.length / 3} triangles, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`)
console.log(`scale ${scale.toFixed(2)} mm/unit; RAS bounds min ${min.map((v) => v.toFixed(1))} max ${max.map((v) => v.toFixed(1))}`)
