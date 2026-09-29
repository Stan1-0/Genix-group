import { SITES } from '@/sites/config'
import { SiteMenu } from '@/components/motion/SiteMenu'

/** Prototype header for the hub (design/hub-home.html). */
export function HubHeader() {
  const cfg = SITES.hub
  return (
    <header className="site-header" id="siteHeader">
      <div className="wrap">
        <a className="logo" href="/" aria-label="The Genix Group home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo-mark" src="/brand/genix-mark.svg" alt="" width={360} height={421} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo-word" src="/brand/genix-wordmark.svg" alt="" width={874} height={298} />
        </a>
        <nav className="nav" id="nav" aria-label="Primary">
          {cfg.nav.map((n) => (
            <a key={n.label} href={n.href}>{n.label}</a>
          ))}
          <a href={cfg.cta.href} className="nav-contact" hidden>{cfg.cta.label}</a>
        </nav>
        <a className="header-cta" href={cfg.cta.href}>
          {cfg.cta.label} <span aria-hidden="true">↗</span>
        </a>
        <button className="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="nav" aria-label="Open menu">
          <span></span>
        </button>
      </div>
      <SiteMenu />
    </header>
  )
}
