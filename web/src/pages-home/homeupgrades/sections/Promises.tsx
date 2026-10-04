/* Promise strip under the hero: four short promises, each a line icon plus a two-line label.
   Mirrors the "Promises" block in design/homeupgrades-home.html. */
const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export function Promises() {
  return (
    <section className="promises" aria-label="Why Genix Home Upgrades">
      <div className="wrap">
        <ul>
          <li data-reveal>
            <svg {...svgProps}>
              <path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9L11 3z" />
              <path d="M19 15v6M16 18h6" className="gold" />
            </svg>
            <div>
              <p className="promise-title">Care in every detail</p>
              <p className="promise-line">Thoughtful craftsmanship</p>
            </div>
          </li>
          <li data-reveal>
            <svg {...svgProps}>
              <path d="M4 5h16v11H10l-5 4v-4H4V5z" />
              <path d="M8 9.5h8M8 12.5h5" className="gold" />
            </svg>
            <div>
              <p className="promise-title">No guesswork</p>
              <p className="promise-line">Clear, honest communication</p>
            </div>
          </li>
          <li data-reveal>
            <svg {...svgProps}>
              <path d="M5 21V4h9v17M14 9h5v12M3 21h18" />
              <path d="M8 8h3M8 12h3M8 16h3" className="gold" />
            </svg>
            <div>
              <p className="promise-title">For every kind of space</p>
              <p className="promise-line">Residential &amp; commercial</p>
            </div>
          </li>
          <li data-reveal>
            <svg {...svgProps}>
              <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
              <circle cx="12" cy="9.5" r="2.5" className="gold" />
            </svg>
            <div>
              <p className="promise-title">Your local project partner</p>
              <p className="promise-line">Serving California</p>
            </div>
          </li>
        </ul>
      </div>
    </section>
  )
}
