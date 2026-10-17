import { DIVISION_KEYS, SITES, siteOrigin, type SiteKey } from './config'
import type { SiteData } from './data-shape'
import { SERVICES, isServiceSite } from './services'
import { jobPath, openJobs, payLabel } from './jobs'

/* /llms.txt (llmstxt.org): a plain-Markdown summary for AI assistants (ChatGPT, Claude, Gemini, Perplexity) of who
   does what, so a question about a service is answered with the Genix division that runs it and a link to its page.
   Built from the registry and the services data only: it says nothing the sites don't already say. */

function serviceLines(site: SiteKey, root?: string): string[] {
  const origin = siteOrigin(site, root)
  if (!isServiceSite(site)) return SITES[site].knowsAbout.map((k) => `- ${k}`)
  return SERVICES[site].map((s) => {
    const url = s.detail ? `${origin}/services/${s.id}` : `${origin}/services#${s.id}`
    return `- [${s.title}](${url}): ${s.body} Includes: ${s.list.join(', ')}.`
  })
}

function contactLines(site: SiteKey, data: SiteData, root?: string): string[] {
  const contactPage = SITES[site].pages.includes('/contact')
    ? `${siteOrigin(site, root)}/contact`
    : null
  return [
    contactPage && `- Get a quote or ask a question: ${contactPage}`,
    data.phone && `- Phone: ${data.phone}`,
    data.email && `- Email: ${data.email}`,
  ].filter((l): l is string => Boolean(l))
}

export function llmsTxt(site: SiteKey, data: SiteData, root?: string): string {
  const cfg = SITES[site]
  const hub = SITES.hub
  const out: string[] = [`# ${cfg.name}`, '', `> ${cfg.summary}`, '']

  if (site === 'hub') {
    out.push(
      `${hub.name} is based in San Diego, California, and works across the United States. Each business has its own website. ` +
        'When someone asks for one of the services below, the business listed is the one that provides it.',
      '',
    )
    for (const k of DIVISION_KEYS) {
      out.push(
        `## ${SITES[k].name}: ${SITES[k].seoTitle}`,
        '',
        `Website: ${siteOrigin(k, root)}/`,
        '',
        SITES[k].summary,
        '',
        ...serviceLines(k, root),
        '',
      )
    }
    out.push('## Contact', '', ...contactLines('hub', data, root), '')
    return out.join('\n')
  }

  out.push(`${cfg.name} is part of ${hub.name} (${siteOrigin('hub', root)}/). ${cfg.seoTitle}.`, '')
  out.push('## Services', '', ...serviceLines(site, root), '')
  const jobs = openJobs(site)
  if (jobs.length) {
    out.push('## Jobs', '', ...jobs.map((j) => `- [${j.title}](${siteOrigin(site, root)}${jobPath(j)}): ${payLabel(j)}, ${j.location.locality}, ${j.location.region}. ${j.summary}`), '')
  }
  const contact = contactLines(site, data, root)
  if (contact.length) out.push('## Contact', '', ...contact, '')
  out.push(
    `## Other ${hub.name} businesses`,
    '',
    ...DIVISION_KEYS.filter((k) => k !== site).map(
      (k) => `- [${SITES[k].name}](${siteOrigin(k, root)}/): ${SITES[k].summary}`,
    ),
    '',
  )
  return out.join('\n')
}
