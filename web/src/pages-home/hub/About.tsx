import { SITES, siteOrigin, type SiteKey } from '@/sites/config'
import { formatAddress, type SiteData } from '@/sites/data-shape'

/** The two <h2>s, in page order; the page and its tests share this list. */
export const ABOUT_HEADINGS = ['Three businesses, one standard', 'Find us'] as const

type Biz = { key: Exclude<SiteKey, 'hub'>; verb: string; color: string; body: string; promises: string[] }

/* Promise titles are copied from the Logistics "Why" list and the Home Upgrades promise strip. */
const BUSINESSES: Biz[] = [
  { key: 'logistics', verb: 'Move', color: 'var(--move)', body: 'Business freight, courier runs and home or office moves anywhere in the USA.', promises: ['A real person to call', 'Clear timelines', 'Price first'] },
  { key: 'homeupgrades', verb: 'Make', color: 'var(--make)', body: 'Accent walls, TV units, outdoor builds and handyman jobs for homes and commercial buildings.', promises: ['Care in every detail', 'No guesswork', 'For every kind of space', 'Your local project partner'] },
  { key: 'multimedia', verb: 'Tell', color: 'var(--tell)', body: 'Photography, video, branding and design for businesses and the people behind them.', promises: [] },
]

/* About page (design/hub-about.html). No motion: this page renders no MotionRoot/HubMotion. */
export function HubAbout({ data }: { data: SiteData }) {
  const email = data.email ?? 'hello@thegenixgroup.com'
  return (
    <main id="main">
      <section className="about-hero" id="about-top">
        <div className="wrap">
          <p className="label">About</p>
          <h1>One group. Three crews. One standard of work.</h1>
          <p className="body">
            We run freight, home upgrades and multimedia under one roof, so the care you get from one Genix business is
            the care you get from all of them. One conversation can cover the move, the build and the photos.
          </p>
        </div>
      </section>
      <section className="about-businesses" id="about-businesses">
        <div className="wrap">
          <h2>{ABOUT_HEADINGS[0]}</h2>
          <ul className="about-biz-list">
            {BUSINESSES.map((b) => (
              <li className="about-biz" key={b.key} style={{ '--c': b.color } as React.CSSProperties}>
                <p className="about-verb">
                  <span className="dot" aria-hidden="true"></span>
                  {b.verb}
                </p>
                <div>
                  <h3><a href={siteOrigin(b.key)}>{SITES[b.key].name}</a></h3>
                  <p className="about-tag">{SITES[b.key].tagline}</p>
                  <p className="body">{b.body}</p>
                  {b.promises.length > 0 && (
                    <ul className="about-promises">
                      {b.promises.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="about-find" id="about-find">
        <div className="wrap">
          <h2>{ABOUT_HEADINGS[1]}</h2>
          <ul className="facts">
            <li><span>Head office</span><span>San Diego, CA</span></li>
            <li><span>Serving</span><span>Customers across the USA</span></li>
            <li><span>Email</span><span><a href={`mailto:${email}`}>{email}</a></span></li>
            {data.address && <li><span>Address</span><span>{formatAddress(data.address)}</span></li>}
          </ul>
          <a className="about-cta" href="/contact">
            Start a conversation <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
    </main>
  )
}
