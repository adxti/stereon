import { useRef } from 'react'
import { structureLabel } from '../lib/anatomy'
import { useGlowPulse } from '../motion'
import type { RiskTier } from '../lib/geometry'
import { MARGIN_RANGE, TIER_LABEL, type Assessment, type Plan } from '../lib/risk'
import { fixed, formatMm } from '../lib/format'
import { Section, SliderField } from './primitives'

function TierCell({ tier }: { tier: RiskTier }) {
  if (tier === 'intersection')
    return <span className="inline-block bg-white px-1.5 text-xs font-medium text-black shadow-glow-sm">{TIER_LABEL[tier]}</span>
  if (tier === 'caution')
    return <span className="inline-block border border-dashed border-white px-1.5 text-xs text-white">{TIER_LABEL[tier]}</span>
  return <span className="inline-block px-1.5 text-xs text-g5">{TIER_LABEL[tier]}</span>
}

export function RiskSection({
  plan,
  assessment,
  onChange,
}: {
  plan: Plan
  assessment: Assessment
  onChange: (patch: Partial<Plan>) => void
}) {
  const a = assessment
  const alertGlow = useRef<HTMLDivElement>(null)
  useGlowPulse(alertGlow, a.highRisk)
  return (
    <Section title="Collision and deficit risk">
      <SliderField
        label="Safety margin"
        value={plan.marginMm}
        min={MARGIN_RANGE.min}
        max={MARGIN_RANGE.max}
        step={0.5}
        unit="mm"
        onChange={(marginMm) => onChange({ marginMm })}
      />

      <div className="mt-3" aria-live="polite">
        {a.highRisk ? (
          <div ref={alertGlow} role="alert" className="border border-white bg-white text-black shadow-glow">
            <div className="flex items-center gap-2 border-b border-black px-3 py-2">
              <span className="h-2.5 w-2.5 shrink-0 bg-black" aria-hidden />
              <span className="text-sm font-semibold">High risk: eloquent tract intersection</span>
            </div>
            <ul>
              {a.affected.map((r, i) => (
                <li key={r.structure.id} className={['px-3 py-2', i > 0 ? 'border-t border-g6' : ''].join(' ')}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{structureLabel(r.structure)}</span>
                    <span className="num text-sm">{formatMm(r.clearance)}</span>
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-between gap-3 text-xs">
                    <span>{r.deficit}</span>
                    <span className="shrink-0 uppercase tracking-[0.1em]">{TIER_LABEL[r.tier]}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="border border-g3 px-3 py-2">
            <div className="text-sm text-white">No eloquent structure within margin</div>
            <div className="text-xs text-g5">
              Every visible structure is more than <span className="num">{fixed(plan.marginMm)} mm</span> from the path.
            </div>
          </div>
        )}
      </div>

      <table className="mt-4 w-full border-collapse text-left">
        <caption className="mb-1.5 text-left text-xs text-g5">Clearance from trajectory to structure surface, closest first</caption>
        <thead>
          <tr className="border-b border-g3">
            <th scope="col" className="eyebrow py-1.5 !font-medium">Structure</th>
            <th scope="col" className="eyebrow py-1.5 text-right !font-medium">Distance</th>
            <th scope="col" className="eyebrow py-1.5 pl-3 text-right !font-medium">Tier</th>
          </tr>
        </thead>
        <tbody>
          {a.rows.map((r) => (
            <tr key={r.structure.id} className="border-b border-g2">
              <td className={['py-1.5 pr-2 text-sm', r.visible ? 'text-g6' : 'text-g4'].join(' ')}>
                {r.structure.name}
                <span className="num ml-1.5 text-xs text-g5">{r.structure.side === 'left' ? 'L' : 'R'}</span>
              </td>
              <td className={['num py-1.5 text-right text-sm', r.visible ? 'text-white' : 'text-g4'].join(' ')}>
                {fixed(r.clearance)}
              </td>
              <td className="py-1.5 pl-3 text-right">
                {r.visible ? <TierCell tier={r.tier} /> : <span className="px-1.5 text-xs text-g4">Hidden</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1.5 text-xs text-g4">Distances in mm. Hidden structures are measured but not assessed.</p>
    </Section>
  )
}
