import Image from 'next/image'
import { GoldHeading } from '../../GoldHeading'
import type { SiteData } from '@/sites/data-shape'

const LEAD =
  "Logistics, home upgrades and multimedia: three specialist businesses, one group. Tell us what you need and we'll put the right crew on it."

/* Hero: lockup, headline, route buttons and the footage reel (reel behaviour attaches in Task 11). */
export function Hero({ data }: { data: SiteData }) {
  return (
    <section className="hero" id="hero">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className="label">An American company · San Diego, California</p>
          <div className="lockup">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="lockup-mark" src="/brand/genix-mark.svg" alt="" width={360} height={421} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="lockup-word" src="/brand/genix-wordmark.svg" alt="The Genix Group" width={874} height={298} />
          </div>
          <GoldHeading site="hub" text={data.heroHeading} split={false} />
          <p className="body">{data.heroSubheading || LEAD}</p>
          <div className="routes">
            <a className="route-btn" href="#div-move" style={{ '--c': 'var(--move)' } as React.CSSProperties}>
              <i></i>Ship something
            </a>
            <a className="route-btn" href="#div-make" style={{ '--c': 'var(--gold)' } as React.CSSProperties}>
              <i></i>Upgrade a space
            </a>
            <a className="route-btn" href="#div-tell" style={{ '--c': 'var(--tell)' } as React.CSSProperties}>
              <i></i>Tell your story
            </a>
          </div>
        </div>

        <figure className="reel" aria-label="Work from each Genix business">
          <div className="reel-frame">
            <div className="slide" data-name="Logistics">
              <Image
                src="https://images.unsplash.com/photo-1786081061992-640cfd629fdc?w=1200&q=70&auto=format&fit=crop"
                alt="A semi-truck on the highway at night"
                width={1200}
                height={900}
                sizes="(max-width: 900px) 100vw, 50vw"
              />
              <p className="reel-cap">
                Move<b>Genix Logistics</b>
              </p>
            </div>
            <div className="slide on" data-name="Home Upgrades">
              <Image
                src="/brand/hu-project-marble-wall.jpg"
                alt="Backlit marble feature wall by Genix Home Upgrades"
                width={1122}
                height={1402}
                sizes="(max-width: 900px) 100vw, 50vw"
                loading="eager"
                fetchPriority="high"
              />
              <video src="/brand/hu-project.mp4" muted loop playsInline preload="metadata" aria-hidden="true"></video>
              <p className="reel-cap">
                Make<b>Genix Home Upgrades</b>
              </p>
            </div>
            <div className="slide" data-name="Multimedia">
              <Image
                src="https://images.unsplash.com/photo-1625690303837-654c9666d2d0?w=1200&q=70&auto=format&fit=crop"
                alt="A camera operator filming under studio light"
                width={1200}
                height={900}
                sizes="(max-width: 900px) 100vw, 50vw"
              />
              <p className="reel-cap">
                Tell<b>Genix Multimedia</b>
              </p>
            </div>
          </div>
          <div className="now" id="nowBar" hidden>
            <div className="now-dots" role="group" aria-label="Choose which business the reel shows">
              <button aria-pressed="false" aria-label="Show Genix Logistics"></button>
              <button aria-pressed="true" aria-label="Show Genix Home Upgrades"></button>
              <button aria-pressed="false" aria-label="Show Genix Multimedia"></button>
            </div>
            <span>
              Now showing: <b id="nowName">Home Upgrades</b>
            </span>
          </div>
        </figure>
      </div>
    </section>
  )
}
