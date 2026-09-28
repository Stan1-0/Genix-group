import { NextResponse, type NextRequest } from 'next/server'
import { routeRequest, siteForRequest } from '@/sites/routing'

const PREVIEW_COOKIE = 'genix-site'

export function proxy(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  const root = process.env.ROOT_DOMAIN || 'thegenixgroup.com'
  // Preview deployments (unknown hosts) may pick a site with ?site=<key>, remembered in a cookie.
  const allowPreview = process.env.VERCEL_ENV !== 'production'
  const querySite = req.nextUrl.searchParams.get('site')
  const site = siteForRequest(host, {
    root,
    previewSite: querySite ?? req.cookies.get(PREVIEW_COOKIE)?.value,
    allowPreview,
  })

  const decision = routeRequest(site, req.nextUrl.pathname)
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
  if (allowPreview && querySite) res.cookies.set(PREVIEW_COOKIE, querySite, { path: '/', sameSite: 'lax' })
  return res
}

export const config = {
  // Everything except Next internals and static brand files.
  matcher: ['/((?!_next/|brand/|icons/|favicon\\.ico).*)'],
}
