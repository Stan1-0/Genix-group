import { JsonLd } from '@/components/site/JsonLd'
import type { SiteData } from '@/sites/data-shape'
import { QUOTING, SERVICES, serviceDetailJsonLd, type ServiceItem } from '@/sites/services'

/* One Logistics service: its own page so a search for that service lands on the division that runs it. Built only
   from classes the Logistics home and services pages already use (svcpage-*, promises, faq-list, ticks), and copy
   the site already says (sections Lanes, Why, Areas, Faq; the quote form's "what to send"). No motion. */
export function LogisticsServiceDetailPage({ item, data }: { item: ServiceItem; data: SiteData }) {
  const d = item.detail
  if (!d) return null
  const others = SERVICES.logistics.filter((s) => s.id !== item.id && s.detail)
  return (
    <main id="main" data-quote-href={item.quoteHref}>
      <JsonLd data={serviceDetailJsonLd(item, data, undefined, 'logistics')} />
      <section className="svcpage-hero" id="service-top">
        <div className="wrap">
          <nav aria-label="Breadcrumb">
            <p className="label">
              <a href="/">Home</a> / <a href="/services">Services</a> /{' '}
              <span aria-current="page">{item.title}</span>
            </p>
          </nav>
          <p className="mono">{d.eyebrow}</p>
          <h1 className="h-display">{item.title}</h1>
          <p className="body svcpage-lede">{d.intro}</p>
        </div>
      </section>
      <section className="svcpage-item" id={item.id}>
        <div className="wrap svcpage-grid">
          <div className="svcpage-copy">
            <h2 className="h-section">{d.lead}</h2>
            <ul className="ticks">
              {item.list.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="svcpage-send">
              <strong>What to send us:</strong> {item.send}
            </p>
            <a className="btn btn-gold" href={item.quoteHref}>
              Get a quote<span className="sr-only"> for {item.title}</span>{' '}
              <span aria-hidden="true">→</span>
            </a>
            {others.map((s) => (
              <a className="svcpage-more" href={`/services/${s.id}`} key={s.id}>
                Also: {s.title} <span aria-hidden="true">→</span>
              </a>
            ))}
          </div>
        </div>
      </section>
      <section className="sec why" id="why" aria-labelledby="whyTitle">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="label">{d.fit.label}</p>
              <h2 className="h-section" id="whyTitle">
                {d.fit.h2}
              </h2>
            </div>
            <p className="body">{d.fit.body}</p>
          </div>
          <ul className="promises">
            {d.fit.cards.map((c) => (
              <li key={c.title}>
                <h3>{c.title}</h3>
                <p>{c.line}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="sec faq lane-top" id="faq" aria-labelledby="faqTitle">
        <div className="wrap">
          <p className="label">Questions</p>
          <h2 className="h-section" id="faqTitle">
            Good to know.
          </h2>
          <div className="faq-list">
            {d.faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className="svcpage-quoting" id="quoting">
        <div className="wrap">
          <h2 className="h-section">How quoting works</h2>
          <ul className="svcpage-list">
            {QUOTING.logistics.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <a className="btn btn-gold" href={item.quoteHref}>
            Get a quote <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>
    </main>
  )
}
