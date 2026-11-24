import { useState } from 'react'
import { ChevronUp } from 'lucide-react'
import type { Assessment, Plan } from '../lib/risk'
import type { CaseInfo, LesionInfo, PatientInfo } from '../lib/case'
import { PatientSection } from './PatientSection'
import { LesionNatureSection } from './LesionNatureSection'
import { TargetSection } from './TargetSection'
import { ApproachSection } from './ApproachSection'
import { RiskSection } from './RiskSection'
import { StructuresSection } from './StructuresSection'
import { ExportSection } from './ExportSection'

/** Height of the collapsed sheet's handle bar on phones. Keep in sync with App's bottom padding. */
export const SHEET_PEEK_PX = 52

/**
 * Planning panel. On md and up it is a fixed right-hand column. On phones it
 * is a bottom sheet: collapsed to a handle bar showing the risk status so the
 * 3D model keeps the screen, and sliding up over the model when opened.
 */
export function Panel({
  plan,
  assessment,
  caseInfo,
  onChange,
  onPatient,
  onLesion,
}: {
  plan: Plan
  assessment: Assessment
  caseInfo: CaseInfo
  onChange: (patch: Partial<Plan>) => void
  onPatient: (patch: Partial<PatientInfo>) => void
  onLesion: (patch: Partial<LesionInfo>) => void
}) {
  const [open, setOpen] = useState(false)
  const risk = assessment.highRisk

  return (
    <aside
      aria-label="Planning"
      className={[
        'flex flex-col bg-black',
        // Phone: bottom sheet over the viewport.
        'fixed inset-x-0 bottom-0 z-30 h-[78dvh] border-t border-g3 transition-transform duration-200 ease-out',
        open ? 'translate-y-0' : 'translate-y-[calc(100%-52px)]',
        // Desktop: static column.
        'md:static md:z-auto md:h-full md:translate-y-0 md:border-t-0 md:border-l md:border-g2 md:transition-none',
      ].join(' ')}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="planning-content"
        onClick={() => setOpen((o) => !o)}
        className="flex h-[52px] shrink-0 items-center gap-3 border-b border-g2 px-4 text-left md:hidden"
      >
        <span className="flex-1">
          <span className="eyebrow block">Planning</span>
          <span className="text-xs text-g6">{open ? 'Tap to show the model' : 'Patient, lesion, trajectory, risk, export'}</span>
        </span>
        <span
          className={[
            'border px-2 py-0.5 text-xs',
            risk ? 'border-white bg-white font-medium text-black shadow-glow-sm' : 'border-g3 text-g6',
          ].join(' ')}
        >
          {risk ? `High risk · ${assessment.affected.length}` : 'Clear'}
        </span>
        <ChevronUp
          size={16}
          strokeWidth={1.25}
          className={['text-g5 transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')}
        />
      </button>

      <div
        id="planning-content"
        className="scroll-quiet min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]"
      >
        <PatientSection info={caseInfo} onPatient={onPatient} onLesion={onLesion} />
        <LesionNatureSection lesion={caseInfo.lesion} onChange={onLesion} />
        <TargetSection plan={plan} assessment={assessment} onChange={onChange} />
        <ApproachSection plan={plan} assessment={assessment} onChange={onChange} />
        <RiskSection plan={plan} assessment={assessment} onChange={onChange} />
        <StructuresSection plan={plan} onChange={onChange} />
        <ExportSection plan={plan} assessment={assessment} caseInfo={caseInfo} />
      </div>
    </aside>
  )
}
