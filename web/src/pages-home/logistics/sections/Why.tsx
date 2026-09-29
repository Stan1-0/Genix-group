/* Why Genix + proof slots (numbers and photos arrive later) */
export function Why() {
  return (
    <section className="sec why" id="why" aria-labelledby="whyTitle">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="label">Why Genix</p>
            <h2 className="h-section" id="whyTitle" data-split>
              Freight without <span className="gold">the guesswork.</span>
            </h2>
          </div>
          <p className="body">What you can count on, from the first call to the signature.</p>
        </div>
        <ul className="promises">
          <li data-reveal>
            <h3>A real person to call</h3>
            <p>Call or text the team handling your load when plans change.</p>
          </li>
          <li data-reveal>
            <h3>Clear timelines</h3>
            <p>A confirmed date and pickup window before anything moves.</p>
          </li>
          <li data-reveal>
            <h3>Price first</h3>
            <p>You see the price before we schedule anything.</p>
          </li>
        </ul>
        <div className="proof">
          <div className="ph"><b>—</b><span>Deliveries completed</span></div>
          <div className="ph"><b>—</b><span>Years on the road</span></div>
          <div className="ph"><b>—</b><span>Recent jobs: photos go here</span></div>
        </div>
      </div>
    </section>
  )
}
