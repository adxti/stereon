/**
 * Case information: lesion pathology and patient details. Pure data and text
 * helpers, no React. Everything stays in the browser; nothing is sent anywhere.
 */

export type LesionTypeId =
  | 'lgg'
  | 'gbm'
  | 'meningioma'
  | 'metastasis'
  | 'pituitary'
  | 'abscess'
  | 'cavernoma'
  | 'lymphoma'
  | 'other'

export type WhoGrade = '1' | '2' | '3' | '4' | 'na'

export interface LesionType {
  id: LesionTypeId
  name: string
  /** Intra-axial (within brain parenchyma) or extra-axial. */
  compartment: 'Intra-axial' | 'Extra-axial' | 'Sellar / suprasellar' | 'Variable'
  /** Default WHO CNS grade, or 'na' where grading does not apply. */
  defaultGrade: WhoGrade
  gradable: boolean
  /** Short teaching summary of typical imaging and surgical considerations. */
  summary: string
}

export const LESION_TYPES: readonly LesionType[] = [
  {
    id: 'lgg',
    name: 'Low-grade glioma',
    compartment: 'Intra-axial',
    defaultGrade: '2',
    gradable: true,
    summary:
      'Infiltrative, usually non-enhancing, T2/FLAIR hyperintense. Tumour extends beyond visible margins; eloquent proximity often favours awake mapping.',
  },
  {
    id: 'gbm',
    name: 'Glioblastoma',
    compartment: 'Intra-axial',
    defaultGrade: '4',
    gradable: true,
    summary:
      'Ring-enhancing with central necrosis and marked vasogenic oedema; may cross the corpus callosum. Extent of resection balanced against new deficit.',
  },
  {
    id: 'meningioma',
    name: 'Meningioma',
    compartment: 'Extra-axial',
    defaultGrade: '1',
    gradable: true,
    summary:
      'Dural-based, homogeneously enhancing, often with a dural tail. Displaces rather than infiltrates cortex; check venous sinus involvement.',
  },
  {
    id: 'metastasis',
    name: 'Metastasis',
    compartment: 'Intra-axial',
    defaultGrade: 'na',
    gradable: false,
    summary:
      'Typically at the grey-white junction, solid or ring enhancement, oedema out of proportion to size. Frequently multiple; well-demarcated plane.',
  },
  {
    id: 'pituitary',
    name: 'Pituitary adenoma',
    compartment: 'Sellar / suprasellar',
    defaultGrade: 'na',
    gradable: false,
    summary:
      'Sellar mass; macroadenoma when 10 mm or larger. Endoscopic transnasal transsphenoidal route is standard; watch the optic chiasm and carotids.',
  },
  {
    id: 'abscess',
    name: 'Cerebral abscess',
    compartment: 'Intra-axial',
    defaultGrade: 'na',
    gradable: false,
    summary:
      'Smooth, thin ring enhancement with central restricted diffusion. Stereotactic aspiration along the shortest safe trajectory is common.',
  },
  {
    id: 'cavernoma',
    name: 'Cavernous malformation',
    compartment: 'Intra-axial',
    defaultGrade: 'na',
    gradable: false,
    summary:
      'Low-flow vascular lesion, "popcorn" appearance with a haemosiderin rim. Approach through the nearest pial or ependymal surface.',
  },
  {
    id: 'lymphoma',
    name: 'Primary CNS lymphoma',
    compartment: 'Intra-axial',
    defaultGrade: 'na',
    gradable: false,
    summary:
      'Periventricular, homogeneously enhancing, restricted diffusion. Diagnosis is usually by stereotactic biopsy rather than resection.',
  },
  {
    id: 'other',
    name: 'Other / undetermined',
    compartment: 'Variable',
    defaultGrade: 'na',
    gradable: true,
    summary: 'Nature not yet established. Record imaging features and differential below.',
  },
]

export const lesionTypeById = (id: LesionTypeId): LesionType => LESION_TYPES.find((t) => t.id === id) ?? LESION_TYPES[LESION_TYPES.length - 1]

export type Certainty = 'suspected' | 'confirmed'
export type Enhancement = 'none' | 'homogeneous' | 'heterogeneous' | 'ring'
export type Oedema = 'none' | 'mild' | 'moderate' | 'marked'
export type Multiplicity = 'solitary' | 'multiple'
export type Sex = '' | 'female' | 'male' | 'other'
export type Handedness = 'right' | 'left' | 'ambidextrous'

