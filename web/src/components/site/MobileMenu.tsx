'use client'
import Link from 'next/link'
import { useState } from 'react'
import type { NavItem } from '@/sites/config'

export function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-[961px]:hidden">
      <button
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
            <Link key={item.label} href={item.href} onClick={() => setOpen(false)} className="block border-b border-line py-3.5 text-lg text-heading last:border-b-0">
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}
