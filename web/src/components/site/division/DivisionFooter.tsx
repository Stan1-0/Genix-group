import { SITES, siteOrigin, type SiteKey } from '@/sites/config'
import type { SiteData } from '@/sites/data-shape'

type L = [label: string, href: string]

/** Link columns that differ between the two prototype footers. */
const COLUMNS: Record<'logistics' | 'homeupgrades', { services: L[]; company: L[]; others: { key: SiteKey; dot: string; label: string }[] }> = {
  logistics: {
    services: [
      ['Business freight', '/#services'],
      ['Last-mile & courier', '/#services'],
      ['Home & office moves', '/#services'],
    ],
    company: [
      ['How it works', '/#how'],
      ['Where we go', '/#areas'],
      ['Questions', '/#faq'],
    ],
    others: [
      { key: 'homeupgrades', dot: 'var(--gold)', label: 'Home Upgrades' },
      { key: 'multimedia', dot: 'var(--tell)', label: 'Multimedia' },
    ],
  },
  homeupgrades: {
    services: [
      ['Accent walls & TV units', '/#services'],
      ['Outdoor builds', '/#services'],
    ],
    company: [
      ['Our work', '/#work'],
      ['How we work', '/#process'],
      ['Get a quote', '/#quote'],
    ],
    others: [
      { key: 'logistics', dot: 'var(--move)', label: 'Logistics' },
      { key: 'multimedia', dot: 'var(--tell)', label: 'Multimedia' },
    ],
  },
}

/** Prototype footer for Logistics and Home Upgrades (design/logistics-home.html). */
export function DivisionFooter({ site, data }: { site: SiteKey; data: SiteData }) {
  const cfg = SITES[site]
  const logo = cfg.logo!
  const cols = COLUMNS[site as 'logistics' | 'homeupgrades']
  const email = data.email ?? 'hello@thegenixgroup.com'
  return (
    <footer className="site-footer" data-quote-bar-hide>
      <div className="wrap">
        <div className="brand-col">
          <a className="footer-logo" href="/#top" aria-label={`${cfg.name} home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo.src} alt="" width={logo.width} height={logo.height} />
          </a>
          <a className="part-of" href={siteOrigin('hub')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/genix-mark.svg" alt="" width={360} height={421} />
            <span>Part of <b>The Genix Group</b></span>
          </a>
        </div>
        <div>
          <h2>Services</h2>
          <ul>
            {cols.services.map(([label, href], i) => (
              <li key={i}><a href={href}>{label}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Company</h2>
          <ul>
            {cols.company.map(([label, href]) => (
              <li key={label}><a href={href}>{label}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Contact</h2>
          <ul>
            <li><a href={`mailto:${email}`}>{email}</a></li>
            <li>
              {data.phone ? (
                <a href={`tel:${data.phone.replace(/[^\d+]/g, '')}`}>{data.phone}</a>
              ) : (
                <span className="ph">(000) 000-0000</span>
              )}
            </li>
            {site === 'logistics' ? (
              <li><a href={cfg.cta.href}>Get a quote</a></li>
            ) : (
              <li>Serving {data.areaServed ? data.areaServed.name : <span className="ph">[service area]</span>}</li>
            )}
          </ul>
        </div>
        <div className="legal">
          <span>© 2026 {cfg.name}, part of The Genix Group</span>
          <span>
            {cols.others.map((o, i) => (
              <span key={o.key}>
                {i > 0 && '   '}
                <a href={siteOrigin(o.key)}>
                  <span className="dot" style={{ background: o.dot }}></span>{o.label}
                </a>
              </span>
            ))}
          </span>
        </div>
      </div>
    </footer>
  )
}
