import { useCallback, useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export type ViewId = 'perspective' | 'top' | 'front' | 'left' | 'right'

export interface ViewPreset {
  id: ViewId
  label: string
  key: string
  /** Direction from the orbit centre to the camera (RAS). */
  dir: [number, number, number]
}

/**
 * Presets keep +z (superior) as the camera's up vector so orbit controls
 * behave the same in every view. Top view sits a hair toward posterior so the
 * look-at basis is defined: anterior is up on screen.
 */
export const VIEWS: readonly ViewPreset[] = [
  { id: 'top', label: 'Top', key: 't', dir: [0, -0.0001, 1] },
  { id: 'front', label: 'Front', key: 'f', dir: [0, 1, 0] },
  { id: 'left', label: 'Left', key: 'l', dir: [-1, 0, 0] },
  { id: 'right', label: 'Right', key: 'r', dir: [1, 0, 0] },
  { id: 'perspective', label: '3D', key: 'p', dir: [-430, 230, 165] },
]

/** Default 3D view. */
const PERSPECTIVE_FOV = 30
const PERSPECTIVE_DISTANCE = Math.hypot(-430, 230, 165)
/**
 * Orthographic views use a 1.5° telephoto lens: at ~8.8 m the depth of the
 * brain changes apparent size by under 1%, so the projection is effectively
 * orthographic, and it lets one camera dolly-zoom smoothly between modes.
 */
const ORTHO_FOV = 1.5
/** Millimetres of anatomy that fit the viewport height in orthographic views. */
const ORTHO_FIT_MM = 230
const TRANSITION_MS = 750

const DEG = Math.PI / 180
const tanHalf = (fov: number) => Math.tan((fov * DEG) / 2)

interface Pose {
  azimuth: number
  elevation: number
  fov: number
  /** Visible height (mm) at the orbit centre. */
  height: number
  target: THREE.Vector3
}

const toAngles = (dir: THREE.Vector3) => ({
  azimuth: Math.atan2(dir.y, dir.x),
  elevation: Math.asin(THREE.MathUtils.clamp(dir.z, -1, 1)),
})

/**
 * The field of view is vertical, so on a viewport narrower than ~1:1 (a phone)
 * the brain would be cropped at the sides. Grow the framing to keep it in view.
 */
const fitFactor = (aspect: number) => (aspect > 0 ? Math.max(1, 0.8 / aspect) : 1)

function presetPose(view: ViewId, aspect: number): Pose {
  const preset = VIEWS.find((v) => v.id === view)!
  const dir = new THREE.Vector3(...preset.dir).normalize()
  const ortho = view !== 'perspective'
  const fov = ortho ? ORTHO_FOV : PERSPECTIVE_FOV
  const base = ortho ? ORTHO_FIT_MM : 2 * PERSPECTIVE_DISTANCE * tanHalf(PERSPECTIVE_FOV)
  return { ...toAngles(dir), fov, height: base * fitFactor(aspect), target: new THREE.Vector3() }
}

type Controls = {
  target: THREE.Vector3
  enabled: boolean
  minDistance: number
  maxDistance: number
  update: () => void
}

function applyPose(camera: THREE.PerspectiveCamera, controls: Controls | null, p: Pose) {
  const distance = p.height / (2 * tanHalf(p.fov))
  const ce = Math.cos(p.elevation)
  const dir = new THREE.Vector3(ce * Math.cos(p.azimuth), ce * Math.sin(p.azimuth), Math.sin(p.elevation))
  camera.up.set(0, 0, 1)
  camera.position.copy(p.target).addScaledVector(dir, distance)
  camera.fov = p.fov
  camera.near = Math.max(1, distance - 450)
  camera.far = distance + 450
  camera.lookAt(p.target)
  camera.updateProjectionMatrix()
  if (controls) controls.target.copy(p.target)
}

/** Zoom limits per mode, expressed as distance so the dolly feels the same in both. */
function setLimits(controls: Controls, ortho: boolean, aspect: number) {
  const fov = ortho ? ORTHO_FOV : PERSPECTIVE_FOV
  const k = fitFactor(aspect)
  // Visible height between ~80 mm (close) and ~420 mm (far) in either mode, widened on narrow screens.
  controls.minDistance = ortho ? 80 / (2 * tanHalf(fov)) : 170
  controls.maxDistance = (ortho ? 420 / (2 * tanHalf(fov)) : 900) * k
}

const shortestAngle = (from: number, to: number) => {
  let d = to - from
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return d
}

/**
 * Owns the camera and moves it to the requested view. Changing view animates
 * an orbit (azimuth/elevation) combined with a dolly-zoom (field of view and
 * distance together, holding the framing), so perspective and orthographic
 * views blend without a cut. `nonce` re-applies the same view.
 */
/** A request to centre and zoom on a point (a selected structure). */
export interface FocusRequest {
  point: [number, number, number]
  /** Structure radius in mm; sets how tightly to frame it. */
  radius: number
  nonce: number
}

/** Current camera pose relative to the orbit target. */
function currentPose(camera: THREE.PerspectiveCamera, controls: Controls): Pose {
  const offset = camera.position.clone().sub(controls.target)
  const distance = offset.length()
  return {
    ...toAngles(offset.normalize()),
    fov: camera.fov,
    height: 2 * distance * tanHalf(camera.fov),
    target: controls.target.clone(),
  }
}

export function CameraRig({ view, nonce, focus }: { view: ViewId; nonce: number; focus: FocusRequest | null }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const controls = useThree((s) => s.controls) as unknown as Controls | null
  const size = useThree((s) => s.size)
  const aspectRef = useRef(1)
  aspectRef.current = size.height > 0 ? size.width / size.height : 1
  const transition = useRef<((now: number) => void) | null>(null)
  const first = useRef(true)

  /**
   * Animate from the current pose to `end`: orbit (azimuth/elevation), lens
   * in tan-space, framing in log-space, target linearly. Returns a cleanup.
   */
  const animateTo = useCallback(
    (end: Pose, onDone: () => void) => {
      if (!controls) return () => {}
      const start = currentPose(camera, controls)
      const dAz = shortestAngle(start.azimuth, end.azimuth)
      const tanA = tanHalf(start.fov)
      const tanB = tanHalf(end.fov)
      const logHA = Math.log(start.height)
      const logHB = Math.log(end.height)

      controls.enabled = false
      controls.minDistance = 0
      controls.maxDistance = Infinity
      const pose: Pose = { ...start, target: start.target.clone() }
      const t0 = performance.now()
      transition.current = (now: number) => {
        const t = easeInOutCubic(Math.min(1, (now - t0) / TRANSITION_MS))
        pose.azimuth = start.azimuth + dAz * t
        pose.elevation = start.elevation + (end.elevation - start.elevation) * t
        pose.fov = (2 * Math.atan(tanA + (tanB - tanA) * t)) / DEG
        pose.height = Math.exp(logHA + (logHB - logHA) * t)
        pose.target.lerpVectors(start.target, end.target, t)
        applyPose(camera, controls, pose)
        if (t >= 1) {
          transition.current = null
          onDone()
          controls.enabled = true
          controls.update()
        }
      }
      return () => {
        transition.current = null
        controls.enabled = true
      }
    },
    [camera, controls],
  )

  // Preset views (and Reset view via nonce).
  useEffect(() => {
    if (!controls) return
    transition.current = null
    const aspect = aspectRef.current
    const end = presetPose(view, aspect)
    const ortho = view !== 'perspective'
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (first.current || reduced) {
      first.current = false
      applyPose(camera, controls, end)
      setLimits(controls, ortho, aspect)
      controls.update()
      return
    }
    return animateTo(end, () => setLimits(controls, ortho, aspect))
  }, [view, nonce, controls])

  // Focus on a selected structure from whatever angle and lens is in use now.
  useEffect(() => {
    if (!focus || !controls) return
    const start = currentPose(camera, controls)
    const ortho = start.fov < 10
    // Frame the structure with context, but stay inside the zoom limits of the current mode.
    const minHeight = ortho ? 85 : 2 * 175 * tanHalf(PERSPECTIVE_FOV)
    const end: Pose = {
      azimuth: start.azimuth,
      elevation: start.elevation,
      fov: start.fov,
      height: Math.max(minHeight, focus.radius * 7) * fitFactor(aspectRef.current),
      target: new THREE.Vector3(...focus.point),
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      applyPose(camera, controls, end)
      controls.update()
      return
    }
    return animateTo(end, () => setLimits(controls, ortho, aspectRef.current))
  }, [focus?.nonce])

  // Advance the transition on R3F's frame loop, timed by the wall clock, so it
  // stays in step with rendering and always lands on schedule.
  useFrame(() => transition.current?.(performance.now()), -1)

  return <PerspectiveCamera makeDefault position={[-430, 230, 165]} up={[0, 0, 1]} fov={PERSPECTIVE_FOV} near={1} far={3000} />
}
