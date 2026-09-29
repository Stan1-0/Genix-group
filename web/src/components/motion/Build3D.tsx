'use client'
import { prefersReducedMotion, ScrollTrigger } from './gsap'
import { useEnhance } from './useEnhance'

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** "Watch the build": switches #build to the 3D scroll track (is3d) when motion is allowed and WebGL exists,
    then loads Three.js (./build3d) only once the visitor has scrolled and the section is within ~800px.
    Port of the decision script in #build and the loader module in design/homeupgrades-home.html. */
export function Build3D() {
  useEnhance((signal) => {
    const section = document.getElementById('build')
    if (!section || prefersReducedMotion() || !hasWebGL()) return
    section.classList.add('is3d')
    ScrollTrigger.refresh() // the prototype added is3d during parse; here it lands after hydration

    let dispose: (() => void) | undefined
    let io: IntersectionObserver | undefined
    const fallback = () => {
      if (signal.aborted) return // a newer setup may own is3d now
      section.classList.remove('is3d')
      ScrollTrigger.refresh()
    }
    // Wait until the visitor actually scrolls, then load once the section is within ~800px.
    // Nothing 3D is downloaded for people who never scroll.
    const load = () =>
      import('./buildScene')
        .then((m) => {
          if (signal.aborted) return
          dispose = m.mountBuild(section)
        })
        .catch(fallback)
    const arm = () => {
      removeEventListener('scroll', arm)
      io = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting) {
            io?.disconnect()
            load()
          }
        },
        { rootMargin: '800px 0px' },
      )
      io.observe(section)
    }
    if (scrollY > 0) arm()
    else addEventListener('scroll', arm, { passive: true })

    return () => {
      removeEventListener('scroll', arm)
      io?.disconnect()
      dispose?.()
      section.classList.remove('is3d')
      ScrollTrigger.refresh()
    }
  })
  return null
}
