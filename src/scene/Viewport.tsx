import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useProgress } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { RotateCcw, X } from 'lucide-react'
import { TIER_LABEL, type Assessment } from '../lib/risk'
import { structureAnchor, structureLabel } from '../lib/anatomy'
import { formatRas, fixed, formatMm } from '../lib/format'
import { Brain } from './Brain'
import { Structures } from './Structures'
import { Lesion } from './Lesion'
import { Trajectory } from './Trajectory'
import { HudDriver } from './HudDriver'
import { LabelDriver, LabelLayer } from './Labels'
import { useGlowPulse } from '../motion'
import { CameraRig, VIEWS, type FocusRequest, type ViewId } from './CameraRig'

const PAN_LIMIT = 70

function Gizmo({ svgRef }: { svgRef: React.RefObject<SVGSVGElement | null> }) {
  const axes = [
    { k: 'x', pos: 'R', neg: 'L' },
    { k: 'y', pos: 'A', neg: 'P' },
    { k: 'z', pos: 'S', neg: 'I' },
  ]
  return (
    <svg ref={svgRef} viewBox="-42 -42 84 84" aria-label="Orientation" className="block h-[60px] w-[60px] md:h-[84px] md:w-[84px]">
      <circle r="22" fill="none" stroke="#1f1f1f" />
      {axes.map((a) => (
        <g key={a.k}>
          <line data-axis={`${a.k}-`} x1="0" y1="0" x2="0" y2="0" stroke="#5c5c5c" strokeWidth="1" strokeDasharray="2 2" />
          <line data-axis={`${a.k}+`} x1="0" y1="0" x2="0" y2="0" stroke="#ffffff" strokeWidth="1" />
          <text data-label={`${a.k}+`} textAnchor="middle" dominantBaseline="central" fontSize="10" fontFamily="IBM Plex Mono, monospace" fill="#ffffff">
            {a.pos}
          </text>
          <text data-label={`${a.k}-`} textAnchor="middle" dominantBaseline="central" fontSize="10" fontFamily="IBM Plex Mono, monospace" fill="#5c5c5c">
            {a.neg}
          </text>
        </g>
      ))}
      <rect x="-1.5" y="-1.5" width="3" height="3" fill="#ffffff" />
    </svg>
  )
}

