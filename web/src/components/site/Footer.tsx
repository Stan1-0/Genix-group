import { DIVISION_KEYS, SITES, siteOrigin, type SiteKey } from '@/sites/config'
import type { SiteData } from '@/sites/data-shape'
import { Logo } from './Logo'

const PRIVACY_URL = `${siteOrigin('hub')}/privacy`

const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, '')}`

export function Footer({ site, data }: { site: SiteKey; data: SiteData }) {
  const cfg = SITES[site]
  const sisters = DIVISION_KEYS.filter((k) => k !== site)
  return (
    <footer data-quote-bar-hide className="on-brand border-t-2 border-gold bg-brand py-16 text-[15px] text-white">
      <div className="mx-auto grid max-w-[1320px] gap-8 px-[clamp(16px,4vw,56px)] min-[961px]:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <span className="inline-block rounded-site bg-paper px-4 py-3">
            <Logo site={site} className="h-14 w-auto" />
          </span>
          {site !== 'hub' && (
            <a href={siteOrigin('hub')} className="mt-5 block text-on-brand-muted hover:underline">
              Part of <b className="font-semibold text-white">The Genix Group</b>
            </a>
          )}
        </div>
        <div>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.14em] text-gold">Pages</h2>
          <ul className="grid gap-3">
            {cfg.nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="hover:underline">{item.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.14em] text-gold">Contact</h2>
          <ul className="grid gap-3">
            {data.email && (
              <li><a href={`mailto:${data.email}`} className="hover:underline">{data.email}</a></li>
            )}
            {data.phone && (
              <li><a href={telHref(data.phone)} className="hover:underline">{data.phone}</a></li>
            )}
          </ul>
        </div>
        <div className="col-span-full flex flex-wrap justify-between gap-4 border-t border-white/15 pt-6 text-sm text-on-brand-muted">
          <span>© {new Date().getFullYear()} {cfg.name}{site !== 'hub' ? ', part of The Genix Group' : ''}</span>
          <span className="flex flex-wrap gap-4">
            {sisters.map((k) => (
              <a key={k} href={siteOrigin(k)} className="hover:text-white">{SITES[k].shortName}</a>
            ))}
            <a href={PRIVACY_URL} className="hover:text-white">Privacy policy</a>
          </span>
        </div>
      </div>
    </footer>
  )
}
