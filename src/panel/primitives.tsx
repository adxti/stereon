import { useId, useState, type ReactNode } from 'react'
import { fixed } from '../lib/format'

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-g2 px-5 pb-5 pt-4">
      <header className="mb-3.5 flex h-4 items-center justify-between">
        <h2 className="eyebrow">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  )
}

/** Numeric text field that accepts free typing and commits clamped values. */
export function NumberField({
  id,
  value,
  min,
  max,
  digits,
  unit,
  onChange,
  label,
}: {
  id?: string
  value: number
  min: number
  max: number
  digits: number
  unit: string
  onChange: (v: number) => void
  label: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = (raw: string) => {
    const v = Number(raw.replace('−', '-'))
    if (raw.trim() !== '' && Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)))
  }
  return (
    <label className="flex h-9 w-[104px] shrink-0 md:h-6 md:w-[84px] items-center border border-g3 bg-black transition-colors duration-100 focus-within:border-white hover:border-g4">
      <input
        id={id}
        aria-label={label}
        type="number"
        inputMode="decimal"
        step="any"
        min={min}
        max={max}
        className="numfield num h-full w-full min-w-0 bg-transparent pl-1.5 text-right text-sm text-white outline-none"
        value={draft ?? value.toFixed(digits)}
        onFocus={(e) => {
          setDraft(value.toFixed(digits))
          e.currentTarget.select()
        }}
        onChange={(e) => {
          setDraft(e.target.value)
          commit(e.target.value)
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setDraft(null)
            e.currentTarget.blur()
          }
        }}
      />
      <span className="num pl-1 pr-1.5 text-xs text-g5">{unit}</span>
    </label>
  )
}

/** Labelled range slider paired with a numeric field. */
export function SliderField({
  label,
  hint,
  value,
  min,
  max,
  step,
  digits = 1,
  unit,
  onChange,
}: {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  step: number
  digits?: number
  unit: string
  onChange: (v: number) => void
}) {
  const id = useId()
  return (
    <div className="py-1.5">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm text-g6">
          {label}
        </label>
        {hint && <span className="num text-2xs text-g4">{hint}</span>}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <input
            id={id}
            type="range"
            className="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <div className="num flex justify-between text-2xs text-g4">
            <span>{fixed(min, digits)}</span>
            <span>{fixed(max, digits)}</span>
          </div>
        </div>
        <NumberField value={value} min={min} max={max} digits={digits} unit={unit} onChange={onChange} label={label} />
      </div>
    </div>
  )
}

/** Two-column readout row: label left, monospace value right. */
export function Readout({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-g2 py-1.5 first:border-t-0">
      <dt className="text-sm text-g5">{label}</dt>
      <dd className="num text-right text-sm text-white">{children}</dd>
    </div>
  )
}

/** Segmented control: hairline boxes, active option inverted. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
  label,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
  disabled?: boolean
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col border border-g3">
      {options.map((o, i) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={[
              'h-10 text-sm transition-colors duration-100 md:h-7',
              i > 0 ? 'border-l border-g3' : '',
              disabled
                ? 'text-g4'
                : active
                  ? 'bg-white font-medium text-black'
                  : 'text-g6 hover:bg-g1 hover:text-white',
            ].join(' ')}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Square checkbox: hairline box, filled white when on. */
export function Check({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={[
        'flex h-3 w-3 shrink-0 items-center justify-center border transition-colors duration-100',
        checked ? 'border-white bg-white' : 'border-g4 bg-black',
      ].join(' ')}
    >
      {checked && (
        <svg width="8" height="8" viewBox="0 0 8 8">
          <path d="M1 4.2 3.1 6.2 7 1.8" fill="none" stroke="#000" strokeWidth="1.25" />
        </svg>
      )}
    </span>
  )
}

export function TextButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-xs text-g5 underline decoration-g3 underline-offset-2 transition-colors duration-100 hover:text-white hover:decoration-white disabled:text-g4 disabled:no-underline"
    >
      {children}
    </button>
  )
}

const fieldBox =
  'w-full border border-g3 bg-black text-sm text-white outline-none transition-colors duration-100 hover:border-g4 focus:border-white placeholder:text-g4'

/** Label above a control, with an optional right-aligned hint. */
export function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="py-1.5">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm text-g6">
          {label}
        </label>
        {hint && <span className="text-2xs text-g4">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  mono,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'date'
  mono?: boolean
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={[fieldBox, 'h-10 px-2 md:h-7', mono ? 'num' : '', type === 'date' ? '[color-scheme:dark]' : ''].join(' ')}
    />
  )
}

export function Select<T extends string>({
  id,
  value,
  options,
  onChange,
}: {
  id: string
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (v: T) => void
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={[fieldBox, 'h-10 cursor-pointer appearance-none pl-2 pr-7 md:h-7'].join(' ')}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-black text-white">
            {o.label}
          </option>
        ))}
      </select>
      <svg aria-hidden width="8" height="5" viewBox="0 0 8 5" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
        <path d="M0.5 0.5 4 4 7.5 0.5" fill="none" stroke="#8a8a8a" strokeWidth="1" />
      </svg>
    </div>
  )
}

export function TextArea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      id={id}
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={[fieldBox, 'block resize-y px-2 py-1.5 leading-[18px]'].join(' ')}
    />
  )
}
