import { ProjectViewer } from '@/components/motion/ProjectViewer'
import type { Project } from '@/projects/types'
import { ViewerDialog } from './work/ViewerDialog'
import { WorkCard } from './work/WorkCard'

/* Our work page (design/homeupgrades-work.html): every published project as the home's cards, then a closing
   "Get a quote" band. No reveal/split motion here, only the viewer. The pinned quote bar goes to /contact. */
export function WorkPage({ projects }: { projects: Project[] }) {
  return (
    <>
      <main id="main" data-quote-href="/contact">
        <section className="workpage-hero" id="work-top">
          <div className="wrap">
            <p className="label">Our work</p>
            <h1 className="h-display">
              Finished, <span className="gold">not just started.</span>
            </h1>
            <p className="body">Real projects by the Genix crew. Tap one to see it larger.</p>
          </div>
        </section>
        <section className="work workpage-grid" id="work">
          <div className="wrap">
            <div className="work-grid">
              {projects.map((p) => (
                <WorkCard key={p.id} project={p} reveal={false} />
              ))}
            </div>
          </div>
        </section>
        <section className="workpage-cta" id="work-cta">
          <div className="wrap">
            <h2 className="h-section">Want something like this?</h2>
            <a className="btn btn-gold" href="/contact">
              Get a quote <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>
      </main>
      <ViewerDialog />
      <ProjectViewer />
    </>
  )
}
