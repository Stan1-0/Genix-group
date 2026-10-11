import Image from 'next/image'
import { JsonLd } from '@/components/site/JsonLd'
import { HuQuoteFormBlock } from '@/components/forms/HuQuoteFormBlock'
import { parseHuPreselect } from '@/inquiries/forms/preselect'
import { telHref } from '@/pages-home/homeupgrades/sections/phone'
import type { SiteData } from '@/sites/data-shape'
import { CLOSING, PROCESS, SERVICES, serviceDetailJsonLd, type ServiceItem } from '@/sites/services'
import { SIZES } from './ServicesPage'

/* One Home Upgrades service (design/homeupgrades-service.html): hero, benefit cards, the process, FAQs beside the
   real quote form (this service pre-selected), the other services and a closing band. The copy is the service's
   `detail` in sites/services.ts. No motion: this page has no MotionRoot. Photos render as the services page does. */
const DEFAULT_SIZE = { width: 900, height: 600 }

function Call({ data }: { data: SiteData }) {
  return (
    <a className="btn btn-ghost" href={telHref(data.phone)}>
      {data.phone ? <>Call {data.phone}</> : <span className="ph">Call (000) 000-0000</span>}
    </a>
  )
}

export function ServiceDetailPage({ item, data }: { item: ServiceItem; data: SiteData }) {
  const d = item.detail
  if (!d) return null
  const dims = item.image ? (SIZES[item.image.src] ?? DEFAULT_SIZE) : null
  const stock = item.image?.src.startsWith('https://') ?? false
  const preselect = parseHuPreselect(Object.fromEntries(new URLSearchParams(item.quoteHref.split('?')[1] ?? '')))
  const others = SERVICES.homeupgrades.filter((s) => s.id !== item.id)
  return (
    <main id="main" data-quote-href="#quote">
      <JsonLd data={serviceDetailJsonLd(item, data)} />
      <section className="svcd-hero" id="service-top">
        <div className="wrap svcd-hero-grid">
          <div className="svcd-hero-copy">
            <nav className="svcd-crumbs" aria-label="Breadcrumb">
              <ol>
                <li><a href="/">Home</a></li>
                <li><a href="/services">Services</a></li>
                <li aria-current="page">{item.title}</li>
              </ol>
            </nav>
            <p className="label">{d.eyebrow}</p>
            <h1 className="h-display">{item.title}</h1>
            <p className="svcd-lead">{d.lead}</p>
            <p className="body">{d.intro}</p>
            <div className="hero-actions">
              <a className="btn btn-gold" href="#quote">
                Get a quote <span aria-hidden="true">→</span>
              </a>
              <Call data={data} />
            </div>
          </div>
          {item.image && dims && (
            <figure className="svcd-media">
              <Image src={item.image.src} alt={item.image.alt} width={dims.width} height={dims.height} sizes="(max-width: 960px) 100vw, 50vw" loading="eager" fetchPriority="high" />
              {stock && <span className="svc-stock">Stock photo</span>}
            </figure>
          )}
        </div>
      </section>
      <section className="svcd-fit" id="fit">
        <div className="wrap">
          <p className="label">{d.fit.label}</p>
          <h2 className="h-section">{d.fit.h2}</h2>
          <p className="body">{d.fit.body}</p>
          <ul className="svcd-cards">
            {d.fit.cards.map((c) => (
              <li key={c.title}>
                <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                <h3>{c.title}</h3>
                <p>{c.line}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="svcd-process on-dark" id="process">
        <div className="wrap">
          <p className="label">{PROCESS.label}</p>
          <h2 className="h-section">
            {PROCESS.h2Lead}
            <span className="gold">{PROCESS.h2Gold}</span>
          </h2>
          <ol className="steps">
            {PROCESS.steps.map((s) => (
              <li className="step" key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="svcd-faq-quote" id="quote">
        <div className="wrap svcd-faq-grid">
          <div className="svcd-faq">
            <p className="label">Questions</p>
            <h2 className="h-section">Good to know.</h2>
            {d.faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <div className="svcd-form">
            <HuQuoteFormBlock data={data} preselect={preselect} />
          </div>
        </div>
      </section>
      <section className="svcd-more" id="more">
        <div className="wrap">
          <p className="label">More services</p>
          <h2 className="h-section">A few more possibilities.</h2>
          <ul className="svcd-more-grid">
            {others.map((s) => {
              const sd = s.image ? (SIZES[s.image.src] ?? DEFAULT_SIZE) : null
              return (
                <li key={s.id}>
                  <a href={`/services/${s.id}`}>
                    <div className="svcd-more-img">
                      {s.image && sd && <Image src={s.image.src} alt={s.image.alt} width={sd.width} height={sd.height} sizes="(max-width: 960px) 100vw, 33vw" loading="lazy" />}
                      {s.image?.src.startsWith('https://') && <span className="svc-stock">Stock photo</span>}
                    </div>
                    <div className="svcd-more-body">
                      <h3>{s.title}</h3>
                      <p>{s.body}</p>
                    </div>
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
      <section className="svcd-close" id="close">
        <div className="wrap">
          <h2 className="h-section">{CLOSING.h2}</h2>
          <p className="body">{CLOSING.lede}</p>
          <div className="svcd-close-actions">
            <a className="btn btn-gold" href="#quote">
              Get a quote <span aria-hidden="true">→</span>
            </a>
            <Call data={data} />
          </div>
        </div>
      </section>
    </main>
  )
}