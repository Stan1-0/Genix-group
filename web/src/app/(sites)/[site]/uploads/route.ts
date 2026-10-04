import { headers } from 'next/headers'
import { getPayload } from 'payload'
import { checkBotId } from 'botid/server'
import config from '@payload-config'
import { grantUpload } from '@/inquiries/upload-grant'

// Home Upgrades photo uploads: grants a one-time signed Cloudinary upload (the browser sends the file there directly).
export async function POST(req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params
  let body: unknown = null
  try { body = await req.json() } catch { /* handled as a bad request */ }
  const h = await headers()
  const ip = (h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0] ?? 'unknown').trim()
  try {
    const payload = await getPayload({ config })
    const r = await grantUpload({ site, body, ip }, { payload, env: process.env, isBot: async () => (await checkBotId()).isBot, now: new Date(), production: process.env.VERCEL_ENV === 'production' })
    return Response.json(r.json, { status: r.status, headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('uploads: grant failed', err)
    return Response.json({ error: 'Could not start the upload' }, { status: 500 })
  }
}
