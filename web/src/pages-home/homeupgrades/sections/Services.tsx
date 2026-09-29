import Image from 'next/image'

/* Services: three upgrade cards. Stock photos are remote (Unsplash, allowed in next.config) and marked as stock. */
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
              Three kinds of upgrade.
            </h2>
          </div>
          <p className="body" data-reveal>
            Every project starts with a visit to the space and a written quote. Tell us what you have in mind — we&apos;ll tell you what it takes.
          </p>
        </div>
        <div className="svc-grid swipe">
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
              <p>Rooms reworked from the studs out: layouts, walls, flooring, fixtures and finishes.</p>
              <ul>
                <li>Living spaces</li>
                <li>Kitchens</li>
                <li>Bathrooms</li>
              </ul>
              <a className="more" href="#quote">
                Ask about a renovation <span aria-hidden="true">→</span>
              </a>
            </div>
          </article>
          <article className="svc" data-reveal>
            <div className="svc-img">
              <Image
                src="/brand/hu-project-marble-wall.jpg"
                alt="Backlit marble feature wall with gold veining and a floating media console"
                width={900}
                height={675}
                sizes="(max-width: 900px) 80vw, 33vw"
                loading="lazy"
              />
            </div>
            <div className="svc-body">
              <h3>Feature walls &amp; TV units</h3>
              <p>Statement walls built around how you use the room — stone panels, slatted wood, hidden wiring and integrated lighting.</p>
              <ul>
                <li>Marble panels</li>
                <li>Slat walls</li>
                <li>LED backlighting</li>
              </ul>
              <a className="more" href="#quote">
                Ask about a feature wall <span aria-hidden="true">→</span>
              </a>
            </div>
          </article>
          <article className="svc" data-reveal>
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
        </div>
      </div>
    </section>
  )
}
