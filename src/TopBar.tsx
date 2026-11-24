import { useRef } from 'react'
import { X } from 'lucide-react'
import { DISCLAIMER } from './lib/note'

export function TopBar() {
  const dialog = useRef<HTMLDialogElement>(null)
  return (
    <header className="flex h-11 items-center justify-between gap-3 border-b border-g2 bg-black px-3 md:h-10 md:px-4">
      <div className="flex min-w-0 flex-col leading-tight md:flex-row md:items-baseline md:gap-3">
        <span className="text-sm font-semibold tracking-[0.02em] text-white">STEREON</span>
        <span className="hidden text-xs text-g5 xl:inline">Trajectory and eloquent cortex simulator</span>
        <span className="text-glow text-2xs text-white italic md:hidden">© Aditi Balan</span>
      </div>
      <div className="num hidden items-center gap-4 text-xs text-g5 lg:flex">
        <span>
          <span className="text-g4">frame</span> <span className="text-g6">RAS</span>
        </span>
        <span className="h-3 w-px bg-g3" aria-hidden />
        <span>
          <span className="text-g4">units</span> <span className="text-g6">mm</span>
        </span>
        <span className="h-3 w-px bg-g3" aria-hidden />
        <span>
          <span className="text-g4">origin</span> <span className="text-g6">brain centre</span>
        </span>
        <span className="h-3 w-px bg-g3" aria-hidden />
        <span>
          <span className="text-g4">+x</span> R <span className="text-g4">+y</span> A <span className="text-g4">+z</span> S
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-glow hidden text-xs text-white italic md:inline">© Aditi Balan</span>
        <span className="hidden h-3 w-px bg-g3 md:block" aria-hidden />
        <button
          type="button"
          onClick={() => dialog.current?.showModal()}
          className="py-2 text-xs text-g5 underline decoration-g3 underline-offset-2 transition-colors duration-100 hover:text-white hover:decoration-white"
        >
          Educational use only
        </button>
      </div>

      <dialog
        ref={dialog}
        className="m-auto w-[min(420px,calc(100vw-32px))] border border-g3 bg-black p-0 text-g6 backdrop:bg-black/70"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close()
        }}
      >
        <div className="flex items-center justify-between border-b border-g2 px-4 py-2.5">
          <h2 className="eyebrow">About this simulator</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialog.current?.close()}
            className="text-g5 transition-colors duration-100 hover:text-white"
          >
            <X size={14} strokeWidth={1.25} />
          </button>
        </div>
        <div className="space-y-2.5 px-4 py-3.5 text-sm">
          <p>{DISCLAIMER}</p>
          <p className="text-g5">
            Eloquent structures are placed at approximate, population-level positions. Distances are geometric clearances
            to idealised spheres and capsules, not tractography.
          </p>
          <p className="text-xs text-g5">
            Brain model: “human-brain” by{' '}
            <a className="underline decoration-g3 underline-offset-2 hover:text-white" href="https://sketchfab.com/3d-models/human-brain-e073c2590bc24daaa7323f4daa5b7784" target="_blank" rel="noreferrer">
              Yash_Dandavate
            </a>
            , licensed{' '}
            <a className="underline decoration-g3 underline-offset-2 hover:text-white" href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
              CC BY 4.0
            </a>
            . Reoriented, rescaled and textures removed.
          </p>
          <p className="text-xs text-g4">© Aditi Balan</p>
        </div>
      </dialog>
    </header>
  )
}
