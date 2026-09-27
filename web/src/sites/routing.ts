import { isSiteKey, resolveSite, type SiteKey } from './config'

export type RouteDecision = { kind: 'next' } | { kind: 'rewrite'; pathname: string } | { kind: 'notFound' }

/** Known hosts map to their site. Unknown hosts (e.g. Vercel preview URLs)
    get the hub, or — only where allowed — the site picked via ?site=. */
export function siteForRequest(
  host: string,
  opts: { root: string; previewSite: string | null | undefined; allowPreview: boolean },
): SiteKey {
  const known = resolveSite(host, opts.root)
  if (known) return known
  if (opts.allowPreview && isSiteKey(opts.previewSite)) return opts.previewSite
  return 'hub'
}

const isPayloadPath = (p: string) => p === '/admin' || p.startsWith('/admin/') || p === '/api' || p.startsWith('/api/')

export function routeRequest(site: SiteKey, pathname: string): RouteDecision {
  if (isPayloadPath(pathname)) return site === 'hub' ? { kind: 'next' } : { kind: 'notFound' }
  if (pathname === `/${site}` || pathname.startsWith(`/${site}/`)) return { kind: 'next' }
  return { kind: 'rewrite', pathname: `/${site}${pathname === '/' ? '' : pathname}` }
}
