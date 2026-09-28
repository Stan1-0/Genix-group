/* Pure helper, no server-only / payload imports, so it's cheap to unit test
   without dragging in the DB layer. */

/** During the production build, a CMS failure must fail the build loudly rather
    than silently baking registry-default fallback content into static pages. At
    runtime (including `next dev` and the server after a successful build), a CMS
    outage should fall back to registry defaults so the site stays up. */
export function shouldRethrowOnCmsFailure(phase: string | undefined): boolean {
  return phase === 'phase-production-build'
}
