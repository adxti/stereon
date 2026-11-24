import { STRUCTURES } from '../lib/anatomy'
import type { Plan } from '../lib/risk'
import { Check, Section, TextButton } from './primitives'

export function StructuresSection({ plan, onChange }: { plan: Plan; onChange: (patch: Partial<Plan>) => void }) {
  const all = (on: boolean) => onChange({ visible: Object.fromEntries(STRUCTURES.map((s) => [s.id, on])) })
  const shown = STRUCTURES.filter((s) => plan.visible[s.id] !== false).length

  return (
    <Section
      title="Eloquent structures"
      aside={
        <div className="flex items-center gap-3">
          <TextButton onClick={() => all(true)} disabled={shown === STRUCTURES.length}>
            Show all
          </TextButton>
          <TextButton onClick={() => all(false)} disabled={shown === 0}>
            Hide all
          </TextButton>
        </div>
      }
    >
      <ul className="border border-g3">
        {STRUCTURES.map((s, i) => {
          const on = plan.visible[s.id] !== false
          return (
            <li key={s.id} className={i > 0 ? 'border-t border-g2' : ''}>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => onChange({ visible: { ...plan.visible, [s.id]: !on } })}
                className="flex w-full items-center gap-2.5 px-3 py-3 text-left md:py-1.5 transition-colors duration-100 hover:bg-g1"
              >
                <Check checked={on} />
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 border border-g3"
                  style={{ backgroundColor: on ? s.tone : 'transparent' }}
                />
                <span className={['flex-1 text-sm', on ? 'text-g6' : 'text-g4'].join(' ')}>{s.name}</span>
                <span className="num w-3 text-right text-xs text-g5">{s.side === 'left' ? 'L' : 'R'}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-1.5 text-xs text-g4">
        <span className="num">{shown}</span> of <span className="num">{STRUCTURES.length}</span> shown. Language areas are
        modelled in the dominant left hemisphere.
      </p>
    </Section>
  )
}
