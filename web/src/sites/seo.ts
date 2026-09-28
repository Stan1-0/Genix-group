import type { Metadata } from 'next'
import { DIVISION_KEYS, SITES, siteOrigin, type SiteKey } from './config'
import type { SiteData } from './data-shape'

export function pageMetadata(
  site: SiteKey,
  path: string,
  opts: { title?: string; description?: string | null } = {},
  root?: string,
): Metadata {
  const cfg = SITES[site]
  const title = opts.title ? `${opts.title} | ${cfg.name}` : `${cfg.name} | ${cfg.tagline}`
  const url = new URL(path, siteOrigin(site, root) + '/').toString()
  const description = opts.description ?? undefined
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: cfg.name, type: 'website' },
    twitter: { card: 'summary_large_image' },
  }
}

export function sitemapXml(site: SiteKey, root?: string): string {
  const origin = siteOrigin(site, root)
  const urls = SITES[site].pages.map((p) => `  <url><loc>${origin}${p}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

export function robotsTxt(site: SiteKey, allowIndexing: boolean, root?: string): string {
  if (!allowIndexing) return 'User-agent: *\nDisallow: /\n'
  const admin = site === 'hub' ? 'Disallow: /admin\nDisallow: /api/\n' : ''
  return `User-agent: *\nAllow: /\n${admin}\nSitemap: ${siteOrigin(site, root)}/sitemap.xml\n`
}

export function siteJsonLd(site: SiteKey, data: SiteData, root?: string): Record<string, unknown> {
  const cfg = SITES[site]
  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': cfg.schemaType,
    name: cfg.name,
    url: `${siteOrigin(site, root)}/`,
    slogan: cfg.tagline,
    ...(data.email ? { email: data.email } : {}),
    ...(data.phone ? { telephone: data.phone } : {}),
  }
  if (site === 'hub') {
    return {
      ...base,
      subOrganization: DIVISION_KEYS.map((k) => ({ '@type': SITES[k].schemaType, name: SITES[k].name, url: `${siteOrigin(k, root)}/` })),
    }
  }
  return {
    ...base,
    ...(data.areaServed ? { areaServed: { '@type': data.areaServed.type, name: data.areaServed.name } } : {}),
    parentOrganization: { '@type': 'Organization', name: SITES.hub.name, url: `${siteOrigin('hub', root)}/` },
  }
}
