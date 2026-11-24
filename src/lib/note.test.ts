import { describe, expect, it } from 'vitest'
import { buildNote, DISCLAIMER, formatTimestamp } from './note'
import { DEFAULT_PLAN, assessPlan, type Plan } from './risk'

const when = new Date(2026, 10, 22, 9, 5)

describe('buildNote', () => {
  it('includes every required field for a clear plan', () => {
    const note = buildNote(DEFAULT_PLAN, assessPlan(DEFAULT_PLAN), when)
    expect(note).toContain('2026-11-22 09:05')
    expect(note).toContain('Centre:         x -28.0, y 18.0, z 8.0 mm')
    expect(note).toContain('Volume:         4.0 cm3')
    expect(note).toContain('Frontal burr hole')
    expect(note).toContain('Side:           Left')
    expect(note).toMatch(/Entry point: {4}x -\d+\.\d, y \d+\.\d, z \d+\.\d mm/)
    expect(note).toMatch(/Length: {9}\d+\.\d mm/)
    expect(note).toContain('Angle, axial:')
    expect(note).toContain('Angle, sagittal:')
    expect(note).toContain('Margin:         5.0 mm')
    expect(note).toContain('Primary motor cortex, L')
    expect(note).toContain('None anticipated')
    expect(note).toContain(DISCLAIMER)
  })

  it('lists deficits and overlap when the path is unsafe', () => {
    const plan: Plan = { ...DEFAULT_PLAN, target: [-32.5, -6, 34], volumeCm3: 0.5 }
    const note = buildNote(plan, assessPlan(plan), when)
    expect(note).toContain('HIGH RISK')
    expect(note).toContain('Primary motor cortex, L (Intersection, -10.0 mm): Contralateral (right) hemiparesis')
    expect(note).toContain('LESION OVERLAP')
  })

  it('marks hidden structures as not assessed and midline approaches as not lateralised', () => {
    const plan: Plan = { ...DEFAULT_PLAN, approach: 'transnasal', visible: { ...DEFAULT_PLAN.visible, broca: false } }
    const note = buildNote(plan, assessPlan(plan), when)
    expect(note).toContain('Midline (not lateralised)')
    expect(note).toMatch(/Broca's area, L .* Not assessed \(hidden\)/)
  })

  it('is plain ASCII so it pastes anywhere', () => {
    const note = buildNote(DEFAULT_PLAN, assessPlan(DEFAULT_PLAN), when)
    expect(/^[\x09\x0a\x20-\x7e]*$/.test(note)).toBe(true)
  })
})

describe('formatTimestamp', () => {
  it('pads fields and includes the UTC offset', () => {
    expect(formatTimestamp(when)).toMatch(/^2026-11-22 09:05 \(UTC[+-]\d{2}:\d{2}\)$/)
  })
})

describe('case details in the note', () => {
  it('adds patient and lesion pathology sections', async () => {
    const { DEFAULT_CASE } = await import('./case')
    const info = {
      lesion: { ...DEFAULT_CASE.lesion, type: 'gbm' as const, grade: '4' as const, certainty: 'confirmed' as const, enhancement: 'ring' as const, notes: 'Crosses\nsplenium' },
      patient: { ...DEFAULT_CASE.patient, reference: 'Case 12', age: 58, sex: 'female' as const, handedness: 'left' as const, kps: 80 },
    }
    const note = buildNote(DEFAULT_PLAN, assessPlan(DEFAULT_PLAN), when, info)
    expect(note).toContain('PATIENT')
    expect(note).toContain('Reference:      Case 12')
    expect(note).toContain('Age:            58 years')
    expect(note).toContain('Sex:            Female')
    expect(note).toContain('KPS:            80')
    expect(note).toContain('About 70% of left-handed')
    expect(note).toContain('Type:           Glioblastoma (histologically confirmed)')
    expect(note).toContain('Grade:          CNS WHO grade 4')
    expect(note).toContain('Enhancement:    Ring')
    expect(note).toContain('Notes:          Crosses / splenium')
    expect(note.indexOf('PATIENT')).toBeLessThan(note.indexOf('TARGET LESION'))
  })

  it('records missing fields as not recorded and omits the dominance note for right-handers', async () => {
    const { DEFAULT_CASE } = await import('./case')
    const note = buildNote(DEFAULT_PLAN, assessPlan(DEFAULT_PLAN), when, DEFAULT_CASE)
    expect(note).toContain('Age:            Not recorded')
    expect(note).not.toContain('left-dominant')
  })
})
