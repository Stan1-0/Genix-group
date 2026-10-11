import Image from 'next/image'
import { JsonLd } from '@/components/site/JsonLd'
import type { SiteData } from '@/sites/data-shape'
import { QUOTING, SERVICES, SERVICES_INTRO, servicesJsonLd, type ServiceSite } from '@/sites/services'

/* Services page for a division (design/logistics-services.html, design/homeupgrades-services.html): one section per
   service from the shared data, a closing "How quoting works" band. No motion: this page has no MotionRoot. Photos
   render as the Home Upgrades home does (next/image; the Unsplash ones carry its "Stock photo" mark). */
export const SIZES: Record<string, { width: number; height: number }> = {
  '/brand/hu-project-marble-wall.jpg': { width: 1402, height: 1122 },
  '/brand/hu-handyman.jpg': { width: 1600, height: 1067 },
}

export function ServicesPage({ site, data }: { site: ServiceSite; data: SiteData }) {
  const intro = SERVICES_INTRO[site]
  return (
    <main id="main" data-quote-href="/contact">
      <JsonLd data={servicesJsonLd(site, data)} />
      <section className="svcpage-hero" id="services-top">
        <div className="wrap">
          <p className="label">Services</p>
          <h1 className="h-display">{intro.h1}</h1>
          <p className="body svcpage-lede">{intro.lede}</p>
        </div>
      </section>
      {SERVICES[site].map((s) => {
        const dims = s.image ? (SIZES[s.image.src] ?? { width: 900, height: 600 }) : null
        const stock = s.image?.src.startsWith('https://') ?? false
        return (
          <section className="svcpage-item" id={s.id} key={s.id}>
            <div className="wrap svcpage-grid">
              <div className="svcpage-copy">
                <h2 className="h-section">{s.title}</h2>
                <p className="body">{s.body}</p>
                <ul className="svcpage-list">
                  {s.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="svcpage-send"><strong>What to send us:</strong> {s.send}</p>
                <a className="btn btn-gold" href={s.quoteHref}>
                  Get a quote<span className="sr-only"> for {s.title}</span> <span aria-hidden="true">→</span>
                </a>
              </div>
              {s.image && dims && (
                <figure className="svcpage-media">
                  <Image src={s.image.src} alt={s.image.alt} width={dims.width} height={dims.height} sizes="(max-width: 960px) 100vw, 50vw" loading="lazy" />
                  {stock && <span className="svc-stock">Stock photo</span>}
                </figure>
              )}
            </div>
          </section>
        )
      })}
      <section className="svcpage-quoting" id="quoting">
        <div className="wrap">
          <h2 className="h-section">How quoting works</h2>
          <ul className="svcpage-list">
            {QUOTING[site].map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <a className="btn btn-gold" href="/contact">
            Get a quote <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>
    </main>
  )
}
