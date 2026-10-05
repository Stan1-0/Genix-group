import { siteOrigin } from '@/sites/config'
import type { SiteData } from '@/sites/data-shape'

const PRIVACY_URL = `${siteOrigin('hub')}/privacy`

/** Prototype footer for the hub (design/hub-home.html). */
export function HubFooter({ data }: { data: SiteData }) {
  const email = data.email ?? 'hello@thegenixgroup.com'
  return (
    <footer className="site-footer" data-quote-bar-hide>
      <div className="wrap">
        <div className="brand">
          <a className="logo-tile" href="/#top" aria-label="The Genix Group home">
            <span className="logo-tile-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="logo-mark" src="/brand/genix-mark.svg" alt="" width={290} height={340} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="logo-word" src="/brand/genix-wordmark.svg" alt="" width={832} height={326} />
            </span>
          </a>
        </div>
        <div>
          <h2>Businesses</h2>
          <ul>
            <li>
              <a href={siteOrigin('logistics')}><span className="dot" style={{ background: 'var(--move)' }}></span>Genix Logistics</a>
            </li>
            <li>
              <a href={siteOrigin('homeupgrades')}><span className="dot" style={{ background: 'var(--make)' }}></span>Genix Home Upgrades</a>
            </li>
            <li>
              <a href={siteOrigin('multimedia')}><span className="dot" style={{ background: 'var(--tell)' }}></span>Genix Multimedia</a>
            </li>
          </ul>
        </div>
        <div>
          <h2>Group</h2>
          <ul>
            <li><a href="/#about">Who we are</a></li>
            <li><a href="/#businesses">Our businesses</a></li>
            <li><a href="/#contact">Get a quote</a></li>
          </ul>
        </div>
        <div>
          <h2>Head office</h2>
          <ul>
            <li>San Diego, California, USA</li>
            <li><a href={`mailto:${email}`}>{email}</a></li>
          </ul>
        </div>
        <div className="legal">
          <span>© 2026 The Genix Group</span>
          <span><a href={PRIVACY_URL}>Privacy policy</a>&nbsp;&nbsp;thegenixgroup.com</span>
        </div>
      </div>
    </footer>
  )
}
