/* Intro: who we are. */
export function Intro() {
  return (
    <section className="intro" id="about">
      <div className="wrap grid">
        <div>
          <p className="label" data-reveal>
            Who we are
          </p>
          <h2 data-reveal>One group. Three crews. One standard of work.</h2>
        </div>
        <div>
          <p className="body" data-reveal>
            We run freight, home upgrades and multimedia under one roof, so the care you get from one Genix business is
            the care you get from all of them. One conversation can cover the move, the build and the photos.
          </p>
          <ul className="facts" data-reveal>
            <li>
              <span>Head office</span>
              <span>San Diego, CA</span>
            </li>
            <li>
              <span>Serving</span>
              <span>Customers across the USA</span>
            </li>
            <li>
              <span>Businesses</span>
              <span>Logistics ·{' '}Home{' '}Upgrades ·{' '}Multimedia</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
