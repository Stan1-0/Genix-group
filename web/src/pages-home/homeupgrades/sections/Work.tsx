import { ProjectViewer } from '@/components/motion/ProjectViewer'
import { getProjects } from '@/projects/data'
import { ViewerDialog } from '../work/ViewerDialog'
import { WorkCard } from '../work/WorkCard'

/* Recent work: three project cards, plus the (empty) viewer dialog.
   The viewer behaviour attaches in the project-viewer enhancer. */
export async function Work() {
  const projects = await getProjects({ featured: true, limit: 3 })
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
            {projects.map((p) => (
              <WorkCard key={p.id} project={p} reveal />
            ))}
          </div>
        </div>
      </section>

      <ViewerDialog />
      <ProjectViewer />
    </>
  )
}
