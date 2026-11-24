import { useCallback, useMemo, useState } from 'react'
import { TopBar } from './TopBar'
import { Viewport } from './scene/Viewport'
import { Panel } from './panel/Panel'
import { DEFAULT_PLAN, assessPlan, type Plan } from './lib/risk'
import { DEFAULT_CASE, type CaseInfo, type LesionInfo, type PatientInfo } from './lib/case'
import { useButtonMotion } from './motion'

export default function App() {
  const [plan, setPlan] = useState<Plan>(DEFAULT_PLAN)
  const [caseInfo, setCaseInfo] = useState<CaseInfo>(DEFAULT_CASE)
  const assessment = useMemo(() => assessPlan(plan), [plan])
  useButtonMotion()
  const update = useCallback((patch: Partial<Plan>) => setPlan((p) => ({ ...p, ...patch })), [])
  const updatePatient = useCallback(
    (patch: Partial<PatientInfo>) => setCaseInfo((c) => ({ ...c, patient: { ...c.patient, ...patch } })),
    [],
  )
  const updateLesion = useCallback(
    (patch: Partial<LesionInfo>) => setCaseInfo((c) => ({ ...c, lesion: { ...c.lesion, ...patch } })),
    [],
  )

  return (
    // Phones: the 3D view fills the screen; the planning panel is a bottom sheet
    // whose 52px handle bar is reserved below the viewport.
    // md and up: workstation layout with a fixed 360px panel on the right.
    <div className="grid h-dvh grid-cols-1 grid-rows-[44px_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_360px] md:grid-rows-[40px_minmax(0,1fr)]">
      <div className="md:col-span-2">
        <TopBar />
      </div>
      <main className="min-h-0 min-w-0 pb-[52px] md:pb-0">
        <Viewport assessment={assessment} />
      </main>
      <Panel
        plan={plan}
        assessment={assessment}
        caseInfo={caseInfo}
        onChange={update}
        onPatient={updatePatient}
        onLesion={updateLesion}
      />
    </div>
  )
}
