'use client'
import { useEnhance } from './useEnhance'

/** Mobile menu for the prototype headers: toggles header.menu-open; Escape closes and
    returns focus to the button; nav links close it. */
export function SiteMenu() {
  useEnhance((signal) => {
    const header = document.getElementById('siteHeader')
    const btn = document.getElementById('menuBtn')
    if (!header || !btn) return
    const extra = header.querySelector<HTMLElement>('.nav-extra, .nav-contact')
    const set = (open: boolean) => {
      header.classList.toggle('menu-open', open)
      btn.setAttribute('aria-expanded', String(open))
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu')
      if (extra) extra.hidden = !open
    }
    btn.addEventListener('click', () => set(!header.classList.contains('menu-open')), { signal })
    header.querySelectorAll('.nav a').forEach((a) => a.addEventListener('click', () => set(false), { signal }))
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && header.classList.contains('menu-open')) {
        set(false)
        btn.focus()
      }
    }, { signal })
    return () => set(false)
  })
  return null
}
