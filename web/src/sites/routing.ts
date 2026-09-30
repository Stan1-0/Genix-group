import { isSiteKey, resolveSite, SITES, type SiteKey } from './config'

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
// Payload media files (images, uploads) are served from here and must load on
// every site, including division subdomains — not just the hub.
const isMediaFile = (p: string) => p.startsWith('/api/media/file/')

export type RouteOpts = {
  /** False when the request's Host header didn't resolve to a known site (e.g. a
      spoofed or stray Host on Vercel). Defaults to true so callers that don't pass
      it (and existing tests) keep today's behaviour. */
  hostResolved: boolean
  /** True only for production deployments (VERCEL_ENV === 'production'). Kept as
      an explicit flag, rather than read from env inside this pure function, so it
      stays unit testable. */
  isProduction: boolean
}

const DEFAULT_ROUTE_OPTS: RouteOpts = { hostResolved: true, isProduction: false }

export function routeRequest(site: SiteKey, pathname: string, opts: RouteOpts = DEFAULT_ROUTE_OPTS): RouteDecision {
  if (isMediaFile(pathname)) return { kind: 'next' }
  // Browsers and search engines ask for /favicon.ico directly, whatever the page links to.
  if (pathname === '/favicon.ico') return { kind: 'rewrite', pathname: `${SITES[site].icons}/favicon.ico` }
  if (isPayloadPath(pathname)) {
    // An unresolved Host in production never reaches Payload's admin or API,
    // regardless of which site the request otherwise fell back to.
    if (!opts.hostResolved && opts.isProduction) return { kind: 'notFound' }
    return site === 'hub' ? { kind: 'next' } : { kind: 'notFound' }
  }
  if (pathname === `/${site}` || pathname.startsWith(`/${site}/`)) return { kind: 'next' }
  return { kind: 'rewrite', pathname: `/${site}${pathname === '/' ? '' : pathname}` }
}
