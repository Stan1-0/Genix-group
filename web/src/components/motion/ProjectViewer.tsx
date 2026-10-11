'use client'
import { Flip } from 'gsap/Flip'
import { gsap, prefersReducedMotion } from './gsap'
import { useEnhance } from './useEnhance'

gsap.registerPlugin(Flip)

/** Recent-work project viewer (design/homeupgrades-home.html). Native <dialog> (Esc and focus handling for free).
    With Flip the photo grows out of its card; with reduced motion it simply opens. */
export function ProjectViewer() {
  useEnhance((signal) => {
    const reduce = prefersReducedMotion()
    const dlg = document.getElementById('viewer') as HTMLDialogElement | null
    const slot = document.getElementById('viewerMediaSlot')
    const title = document.getElementById('viewerTitle')
    const desc = document.getElementById('viewerDesc')
    const closeBtn = document.getElementById('viewerClose')
    const nav = document.getElementById('viewerNav')
    const count = document.getElementById('viewerCount')
    const prevBtn = document.getElementById('viewerPrev')
    const nextBtn = document.getElementById('viewerNext')
    if (!dlg || !slot || !title || !desc || !closeBtn || !nav || !count || !prevBtn || !nextBtn) return
    const canFlip = !reduce
    let opener: HTMLElement | null = null
    const ctx = gsap.context(() => {}, dlg)

    // Photo stepping: the opened card's data-gallery ([{src, alt}], 2+ items) drives the prev/next buttons.
    type Shot = { src: string; alt: string }
    let gallery: Shot[] = []
    let at = 0
    const parseGallery = (raw: string | undefined): Shot[] => {
      if (!raw) return []
      try {
        const list: unknown = JSON.parse(raw)
        if (!Array.isArray(list)) return []
        return list.filter(
          (x): x is Shot => !!x && typeof x.src === 'string' && typeof x.alt === 'string',
        )
      } catch {
        return []
      }
    }
    const showShot = () => {
      const img = slot.querySelector('img')
      if (!img) return
      img.src = gallery[at].src
      img.alt = gallery[at].alt
      count.textContent = `${at + 1} / ${gallery.length}`
    }
    const step = (by: number) => {
      if (gallery.length < 2) return
      at = (at + by + gallery.length) % gallery.length
      showShot()
    }
    const resetNav = () => {
      gallery = []
      at = 0
      nav.hidden = true
      count.textContent = ''
    }
    prevBtn.addEventListener('click', () => step(-1), { signal })
    nextBtn.addEventListener('click', () => step(1), { signal })
    dlg.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'ArrowLeft') step(-1)
        else if (e.key === 'ArrowRight') step(1)
        else return
        if (gallery.length > 1) e.preventDefault()
      },
      { signal },
    )

    document.querySelectorAll<HTMLElement>('.work-card').forEach((card, i) => {
      card.addEventListener(
        'click',
        () => {
          opener = card
          const thumb = card.querySelector('img')!
          const flipId = 'work-' + i
          thumb.dataset.flipId = flipId
          const state = canFlip ? Flip.getState(thumb) : null

          slot.innerHTML = ''
          let media: HTMLVideoElement | HTMLImageElement
          if (card.dataset.kind === 'video') {
            const video = document.createElement('video')
            Object.assign(video, {
              src: card.dataset.src,
              poster: card.dataset.poster,
              controls: true,
              playsInline: true,
              muted: true,
              loop: true,
            })
            video.setAttribute('aria-label', card.dataset.title ?? '')
            if (!reduce) video.autoplay = true
            media = video
          } else {
            const img = document.createElement('img')
            img.src = card.dataset.src ?? ''
            img.alt = thumb.alt
            media = img
          }
          media.className = 'viewer-media'
          media.dataset.flipId = flipId
          slot.appendChild(media)
          resetNav()
          if (card.dataset.kind !== 'video') {
            const shots = parseGallery(card.dataset.gallery)
            if (shots.length > 1) {
              gallery = shots
              nav.hidden = false
              showShot()
            }
          }
          title.textContent = card.dataset.title ?? ''
          desc.textContent = card.dataset.desc ?? ''
          dlg.showModal()
          window.genixLenis?.stop()
          if (canFlip && state) {
            ctx.add(() => {
              Flip.from(state, { targets: media, duration: 0.65, ease: 'power3.inOut', scale: true, absolute: true })
              gsap.from('.viewer-cap, .viewer-close', { opacity: 0, y: 12, duration: 0.4, delay: 0.35 })
            })
          }
        },
        { signal },
      )
    })

    const close = () => {
      if (!dlg.open) return
      const done = () => {
        dlg.close()
      }
      if (canFlip)
        ctx.add(() => {
          gsap.to(dlg, {
            opacity: 0,
            duration: 0.2,
            onComplete: () => {
              done()
              gsap.set(dlg, { opacity: 1 })
            },
          })
        })
      else done()
    }
    closeBtn.addEventListener('click', close, { signal })
    dlg.addEventListener(
      'click',
      (e) => {
        const t = e.target as HTMLElement
        if (t === dlg || t.classList.contains('viewer-inner')) close()
      },
      { signal },
    )
    dlg.addEventListener(
      'close',
      () => {
        slot.querySelector('video')?.pause()
        slot.innerHTML = ''
        resetNav()
        window.genixLenis?.start()
        opener?.focus()
      },
      { signal },
    )

    return () => {
      ctx.revert()
      if (dlg.open) {
        // The close listener is already detached, so undo what it would have done.
        slot.querySelector('video')?.pause()
        dlg.close()
        window.genixLenis?.start()
      }
      slot.innerHTML = ''
      resetNav()
      title.textContent = ''
      desc.textContent = ''
      document.querySelectorAll<HTMLElement>('.work-card img').forEach((img) => img.removeAttribute('data-flip-id'))
      dlg.removeAttribute('style')
    }
  })
  return null
}
