/* The quote form is look-only until the enquiry pipeline exists (owner decision,
   2026-09-29). On the production deployment, Send must never pretend a request was received. */
export type SendMode = 'preview' | 'offline'

export function quoteSendMode(vercelEnv: string | undefined): SendMode {
  return vercelEnv === 'production' ? 'offline' : 'preview'
}

export function offlineMessage(phone: string | null): string {
  return phone
    ? `We can't take requests online yet. Call us at ${phone} or email hello@thegenixgroup.com.`
    : "We can't take requests online yet. Email hello@thegenixgroup.com."
}
