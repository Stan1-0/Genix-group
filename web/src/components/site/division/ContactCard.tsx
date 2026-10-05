import type { SiteData } from '@/sites/data-shape'

type Site = 'logistics' | 'homeupgrades'

/** Per-division wording; the reply lines match each home page's own "request sent" copy. */
const COPY: Record<Site, { area: (data: SiteData) => string; reply: string }> = {
  logistics: {
    area: (d) => d.areaServed?.name ?? 'Based in San Diego · Nationwide',
    reply: "We'll get back to you within two business days with a price.",
  },
  homeupgrades: {
    area: (d) => `Serving ${d.areaServed?.name ?? 'California'}`,
    reply: "We'll get back to you within two business days to arrange a visit.",
  },
}

/** "Reach us directly" card for a division's Contact page (design/*-contact.html `.contact-card`). */
export function ContactCard({ site, data }: { site: Site; data: SiteData }) {
  const email = data.email ?? 'hello@thegenixgroup.com'
  const copy = COPY[site]
  return (
    <div className="contact-card">
      <h2 className="contact-card-title">Reach us directly</h2>
      <dl>
        <div>
          <dt>Email</dt>
          <dd><a href={`mailto:${email}`}>{email}</a></dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>
            {data.phone ? (
              <a href={`tel:${data.phone.replace(/[^+\d]/g, '')}`}>{data.phone}</a>
            ) : (
              <span className="ph">(000) 000-0000</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Area</dt>
          <dd>{copy.area(data)}</dd>
        </div>
      </dl>
      <p className="contact-reply">{copy.reply}</p>
    </div>
  )
}
