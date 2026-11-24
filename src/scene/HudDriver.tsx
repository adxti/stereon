import { useFrame, useThree } from '@react-three/fiber'
import type { RefObject } from 'react'
import * as THREE from 'three'

export interface HudRefs {
  gizmo: RefObject<SVGSVGElement | null>
  scaleBar: RefObject<HTMLDivElement | null>
  scaleLabel: RefObject<HTMLSpanElement | null>
}

const AXES: Array<{ key: string; dir: THREE.Vector3 }> = [
  { key: 'x', dir: new THREE.Vector3(1, 0, 0) },
  { key: 'y', dir: new THREE.Vector3(0, 1, 0) },
  { key: 'z', dir: new THREE.Vector3(0, 0, 1) },
]
const NICE_MM = [1, 2, 5, 10, 20, 25, 50, 100, 200]
const GIZMO_R = 22
const LABEL_R = 31
const tmp = new THREE.Vector3()
const inv = new THREE.Quaternion()

/**
 * Lives inside the Canvas and writes camera-dependent overlay geometry
 * straight to the DOM each frame (no React re-render): the A/P, L/R, S/I
 * gizmo and the millimetre scale bar at the orbit-target depth.
 */
export function HudDriver({ refs }: { refs: HudRefs }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3 } | null

  useFrame(() => {
    const svg = refs.gizmo.current
    if (svg) {
      inv.copy(camera.quaternion).invert()
      for (const { key, dir } of AXES) {
        tmp.copy(dir).applyQuaternion(inv)
        const x = tmp.x
        const y = -tmp.y
        const front = tmp.z >= 0
        const pos = svg.querySelector<SVGLineElement>(`[data-axis="${key}+"]`)
        const neg = svg.querySelector<SVGLineElement>(`[data-axis="${key}-"]`)
        const lp = svg.querySelector<SVGTextElement>(`[data-label="${key}+"]`)
        const ln = svg.querySelector<SVGTextElement>(`[data-label="${key}-"]`)
        pos?.setAttribute('x2', String(x * GIZMO_R))
        pos?.setAttribute('y2', String(y * GIZMO_R))
        neg?.setAttribute('x2', String(-x * GIZMO_R))
        neg?.setAttribute('y2', String(-y * GIZMO_R))
        lp?.setAttribute('x', String(x * LABEL_R))
        lp?.setAttribute('y', String(y * LABEL_R))
        ln?.setAttribute('x', String(-x * LABEL_R))
        ln?.setAttribute('y', String(-y * LABEL_R))
        lp?.setAttribute('fill', front ? '#ffffff' : '#8a8a8a')
        ln?.setAttribute('fill', front ? '#5c5c5c' : '#bdbdbd')
      }
    }

    const bar = refs.scaleBar.current
    const label = refs.scaleLabel.current
    if (bar && label) {
      // Works for the 30° 3D lens and the 1.5° orthographic-style lens alike.
      const target = controls?.target ?? tmp.set(0, 0, 0)
      const d = camera.position.distanceTo(target)
      const worldH = 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      const pxPerMm = size.height / worldH
      let mm = NICE_MM[0]
      for (const n of NICE_MM) if (n * pxPerMm <= 120) mm = n
      const w = `${Math.round(mm * pxPerMm)}px`
      if (bar.style.width !== w) bar.style.width = w
      const text = `${mm} mm`
      if (label.textContent !== text) label.textContent = text
    }
  })
  return null
}
