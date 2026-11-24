import { useId } from 'react'
import { dominanceNote, type CaseInfo, type Handedness, type LesionInfo, type PatientInfo, type Sex } from '../lib/case'
import { Field, NumberField, Section, Segmented, Select, TextArea, TextInput } from './primitives'

const KPS = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0]

export function PatientSection({
  info,
  onPatient,
  onLesion,
}: {
  info: CaseInfo
  onPatient: (patch: Partial<PatientInfo>) => void
  onLesion: (patch: Partial<LesionInfo>) => void
}) {
  const id = useId()
  const p = info.patient
  const dom = dominanceNote(p.handedness)

  return (
    <Section title="Patient and lesion details">
      <p className="mb-2 text-xs text-g4">Stays in this browser. Use a study or teaching reference, not real identifiers.</p>

      <Field label="Case reference" htmlFor={`${id}-ref`}>
        <TextInput id={`${id}-ref`} value={p.reference} placeholder="e.g. Teaching case 04" onChange={(reference) => onPatient({ reference })} />
      </Field>

      <div className="grid grid-cols-2 gap-x-3">
        <Field label="Age" htmlFor={`${id}-age`}>
          <div className="flex items-center gap-2">
            {p.age == null ? (
              <button
                id={`${id}-age`}
                type="button"
                onClick={() => onPatient({ age: 50 })}
                className="h-6 w-full border border-dashed border-g3 text-xs text-g5 transition-colors duration-100 hover:border-white hover:text-white"
              >
                Add age
              </button>
            ) : (
              <NumberField id={`${id}-age`} label="Age" value={p.age} min={0} max={110} digits={0} unit="y" onChange={(v) => onPatient({ age: Math.round(v) })} />
            )}
          </div>
        </Field>
        <Field label="Sex" htmlFor={`${id}-sex`}>
          <Select<Sex>
            id={`${id}-sex`}
            value={p.sex}
            options={[
              { value: '', label: 'Not recorded' },
              { value: 'female', label: 'Female' },
              { value: 'male', label: 'Male' },
              { value: 'other', label: 'Other' },
            ]}
            onChange={(sex) => onPatient({ sex })}
          />
        </Field>
      </div>

      <div className="py-1.5">
        <div className="mb-1 text-sm text-g6">Handedness</div>
        <Segmented<Handedness>
          label="Handedness"
          value={p.handedness}
          onChange={(handedness) => onPatient({ handedness })}
          options={[
            { value: 'right', label: 'Right' },
            { value: 'left', label: 'Left' },
            { value: 'ambidextrous', label: 'Ambidextrous' },
          ]}
        />
        {dom && <p className="mt-1.5 border-l border-white pl-2.5 text-xs leading-[17px] text-g6">{dom}</p>}
      </div>

      <div className="grid grid-cols-2 gap-x-3">
        <Field label="KPS" htmlFor={`${id}-kps`} hint="Karnofsky">
          <Select<string>
            id={`${id}-kps`}
            value={p.kps == null ? '' : String(p.kps)}
            options={[{ value: '', label: 'Not recorded' }, ...KPS.map((k) => ({ value: String(k), label: String(k) }))]}
            onChange={(v) => onPatient({ kps: v === '' ? null : Number(v) })}
          />
        </Field>
        <Field label="Imaging date" htmlFor={`${id}-date`}>
          <TextInput id={`${id}-date`} type="date" mono value={info.lesion.imagingDate} onChange={(imagingDate) => onLesion({ imagingDate })} />
        </Field>
      </div>

      <Field label="Presenting symptoms" htmlFor={`${id}-pres`}>
        <TextArea id={`${id}-pres`} rows={2} value={p.presentation} placeholder="e.g. Focal seizures, right hand weakness" onChange={(presentation) => onPatient({ presentation })} />
      </Field>
      <Field label="Relevant history" htmlFor={`${id}-hist`}>
        <TextArea id={`${id}-hist`} rows={2} value={p.history} placeholder="Comorbidities, medication, prior treatment" onChange={(history) => onPatient({ history })} />
      </Field>
      <Field label="Lesion notes" htmlFor={`${id}-notes`}>
        <TextArea id={`${id}-notes`} rows={3} value={info.lesion.notes} placeholder="Imaging findings, differential, MDT discussion" onChange={(notes) => onLesion({ notes })} />
      </Field>
    </Section>
  )
}
