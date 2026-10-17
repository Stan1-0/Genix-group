import { sentUrl, submitInquiry } from '@/inquiries/submit'

/* The job application form posts here as a plain HTML form (no server action): a React server action's redirect is
   rendered without the per-site proxy rewrite, so /careers/sent would 404. A 303 makes the browser GET the
   confirmation page on its own host, with or without JavaScript. */
export async function POST(req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params
  if (site !== 'logistics') return new Response('Not found', { status: 404 })
  // Same-origin posts only (server actions get this check from Next; a route handler has to do it itself).
  const origin = req.headers.get('origin')
  if (origin && origin !== 'null' && new URL(origin).host !== req.headers.get('host')) return new Response('Forbidden', { status: 403 })
  let formData: FormData
  try { formData = await req.formData() } catch { return new Response('Bad request', { status: 400 }) }
  formData.set('site', 'logistics')
  formData.set('form', 'application')
  const outcome = await submitInquiry(formData, false)
  return new Response(null, { status: 303, headers: { Location: sentUrl(formData, outcome) } })
}
