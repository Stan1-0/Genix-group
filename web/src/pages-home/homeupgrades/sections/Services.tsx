import Image from 'next/image'

/* Services: upgrade cards with a Home | Business toggle (CSS only: radios + :has in the prototype CSS,
   cards tagged with data-aud). Renovation is commented out. Stock photos are remote (Unsplash, allowed
   in next.config) and marked as stock. */
export function Services() {
  return (
    <section className="services" id="services">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="label" data-reveal>
              What we do
            </p>
            <h2 className="h-section" data-split>
              Good things start with the right helping hand.
            </h2>
          </div>
          <p className="body" data-reveal>
            One task or a whole to-do list. We make the next step simple.
          </p>
        </div>
        <fieldset className="svc-toggle" data-reveal>
          <legend className="sr-only">Show services for</legend>
          <input type="radio" name="svc-aud" id="svc-aud-home" value="home" defaultChecked />
          <label htmlFor="svc-aud-home">Home</label>
          <input type="radio" name="svc-aud" id="svc-aud-business" value="business" />
          <label htmlFor="svc-aud-business">Business</label>
        </fieldset>
        <div className="svc-grid swipe">
          {/* Renovation: not offered for now (owner, 2026-09-30). Restore this card and set the
              grid to 4 columns if it returns.
          <article className="svc" data-reveal>
            <div className="svc-img">
              <Image
                src="https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?w=900&q=70&auto=format&fit=crop"
                alt="A tradesman on a ladder renovating a room"
                width={900}
                height={600}
                sizes="(max-width: 900px) 80vw, 33vw"
                loading="lazy"
              />
              <span className="svc-stock">Stock photo</span>
            </div>
            <div className="svc-body">
              <h3>Renovation</h3>
              <p>
                Rooms reworked from the studs out: layouts, walls, flooring, fixtures and finishes.
              </p>
              <ul>
                <li>Living spaces</li>
                <li>Kitchens</li>
                <li>Bathrooms</li>
              </ul>
              <a className="more" href="#quote">
                Ask about a renovation <span aria-hidden="true">→</span>
              </a>
            </div>
          </article> */}
          <article className="svc" data-aud="home" data-reveal>
            <div className="svc-img">
              <Image
                src="/brand/hu-project-marble-wall.jpg"
                alt="Backlit marble TV wall with slatted wood surround"
                width={1402}
                height={1122}
                sizes="(max-width: 900px) 80vw, 33vw"
                loading="lazy"
              />
            </div>
            <div className="svc-body">
              <h3>Accent walls &amp; TV units</h3>
              <p>
                Statement walls built around how you use the room — stone panels, slatted wood,
                hidden wiring and integrated lighting.
              </p>
              <ul>
                <li>Marble panels</li>
                <li>Accent walls</li>
                <li>Customized TV unit</li>
              </ul>
              <a className="more" href="#quote">
                Ask about an accent wall <span aria-hidden="true">→</span>
              </a>
            </div>
          </article>
          <article className="svc" data-aud="home" data-reveal>
            <div className="svc-img">
              <Image
                src="https://images.unsplash.com/photo-1656646549633-80ad4bd2ab40?w=900&q=70&auto=format&fit=crop"
                alt="A wooden deck with outdoor seating beside a house"
                width={900}
                height={600}
                sizes="(max-width: 900px) 80vw, 33vw"
                loading="lazy"
              />
              <span className="svc-stock">Stock photo</span>
            </div>
            <div className="svc-body">
              <h3>Outdoor builds</h3>
              <p>Decks, patios and outdoor structures that turn a yard into usable space.</p>
              <ul>
                <li>Decks</li>
                <li>Patios</li>
                <li>Pergolas</li>
              </ul>
              <a className="more" href="#quote">
                Ask about an outdoor build <span aria-hidden="true">→</span>
              </a>
            </div>
          </article>
          <article className="svc" data-aud="home business" data-reveal>
            <div className="svc-img">
              <Image
                src="/brand/hu-handyman.jpg"
                alt="Hands driving a screw into a door lock plate with a cordless screwdriver"
                width={1600}
                height={1067}
                sizes="(max-width: 900px) 80vw, 33vw"
                loading="lazy"
              />
            </div>
            <div className="svc-body">
              <h3>Handyman services</h3>
              <p>The small jobs that make a home work: fixes, fittings and finishing touches.</p>
              <ul>
                <li>TV wall mounting</li>
                <li>Repairs</li>
                <li>Fittings</li>
              </ul>
              <a className="more" href="#quote">
                Ask about a handyman job <span aria-hidden="true">→</span>
              </a>
            </div>
          </article>
          <article className="svc" data-aud="business" data-reveal>
            <div className="svc-img">
              <Image
                src="https://images.unsplash.com/photo-1758448093806-88b2089068ab?w=900&q=70&auto=format&fit=crop"
                alt="A modern reception area with a stone and slatted-wood accent wall behind the front desk"
                width={900}
                height={600}
                sizes="(max-width: 900px) 80vw, 50vw"
                loading="lazy"
              />
              <span className="svc-stock">Stock photo</span>
            </div>
            <div className="svc-body">
              <h3>Accent walls for reception areas</h3>
              <p>
                The first thing visitors see, built to set the tone: a statement wall behind your
                front desk in stone, slatted wood and integrated lighting.
              </p>
              <ul>
                <li>Reception walls</li>
                <li>Stone &amp; wood finishes</li>
                <li>Feature lighting</li>
              </ul>
              <a className="more" href="#quote">
                Ask about a reception wall <span aria-hidden="true">→</span>
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
