import { SITES, siteOrigin, type SiteKey } from '@/sites/config'
import { SiteMenu } from '@/components/motion/SiteMenu'

/** Prototype header for Logistics and Home Upgrades (design/logistics-home.html). */
export function DivisionHeader({ site }: { site: SiteKey }) {
  const cfg = SITES[site]
  const logo = cfg.logo!
  return (
    <header className="site-header" id="siteHeader">
      <div className="wrap">
        <a className="brand" href="/#top" aria-label={`${cfg.name} home`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo.src} alt="" width={logo.width} height={logo.height} />
        </a>
        <nav className="nav" id="nav" aria-label="Primary">
          {cfg.nav.map((n) => (
            <a key={n.href} href={n.href}>{n.label}</a>
          ))}
          <a href={cfg.cta.href} className="nav-extra" hidden>{cfg.cta.label}</a>
        </nav>
        <div className="header-end">
          <a className="parent-link" href={siteOrigin('hub')}>Part of The Genix Group ↗</a>
          <a className="btn btn-gold btn-sm" href={cfg.cta.href}>{cfg.cta.label}</a>
        </div>
        <button className="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="nav" aria-label="Open menu">
          <span></span>
        </button>
      </div>
      <SiteMenu />
    </header>
  )
}
