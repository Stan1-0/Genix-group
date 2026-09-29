'use client'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-[1320px] px-[clamp(16px,4vw,56px)] py-[clamp(72px,12vw,160px)]">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Something went wrong</p>
      <h1 className="mt-4 font-display text-[clamp(36px,5vw,64px)] font-bold leading-none text-heading">This page didn&apos;t load.</h1>
      <p className="mt-6 max-w-[48ch] text-ink-2">Try again. If it keeps happening, the home page is still available.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="cta">
          Try again
        </button>
        <a href="/" className="cta cta-outline">
          Go to the home page
        </a>
      </div>
    </main>
  )
}
