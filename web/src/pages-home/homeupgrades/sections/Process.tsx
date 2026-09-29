import { ProcessLine } from '@/components/motion/ProcessLine'
import Image from 'next/image'

/* How a project runs: crew photo and four steps (the progress line is added by an enhancer). */
export function Process() {
  return (
    <section className="process on-dark" id="process">
      <div className="wrap">
        <figure className="crew" data-reveal>
          <Image
            src="/brand/hu-outdoor-build.jpg"
            alt="Two Genix crew members cutting panels on a patio at sunset"
            width={1004}
            height={752}
            sizes="(max-width: 900px) 100vw, 50vw"
            loading="lazy"
          />
          <figcaption>The crew cutting panels on site for the TV-wall build above.</figcaption>
        </figure>
        <div>
          <p className="label" data-reveal>
            How a project runs
          </p>
          <h2 className="h-section" data-split>
            Four steps, <span className="gold">no surprises.</span>
          </h2>
          <ol className="steps" id="steps">
            <li className="step" data-reveal>
              <h3>Site visit</h3>
              <p>We walk the space with you, measure up and talk through what you want it to do.</p>
            </li>
            <li className="step" data-reveal>
              <h3>Written quote</h3>
              <p>A clear, itemised quote and timeline before any work starts.</p>
            </li>
            <li className="step" data-reveal>
              <h3>The build</h3>
              <p>The Genix crew does the work and keeps you updated as it goes.</p>
            </li>
            <li className="step" data-reveal>
              <h3>Final walkthrough</h3>
              <p>We go over the finished space together and put right anything that isn&apos;t.</p>
            </li>
          </ol>
        </div>
      </div>
      <ProcessLine />
    </section>
  )
}
