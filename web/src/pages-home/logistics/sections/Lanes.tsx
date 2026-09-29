/* Two lanes of services */
export function Lanes() {
  return (
    <section className="sec lanes" id="services" aria-labelledby="servicesTitle">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="label" data-reveal>What we move</p>
            <h2 className="h-section" id="servicesTitle" data-split>
              Two ways <span className="gold">we help.</span>
            </h2>
          </div>
          <p className="body" data-reveal>
            For businesses that ship every week, and for people moving once. Either way it starts with the same short form.
          </p>
        </div>
        <div className="lane-grid swipe">
          <article className="lane-card" data-reveal>
            <p className="mono lane-tag">For businesses</p>
            <h3>Freight &amp; deliveries</h3>
            <p>
              Pallets, part loads and full truckloads for shops, suppliers and contractors, plus same-day and next-day courier runs across California.
            </p>
            <ul className="ticks">
              <li>Pallets &amp; part loads</li>
              <li>Full truckloads</li>
              <li>Last-mile &amp; courier</li>
            </ul>
            <a className="btn btn-dark" href="#quote-form" data-kind="business">
              Price a shipment <span aria-hidden="true">→</span>
            </a>
          </article>
          <article className="lane-card" data-reveal>
            <p className="mono lane-tag">For moves</p>
            <h3>Home &amp; office moves</h3>
            <p>
              Apartments, family homes and offices, moved on the day we agree, with the price settled before anything is lifted.
            </p>
            <ul className="ticks">
              <li>Studio to 3+ bedrooms</li>
              <li>Office moves</li>
              <li>Local &amp; long-distance moves</li>
            </ul>
            <a className="btn btn-dark" href="#quote-form" data-kind="move">
              Price a move <span aria-hidden="true">→</span>
            </a>
          </article>
        </div>
      </div>
    </section>
  )
}