/** Quiet loading readout while the brain mesh streams in. */
function ModelLoading() {
  const { active, progress } = useProgress()
  if (!active) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
      <div className="border border-g3 bg-black px-3 py-1.5 text-xs text-g5">
        Loading brain model <span className="num text-white">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

export function Viewport({ assessment }: { assessment: Assessment }) {
  const controls = useRef<OrbitControlsImpl>(null)
  const gizmo = useRef<SVGSVGElement>(null)
  const scaleBar = useRef<HTMLDivElement>(null)
  const scaleLabel = useRef<HTMLSpanElement>(null)
  const labels = useRef(new Map<string, HTMLDivElement>())
  const statusGlow = useRef<HTMLDivElement>(null)
  useGlowPulse(statusGlow, assessment.highRisk)
  const a = assessment
  const [view, setView] = useState<ViewId>('perspective')
  const [nonce, setNonce] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState<FocusRequest | null>(null)
  const goTo = (v: ViewId) => {
    setView(v)
    setNonce((n) => n + 1)
    if (v === 'perspective') setSelectedId(null)
  }
  /** Highlight a structure and zoom to it from the current viewing angle. */
  const select = (id: string) => {
    const row = a.rows.find((r) => r.structure.id === id)
    if (!row) return
    setSelectedId(id)
    setFocus((f) => ({ point: [...structureAnchor(row.structure)] as [number, number, number], radius: row.structure.radius, nonce: (f?.nonce ?? 0) + 1 }))
  }
  const selectedRow = a.rows.find((r) => r.structure.id === selectedId && r.visible) ?? null

  // Keyboard shortcuts: T top, F front, L left, R right, P perspective. Ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return
      if (e.key === 'Escape') {
        setSelectedId(null)
        return
      }
      const preset = VIEWS.find((v) => v.key === e.key.toLowerCase())
      if (!preset) return
      e.preventDefault()
      goTo(preset.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true }}
        onCreated={({ gl }) => gl.setClearColor('#000000')}
        onPointerMissed={(e) => {
          // A tap on empty space (not an orbit drag) clears the selection.
          if (e.type === 'click') setSelectedId(null)
        }}
      >
        <CameraRig view={view} nonce={nonce} focus={focus} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[-200, 300, 400]} intensity={1.2} />
        <directionalLight position={[250, -200, -100]} intensity={0.35} />
        <Structures rows={a.rows} selectedId={selectedRow ? selectedId : null} onSelect={select} />
        <Lesion center={a.target} radius={a.lesionRadius} />
        <Trajectory entry={a.entry} target={a.target} intervals={a.zoneIntervals} />
        <Suspense fallback={null}>
          <Brain />
        </Suspense>
        <OrbitControls
          ref={controls}
          makeDefault
          enableDamping
          dampingFactor={0.18}
          screenSpacePanning
          onChange={() => {
            const t = controls.current?.target
            if (!t) return
            t.set(
              Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, t.x)),
              Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, t.y)),
              Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, t.z)),
            )
          }}
        />
        <HudDriver refs={{ gizmo, scaleBar, scaleLabel }} />
        <LabelDriver rows={a.rows} registry={labels} selectedId={selectedId} />
      </Canvas>
      <LabelLayer rows={a.rows} registry={labels} selectedId={selectedRow ? selectedId : null} onSelect={select} />
      <ModelLoading />

      {/* Risk status, top left */}
      <div className="pointer-events-none absolute left-3 top-3 flex max-w-[calc(100%-96px)] flex-col items-start md:left-4 md:top-4 md:max-w-none">
        {a.highRisk ? (
          <div ref={statusGlow} className="border border-white bg-white px-2 py-1 text-black shadow-glow md:px-2.5 md:py-1.5">
            <div className="eyebrow !text-black">High risk</div>
            <div className="text-xs font-medium md:text-sm">
              {a.affected.length} eloquent {a.affected.length === 1 ? 'structure' : 'structures'} within margin
            </div>
          </div>
        ) : (
          <div className="border border-g3 bg-black px-2 py-1 md:px-2.5 md:py-1.5">
            <div className="eyebrow">Trajectory</div>
            <div className="text-xs text-white md:text-sm">Clear of all visible structures</div>
          </div>
        )}

        {/* Selected structure: what it is, how close the path runs, and what injury would cost. */}
        {selectedRow && (
          <div className="pointer-events-auto mt-2 w-[min(280px,calc(100vw-110px))] border border-white bg-black shadow-glow">
            <div className="flex items-center justify-between gap-2 border-b border-g3 px-2.5 py-1.5">
              <span className="eyebrow !text-white">Selected</span>
              <button
                type="button"
                aria-label="Clear selection"
                onClick={() => setSelectedId(null)}
                className="-mr-1 flex h-6 w-6 items-center justify-center text-g5 hover:text-white"
              >
                <X size={13} strokeWidth={1.25} />
              </button>
            </div>
            <div className="space-y-1 px-2.5 py-2">
              <div className="text-sm font-medium text-white">{structureLabel(selectedRow.structure)}</div>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-g5">Clearance from path</span>
                <span className="num text-white">{formatMm(selectedRow.clearance)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-g5">Risk</span>
                <span
                  className={[
                    'px-1.5',
                    selectedRow.tier === 'intersection'
                      ? 'bg-white font-medium text-black'
                      : selectedRow.tier === 'caution'
                        ? 'border border-dashed border-white text-white'
                        : 'text-g6',
                  ].join(' ')}
                >
                  {TIER_LABEL[selectedRow.tier]}
                </span>
              </div>
              <div className="border-t border-g2 pt-1.5 text-xs text-g6">{selectedRow.deficit} if injured</div>
            </div>
          </div>
        )}
      </div>

      {/* Orientation gizmo, top right */}
      <div className="absolute right-3 top-3 border border-g2 bg-black md:right-4 md:top-4">
        <Gizmo svgRef={gizmo} />
      </div>

      {/* View shortcuts + reset: full-width bar along the bottom on phones, under the gizmo on desktop. */}
      <div className="absolute inset-x-3 bottom-3 flex items-stretch gap-2 md:inset-x-auto md:bottom-auto md:right-4 md:top-[112px] md:flex-col md:items-end">
        <div role="group" aria-label="Orthographic views" className="flex flex-1 border border-g3 bg-black md:flex-none">
          {VIEWS.map((v, i) => {
            const active = view === v.id
            return (
              <button
                key={v.id}
                type="button"
                aria-pressed={active}
                title={`${v.id === 'perspective' ? 'Perspective' : `${v.label} (orthographic)`} · ${v.key.toUpperCase()}`}
                onClick={() => goTo(v.id)}
                className={[
                  'flex h-9 flex-1 items-center justify-center gap-1 px-1.5 text-xs transition-colors duration-100 md:h-6 md:flex-none',
                  i > 0 ? 'border-l border-g3' : '',
                  active ? 'bg-white text-black' : 'text-g6 hover:bg-g1 hover:text-white',
                ].join(' ')}
              >
                {v.label}
                <kbd className="num hidden text-2xs text-g4 md:inline">{v.key.toUpperCase()}</kbd>
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => goTo('perspective')}
          aria-label="Reset view"
          className="flex w-9 items-center justify-center gap-1.5 border border-g3 bg-black text-xs text-g6 transition-colors duration-100 hover:border-white hover:text-white md:w-auto md:px-2 md:py-1"
        >
          <RotateCcw size={13} strokeWidth={1.25} />
          <span className="hidden md:inline">Reset view</span>
        </button>
      </div>

      {/* Target crosshair readout, bottom left (above the view bar on phones) */}
      <div className="pointer-events-none absolute bottom-[56px] left-3 border border-g2 bg-black px-2 py-1.5 md:bottom-4 md:left-4 md:px-2.5 md:py-2">
        <div className="eyebrow mb-0.5 md:mb-1">Target</div>
        <div className="num text-xs text-white md:text-sm">{formatRas(a.target)}</div>
        <div className="num mt-0.5 text-2xs text-g5 md:text-xs">
          r {fixed(a.lesionRadius)} mm · depth {fixed(a.lengthMm)} mm
        </div>
      </div>

      {/* Scale bar, bottom right (above the view bar on phones) */}
      <div className="pointer-events-none absolute bottom-[56px] right-3 flex flex-col items-end gap-1 md:bottom-4 md:right-4">
        <span ref={scaleLabel} className="num text-xs text-g6">
          10 mm
        </span>
        <div ref={scaleBar} className="h-[5px] border-x border-b border-white" style={{ width: 60 }} />
        <span className="hidden text-2xs text-g4 md:inline">at orbit centre</span>
      </div>
    </div>
  )
}
