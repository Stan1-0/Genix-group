export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-[1320px] px-[clamp(16px,4vw,56px)] py-[clamp(72px,12vw,160px)]">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Error 404</p>
      <h1 className="mt-4 font-display text-[clamp(36px,5vw,64px)] font-bold leading-none text-heading">We couldn&apos;t find that page.</h1>
      <p className="mt-6 max-w-[48ch] text-ink-2">It may have moved, or the link may be mistyped. The home page has everything we do.</p>
      <a href="/" className="cta mt-8">
        Go to the home page
      </a>
    </main>
  )
}
