import { NextResponse, type NextRequest } from 'next/server'
import { routeRequest, siteForRequest } from '@/sites/routing'
import { isSiteKey, resolveSite } from '@/sites/config'

const PREVIEW_COOKIE = 'genix-site'

export function proxy(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  const root = process.env.ROOT_DOMAIN || 'thegenixgroup.com'
  const isProduction = process.env.VERCEL_ENV === 'production'
  // Preview deployments (unknown hosts) may pick a site with ?site=<key>, remembered in a cookie.
  const allowPreview = !isProduction
  const querySite = req.nextUrl.searchParams.get('site')
  const site = siteForRequest(host, {
    root,
    previewSite: querySite ?? req.cookies.get(PREVIEW_COOKIE)?.value,
    allowPreview,
  })
  const hostResolved = resolveSite(host, root) !== null

  const decision = routeRequest(site, req.nextUrl.pathname, { hostResolved, isProduction })
  let res: NextResponse
  if (decision.kind === 'notFound') {
    const url = req.nextUrl.clone()
    url.pathname = `/${site}/__not-found`
    res = NextResponse.rewrite(url, { status: 404 })
  } else if (decision.kind === 'rewrite') {
    const url = req.nextUrl.clone()
    url.pathname = decision.pathname
    res = NextResponse.rewrite(url)
  } else {
    res = NextResponse.next()
  }
  if (allowPreview && querySite && isSiteKey(querySite)) res.cookies.set(PREVIEW_COOKIE, querySite, { path: '/', sameSite: 'lax' })
  return res
}

export const config = {
  // Everything except Next internals, static brand files and BotID's own paths (withBotId in
  // next.config.ts rewrites those to Vercel; prefixing them with a site would 404 the challenge).
  // /favicon.ico is routed per site.
  matcher: ['/((?!_next/|brand/|icons/|149e9513-01fa-4fb0-aad4-566afd725d1b/).*)'],
}
