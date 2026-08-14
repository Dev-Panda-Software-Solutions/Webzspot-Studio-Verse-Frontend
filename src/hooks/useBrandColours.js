import { useEffect } from 'react'

const hexToRgba = (hex, alpha) => {
  const h = (hex || '').replace('#', '')
  if (h.length !== 6) return null
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

const BRAND_VARS = [
  '--brand-primary', '--brand-secondary',
  '--brand-primary-30', '--brand-primary-40', '--brand-primary-25',
  '--brand-primary-15', '--brand-primary-12',
  '--accent-primary', '--accent-hover', '--accent-muted',
]

// Re-themes a client-facing page (gallery, favourites) with the studio's
// brand colours. Falls back to the default gold when nothing is set, in which
// case no overrides are applied at all.
export default function useBrandColours(rootRef, primary, secondary) {
  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const p = primary && /^#[0-9a-fA-F]{6}$/.test(primary) ? primary : null
    const s = secondary && /^#[0-9a-fA-F]{6}$/.test(secondary) ? secondary : null
    if (!p && !s) return

    const style = el.style
    if (p) {
      style.setProperty('--brand-primary', p)
      style.setProperty('--brand-primary-30', hexToRgba(p, 0.30))
      style.setProperty('--brand-primary-40', hexToRgba(p, 0.40))
      style.setProperty('--brand-primary-25', hexToRgba(p, 0.25))
      style.setProperty('--brand-primary-15', hexToRgba(p, 0.15))
      style.setProperty('--brand-primary-12', hexToRgba(p, 0.12))
      style.setProperty('--accent-primary', p)
      style.setProperty('--accent-muted', `var(--brand-primary-12)`)
    }
    if (s) {
      style.setProperty('--brand-secondary', s)
      style.setProperty('--accent-hover', s)
    }
    el.setAttribute('data-brand', 'true')

    return () => {
      el.removeAttribute('data-brand')
      BRAND_VARS.forEach(k => style.removeProperty(k))
    }
  }, [rootRef, primary, secondary])
}