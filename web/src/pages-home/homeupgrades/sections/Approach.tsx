import Image from 'next/image'

function Check() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" />
      <path d="m8.5 12.2 2.4 2.4 4.8-5" />
    </svg>
  )
}

/* The Genix approach: portrait TV-wall photo with an overlapping gold quote card, then the copy,
   three promises and a link to the quote form. */
export function Approach() {
  return (
    <section className="approach" id="approach" aria-labelledby="approachTitle">
      <div className="wrap">
        <figure className="approach-media" data-reveal>
          <Image
            src="/brand/hu-tv-mount.jpg"
            alt="Slatted wood feature wall with a wall-mounted TV and floating console"
            width={3710}
            height={1944}
            /* A landscape photo cropped to a portrait box renders ~2.4x the box width (object-fit: cover). */
            sizes="(max-width: 960px) 240vw, (max-width: 1320px) 100vw, 1320px"
            loading="lazy"
          />
          <figcaption className="approach-card">
            <span className="approach-card-top">
              <span>The Genix approach</span>
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9" />
                <path d="m18 15 4-4" />
                <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-1.13a6 6 0 0 0-2.65-.62H9.5l.92.82A6.18 6.18 0 0 1 12 9.42V11l2 2h1.172a2 2 0 0 1 1.414.586L18.5 15.5" />
              </svg>
            </span>
            <span className="approach-quote">It&apos;s the little things that make a home.</span>
          </figcaption>
        </figure>
        <div className="approach-copy">
          <p className="label" data-reveal>
            More than a checked-off to-do list
          </p>
          <h2 className="h-section" id="approachTitle" data-split>
            Your space matters.<br /> So do the details.
          </h2>
          <p className="body" data-reveal>
            We believe home improvements should feel exciting, not overwhelming. That starts with listening to
            what you need and ends with work that feels right for your space.
          </p>
          <p className="body" data-reveal>
            Whether you&apos;re mounting a TV, adding an accent wall, or tackling the small tasks that have piled up,
            Genix Home Upgrades is here to help you move forward.
          </p>
          <ul className="approach-checks">
            <li data-reveal>
              <Check />
              A clear plan before the work begins
            </li>
            <li data-reveal>
              <Check />
              Care for your home and your time
            </li>
            <li data-reveal>
              <Check />
              Practical ideas, thoughtfully finished
            </li>
          </ul>
          <a className="approach-link" href="#quote" data-reveal>
            Tell us about your space
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 17 17 7" />
              <path d="M8 7h9v9" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}
