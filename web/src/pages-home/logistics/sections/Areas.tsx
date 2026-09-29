/* Where we go */
export function Areas() {
  return (
    <section className="sec areas lane-top" id="areas" aria-labelledby="areasTitle">
      <div className="wrap">
        <div>
          <p className="label">Where we go</p>
          <h2 className="h-section" id="areasTitle" data-split>
            Anywhere in <span className="gold">the USA.</span>
          </h2>
          <p className="body">
            Based in San Diego, running freight and moves coast to coast. Not sure about a route?{' '}
            <a href="#quote-form" data-start-quote>Ask us</a>.
          </p>
        </div>
        <ul className="area-list" data-reveal>
          <li>West Coast <span>CA · OR · WA</span></li>
          <li>Southwest <span>AZ · NV · NM</span></li>
          <li>Mountain West <span>CO · UT · ID</span></li>
          <li>Midwest <span>OH · IL · MI</span></li>
          <li>South <span>TX · GA · FL</span></li>
          <li>Northeast <span>NY · PA · MA</span></li>
        </ul>
      </div>
    </section>
  )
}
