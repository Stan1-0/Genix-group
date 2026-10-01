type Env = Record<string, string | undefined>
export type SendMode = 'live' | 'preview' | 'offline'

/** live: email settings present — save and send for real.
    offline: the production deployment without them — the form says it can't take requests yet.
    preview: everywhere else — save, and write emails to the server log. */
export function inquirySendMode(env: Env): SendMode {
  const production = env.VERCEL_ENV === 'production'
  const hasMail = Boolean(env.RESEND_API_KEY && env.INQUIRY_TO)
  if (hasMail && (!production || env.IP_HASH_SALT)) return 'live'
  return production ? 'offline' : 'preview'
}

export function offlineMessage(phone: string | null): string {
  return phone
    ? `We can't take requests online yet. Call us at ${phone} or email hello@thegenixgroup.com.`
    : "We can't take requests online yet. Email hello@thegenixgroup.com."
}
