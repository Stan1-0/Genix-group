import Image from 'next/image'
import { Build3D } from '@/components/motion/Build3D'

/* Watch the build. The static fallback (photo + steps) is the base; the 3D scroll track and the
   `is3d` decision the prototype made inline are added by the Build3D enhancer. */
export function Build() {
  return (
    <section className="build" id="build" aria-labelledby="buildTitle">
      <h2 className="sr-only" id="buildTitle">
        Watch a feature wall come together
      </h2>
      <Build3D />
      <div className="stage">
        <div className="steps3d">
          <div className="step3d" data-step="0">
            <p className="num">Step 1 of 5</p>
            <h3>It starts with a bare wall.</h3>
            <p>Every feature wall begins as a blank, measured surface.</p>
          </div>
          <div className="step3d" data-step="1">
            <p className="num">Step 2 of 5</p>
            <h3>Slats for warmth.</h3>
            <p>Slatted wood goes up first, spaced by hand, running floor to ceiling.</p>
          </div>
          <div className="step3d" data-step="2">
            <p className="num">Step 3 of 5</p>
            <h3>Stone at the centre.</h3>
            <p>A marble panel becomes the backdrop — the piece everything else frames.</p>
          </div>
          <div className="step3d" data-step="3">
            <p className="num">Step 4 of 5</p>
            <h3>The screen floats.</h3>
            <p>Mounted flush, with the cables hidden inside the wall.</p>
          </div>
          <div className="step3d" data-step="4">
            <p className="num">Step 5 of 5</p>
            <h3>Light it. Done.</h3>
            <p>A floating console and warm backlighting finish the room.</p>
            <a className="btn btn-dark cta" href="#quote">
              Plan a wall like this <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
        <div className="progress3d" aria-hidden="true">
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
        </div>
        <span className="scroll-hint" aria-hidden="true">
          Scroll to build ↓
        </span>
      </div>
      <div className="wrap fallback">
        <Image
          src="/brand/hu-ba-finished.jpg"
          alt="Finished backlit marble TV wall with slatted wood surround"
          width={1004}
          height={752}
          sizes="(max-width: 900px) 100vw, 50vw"
          loading="lazy"
        />
        <div>
          <p className="label">How a feature wall comes together</p>
          <ol>
            <li>
              <b>A bare wall</b>Measured and prepared.
            </li>
            <li>
              <b>Slats for warmth</b>Slatted wood, floor to ceiling.
            </li>
            <li>
              <b>Stone at the centre</b>A marble panel as the backdrop.
            </li>
            <li>
              <b>The screen floats</b>Mounted flush, cables hidden.
            </li>
            <li>
              <b>Light it</b>Floating console and warm backlighting.
            </li>
          </ol>
        </div>
      </div>
    </section>
  )
}
