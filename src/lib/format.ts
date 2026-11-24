/** Number formatting shared by the panel, overlays and the exported note. */

const MINUS = '−'

/** Fixed decimals with a true minus sign. */
export function fixed(v: number, digits = 1): string {
  const r = Number(v.toFixed(digits))
  const s = Math.abs(r).toFixed(digits)
  return r < 0 ? `${MINUS}${s}` : s
}

/** Signed value with an explicit plus for positives. */
export function signed(v: number, digits = 1): string {
  const r = Number(v.toFixed(digits))
  return r > 0 ? `+${r.toFixed(digits)}` : fixed(r, digits)
}

export const formatMm = (v: number, digits = 1): string => `${fixed(v, digits)} mm`

/** RAS triplet, e.g. "R 12.0  A −4.0  S 30.0". */
export function formatRas(p: readonly [number, number, number], digits = 1): string {
  const half = 0.5 * 10 ** -digits
  const lr = Math.abs(p[0]) < half ? 'Midline' : `${p[0] < 0 ? 'L' : 'R'} ${Math.abs(p[0]).toFixed(digits)}`
  const ap = p[1] < 0 ? 'P' : 'A'
  const si = p[2] < 0 ? 'I' : 'S'
  return `${lr}  ${ap} ${Math.abs(p[1]).toFixed(digits)}  ${si} ${Math.abs(p[2]).toFixed(digits)}`
}

/** Plain-ASCII variant for the clipboard note. */
export function asciiFixed(v: number, digits = 1): string {
  return fixed(v, digits).replace(MINUS, '-')
}
