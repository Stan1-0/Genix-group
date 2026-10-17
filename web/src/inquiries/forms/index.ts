import type { SiteKey } from '@/sites/config'
import { homeupgradesForm } from './homeupgrades'
import { hubForm } from './hub'
import { jobApplicationForm } from './job'
import { logisticsForm } from './logistics'
import type { FormDef, InquiryType } from './types'

const FORMS: Partial<Record<SiteKey, FormDef<unknown>>> = {
  logistics: logisticsForm as FormDef<unknown>,
  homeupgrades: homeupgradesForm as FormDef<unknown>,
  hub: hubForm as FormDef<unknown>,
}

export const FORM_SITES = Object.keys(FORMS) as SiteKey[]

/** The site's own form, or a job application (stored with type 'application') when `type` says so. */
export function formFor(site: SiteKey, type?: InquiryType | string | null): FormDef<unknown> {
  if (type === 'application') {
    if (site !== jobApplicationForm.site) throw new Error(`no job application form for ${site}`)
    return jobApplicationForm as FormDef<unknown>
  }
  const def = FORMS[site]
  if (!def) throw new Error(`no quote form for ${site}`)
  return def
}

export function formDataToRawFor(def: FormDef<unknown>, fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of def.fields) out[k] = fd.get(k) ?? ''
  return out
}

export type { FormDef, Row, Contact, InquiryType } from './types'
