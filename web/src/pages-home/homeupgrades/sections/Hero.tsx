import { BeforeAfter } from '@/components/motion/BeforeAfter'
import Image from 'next/image'
import { GoldHeading } from '../../GoldHeading'
import type { SiteData } from '@/sites/data-shape'
import { telHref } from './phone'

const LEAD = 'Renovations, feature walls and custom TV units, planned with you and built by our own crew.'

/* Hero: headline, lead, actions and the before/after slider (behaviour attaches in the slider enhancer). */
export function Hero({ data }: { data: SiteData }) {
  return (
    <section className="hero" data-hero>
      <div className="wrap">
        <div className="hero-copy">
          <p className="label">Genix Home Upgrades</p>
          <GoldHeading site="homeupgrades" text={data.heroHeading} className="h-display" />
          <p className="lead">{data.heroSubheading || LEAD}</p>
          <p className="body">
            From the first site visit to the final walkthrough, you get one team, a written quote before work starts, and a site kept tidy while we build.
          </p>
          <div className="hero-actions">
            <a className="btn btn-dark" href="#quote">
              Plan an upgrade <span aria-hidden="true">→</span>
            </a>
            <a className="btn btn-ghost" href={telHref(data.phone)}>
              {data.phone ? <>Call {data.phone}</> : <span className="ph">Call (000) 000-0000</span>}
            </a>
          </div>
        </div>

        <figure className="ba-wrap">
          <div className="ba" id="ba">
            <Image
              src="/brand/hu-ba-finished.jpg"
              alt="Finished: backlit marble TV wall with slatted wood surround and warm LED glow"
              width={1004}
              height={752}
              sizes="(max-width: 900px) 100vw, 50vw"
              loading="eager"
              fetchPriority="high"
            />
            <div className="ba-before">
              <Image
                src="/brand/hu-ba-midbuild.jpg"
                alt="Mid-build: the same wall with the marble panel and slats up, before lighting and finishing"
                width={1004}
                height={752}
                sizes="(max-width: 900px) 100vw, 50vw"
                loading="eager"
                fetchPriority="high"
              />
            </div>
            <span className="ba-tag ba-tag-before" aria-hidden="true">
              Mid-build
            </span>
            <span className="ba-tag ba-tag-after" aria-hidden="true">
              Finished
            </span>
            <div
              className="ba-handle"
              id="baHandle"
              role="slider"
              tabIndex={0}
              aria-label="Compare mid-build and finished"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={50}
              aria-valuetext="50% mid-build"
            >
              <span className="ba-knob" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l-5 6 5 6M15 6l5 6-5 6" />
                </svg>
              </span>
            </div>
          </div>
          <figcaption className="ba-cap">
            <span>
              <b>Drag to see the build.</b>
            </span>
            <span>Backlit marble TV wall · Genix Home Upgrades</span>
          </figcaption>
        </figure>
        <BeforeAfter />
      </div>
    </section>
  )
}
