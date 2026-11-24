import { APPROACHES, approachById, type Side } from '../lib/anatomy'
import type { Assessment, Plan } from '../lib/risk'
import { fixed, formatMm, formatRas } from '../lib/format'
import { Readout, Section, Segmented } from './primitives'

export function ApproachSection({
  plan,
  assessment,
  onChange,
}: {
  plan: Plan
  assessment: Assessment
  onChange: (patch: Partial<Plan>) => void
}) {
  const approach = approachById(plan.approach)
  return (
    <Section title="Entry and trajectory">
      <div role="radiogroup" aria-label="Approach" className="border border-g3">
        {APPROACHES.map((a, i) => {
          const active = a.id === plan.approach
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ approach: a.id })}
              className={[
                'flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors duration-100',
                i > 0 ? 'border-t border-g3' : '',
                active ? 'bg-white text-black' : 'text-g6 hover:bg-g1',
              ].join(' ')}
            >
              <span
                aria-hidden
                className={[
                  'mt-[5px] h-2 w-2 shrink-0 border',
                  active ? 'border-black bg-black' : 'border-g4',
                ].join(' ')}
              />
              <span className="min-w-0">
                <span className={['block text-sm', active ? 'font-medium' : ''].join(' ')}>{a.name}</span>
                <span className={['block text-xs', active ? 'text-g3' : 'text-g5'].join(' ')}>{a.detail}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <span className={['text-sm', approach.lateralised ? 'text-g6' : 'text-g4'].join(' ')}>Side</span>
        <div className="w-44">
          <Segmented<Side>
            label="Side"
            value={plan.side}
            disabled={!approach.lateralised}
            onChange={(side) => onChange({ side })}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
            ]}
          />
        </div>
      </div>
      {!approach.lateralised && <p className="mt-1 text-right text-xs text-g4">Midline approach, side not applicable</p>}

      <dl className="mt-3">
        <Readout label="Entry">{formatRas(assessment.entry)}</Readout>
        <Readout label="Trajectory length">{formatMm(assessment.lengthMm)}</Readout>
        <Readout label="Angle to axial plane">{fixed(assessment.angles.axial)}°</Readout>
        <Readout label="Angle to sagittal plane">{fixed(assessment.angles.sagittal)}°</Readout>
      </dl>
    </Section>
  )
}
