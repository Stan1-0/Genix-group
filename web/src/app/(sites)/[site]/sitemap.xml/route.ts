import { isSiteKey } from '@/sites/config'
import { sitemapXml } from '@/sites/seo'

export async function GET(_req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params
  if (!isSiteKey(site)) return new Response('Not found', { status: 404 })
  return new Response(sitemapXml(site), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
