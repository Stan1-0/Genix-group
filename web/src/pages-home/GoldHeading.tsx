import { SITES, type SiteKey } from '@/sites/config'
import { goldTail } from './gold'

/** Hero <h1>: the admin heading with the site's gold phrase, markup as in the prototypes. */
export function GoldHeading({ site, text, className, split = true }: { site: SiteKey; text: string; className?: string; split?: boolean }) {
  const [lead, gold] = goldTail(text, SITES[site].heroGold)
  return (
    <h1 className={className} data-split={split ? '' : undefined}>
      {lead}
      {gold && <>{' '}<span className="gold">{gold}</span></>}
    </h1>
  )
}
