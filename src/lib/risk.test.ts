import { describe, expect, it } from 'vitest'
import { STRUCTURES, BRAIN_AXES, SKULL_AXES, deficitFor, entryPoint, APPROACHES } from './anatomy'
import { ellipsoidRadius, type Vec3 } from './geometry'
import { DEFAULT_PLAN, assessPlan, clampTarget, lesionBounds, type Plan } from './risk'

const byId = (id: string) => STRUCTURES.find((s) => s.id === id)!

describe('anatomy', () => {
  it('places every structure inside the brain volume', () => {
    for (const s of STRUCTURES) {
      const pts: Vec3[] = s.shape === 'sphere' ? [s.center] : [s.a, s.b]
      for (const p of pts) expect(ellipsoidRadius(p, BRAIN_AXES)).toBeLessThan(1)
    }
  })
  it('keeps language areas in the dominant (left) hemisphere', () => {
    expect(byId('broca').side).toBe('left')
    expect(byId('wernicke').side).toBe('left')
    for (const s of STRUCTURES) {
      const x = s.shape === 'sphere' ? s.center[0] : s.a[0]
      expect(Math.sign(x)).toBe(s.side === 'left' ? -1 : 1)
    }
  })
  it('puts entry points on the skull shell, on the requested side', () => {
    for (const a of APPROACHES) {
      const l = entryPoint(a.id, 'left')
      const r = entryPoint(a.id, 'right')
      expect(ellipsoidRadius(l, SKULL_AXES)).toBeCloseTo(1)
      if (a.lateralised) {
        expect(l[0]).toBeLessThan(0)
        expect(r[0]).toBeGreaterThan(0)
      } else {
        expect(l).toEqual(r)
        expect(l[0]).toBe(0)
      }
    }
  })
})

describe('deficit lateralisation', () => {
  it('maps crossed pathways to the contralateral side', () => {
    expect(deficitFor(byId('motor-l'))).toBe('Contralateral (right) hemiparesis')
    expect(deficitFor(byId('motor-r'))).toBe('Contralateral (left) hemiparesis')
    expect(deficitFor(byId('visual-l'))).toBe('Contralateral (right) homonymous hemianopia')
    expect(deficitFor(byId('visual-r'))).toBe('Contralateral (left) homonymous hemianopia')
    expect(deficitFor(byId('capsule-r'))).toBe('Contralateral (left) hemiparesis / hemisensory loss')
  })
  it('maps language areas to the aphasia type', () => {
    expect(deficitFor(byId('broca'))).toBe('Expressive (non-fluent) aphasia')
    expect(deficitFor(byId('wernicke'))).toBe('Receptive (fluent) aphasia')
  })
})

describe('assessPlan', () => {
  it('the default plan is clear and sorted closest first', () => {
    const a = assessPlan(DEFAULT_PLAN)
    expect(a.highRisk).toBe(false)
    expect(a.affected).toEqual([])
    for (let i = 1; i < a.rows.length; i++) {
      expect(a.rows[i].clearance).toBeGreaterThanOrEqual(a.rows[i - 1].clearance)
    }
  })

  it('flags an intersection when the target sits inside a structure', () => {
    const plan: Plan = { ...DEFAULT_PLAN, target: [-32.5, -6, 34], volumeCm3: 0.5 }
    const a = assessPlan(plan)
    const motor = a.rows.find((r) => r.structure.id === 'motor-l')!
    expect(motor.tier).toBe('intersection')
    expect(motor.lesionOverlap).toBe(true)
    expect(a.highRisk).toBe(true)
    expect(a.affected[0].structure.id).toBe('motor-l')
    expect(a.zoneIntervals.length).toBeGreaterThan(0)
  })

  it('ignores hidden structures for alerts but still measures them', () => {
    const plan: Plan = {
      ...DEFAULT_PLAN,
      target: [-32.5, -6, 34],
      volumeCm3: 0.5,
      visible: { ...DEFAULT_PLAN.visible, 'motor-l': false },
    }
    const a = assessPlan(plan)
    expect(a.affected.some((r) => r.structure.id === 'motor-l')).toBe(false)
    expect(a.rows.find((r) => r.structure.id === 'motor-l')!.tier).toBe('intersection')
  })

  it('a wider margin can only add caution rows', () => {
    const narrow = assessPlan({ ...DEFAULT_PLAN, marginMm: 1 })
    const wide = assessPlan({ ...DEFAULT_PLAN, marginMm: 20 })
    expect(wide.affected.length).toBeGreaterThanOrEqual(narrow.affected.length)
  })

  it('reports trajectory length from entry to target', () => {
    const a = assessPlan(DEFAULT_PLAN)
    const d = a.entry.map((v, i) => v - a.target[i])
    expect(a.lengthMm).toBeCloseTo(Math.hypot(...d))
  })
})

describe('clampTarget', () => {
  it('keeps the whole lesion inside the brain', () => {
    const p = clampTarget([200, 0, 0], 30)
    expect(ellipsoidRadius(p, lesionBounds(19.276))).toBeCloseTo(1, 2)
    expect(p[0]).toBeLessThan(BRAIN_AXES[0] - 19)
  })
})
