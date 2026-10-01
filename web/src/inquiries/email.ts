import { SITES, type SiteKey } from '@/sites/config'
import { loadLabel, teamSubject } from './format'
import type { QuoteInput } from './schema'

export type EmailContent = { subject: string; html: string; text: string }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const tel = (p: string) => `tel:+${(p.replace(/\D/g, '').length === 10 ? '1' : '') + p.replace(/\D/g, '')}`

function answers(q: QuoteInput): [string, string][] {
  return [
    ['Type', q.kind === 'move' ? 'Move' : 'Business shipment'],
    ['From', q.from],
    ['To', q.to],
    ['Date', q.flexible ? 'Flexible' : (q.date ?? '')],
    ["What's moving", loadLabel(q.load)],
    ...(q.pallets ? ([['Pallets', String(q.pallets)]] as [string, string][]) : []),
    ['Name', q.name],
    ...(q.phone ? ([['Phone', q.phone]] as [string, string][]) : []),
    ...(q.email ? ([['Email', q.email]] as [string, string][]) : []),
    ...(q.notes ? ([['Notes', q.notes]] as [string, string][]) : []),
  ]
}

function table(rows: [string, string][], phone: string | null): string {
  const cell = 'padding:6px 12px 6px 0;vertical-align:top'
  return `<table style="border-collapse:collapse;font:15px/1.5 Arial,sans-serif;color:#111110">${rows
    .map(([k, v]) => {
      const value = k === 'Phone' && phone ? `<a href="${tel(phone)}" style="color:#012247">${esc(v)}</a>` : esc(v)
      return `<tr><th align="left" style="${cell};color:#625d55;font-weight:600">${esc(k)}</th><td style="${cell}">${value}</td></tr>`
    })
    .join('')}</table>`
}

const shell = (body: string) =>
  `<div style="max-width:560px;margin:0 auto;padding:24px;border-top:4px solid #c28a2c;font:15px/1.5 Arial,sans-serif;color:#111110">${body}</div>`

export function teamEmail({ site, reference, q, adminUrl }: { site: SiteKey; reference: string; q: QuoteInput; adminUrl: string }): EmailContent {
  const rows = answers(q)
  const subject = teamSubject(SITES[site].shortName, q, reference)
  const html = shell(`<p style="margin:0 0 16px;font-weight:700">New quote request · ${esc(reference)}</p>${table(rows, q.phone)}<p style="margin:20px 0 0"><a href="${esc(adminUrl)}" style="color:#012247">Open in the admin</a></p>`)
  const text = [`New quote request · ${reference}`, '', ...rows.map(([k, v]) => `${k}: ${v}`), '', `Admin: ${adminUrl}`].join('\n')
  return { subject, html, text }
}

export function customerEmail({ site, reference, q, phone }: { site: SiteKey; reference: string; q: QuoteInput; phone: string | null }): EmailContent {
  const name = SITES[site].name
  // Structured answers only: free text (notes) is never relayed to an address the visitor typed.
  const rows = answers(q).filter(([k]) => !['Name', 'Phone', 'Email', 'Notes'].includes(k))
  const greet = q.name.trim().slice(0, 40)
  const promise = "We'll get back to you within two business days."
  const call = phone ? `Need us sooner? Call ${phone}.` : 'Need us sooner? Reply to this email.'
  const subject = `We got your request · ${reference}`
  const html = shell(`<p style="margin:0 0 12px">Thanks, ${esc(greet)}. ${promise}</p><p style="margin:0 0 16px">Your reference: <b>${esc(reference)}</b></p>${table(rows, null)}<p style="margin:20px 0 0">${esc(call)}</p><p style="margin:8px 0 0;color:#625d55">${esc(name)} · Part of The Genix Group</p>`)
  const text = [`Thanks, ${greet}. ${promise}`, '', `Your reference: ${reference}`, '', ...rows.map(([k, v]) => `${k}: ${v}`), '', call, `${name} · Part of The Genix Group`].join('\n')
  return { subject, html, text }
}
