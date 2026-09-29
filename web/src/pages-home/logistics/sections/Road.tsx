/* How a job runs: the truck drives the road as the section scrolls past (road enhancer). */
export function Road() {
  return (
    <section className="sec route on-dark" id="how" aria-labelledby="howTitle">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="label">How a job runs</p>
            <h2 className="h-section" id="howTitle" data-split>
              Quote to <span className="gold">delivered.</span>
            </h2>
          </div>
          <p className="body">Four stops, the same for a pallet or a three-bedroom move.</p>
        </div>
        <div className="road" data-road>
          <div className="road-line" aria-hidden="true">
            <span className="road-fill"></span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="road-truck" src="/brand/logistics-truck.svg" alt="" width={486} height={166} />
          <ol className="stops">
            <li className="stop" data-stop>
              <span className="stop-dot" aria-hidden="true"></span>
              <p className="mono">01 · Quote</p>
              <h3>We price it</h3>
              <p>
                You send the route; we reply with a price <span className="ph">within one business day</span>.
              </p>
            </li>
            <li className="stop" data-stop>
              <span className="stop-dot" aria-hidden="true"></span>
              <p className="mono">02 · Scheduled</p>
              <h3>Date confirmed</h3>
              <p>
                Pickup date and window agreed, <span className="ph">with a reminder the day before</span>.
              </p>
            </li>
            <li className="stop" data-stop>
              <span className="stop-dot" aria-hidden="true"></span>
              <p className="mono">03 · Picked up</p>
              <h3>On the road</h3>
              <p>
                Loaded and secured. <span className="ph">We text when the driver is on the way.</span>
              </p>
            </li>
            <li className="stop" data-stop>
              <span className="stop-dot" aria-hidden="true"></span>
              <p className="mono">04 · Delivered</p>
              <h3>Signed for</h3>
              <p>
                Dropped off and signed for<span className="ph">, with photo proof on request</span>.
              </p>
              <span className="stamp" aria-hidden="true">Delivered</span>
            </li>
          </ol>
        </div>
      </div>
    </section>
  )
}
