import { ProjectViewer } from '@/components/motion/ProjectViewer'
import Image from 'next/image'

/* Recent work: two project cards and a placeholder, plus the (empty) viewer dialog.
   The viewer behaviour attaches in the project-viewer enhancer (Task 8). */
export function Work() {
  return (
    <>
      <section className="work" id="work">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="label" data-reveal>
                Recent work
              </p>
              <h2 className="h-section" data-split>
                Finished, <span className="gold">not just started.</span>
              </h2>
            </div>
            <p className="body" data-reveal>
              Real projects by the Genix crew. Tap one to see it larger.
            </p>
          </div>
          <div className="work-grid">
            <button
              className="work-card"
              data-reveal
              data-kind="img"
              data-src="/brand/hu-project-marble-wall.jpg"
              data-title="Marble feature wall"
              data-desc="Backlit stone panels, a floating console and lit shelving."
            >
              <Image
                src="/brand/hu-project-marble-wall.jpg"
                alt="Backlit marble feature wall with a floating media console"
                width={900}
                height={675}
                sizes="(max-width: 900px) 90vw, 33vw"
                loading="lazy"
              />
              <span className="work-cap">
                <small>Feature wall</small>
                <b>Accent wall</b>
                <span>Backlit stone, floating console, lit shelving</span>
              </span>
            </button>
            <button
              className="work-card"
              data-reveal
              data-kind="video"
              data-src="/brand/hu-project.mp4"
              data-poster="/brand/hu-project-poster.jpg"
              data-title="Custom TV unit, start to finish"
              data-desc="From cutting the panels to the finished, backlit wall."
            >
              <Image
                src="/brand/hu-project-poster.jpg"
                alt="Finished custom TV wall with warm LED backlighting"
                width={900}
                height={675}
                sizes="(max-width: 900px) 90vw, 33vw"
                loading="lazy"
              />
              <span className="work-play" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <span className="work-cap">
                <small>TV unit · video</small>
                <b>Custom TV unit</b>
                <span>Start to finish in 13 seconds</span>
              </span>
            </button>
            <div className="work-ph" data-reveal>
              <div>
                <b>Your next project here</b>
                <span>Placeholder — add a third finished project with photos.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <dialog className="viewer" id="viewer" aria-labelledby="viewerTitle">
        <div className="viewer-inner">
          <div id="viewerMediaSlot" style={{ display: 'contents' }}></div>
          <p className="viewer-cap">
            <b id="viewerTitle"></b>
            <span id="viewerDesc"></span>
          </p>
        </div>
        <button className="viewer-close" id="viewerClose" aria-label="Close project view">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </dialog>
      <ProjectViewer />
    </>
  )
}
