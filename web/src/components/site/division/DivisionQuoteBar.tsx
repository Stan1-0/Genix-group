'use client'
import { SITES, type SiteKey } from '@/sites/config'
import type { SiteData } from '@/sites/data-shape'
import { useEnhance } from '@/components/motion/useEnhance'

/* Values verbatim from each prototype's #quoteBar. */
const RULES: Record<'logistics' | 'homeupgrades', { after: string; hideOver: string }> = {
  logistics: { after: '#quote-form', hideOver: '#quote, .site-footer' },
  homeupgrades: { after: '.hero-actions', hideOver: '#build, #quote, .site-footer' },
}

/** Phones: "Get a quote" stays one tap away once the hero action scrolls off
    (design/shared/quote-bar.js). */
export function DivisionQuoteBar({ site, data }: { site: SiteKey; data: SiteData }) {
  const cfg = SITES[site]
  const rules = RULES[site as 'logistics' | 'homeupgrades']
  useEnhance((signal) => {
    const bar = document.getElementById('quoteBar')
    if (!bar) return
    const wide = matchMedia('(min-width: 961px)')
    const after = bar.dataset.after ? document.querySelector(bar.dataset.after) : null
    const watch = [after, ...(bar.dataset.hideOver ? document.querySelectorAll(bar.dataset.hideOver) : [])].filter(Boolean) as Element[]
    const seen = new Map<Element, boolean>()
    bar.hidden = false
    bar.classList.add('off')
    bar.dataset.off = 'true'
    bar.inert = true
    const update = () => {
      const passed = after ? after.getBoundingClientRect().bottom < 0 : true
      const off = wide.matches || !passed || watch.some((el) => seen.get(el))
      bar.classList.toggle('off', off)
      bar.dataset.off = String(off)
      bar.inert = off // off-screen links stay out of the tab order
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target, e.isIntersecting))
      update()
    })
    watch.forEach((el) => io.observe(el))
    wide.addEventListener('change', update, { signal })
    return () => io.disconnect()
  })
  const phone = data.phone
  return (
    <div className="quote-bar" id="quoteBar" data-testid="quote-bar" data-off="true" data-after={rules.after} data-hide-over={rules.hideOver} hidden>
      <a className="btn btn-gold" href={cfg.cta.href} {...(site === 'logistics' ? { 'data-start-quote': '' } : {})}>
        {cfg.cta.label} <span aria-hidden="true">→</span>
      </a>
      <a
        className={`btn btn-ghost${phone ? '' : ' ph'}`}
        href={`tel:${phone ? phone.replace(/[^\d+]/g, '') : '+10000000000'}`}
        aria-label={`Call ${cfg.name}`}
      >
        Call
      </a>
    </div>
  )
}
