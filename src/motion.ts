/**
 * Small anime.js motion layer: button press feedback, a glow pulse for active
 * warnings, and a confirmation pop. Everything is skipped when the user
 * prefers reduced motion.
 */
import { useEffect, type RefObject } from 'react'
import { animate } from 'animejs'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const pressable = (target: EventTarget | null): HTMLButtonElement | null => {
  const el = (target as Element | null)?.closest?.('button')
  // data-no-motion: buttons that own their transform (e.g. projected 3D labels).
  return el instanceof HTMLButtonElement && !el.disabled && !el.hasAttribute('data-no-motion') ? el : null
}

/** Delegated press animation for every button: a quick dip, then a soft spring back. */
export function useButtonMotion() {
  useEffect(() => {
    if (reducedMotion()) return
    let held: HTMLButtonElement | null = null
    const release = () => {
      if (!held) return
      animate(held, { scale: 1, duration: 320, ease: 'outBack(2.2)' })
      held = null
    }
    const down = (e: PointerEvent) => {
      const btn = pressable(e.target)
      if (!btn || e.button !== 0) return
      held = btn
      animate(btn, { scale: 0.95, duration: 90, ease: 'outQuad' })
    }
    const over = (e: PointerEvent) => {
      const btn = pressable(e.target)
      if (!btn || btn === held || btn.contains(e.relatedTarget as Node)) return
      animate(btn, { translateY: [0, -1, 0], duration: 220, ease: 'outQuad' })
    }
    document.addEventListener('pointerdown', down)
    document.addEventListener('pointerup', release)
    document.addEventListener('pointercancel', release)
    document.addEventListener('pointerover', over)
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('pointerup', release)
      document.removeEventListener('pointercancel', release)
      document.removeEventListener('pointerover', over)
    }
  }, [])
}

const GLOW_LOW = '0 0 6px 0px rgba(255, 255, 255, 0.30)'
const GLOW_HIGH = '0 0 22px 4px rgba(255, 255, 255, 0.65)'

/** Breathing white glow on a warning element while `active` is true. */
export function useGlowPulse(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const el = ref.current
    if (!el || !active) return
    if (reducedMotion()) {
      el.style.boxShadow = GLOW_HIGH
      return () => {
        el.style.boxShadow = ''
      }
    }
    const anim = animate(el, {
      boxShadow: [GLOW_LOW, GLOW_HIGH],
      duration: 1100,
      ease: 'inOutQuad',
      alternate: true,
      loop: true,
    })
    return () => {
      anim.revert()
    }
  }, [ref, active])
}

/** One-shot pop, e.g. when a button switches to a confirmed state. */
export function pop(el: HTMLElement | null) {
  if (!el || reducedMotion()) return
  animate(el, { scale: [0.94, 1], duration: 380, ease: 'outBack(2.5)' })
}
