import type { Payload } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { SITES, type SiteKey } from '@/sites/config'
import { formatReference } from './format'

/** Atomic per-division counter: one statement, so concurrent submissions never share a number.
    A failed insert afterwards leaves a gap, which is fine for a lead reference. */
export async function nextReference(payload: Payload, site: SiteKey): Promise<string> {
  const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: { value: string | number }[] }> } }).drizzle
  const res = await db.execute(sql`
    INSERT INTO inquiry_counters (division, value, updated_at, created_at)
    VALUES (${site}, 1, now(), now())
    ON CONFLICT (division) DO UPDATE SET value = inquiry_counters.value + 1, updated_at = now()
    RETURNING value`)
  return formatReference(SITES[site].inquiryPrefix, Number(res.rows[0].value))
}
