import { SITES, type SiteKey } from '@/sites/config'
import type { Row } from './forms/types'

export type EmailContent = { subject: string; html: string; text: string }
export type PhotoLink = { thumb: string; full: string }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const tel = (p: string) => `tel:+${(p.replace(/\D/g, '').length === 10 ? '1' : '') + p.replace(/\D/g, '')}`

function table(rows: Row[],phone: string | null): string {
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


/** `unlinkedPhotos`: photos on the enquiry that can't be linked here (Cloudinary settings missing); the team is told to look in the admin. */
export function teamEmail(a: { site: SiteKey; kind?: 'quote' | 'contact'; reference: string; rows: Row[]; subjectDetails: string; phone: string | null; adminUrl: string; links?: string[]; photos?: PhotoLink[]; unlinkedPhotos?: number }): EmailContent {
  const msg = a.kind === 'contact'
  const subject = `[${SITES[a.site].shortName}] ${msg ? 'Message' : 'Quote'} · ${a.subjectDetails} · ${a.reference}`
  const heading = `${msg ? 'New message' : 'New quote request'} · ${a.reference}`
  const links = a.links ?? []
  const photos = a.photos ?? []
  const note = !photos.length && a.unlinkedPhotos ? `${a.unlinkedPhotos} photo(s) attached — see the admin.` : ''
  const linksHtml = links.length ? `<p style="margin:20px 0 6px;font-weight:600">Inspiration links</p>${links.map((l) => `<p style="margin:0 0 4px"><a href="${esc(l)}" style="color:#012247">${esc(l)}</a></p>`).join('')}` : ''
  const photosHtml = photos.length ? `<p style="margin:20px 0 8px;font-weight:600">Photos (${photos.length})</p><p style="margin:0">${photos.map((p) => `<a href="${esc(p.full)}"><img src="${esc(p.thumb)}" width="120" height="120" alt="Photo" style="border-radius:8px;margin:0 6px 6px 0"></a>`).join('')}</p><p style="margin:4px 0 0;color:#625d55;font-size:13px">Full-size links expire after 30 days; the admin always has them.</p>` : ''
  const html = shell(`<p style="margin:0 0 16px;font-weight:700">${esc(heading)}</p>${table(a.rows, a.phone)}${linksHtml}${photosHtml}${note ? `<p style="margin:20px 0 0;font-weight:600">${esc(note)}</p>` : ''}<p style="margin:20px 0 0"><a href="${esc(a.adminUrl)}" style="color:#012247">Open in the admin</a></p>`)
  const text = [
    heading, '', ...a.rows.map(([k, v]) => `${k}: ${v}`),
    ...(links.length ? ['', 'Inspiration links:', ...links] : []),
    ...(photos.length ? ['', `Photos (${photos.length}):`, ...photos.map((p) => p.full)] : []),
    ...(note ? ['', note] : []),
    '', `Admin: ${a.adminUrl}`,
  ].join('\n')
  return { subject, html, text }
}

export function customerEmail(a: { site: SiteKey; kind?: 'quote' | 'contact'; reference: string; name: string; rows: Row[]; phone: string | null; extraLine?: string }): EmailContent {
  const division = SITES[a.site].name
  const greet = a.name.trim().slice(0, 40)
  const promise = "We'll get back to you within two business days."
  const call = a.phone ? `Need us sooner? Call ${a.phone}.` : 'Need us sooner? Reply to this email.'
  const subject = `We got your ${a.kind === 'contact' ? 'message' : 'request'} · ${a.reference}`
  const sign = a.site === 'hub' ? SITES.hub.name : `${division} · Part of The Genix Group`
  const extra = a.extraLine ? `<p style="margin:12px 0 0">${esc(a.extraLine)}</p>` : ''
  const html = shell(`<p style="margin:0 0 12px">Thanks, ${esc(greet)}. ${promise}</p><p style="margin:0 0 16px">Your reference: <b>${esc(a.reference)}</b></p>${table(a.rows, null)}${extra}<p style="margin:20px 0 0">${esc(call)}</p><p style="margin:8px 0 0;color:#625d55">${esc(sign)}</p>`)
  const text = [`Thanks, ${greet}. ${promise}`, '', `Your reference: ${a.reference}`, '', ...a.rows.map(([k, v]) => `${k}: ${v}`), ...(a.extraLine ? ['', a.extraLine] : []), '', call, sign].join('\n')
  return { subject, html, text }
}
