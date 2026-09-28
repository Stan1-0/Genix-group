const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]'])

/** True only for a database on this machine. Dev schema push is limited to these,
    so running `npm run dev` or `npm run seed` with a Neon URL can never alter a
    remote schema outside migrations. */
export function isLocalDatabase(url: string | undefined): boolean {
  if (!url) return false
  try {
    return LOOPBACK.has(new URL(url).hostname)
  } catch {
    return false
  }
}
