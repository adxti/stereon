import { useEffect, useRef, useState } from 'react'
import { Check as CheckIcon, Copy } from 'lucide-react'
import { buildNote, copyText } from '../lib/note'
import type { Assessment, Plan } from '../lib/risk'
import type { CaseInfo } from '../lib/case'
import { Section, TextButton } from './primitives'
import { pop } from '../motion'

type CopyState = 'idle' | 'copied' | 'failed'

export function ExportSection({ plan, assessment, caseInfo }: { plan: Plan; assessment: Assessment; caseInfo: CaseInfo }) {
  const [state, setState] = useState<CopyState>('idle')
  const [fallback, setFallback] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const area = useRef<HTMLTextAreaElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => {
    if (fallback) area.current?.select()
  }, [fallback])

  const onCopy = async () => {
    const note = buildNote(plan, assessment, new Date(), caseInfo)
    const ok = await copyText(note)
    window.clearTimeout(timer.current)
    if (ok) {
      setFallback(null)
      setState('copied')
      pop(button.current)
      timer.current = window.setTimeout(() => setState('idle'), 2000)
    } else {
      setFallback(note)
      setState('failed')
    }
  }

  return (
    <Section
      title="Export"
      aside={<TextButton onClick={() => setPreview((p) => !p)}>{preview ? 'Hide preview' : 'Preview note'}</TextButton>}
    >
      <button
        type="button"
        ref={button}
        onClick={onCopy}
        aria-live="polite"
        className={[
          'flex h-9 w-full items-center justify-center gap-2 border text-sm font-medium transition-colors duration-100',
          state === 'copied'
            ? 'border-white bg-black text-white'
            : 'border-white bg-white text-black hover:bg-g6 hover:border-g6',
        ].join(' ')}
      >
        {state === 'copied' ? <CheckIcon size={14} strokeWidth={1.25} /> : <Copy size={14} strokeWidth={1.25} />}
        {state === 'copied' ? 'Copied' : 'Copy pre-op note'}
      </button>
      <p className="mt-1.5 text-xs text-g4">Plain text with coordinates, trajectory, clearances, deficits and disclaimer.</p>

      {fallback && (
        <div className="mt-3 border border-white">
          <p role="alert" className="border-b border-white px-3 py-1.5 text-xs text-white">
            Clipboard unavailable. The note is selected below, press Ctrl+C or Cmd+C to copy it.
          </p>
          <textarea
            ref={area}
            readOnly
            value={fallback}
            aria-label="Pre-op note"
            className="num block h-48 w-full resize-y bg-black p-2 text-2xs text-g6 outline-none"
          />
        </div>
      )}

      {preview && !fallback && (
        <pre className="scroll-quiet num mt-3 max-h-72 overflow-auto border border-g3 p-2 text-2xs whitespace-pre text-g6">
          {buildNote(plan, assessment, new Date(), caseInfo)}
        </pre>
      )}
    </Section>
  )
}
