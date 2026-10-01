/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; an unset or empty secret never authorizes. */
export function cronAuthorized(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret) return false
  return authHeader === `Bearer ${secret}`
}
