import { isSiteKey } from '@/sites/config'
import { sitemapXml } from '@/sites/seo'

// Must stay dynamic. Next treats `sitemap.xml/route.ts` as a metadata route and
// ignores generateStaticParams for it: it prerenders one placeholder param (`-`),
// stores that 404 as a static file, and Vercel then answers every real request
// with a 500. (robots.txt avoids this only because it reads process.env.)
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params
  if (!isSiteKey(site)) return new Response('Not found', { status: 404 })
  return new Response(sitemapXml(site), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
