import { structureLabel } from '../lib/anatomy'
import { axisLimit, radiusFromVolume, type Vec3 } from '../lib/geometry'
import { VOLUME_RANGE, clampTarget, lesionBounds, type Assessment, type Plan } from '../lib/risk'
import { fixed, formatMm } from '../lib/format'
import { Readout, Section, SliderField } from './primitives'

const AXES = [
  { label: 'X · left to right', hint: 'L− / R+' },
  { label: 'Y · posterior to anterior', hint: 'P− / A+' },
  { label: 'Z · inferior to superior', hint: 'I− / S+' },
] as const

const floorHalf = (v: number) => Math.floor(v * 2) / 2

export function TargetSection({
  plan,
  assessment,
  onChange,
}: {
  plan: Plan
  assessment: Assessment
  onChange: (patch: Partial<Plan>) => void
}) {
  const bounds = lesionBounds(radiusFromVolume(plan.volumeCm3))

  const setAxis = (axis: 0 | 1 | 2, v: number) => {
    const next = [...plan.target] as [number, number, number]
    next[axis] = v
    onChange({ target: clampTarget(next as Vec3, plan.volumeCm3) })
  }

  return (
    <Section title="Target lesion">
      {AXES.map((ax, i) => {
        const axis = i as 0 | 1 | 2
        const lim = floorHalf(axisLimit(axis, plan.target, bounds))
        return (
          <SliderField
            key={ax.label}
            label={ax.label}
            hint={ax.hint}
            value={plan.target[axis]}
            min={-lim}
            max={lim}
            step={0.5}
            unit="mm"
            onChange={(v) => setAxis(axis, v)}
          />
        )
      })}
      <SliderField
        label="Lesion volume"
        value={plan.volumeCm3}
        min={VOLUME_RANGE.min}
        max={VOLUME_RANGE.max}
        step={0.1}
        unit="cm³"
        onChange={(v) => onChange({ volumeCm3: v, target: clampTarget(plan.target, v) })}
      />
      <dl className="mt-2">
        <Readout label="Radius, r = ∛(3V / 4π)">{formatMm(assessment.lesionRadius)}</Readout>
        <Readout label="Diameter">{formatMm(assessment.lesionRadius * 2)}</Readout>
      </dl>

      {assessment.lesionOverlaps.length > 0 && (
        <div role="alert" className="mt-3 flex border border-white shadow-glow-sm">
          <div className="hatch w-2 shrink-0 border-r border-white" aria-hidden />
          <div className="px-3 py-2">
            <div className="text-sm font-medium text-white">Lesion overlaps eloquent tissue</div>
            <ul className="mt-1 space-y-0.5">
              {assessment.lesionOverlaps.map((r) => (
                <li key={r.structure.id} className="flex justify-between gap-3 text-xs text-g6">
                  <span>{structureLabel(r.structure)}</span>
                  <span className="num text-g5">overlap {fixed(-r.lesionClearance)} mm</span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs text-g5">Resecting the full lesion volume would injure this structure.</p>
          </div>
        </div>
      )}
    </Section>
  )
}
