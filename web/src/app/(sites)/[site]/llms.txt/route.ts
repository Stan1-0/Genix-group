import { isSiteKey } from '@/sites/config'
import { getSiteData } from '@/sites/data'
import { llmsTxt } from '@/sites/llms'

// Dynamic like sitemap.xml: a prerendered route under [site] can be stored for a placeholder param and 404.
// getSiteData is cached, so this stays cheap.
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params
  if (!isSiteKey(site)) return new Response('Not found', { status: 404 })
  return new Response(llmsTxt(site, await getSiteData(site)), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
