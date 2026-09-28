import Link from 'next/link'
import { SITES, siteOrigin, type SiteKey } from '@/sites/config'
import { Logo } from './Logo'
import { MobileMenu } from './MobileMenu'

export function Header({ site }: { site: SiteKey }) {
  const cfg = SITES[site]
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <div className="relative mx-auto flex h-[76px] max-w-[1320px] items-center justify-between gap-6 px-[clamp(16px,4vw,56px)]">
        <Link href="/" aria-label={`${cfg.name} home`} className="inline-flex min-h-11 items-center">
          <Logo site={site} className="h-12 w-auto" />
        </Link>
        <nav aria-label="Primary" className="hidden gap-8 min-[961px]:flex">
          {cfg.nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-[15px] font-medium text-ink-2 hover:text-heading">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-5 min-[961px]:flex">
          {site !== 'hub' && (
            <a href={siteOrigin('hub')} className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-[0.1em] text-muted hover:text-heading">
              Part of The Genix Group ↗
            </a>
          )}
          <Link href={cfg.cta.href} className="inline-flex min-h-11 items-center rounded-site bg-gold px-[18px] text-[15px] font-semibold text-heading">
            {cfg.cta.label}
          </Link>
        </div>
        <MobileMenu items={[...cfg.nav, cfg.cta]} />
      </div>
    </header>
  )
}
