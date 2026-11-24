/** Pre-operative note export. Pure: plan + assessment in, plain text out. */
import { approachById, structureLabel } from './anatomy'
import type { Vec3 } from './geometry'
import { TIER_LABEL, type Assessment, type Plan } from './risk'
import { asciiFixed } from './format'
import { caseNoteLines, type CaseInfo } from './case'

export const DISCLAIMER =
  'Educational simulation only. Not a medical device and not for clinical decision-making, diagnosis or treatment planning.'

const pad = (n: number) => String(n).padStart(2, '0')

/** Local date-time as YYYY-MM-DD HH:MM with the UTC offset. */
export function formatTimestamp(d: Date): string {
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const oh = pad(Math.floor(Math.abs(off) / 60))
  const om = pad(Math.abs(off) % 60)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())} (UTC${sign}${oh}:${om})`
}

const ras = (p: Vec3) => `x ${asciiFixed(p[0])}, y ${asciiFixed(p[1])}, z ${asciiFixed(p[2])} mm`
const rasWords = (p: Vec3) =>
  `${p[0] < 0 ? 'L' : 'R'} ${asciiFixed(Math.abs(p[0]))} / ${p[1] < 0 ? 'P' : 'A'} ${asciiFixed(Math.abs(p[1]))} / ${p[2] < 0 ? 'I' : 'S'} ${asciiFixed(Math.abs(p[2]))}`

export function buildNote(plan: Plan, a: Assessment, now: Date, info?: CaseInfo): string {
  const approach = approachById(plan.approach)
  const side = approach.lateralised ? (plan.side === 'left' ? 'Left' : 'Right') : 'Midline (not lateralised)'
  const nameWidth = Math.max(...a.rows.map((r) => structureLabel(r.structure).length))
  const rule = '-'.repeat(64)

  const lines: string[] = [
    'NEUROPATH 3D - PRE-OPERATIVE TRAJECTORY NOTE (SIMULATION)',
    rule,
    `Generated:        ${formatTimestamp(now)}`,
    'Frame:            RAS, millimetres, origin at brain centre',
    '',
    ...(info ? [...caseNoteLines(info), ''] : []),
    'TARGET LESION',
    `  Centre:         ${ras(a.target)}  (${rasWords(a.target)})`,
    `  Volume:         ${asciiFixed(plan.volumeCm3)} cm3`,
    `  Radius:         ${asciiFixed(a.lesionRadius)} mm  (r = cbrt(3V / 4pi))`,
    '',
    'APPROACH',
    `  Approach:       ${approach.name} - ${approach.detail.replace(/·/g, '-')}`,
    `  Side:           ${side}`,
    `  Entry point:    ${ras(a.entry)}  (${rasWords(a.entry)})`,
    `  Length:         ${asciiFixed(a.lengthMm)} mm (entry to lesion centre)`,
    `  Angle, axial:   ${asciiFixed(a.angles.axial)} deg`,
    `  Angle, sagittal:${' '}${asciiFixed(a.angles.sagittal)} deg`,
    '',
    'SAFETY',
    `  Margin:         ${asciiFixed(plan.marginMm)} mm`,
    `  Status:         ${a.highRisk ? 'HIGH RISK - eloquent tract intersection' : 'Clear of all assessed structures'}`,
    '',
    'STRUCTURE CLEARANCES (trajectory to surface, closest first)',
    ...a.rows.map((r) => {
      const name = structureLabel(r.structure).padEnd(nameWidth)
      const dist = `${asciiFixed(r.clearance)} mm`.padStart(10)
      const tier = r.visible ? TIER_LABEL[r.tier] : 'Not assessed (hidden)'
      return `  ${name}  ${dist}  ${tier}`
    }),
    '',
    'ANTICIPATED DEFICITS',
    ...(a.affected.length
      ? a.affected.map((r) => `  - ${structureLabel(r.structure)} (${TIER_LABEL[r.tier]}, ${asciiFixed(r.clearance)} mm): ${r.deficit}`)
      : ['  None anticipated at the current safety margin.']),
  ]

  if (a.lesionOverlaps.length) {
    lines.push(
      '',
      'LESION OVERLAP',
      ...a.lesionOverlaps.map(
        (r) => `  - ${structureLabel(r.structure)}: overlap ${asciiFixed(-r.lesionClearance)} mm. ${r.deficit}`,
      ),
    )
  }

  lines.push('', rule, DISCLAIMER, '')
  return lines.join('\n')
}

/**
 * Copy text to the clipboard. Tries the async Clipboard API, then a hidden
 * textarea with execCommand. Resolves false if neither is available.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
