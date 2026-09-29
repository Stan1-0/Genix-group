import Image from 'next/image'
import { SITES, type SiteKey } from '@/sites/config'

// Supplied SVG lockups are used whole (the gold X is a trademark). No logo yet → wordmark.
export function Logo({ site, className }: { site: SiteKey; className?: string }) {
  const { logo, shortName } = SITES[site]
  if (!logo) {
    return (
      <span className={`font-display text-xl font-bold tracking-tight text-heading ${className ?? ''}`}>
        GENIX <span className="font-normal text-gold-text">{shortName}</span>
      </span>
    )
  }
  return <Image src={logo.src} width={logo.width} height={logo.height} alt="" unoptimized preload className={className} />
}
