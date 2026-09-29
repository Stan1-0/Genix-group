'use client'

// Catches errors thrown by the root layout itself (e.g. a failed CMS read while
// rendering), which [site]/error.tsx cannot. It replaces the root layout, so it
// needs its own <html>/<body> and cannot use the site's stylesheet.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0b0b0c', color: '#fff' }}>
        <main style={{ maxWidth: 640, margin: '0 auto', padding: '96px 24px' }}>
          <h1 style={{ fontSize: 36, lineHeight: 1.1, margin: 0 }}>This page didn&apos;t load.</h1>
          <p style={{ marginTop: 16, color: '#cfcfcf' }}>Try again. If it keeps happening, please come back in a few minutes.</p>
          <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={reset}
              style={{ minHeight: 48, padding: '0 24px', border: 0, borderRadius: 8, background: '#c28a2c', color: '#0b0b0c', font: 'inherit', fontWeight: 600, cursor: 'pointer' }}
            >
              Try again
            </button>
            <a href="/" style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', padding: '0 24px', color: '#fff' }}>
              Go to the home page
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
