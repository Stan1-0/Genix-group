import { createHmac } from 'node:crypto'
import type { QuoteInput } from './schema'

export const formatReference = (prefix: string, n: number) => `GX-${prefix}-${String(n).padStart(6, '0')}`

export const hashIp = (ip: string, salt: string) => createHmac('sha256', salt).update(ip).digest('hex')

const LOAD_LABELS: Record<string, string> = {
  pallets: 'Pallets', parcels: 'Parcels or boxes', truckload: 'Full truckload', courier: 'Same-day courier',
  studio: 'Studio', '1-2bed': '1–2 bedroom home', '3bed': '3+ bedroom home', office: 'Office',
}
export const loadLabel = (load: string) => LOAD_LABELS[load] ?? load

export function quoteSummary(q: QuoteInput): string {
  const what = q.load === 'pallets' && q.pallets ? `${q.pallets} pallet${q.pallets === 1 ? '' : 's'}` : loadLabel(q.load)
  return `${q.from} → ${q.to} · ${what}`
}

export const teamSubject = (division: string, q: QuoteInput, reference: string) => `[${division}] Quote · ${quoteSummary(q)} · ${reference}`
