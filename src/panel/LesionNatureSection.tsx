import { useId } from 'react'
import {
  ENHANCEMENT_LABEL,
  LESION_TYPES,
  OEDEMA_LABEL,
  gradeLabel,
  lesionTypeById,
  type Certainty,
  type Enhancement,
  type LesionInfo,
  type LesionTypeId,
  type Multiplicity,
  type Oedema,
  type WhoGrade,
} from '../lib/case'
import { Field, Section, Segmented, Select } from './primitives'

const GRADES: WhoGrade[] = ['1', '2', '3', '4', 'na']

export function LesionNatureSection({ lesion, onChange }: { lesion: LesionInfo; onChange: (patch: Partial<LesionInfo>) => void }) {
  const id = useId()
  const type = lesionTypeById(lesion.type)

  return (
    <Section title="Lesion nature">
      <Field label="Lesion type" htmlFor={`${id}-type`} hint={type.compartment}>
        <Select<LesionTypeId>
          id={`${id}-type`}
          value={lesion.type}
          options={LESION_TYPES.map((t) => ({ value: t.id, label: t.name }))}
          onChange={(v) => onChange({ type: v, grade: lesionTypeById(v).defaultGrade })}
        />
      </Field>

      <p className="mb-1.5 border-l border-g3 pl-2.5 text-xs leading-[17px] text-g5">{type.summary}</p>

      <div className="py-1.5">
        <div className="mb-1 text-sm text-g6">Diagnosis</div>
        <Segmented<Certainty>
          label="Diagnosis"
          value={lesion.certainty}
          onChange={(certainty) => onChange({ certainty })}
          options={[
            { value: 'suspected', label: 'Suspected' },
            { value: 'confirmed', label: 'Histology confirmed' },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-3">
        <Field label="WHO grade" htmlFor={`${id}-grade`}>
          <Select<WhoGrade>
            id={`${id}-grade`}
            value={type.gradable ? lesion.grade : 'na'}
            options={(type.gradable ? GRADES : (['na'] as WhoGrade[])).map((g) => ({
              value: g,
              label: g === 'na' ? 'Not applicable' : `Grade ${g}`,
            }))}
            onChange={(grade) => onChange({ grade })}
          />
        </Field>
        <Field label="Lesions" htmlFor={`${id}-multi`}>
          <Select<Multiplicity>
            id={`${id}-multi`}
            value={lesion.multiplicity}
            options={[
              { value: 'solitary', label: 'Solitary' },
              { value: 'multiple', label: 'Multiple' },
            ]}
            onChange={(multiplicity) => onChange({ multiplicity })}
          />
        </Field>
        <Field label="Enhancement" htmlFor={`${id}-enh`}>
          <Select<Enhancement>
            id={`${id}-enh`}
            value={lesion.enhancement}
            options={(Object.keys(ENHANCEMENT_LABEL) as Enhancement[]).map((k) => ({ value: k, label: ENHANCEMENT_LABEL[k] }))}
            onChange={(enhancement) => onChange({ enhancement })}
          />
        </Field>
        <Field label="Oedema" htmlFor={`${id}-oed`}>
          <Select<Oedema>
            id={`${id}-oed`}
            value={lesion.oedema}
            options={(Object.keys(OEDEMA_LABEL) as Oedema[]).map((k) => ({ value: k, label: OEDEMA_LABEL[k] }))}
            onChange={(oedema) => onChange({ oedema })}
          />
        </Field>
      </div>
      <p className="mt-1 text-xs text-g4">
        {type.name}, {gradeLabel(type.gradable ? lesion.grade : 'na').toLowerCase()}.
      </p>
    </Section>
  )
}
