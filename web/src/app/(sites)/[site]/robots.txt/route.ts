import { isSiteKey } from '@/sites/config'
import { robotsTxt } from '@/sites/seo'

export async function GET(_req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params
  if (!isSiteKey(site)) return new Response('Not found', { status: 404 })
  const allowIndexing = process.env.ALLOW_INDEXING === '1'
  return new Response(robotsTxt(site, allowIndexing), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
