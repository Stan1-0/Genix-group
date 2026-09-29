type Env = Record<string, string | undefined>

/** Names of required settings that are missing. Empty outside production so local dev,
    tests and `next build` on a laptop keep working. On Vercel (VERCEL_ENV set) uploads
    also need the Blob token: without it Payload writes to ./media, which is read-only
    or ephemeral there, so uploaded images would silently vanish. */
export function missingProductionEnv(env: Env): string[] {
  if (env.NODE_ENV !== 'production') return []
  const missing = ['PAYLOAD_SECRET', 'DATABASE_URL'].filter((k) => !env[k])
  if (env.VERCEL_ENV && !env.BLOB_READ_WRITE_TOKEN) missing.push('BLOB_READ_WRITE_TOKEN')
  return missing
}

export function assertProductionEnv(env: Env): void {
  const missing = missingProductionEnv(env)
  if (missing.length) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}. See README "Deploy (Vercel)".`)
  }
}
