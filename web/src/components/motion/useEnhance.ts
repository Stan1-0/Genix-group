'use client'
import { useEffect } from 'react'

/** Runs a ported prototype script once after hydration. `setup` registers listeners with
    `{ signal }` and may return extra cleanup; both are undone on unmount (and between
    StrictMode's double invocation in dev). */
export function useEnhance(setup: (signal: AbortSignal) => void | (() => void)) {
  useEffect(() => {
    const ac = new AbortController()
    const cleanup = setup(ac.signal)
    return () => {
      ac.abort()
      cleanup?.()
    }
    // setup is a module-level behaviour; run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
