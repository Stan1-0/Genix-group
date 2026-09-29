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
    if (!dlg || !slot || !title || !desc || !closeBtn) return
    const canFlip = !reduce
    let opener: HTMLElement | null = null
    const ctx = gsap.context(() => {}, dlg)

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
      title.textContent = ''
      desc.textContent = ''
      document.querySelectorAll<HTMLElement>('.work-card img').forEach((img) => img.removeAttribute('data-flip-id'))
      dlg.removeAttribute('style')
    }
  })
  return null
}
