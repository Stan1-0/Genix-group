import { getPayload } from 'payload'
import config from '@payload-config'
import type { SiteKey } from '@/sites/config'
import { siteOrigin } from '@/sites/config'
import { getSiteData } from '@/sites/data'
import { createMailer, retryUnsent } from '@/inquiries/deliver'

// Vercel Cron (vercel.json) calls /cron/inquiries daily; proxy.ts rewrites it to /hub/cron/inquiries.
export async function GET(req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params
  if (site !== 'hub') return new Response('Not found', { status: 404 })
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 })
  const payload = await getPayload({ config })
  const result = await retryUnsent(payload, createMailer(process.env), {
    env: process.env,
    phoneFor: async (s: SiteKey) => (await getSiteData(s)).phone,
    adminOrigin: siteOrigin('hub'),
    now: new Date(),
  })
  return Response.json(result)
}
