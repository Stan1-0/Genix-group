'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { NavItem } from '@/sites/config'

export function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="min-[961px]:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-site border border-line bg-paper"
      >
        <span aria-hidden="true" className="grid gap-[5px]">
          <span className="block h-0.5 w-[18px] bg-heading" />
          <span className="block h-0.5 w-[18px] bg-heading" />
          <span className="block h-0.5 w-[18px] bg-heading" />
        </span>
      </button>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="absolute inset-x-0 top-[76px] border-b border-line bg-paper px-4 pb-5 pt-2">
          {items.map((item) => (
            <Link key={item.label} href={item.href} onClick={close} className="block border-b border-line py-3.5 text-lg text-heading last:border-b-0">
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}
