import Image from 'next/image'
import { siteOrigin } from '@/sites/config'

/* The three division panels. Panel inset / video playback attach in Task 11. */
export function Businesses() {
  const logistics = siteOrigin('logistics')
  const homeupgrades = siteOrigin('homeupgrades')
  const multimedia = siteOrigin('multimedia')
  return (
    <div id="businesses">
      <section className="panel" data-key="move" id="div-move" aria-labelledby="h-move">
        <div className="panel-media">
          <Image
            src="https://images.unsplash.com/photo-1766785368863-f2188a8c8b32?w=2000&q=70&auto=format&fit=crop"
            alt=""
            width={2000}
            height={1333}
            sizes="100vw"
            loading="lazy"
          />
        </div>
        <div className="wrap">
          <div>
            <p className="verb">Move</p>
            <div className="brand-tile" style={{ '--zoom': 1, padding: '10px 12px' } as React.CSSProperties}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/genix-logistics-logo.svg" alt="Genix Freight &amp; Logistics logo" width={876} height={405} />
            </div>
            <h3 id="h-move">Genix Logistics</h3>
            <p className="lead">Reliable Freight. Real People. On Time, Every Time.</p>
            <p className="body">
              Business freight, courier runs and home or office moves anywhere in the USA, with clear timelines and a
              real person to call when plans change.
            </p>
            <ul className="chips">
              <li>Business freight</li>
              <li>Last-mile &amp; courier</li>
              <li>Home &amp; office moves</li>
            </ul>
            <div className="panel-cta">
              <a className="btn-accent" href={`${logistics}/#quote-form`}>
                Get a quote <span aria-hidden="true">↗</span>
              </a>
              <a className="host" href={logistics}>
                logistics.thegenixgroup.com
              </a>
            </div>
          </div>
          <div className="cases">
            <h4>Recent work</h4>
            <figure className="case placeholder">
              <div className="case-thumb">Add a real delivery</div>
              <figcaption>
                <b>Placeholder: a recent haul</b>
                <span>Route, load and turnaround time go here.</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="panel" data-key="make" id="div-make" aria-labelledby="h-make">
        <div className="panel-media">
          <Image src="/brand/hu-project-marble-wall.jpg" alt="" width={1122} height={1402} sizes="100vw" loading="lazy" />
        </div>
        <div className="wrap">
          <div>
            <p className="verb">Make</p>
            <div className="brand-tile" style={{ '--zoom': 1 } as React.CSSProperties}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="tall" src="/brand/genix-home-upgrades-logo.svg" alt="Genix Home Upgrade logo" width={976} height={722} />
            </div>
            <h3 id="h-make">Genix Home Upgrades</h3>
            <p className="lead">From Blueprint to Beautiful.</p>
            <p className="body">
              Renovations, feature walls, fittings and outdoor builds for homes and commercial buildings, from the first
              site visit to the final finish.
            </p>
            <ul className="chips">
              <li>Renovation</li>
              <li>Feature walls</li>
              <li>Outdoor builds</li>
            </ul>
            <div className="panel-cta">
              <a className="btn-accent" href={`${homeupgrades}/contact`}>
                Plan an upgrade <span aria-hidden="true">↗</span>
              </a>
              <a className="host" href={homeupgrades}>
                homeupgrades.thegenixgroup.com
              </a>
            </div>
          </div>
          <div className="cases">
            <h4>Recent work</h4>
            <figure className="case">
              <div className="case-thumb">
                <Image
                  src="/brand/hu-project-marble-wall.jpg"
                  alt="Backlit marble feature wall with gold veining, a floating media console and slatted wood shelving"
                  width={1122}
                  height={1402}
                  sizes="(max-width: 900px) 90vw, 33vw"
                  loading="lazy"
                />
              </div>
              <figcaption>
                <b>Marble feature wall</b>
                <span>Backlit stone panels, floating console and lit shelving.</span>
              </figcaption>
            </figure>
            <figure className="case">
              <div className="case-thumb">
                {/* preload="none" + poster: the video downloads only once the card is on screen (the hero reel already
                    loads this file; fetching it twice on page load cost 2.2 MB) */}
                <video
                  src="/brand/hu-project.mp4"
                  poster="/brand/hu-project-poster.jpg"
                  muted
                  loop
                  playsInline
                  preload="none"
                  aria-label="Genix Home Upgrades crew building a custom TV wall, from framing to the finished, backlit unit"
                ></video>
              </div>
              <figcaption>
                <b>Customized TV unit</b>
                <span>Our crew on site, remodeling a TV area.</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="panel" data-key="tell" id="div-tell" aria-labelledby="h-tell">
        <div className="panel-media">
          <Image
            src="https://images.unsplash.com/photo-1632187981988-40f3cbaeef5e?w=2000&q=70&auto=format&fit=crop"
            alt=""
            width={2000}
            height={1333}
            sizes="100vw"
            loading="lazy"
          />
        </div>
        <div className="wrap">
          <div>
            <p className="verb">Tell</p>
            <div className="brand-tile">
              <div className="wm">
                <b>
                  GENI<i>X</i>
                </b>
                <small>MULTIMEDIA</small>
              </div>
            </div>
            <h3 id="h-tell">Genix Multimedia</h3>
            <p className="lead">Your Story, Captured and Amplified.</p>
            <p className="body">Photography, video, branding and design for businesses and the people behind them.</p>
            <ul className="chips">
              <li>Photography</li>
              <li>Video production</li>
              <li>Branding &amp; design</li>
            </ul>
            <div className="panel-cta">
              <a className="btn-accent" href={`${multimedia}/contact`}>
                Book a shoot <span aria-hidden="true">↗</span>
              </a>
              <a className="host" href={multimedia}>
                multimedia.thegenixgroup.com
              </a>
            </div>
          </div>
          <div className="cases">
            <h4>Recent work</h4>
            <figure className="case placeholder">
              <div className="case-thumb">Add a real shoot</div>
              <figcaption>
                <b>Placeholder: a recent production</b>
                <span>Client, deliverable and result go here.</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>
    </div>
  )
}
