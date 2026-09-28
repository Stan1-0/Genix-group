'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/* Phones (≤960px): slides in once [data-quote-bar-after] has scrolled away;
   stays away while any [data-quote-bar-hide] element is on screen.
   Ported from design/shared/quote-bar.js. */
export function QuoteBar({ href, label, phone }: { href: string; label: string; phone: string | null }) {
  const [off, setOff] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const wide = matchMedia('(min-width: 961px)')
    const after = document.querySelector('[data-quote-bar-after]')
    const watch = [after, ...Array.from(document.querySelectorAll('[data-quote-bar-hide]'))].filter(Boolean) as Element[]
    const seen = new Map<Element, boolean>()
    const update = () => {
      const passed = after ? after.getBoundingClientRect().bottom < 0 : true
      setOff(wide.matches || !passed || watch.some((el) => seen.get(el)))
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target, e.isIntersecting))
      update()
    })
    watch.forEach((el) => io.observe(el))
    wide.addEventListener('change', update)
    update()
    return () => {
      io.disconnect()
      wide.removeEventListener('change', update)
    }
  }, [pathname])

  return (
    <div
      data-testid="quote-bar"
      data-off={off}
      inert={off}
      className={`fixed inset-x-0 bottom-0 z-40 flex gap-2.5 border-t border-line bg-paper px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(2,34,72,0.08)] transition-transform duration-300 motion-reduce:transition-none min-[961px]:hidden ${off ? 'translate-y-[110%]' : ''}`}
    >
      <Link href={href} className="flex min-h-[52px] flex-1 items-center justify-center rounded-site bg-gold font-semibold text-heading">
        {label} <span aria-hidden="true" className="ml-2">→</span>
      </Link>
      {phone && (
        <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="flex min-h-[52px] items-center rounded-site border border-heading px-5 font-semibold text-heading">
          Call
        </a>
      )}
    </div>
  )
}
