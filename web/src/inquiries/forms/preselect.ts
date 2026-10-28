/** Which service a link to /contact pre-selects. Only allow-listed single values count; the raw
    query is never rendered. Used by the /contact route; the home pages never pre-select. */
export type Query = Record<string, string | string[] | undefined>
export type LogisticsPreselect = { kind?: 'business' | 'move' }
export type HuPreselect = { project?: 'accent' | 'outdoor' | 'other'; property?: 'home' | 'business' | 'church' }

const pick = <T extends string>(v: string | string[] | undefined, allowed: readonly T[]): T | undefined =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined

export function parseLogisticsPreselect(q: Query): LogisticsPreselect {
  const kind = pick(q.kind, ['business', 'move'] as const)
  return kind ? { kind } : {}
}

export function parseHuPreselect(q: Query): HuPreselect {
  const project = pick(q.project, ['accent', 'outdoor', 'other'] as const)
  const property = pick(q.property, ['home', 'business', 'church'] as const)
  return { ...(project ? { project } : {}), ...(property ? { property } : {}) }
}
