import type { SiteKey } from '@/sites/config'
import { homeupgradesForm } from './homeupgrades'
import { hubForm } from './hub'
import { logisticsForm } from './logistics'
import type { FormDef } from './types'

const FORMS: Partial<Record<SiteKey, FormDef<unknown>>> = {
  logistics: logisticsForm as FormDef<unknown>,
  homeupgrades: homeupgradesForm as FormDef<unknown>,
  hub: hubForm as FormDef<unknown>,
}

export const FORM_SITES = Object.keys(FORMS) as SiteKey[]

export function formFor(site: SiteKey): FormDef<unknown> {
  const def = FORMS[site]
  if (!def) throw new Error(`no quote form for ${site}`)
  return def
}

export function formDataToRawFor(def: FormDef<unknown>, fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of def.fields) out[k] = fd.get(k) ?? ''
  return out
}

export type { FormDef, Row, Contact } from './types'