export interface LesionInfo {
  type: LesionTypeId
  certainty: Certainty
  grade: WhoGrade
  enhancement: Enhancement
  oedema: Oedema
  multiplicity: Multiplicity
  imagingDate: string
  notes: string
}

export interface PatientInfo {
  reference: string
  age: number | null
  sex: Sex
  handedness: Handedness
  /** Karnofsky performance status, 0–100 in steps of 10. */
  kps: number | null
  presentation: string
  history: string
}

export interface CaseInfo {
  lesion: LesionInfo
  patient: PatientInfo
}

export const DEFAULT_CASE: CaseInfo = {
  lesion: {
    type: 'lgg',
    certainty: 'suspected',
    grade: '2',
    enhancement: 'none',
    oedema: 'mild',
    multiplicity: 'solitary',
    imagingDate: '',
    notes: '',
  },
  patient: {
    reference: '',
    age: null,
    sex: '',
    handedness: 'right',
    kps: null,
    presentation: '',
    history: '',
  },
}

export const ENHANCEMENT_LABEL: Record<Enhancement, string> = {
  none: 'None',
  homogeneous: 'Homogeneous',
  heterogeneous: 'Heterogeneous',
  ring: 'Ring',
}
export const OEDEMA_LABEL: Record<Oedema, string> = { none: 'None', mild: 'Mild', moderate: 'Moderate', marked: 'Marked' }
export const SEX_LABEL: Record<Sex, string> = { '': 'Not recorded', female: 'Female', male: 'Male', other: 'Other' }
export const HANDEDNESS_LABEL: Record<Handedness, string> = { right: 'Right', left: 'Left', ambidextrous: 'Ambidextrous' }

export const gradeLabel = (g: WhoGrade): string => (g === 'na' ? 'Not applicable' : `CNS WHO grade ${g}`)

/**
 * Teaching note on language lateralisation. The model places language areas
 * on the left; that holds for about 95% of right-handers but only about 70%
 * of left-handers.
 */
export function dominanceNote(h: Handedness): string | null {
  if (h === 'right') return null
  return 'Language areas are modelled on the left. About 70% of left-handed and ambidextrous patients are left-dominant (vs about 95% of right-handers); confirm with fMRI or Wada testing.'
}

/** Lines for the pre-op note. Free text is passed through as entered. */
export function caseNoteLines(c: CaseInfo): string[] {
  const t = lesionTypeById(c.lesion.type)
  const p = c.patient
  const or = (v: string, fallback = 'Not recorded') => (v.trim() ? v.trim() : fallback)
  const lines = [
    'PATIENT',
    `  Reference:      ${or(p.reference)}`,
    `  Age:            ${p.age == null ? 'Not recorded' : `${p.age} years`}`,
    `  Sex:            ${SEX_LABEL[p.sex]}`,
    `  Handedness:     ${HANDEDNESS_LABEL[p.handedness]}`,
    `  KPS:            ${p.kps == null ? 'Not recorded' : p.kps}`,
    `  Presentation:   ${or(p.presentation)}`,
    `  History:        ${or(p.history)}`,
  ]
  const dom = dominanceNote(p.handedness)
  if (dom) lines.push(`  Note:           ${dom}`)
  lines.push(
    '',
    'LESION PATHOLOGY',
    `  Type:           ${t.name} (${c.lesion.certainty === 'confirmed' ? 'histologically confirmed' : 'suspected'})`,
    `  Compartment:    ${t.compartment}`,
    `  Grade:          ${gradeLabel(c.lesion.grade)}`,
    `  Enhancement:    ${ENHANCEMENT_LABEL[c.lesion.enhancement]}`,
    `  Oedema:         ${OEDEMA_LABEL[c.lesion.oedema]}`,
    `  Lesions:        ${c.lesion.multiplicity === 'solitary' ? 'Solitary' : 'Multiple'}`,
    `  Imaging date:   ${or(c.lesion.imagingDate)}`,
    `  Notes:          ${or(c.lesion.notes)}`,
  )
  return lines.map((l) => l.replace(/\r?\n/g, ' / '))
}
