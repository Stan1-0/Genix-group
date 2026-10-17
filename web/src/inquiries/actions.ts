'use server'
import { redirect } from 'next/navigation'
import type { QuoteResult } from './pipeline'
import { sentUrl, submitInquiry } from './submit'

export async function submitQuote(_prev: QuoteResult | null, formData: FormData): Promise<QuoteResult> {
  const js = formData.get('js') === '1'
  const outcome = await submitInquiry(formData, js)
  // The enhancer never calls this in offline mode; a no-JS post gets the honest look-only message.
  if (js) return outcome === 'offline' ? { ok: false, error: 'server' } : outcome
  redirect(sentUrl(formData, outcome))
}

/** The form's own action, used by a plain (no-JS) post. */
export async function submitQuoteForm(formData: FormData): Promise<void> {
  await submitQuote(null, formData) // no `js` field, so submitQuote redirects to /quote/sent
}
