export type SeedTarget = { dbHost: string; local: boolean; blob: boolean; ok: boolean; reason?: string }

const LOCAL = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

/** Where a seed run would write, and whether that is safe. Never exposes credentials. */
export function seedTarget(env: Record<string, string | undefined>): SeedTarget {
  const blob = Boolean(env.BLOB_READ_WRITE_TOKEN?.trim())
  const raw = env.DATABASE_URL?.trim()
  if (!raw) return { dbHost: '', local: false, blob, ok: false, reason: 'DATABASE_URL is not set.' }
  let host: string
  try {
    host = new URL(raw).hostname
  } catch {
    return { dbHost: '', local: false, blob, ok: false, reason: 'DATABASE_URL is not a valid connection string.' }
  }
  if (!host) return { dbHost: '', local: false, blob, ok: false, reason: 'DATABASE_URL has no host.' }
  const local = LOCAL.has(host.toLowerCase())
  if (!local && !blob) {
    return { dbHost: host, local, blob, ok: false, reason: `The database (${host}) is not local but BLOB_READ_WRITE_TOKEN is empty, so the photos would stay on this computer's disk. Set both to the production values.` }
  }
  return { dbHost: host, local, blob, ok: true }
}
