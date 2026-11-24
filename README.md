# STEREON

© Aditi Balan

An educational simulator for planning minimally invasive neurosurgical trajectories around eloquent cortex. Record the case, place a lesion, pick an approach, and see in real time how close the path runs to motor, language, visual and internal capsule structures, and what deficit an injury to each would cause.

> **Educational use only.** STEREON is a teaching and visualisation tool. It is not a medical device and must not be used for clinical decision-making, diagnosis or treatment planning. Structure positions are population-level landmarks, not patient imaging.

## What it does

- **Anatomical brain model.** A real brain mesh (cerebrum, cerebellum and brainstem) rendered as a grey x-ray wireframe. The silhouette and sulci read against black while deep structures stay visible. Rotate, zoom and pan with limits.
- **Click to focus.** Click or tap any centre (its 3D shape or its label) to highlight it and zoom to it from whatever angle you're viewing. A card shows its clearance from the path, risk tier and expected deficit. Tap empty space, press Esc or use *Reset view* to clear it.
- **Phones.** On screens narrower than 768 px the 3D model fills the screen. The planning panel becomes a bottom sheet that shows the risk status while collapsed and slides up when tapped. Controls are touch-sized, and form text is 16 px so iOS doesn't zoom in on focus. Overlapping labels are decluttered: risk and selected labels win, then the nearest.
- **View shortcuts.** *Top*, *Front*, *Left* and *Right* orthographic views and the *3D* perspective view, from the viewport buttons or keys **T F L R P**. Changing view is one smooth camera move: the camera orbits and dolly-zooms at the same time, so perspective and orthographic blend without a cut. *Reset view* returns to 3D.
- **Patient and lesion details.** Case reference, age, sex, handedness, Karnofsky score, imaging date, presenting symptoms, history and free-text lesion notes. Choosing left-handed or ambidextrous adds a note on language dominance. Everything stays in the browser.
- **Lesion nature.** Lesion type (low-grade glioma, glioblastoma, meningioma, metastasis, pituitary adenoma, abscess, cavernous malformation, CNS lymphoma, other), suspected or histology-confirmed, WHO grade (set automatically per type), enhancement, oedema and multiplicity. Each type shows a short teaching summary.
- **Eloquent structures.** Primary motor cortex (L/R), Broca's area (left, dominant), Wernicke's area (left, dominant), primary visual cortex (L/R) and the posterior limb of the internal capsule (L/R, modelled as a capsule). Structures are told apart by grey value and labels, and each one can be toggled.
- **Target lesion.** X/Y/Z sliders with paired numeric fields, clamped so the whole lesion stays inside the brain volume. A volume slider from 0.5 to 30 cm³ sets the sphere radius. You get a warning if the lesion itself overlaps a structure.
- **Entry and trajectory.** Frontal burr hole (Kocher's point), pterional, transnasal endoscopic (midline) and parietal approaches, with a left/right selector where it applies. The path is solid where clear and dashed through a safety zone. Readouts show entry coordinates, length and angles to the axial and sagittal planes.
- **Collision and deficit calculator.** Clearance from the trajectory to every structure surface, an adjustable safety margin (default 5 mm), and three risk tiers. The high-risk alert glows and pulses, lists correctly lateralised deficits, and the affected structures are hatched in the scene. A distance table is sorted closest first.
- **Pre-op note.** *Copy pre-op note* copies a structured plain-text summary: patient, lesion pathology, target, approach, clearances, deficits and the disclaimer. If the clipboard is unavailable it falls back to a pre-selected text box.
- **Viewport overlays.** An A/P, L/R, S/I orientation gizmo, a scale bar in mm, a target readout and an overall risk status.

## Running it

Requires Node 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest unit tests for geometry, risk engine, case data and note
npm run build      # type-check and production build into dist/
```

## The brain model

`public/models/brain.glb` is generated from the source model by `scripts/prepare-brain.mjs`:

```bash
node scripts/prepare-brain.mjs path/to/human-brain.glb public/models/brain.glb
```

The script maps the source axes to RAS ((R, A, S) = (z, x, y), a proper rotation), scales to 170 mm anterior to posterior, centres the cerebrum's bounding box on the origin, and drops the textures and UVs. That shrinks the file from 3.9 MB to 0.8 MB. At load time, `src/scene/brainGeometry.ts` welds the seams and computes per-vertex concavity (the Laplacian projected on the normal), which drives the sulcal shading.

**Credit.** "human-brain" by [Yash_Dandavate](https://sketchfab.com/Yash_Dandavate) on [Sketchfab](https://sketchfab.com/3d-models/human-brain-e073c2590bc24daaa7323f4daa5b7784), licensed [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/). Changes: reoriented, rescaled, recentred, textures removed.

## Coordinate frame

RAS, in millimetres, with the origin at the centre of the cerebrum's bounding box: +x is right, +y is anterior, +z is superior. Landmark positions start from MNI-space coordinates shifted the same way (MNI + [0, 17, −15]). Each one was then moved inward along the mesh's surface normal until the whole sphere or capsule sits at least 1.5 mm under the brain surface. `src/lib/anatomy.mesh.test.ts` loads the real model and fails if any structure pokes out.

The entry point is drawn as a low-poly, flat-shaded marker aligned with the trajectory: a burr-hole ring, a guide tube outside the skull and a cone pointing at the target.

Lesion placement is bounded by an ellipsoid with semi-axes 68 × 85 × 62 mm. It deliberately includes the skull-base region below the frontal lobes, where sellar targets for the transnasal approach sit. Entry points lie on an invisible skull ellipsoid of 86 × 104 × 80 mm, which encloses the cerebrum with about 2 mm to spare.

## How the risk maths works

All maths lives in pure TypeScript with no React or Three.js dependencies (`src/lib/geometry.ts`, `src/lib/risk.ts`) and is unit-tested.

**Trajectory.** A line segment from the entry point E on the skull ellipsoid to the lesion centre T. Each entry point is a fixed direction projected onto the ellipsoid: for direction **d** and semi-axes (a, b, c), the point is **d** / √((dₓ/a)² + (d_y/b)² + (d_z/c)²).

**Lesion radius.** From volume V in cm³ (converted to mm³):

```
r = ∛(3V / 4π)
```

**Clearance to a sphere** (centre C, radius R): the distance from C to the closest point on segment ET, minus R.

```
t* = clamp(((C − E) · (T − E)) / |T − E|², 0, 1)
clearance = |C − (E + t*(T − E))| − R
```

**Clearance to a capsule** (axis segment AB, radius R): the minimum distance between segments ET and AB, minus R. This uses the closest-points-between-segments method from Ericson, *Real-Time Collision Detection*, §5.1.9, which handles parallel and degenerate segments.

**Risk tiers**, for safety margin m:

| Tier | Condition |
| --- | --- |
| Clear | clearance > m |
| Caution | 0 < clearance ≤ m |
| Intersection | clearance ≤ 0 |

Only visible structures are assessed. Hidden ones are still measured and listed, but marked "not assessed".

**Safety-zone dashing.** The segment is sampled at 400 points. Where a point lies within m of any visible structure surface, the line is drawn dashed.

**Lesion overlap.** The distance from the lesion centre to the structure surface, minus the lesion radius. A value of zero or less means the lesion overlaps the structure.

**Angles.** For direction **v** = T − E: the angle to the axial plane is asin(|v_z| / |v|) and the angle to the sagittal plane is asin(|vₓ| / |v|), both in degrees.

**Deficits.** The motor, visual and capsular pathways cross, so injury produces a contralateral deficit:

| Structure | Expected deficit |
| --- | --- |
| Primary motor cortex | Contralateral hemiparesis |
| Broca's area (dominant) | Expressive (non-fluent) aphasia |
| Wernicke's area (dominant) | Receptive (fluent) aphasia |
| Visual cortex | Contralateral homonymous hemianopia |
| Internal capsule | Contralateral hemiparesis / hemisensory loss |

## Views and camera

A single perspective camera handles every view. The *3D* view uses a 30° lens. The orthographic views use a 1.5° telephoto lens about 8.8 m away. At that distance the depth of the brain changes apparent size by under 1%, so the projection is effectively orthographic. Switching view interpolates azimuth and elevation (keeping superior up), the lens in tan-space and the framing in log-space. That gives one continuous orbit plus dolly-zoom of 750 ms, timed by the wall clock on the render loop, and skipped under reduced-motion.

## Project layout

```
src/
  lib/        geometry.ts (pure maths) · anatomy.ts (structures, approaches)
              risk.ts (assessment) · case.ts (patient, lesion pathology)
              note.ts (export) · format.ts · *.test.ts
  scene/      Viewport, CameraRig, Brain, brainGeometry, Structures, Lesion,
              Trajectory, Labels, HudDriver
  panel/      Panel and its sections, shared primitives
  motion.ts   anime.js button feedback, warning glow pulse, confirmation pop
scripts/
  prepare-brain.mjs   bakes the source GLB into RAS millimetres
```

## Design notes

The interface is monochrome: black, white and six greys, defined as Tailwind theme tokens, with every other colour removed from the theme. White glows are reserved for two things, warnings and the copyright line. Warnings also pulse gently through anime.js while active. Buttons get a short anime.js press-and-spring. There are no gradients: hatching is an SVG tile, and the cortex uses plain alpha blending. Risk is shown through inversion, hatching, dashed rules, glow and explicit text, never colour. The type pairing is Archivo for the UI and IBM Plex Mono for every number, coordinate and unit.

Two implementation notes:

- Structure labels are ordinary DOM elements projected each frame, rather than drei `<Html>`. Under React 19, `<Html>` creates a nested root per label and logs unmount errors.
- `three` is pinned to 0.182. r183 deprecates `THREE.Clock`, which `@react-three/fiber` 9 still uses, so newer versions log a console warning.

## Licence

Code: MIT. Brain model: CC BY 4.0 (see credit above).
