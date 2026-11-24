import { useFrame, useThree } from '@react-three/fiber'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { structureAnchor, type Structure } from '../lib/anatomy'
import type { RiskTier } from '../lib/geometry'
import type { StructureAssessment } from '../lib/risk'
import { formatMm } from '../lib/format'

/**
 * Floating structure labels. Content is ordinary React DOM in the overlay
 * layer; a driver inside the Canvas projects each anchor to screen space every
 * frame and writes the transform directly. This avoids creating a nested React
 * root per label.
 */
export type LabelRegistry = RefObject<Map<string, HTMLDivElement>>

const labelPoint = (s: Structure): THREE.Vector3 => {
  const a = structureAnchor(s)
  const lift = s.shape === 'sphere' ? s.radius + 5 : s.radius + 14
  return new THREE.Vector3(a[0], a[1], a[2] + lift)
}

const TIER_MARK: Record<RiskTier, string> = { clear: '', caution: 'Caution', intersection: 'Intersect' }

export function LabelLayer({
  rows,
  registry,
  selectedId,
  onSelect,
}: {
  rows: StructureAssessment[]
  registry: LabelRegistry
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {rows
        .filter((r) => r.visible)
        .map((r) => {
          const s = r.structure
          const affected = r.tier !== 'clear'
          const selected = s.id === selectedId
          return (
            <div
              key={s.id}
              ref={(el) => {
                if (el) registry.current.set(s.id, el)
                else registry.current.delete(s.id)
              }}
              className="absolute left-0 top-0 will-change-transform"
              style={{ visibility: 'hidden' }}
            >
              <button
                type="button"
                data-no-motion
                aria-pressed={selected}
                aria-label={`Focus ${s.name}, ${s.side}`}
                onClick={() => onSelect(s.id)}
                className={[
                  'pointer-events-auto block -translate-x-1/2 -translate-y-1/2 cursor-pointer whitespace-nowrap border px-1.5 py-px text-2xs select-none transition-colors duration-100',
                  affected ? 'border-white bg-white font-medium text-black shadow-glow-sm' : 'border-g3 bg-black text-g6 hover:border-white hover:text-white',
                  r.tier === 'caution' ? 'outline-1 outline-offset-1 outline-dashed outline-white' : '',
                  selected ? 'shadow-glow !border-white' + (affected ? '' : ' !text-white') : '',
                ].join(' ')}
              >
                <span>{s.short}</span>
                <span className="num ml-1">{s.side === 'left' ? 'L' : 'R'}</span>
                {affected && (
                  <span className="num ml-1.5">
                    {TIER_MARK[r.tier]} {formatMm(r.clearance)}
                  </span>
                )}
              </button>
            </div>
          )
        })}
    </div>
  )
}

const ndc = new THREE.Vector3()
const camSpace = new THREE.Vector3()

interface Placed {
  x0: number
  y0: number
  x1: number
  y1: number
}
const GAP = 2
const overlaps = (a: Placed, b: Placed) => a.x0 < b.x1 + GAP && a.x1 + GAP > b.x0 && a.y0 < b.y1 + GAP && a.y1 + GAP > b.y0

export function LabelDriver({
  rows,
  registry,
  selectedId,
}: {
  rows: StructureAssessment[]
  registry: LabelRegistry
  selectedId: string | null
}) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const points = rows.filter((r) => r.visible).map((r) => ({
    id: r.structure.id,
    p: labelPoint(r.structure),
    priority: r.structure.id === selectedId ? 2 : r.tier === 'clear' ? 0 : 1,
  }))

  useFrame(() => {
    // Project, then place labels greedily: risk labels first, then nearest to
    // the camera. A label that would collide is nudged down or up by one row;
    // if both are taken it is hidden for this frame.
    const candidates: Array<{ el: HTMLDivElement; x: number; y: number; depth: number; priority: number }> = []
    for (const { id, p, priority } of points) {
      const el = registry.current.get(id)
      if (!el) continue
      camSpace.copy(p).applyMatrix4(camera.matrixWorldInverse)
      if (camSpace.z > -1) {
        el.style.visibility = 'hidden'
        continue
      }
      ndc.copy(p).project(camera)
      candidates.push({
        el,
        x: Math.round((ndc.x * 0.5 + 0.5) * size.width),
        y: Math.round((-ndc.y * 0.5 + 0.5) * size.height),
        depth: -camSpace.z,
        priority,
      })
    }
    candidates.sort((a, b) => b.priority - a.priority || a.depth - b.depth)

    const placed: Placed[] = []
    for (const c of candidates) {
      const box = c.el.firstElementChild as HTMLElement | null
      const w = box?.offsetWidth ?? 0
      const h = box?.offsetHeight ?? 0
      let shown = false
      for (const dy of [0, h + GAP, -(h + GAP)]) {
        const rect = { x0: c.x - w / 2, x1: c.x + w / 2, y0: c.y + dy - h / 2, y1: c.y + dy + h / 2 }
        if (placed.some((q) => overlaps(rect, q))) continue
        placed.push(rect)
        c.el.style.transform = `translate(${c.x}px, ${c.y + dy}px)`
        shown = true
        break
      }
      c.el.style.visibility = shown ? 'visible' : 'hidden'
    }
  })
  return null
}
