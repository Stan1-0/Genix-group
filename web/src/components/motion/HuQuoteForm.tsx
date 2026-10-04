'use client'
import { useEnhance } from './useEnhance'
import { submitQuote } from '@/inquiries/actions'
import { rateLimitedMessage, serverErrorMessage } from '@/inquiries/messages'

const SEND_TIMEOUT_MS = 15_000
const GRANT_TIMEOUT_MS = 15_000
const UPLOAD_TIMEOUT_MS = 120_000 // a 10 MB photo on a slow phone connection
const MAX_PHOTOS = 5
const MAX_BYTES = 10_485_760 // 10 MB
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const EXT = /\.(heic|heif)$/i // some browsers report no type for HEIC: fall back to the extension
const UPLOAD_FAILED = "That photo didn't upload. Try again, or send without it."
const ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/></svg>'

type Photo = { file: File; key: string; url: string; li: HTMLLIElement }
type Grant = { uploadUrl: string; fields: Record<string, string>; publicId: string }

declare global {
  interface Window { genixHuQuote?: { validZip: (v: string) => boolean; okType: (f: File) => boolean } }
}

/** A signal that aborts after `ms`; older Safari has no AbortSignal.timeout, so fall back to a controller + timer. */
function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms)
  const c = new AbortController()
  setTimeout(() => c.abort(), ms)
  return c.signal
}

/** Home Upgrades quote form from design/js/hu-quote-form.js: tap-to-pick pills, two steps,
    inline validation and photos. Each photo uploads straight to Cloudinary through a one-time
    grant from POST /uploads; a finished upload adds a hidden `photos` input (its public id) to
    its tile, so removing the tile removes it from the request. Send waits for uploads still in
    flight, then posts through the submitQuote Server Action and shows the reference it returns
    (or the server's field errors / a rate-limit or error message). In offline mode
    (data-send-mode="offline") Send shows the call/email message instead and posts nothing. */
export function HuQuoteForm() {
  useEnhance((signal) => {
    const form = document.getElementById('hu-quote-form') as HTMLFormElement | null
    if (!form) return
    const $ = (id: string) => document.getElementById(id) as HTMLInputElement
    const step1 = form.querySelector<HTMLElement>('[data-step="1"]')!
    const step2 = form.querySelector<HTMLElement>('[data-step="2"]')!
    const steps = $('hqSteps') as unknown as HTMLElement
    const status = $('hqStatus') as unknown as HTMLElement
    const callTime = $('hqCallTime') as unknown as HTMLElement
    const send = $('hqSend') as unknown as HTMLButtonElement
    const sendHTML = send.innerHTML
    const photosOn = form.dataset.photos === 'on'
    let statusTimer: ReturnType<typeof setTimeout> | undefined

    // ---- rules ----
    const validZip = (v: string) => /^\d{5}$/.test(v)
    const validPhone = (v: string) => v.replace(/\D/g, '').length >= 10
    const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
    const okType = (f: File) => (f.type ? TYPES.includes(f.type.toLowerCase()) : EXT.test(f.name))
    const isHeic = (f: File) => /heic|heif/i.test(f.type) || EXT.test(f.name)

    // ---- errors: an input or a pill group (fieldset) ----
    function setErr(el: HTMLElement, msg: string) {
      const err = document.getElementById(el.id + 'Err')
      if (err) err.textContent = msg || ''
      if (msg) el.setAttribute('aria-invalid', 'true')
      else el.removeAttribute('aria-invalid')
      el.closest('.field, .pills, .photos')?.classList.toggle('invalid', !!msg)
    }
    // the element that takes focus for an error: a group's first pill
    const focusTarget = (el: HTMLElement) => (el.matches('fieldset') ? el.querySelector<HTMLElement>('input:checked, input')! : el)
    // A visible message (offline, rate limit, server error) vs. the screen-reader-only announcements.
    function showStatus(msg: string) {
      clearTimeout(statusTimer)
      status.classList.remove('sr-only') // the message must be visible, not screen-reader only
      status.style.cssText = 'margin-top:12px;font-weight:600'
      status.textContent = msg
      status.focus()
    }
    function quietStatus() {
      status.classList.add('sr-only')
      status.removeAttribute('style')
    }
    function announce(msg: string) {
      status.textContent = '' // clear first so an identical repeat message is re-announced
      clearTimeout(statusTimer)
      statusTimer = setTimeout(() => { status.textContent = msg }, 50)
    }
    function report(bad: HTMLElement[]) {
      quietStatus()
      if (!bad.length) { status.textContent = ''; return true }
      announce(bad.length === 1 ? '1 field needs attention.' : `${bad.length} fields need attention.`)
      focusTarget(bad[0]).focus()
      return false
    }

    // ---- bring the form back into view when a step swap leaves it under the sticky header ----
    function bringIntoView() {
      const header = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header')) || 76
      if (form!.getBoundingClientRect().top < header) {
        if (window.genixLenis) window.genixLenis.scrollTo(form!, { offset: -header - 16 })
        else form!.scrollIntoView({ block: 'start' })
      }
    }
    function goStep(n: number) {
      step1.hidden = n !== 1
      step2.hidden = n !== 2
      steps.children[1].classList.toggle('on', n === 2)
      bringIntoView()
      ;(n === 2 ? $('hqStep2Title') : $('hqStep1Title')).focus({ preventScroll: true })
    }

    // ---- best time to call: only once there's a phone number ----
    function syncCallTime() {
      const has = $('hqPhone').value.trim() !== ''
      if (!has) callTime.querySelectorAll('input').forEach((r) => { r.checked = false })
      callTime.hidden = !has
    }

    form.addEventListener('change', (e) => {
      const group = (e.target as HTMLElement).closest<HTMLElement>('.pills')
      if (group && group.id !== 'hqCallTime') setErr(group, '')
    }, { signal })
    form.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement
      if (t.id === 'hqZip') {
        const filtered = t.value.replace(/\D/g, '').slice(0, 5)
        if (filtered !== t.value) t.value = filtered
      }
      if (t.id === 'hqPhone') syncCallTime()
      if (t.id === 'hqPhone' || t.id === 'hqEmail') { setErr($('hqPhone'), ''); setErr($('hqEmail'), '') }
      else if (t.closest && t.closest('.field') && document.getElementById(t.id + 'Err')) setErr(t, '')
    }, { signal })

    // ---- checks ----
    const picked = (name: string) => form.querySelector(`input[name="${name}"]:checked`)
    function checkStep1() {
      const bad: HTMLElement[] = []
      for (const [id, name, msg] of [
        ['hqProject', 'project', "Choose what we're building."],
        ['hqProperty', 'property', 'Choose home or business.'],
        ['hqTiming', 'timing', "Choose when you'd like to start."],
      ] as const) {
        const m = picked(name) ? '' : msg
        setErr($(id), m); if (m) bad.push($(id))
      }
      const zip = $('hqZip')
      const zipMsg = validZip(zip.value) ? '' : 'Enter a 5-digit ZIP code.'
      setErr(zip, zipMsg); if (zipMsg) bad.push(zip)
      return report(bad)
    }
    function checkStep2() {
      const bad: HTMLElement[] = []
      const notes = $('hqNotes')
      const notesMsg = notes.value.trim().length >= 10 ? '' : 'Tell us a little about the space.'
      setErr(notes, notesMsg); if (notesMsg) bad.push(notes)
      const name = $('hqName')
      const nameMsg = name.value.trim() ? '' : 'Enter your name.'
      setErr(name, nameMsg); if (nameMsg) bad.push(name)
      const phone = $('hqPhone'), email = $('hqEmail')
      const p = phone.value.trim(), m = email.value.trim()
      const neither = !p && !m ? 'Add a phone number or an email so we can reply.' : ''
      const phoneMsg = neither || (p && !validPhone(p) ? 'Enter a phone number with area code.' : '')
      const emailMsg = m && !validEmail(m) ? 'Enter an email like name@company.com.' : ''
      setErr(phone, phoneMsg); if (phoneMsg) bad.push(phone)
      setErr(email, emailMsg); if (emailMsg) bad.push(email)
      return report(bad)
    }

    // ---- photos: each one uploads to Cloudinary through a grant from /uploads ----
    const photoBlock = form.querySelector<HTMLElement>('[data-photos]:not(form)')
    const drop = $('hqPhotos') as unknown as HTMLElement
    const picker = $('hqPhotoInput')
    const list = $('hqPhotoList') as unknown as HTMLUListElement
    const photos: Photo[] = []
    const inFlight = new Set<Promise<void>>()
    function photoErr(msg: string) {
      $('hqPhotosErr').textContent = msg
      photoBlock?.classList.toggle('invalid', !!msg)
      if (msg) announce(msg) // focus stays put: announce it
    }
    function labelTiles() {
      photos.forEach((p, i) => p.li.querySelector('.tile-remove')!.setAttribute('aria-label', `Remove photo ${i + 1}, ${p.file.name}`))
    }
    function dropPhoto(p: Photo) {
      const i = photos.indexOf(p)
      if (i >= 0) photos.splice(i, 1)
      if (p.url) URL.revokeObjectURL(p.url)
      p.li.remove()
      labelTiles()
      return i
    }
    async function upload(p: Photo) {
      const type = p.file.type || 'image/heic'
      const g = await fetch('/uploads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, size: p.file.size }), signal: timeoutSignal(GRANT_TIMEOUT_MS),
      })
      if (!g.ok) throw new Error(`grant ${g.status}`)
      const grant = (await g.json()) as Grant
      if (!grant.uploadUrl || !grant.publicId) throw new Error('bad grant')
      const body = new FormData()
      for (const [k, v] of Object.entries(grant.fields ?? {})) body.append(k, v)
      body.append('file', p.file)
      const u = await fetch(grant.uploadUrl, { method: 'POST', body, signal: timeoutSignal(UPLOAD_TIMEOUT_MS) })
      if (!u.ok) throw new Error(`upload ${u.status}`)
      if (!photos.includes(p)) return // removed while uploading: never attach it
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = 'photos'
      input.value = grant.publicId
      p.li.append(input)
      p.li.dataset.state = 'done'
    }
    function addFiles(files: File[]) {
      let msg = ''
      for (const file of files) {
        const key = `${file.name}|${file.size}|${file.lastModified}`
        if (photos.some((p) => p.key === key)) continue // the same photo picked twice: keep one
        if (photos.length >= MAX_PHOTOS) { msg = msg || 'You can add up to 5 photos.'; break }
        if (!okType(file)) { msg = msg || 'Only JPG, PNG, WebP or HEIC photos.'; continue }
        if (file.size > MAX_BYTES) { msg = msg || 'Photos must be 10 MB or smaller.'; continue }
        const li = document.createElement('li')
        li.className = 'tile'
        li.dataset.state = 'uploading'
        let url = ''
        if (isHeic(file)) {
          li.innerHTML = `<span class="tile-icon">${ICON}</span>` // browsers can't preview HEIC
        } else {
          url = URL.createObjectURL(file)
          const img = document.createElement('img')
          img.src = url
          img.alt = ''
          li.append(img)
        }
        const rm = document.createElement('button')
        rm.type = 'button'
        rm.className = 'tile-remove'
        rm.innerHTML = '<span aria-hidden="true">✕</span>'
        li.append(rm)
        list.append(li)
        const p: Photo = { file, key, url, li }
        photos.push(p)
        const job: Promise<void> = upload(p)
          .catch(() => {
            if (!photos.includes(p)) return // removed meanwhile: nothing to report
            dropPhoto(p)
            photoErr(UPLOAD_FAILED)
          })
          .finally(() => inFlight.delete(job))
        inFlight.add(job)
      }
      labelTiles()
      photoErr(msg)
    }
    function removePhoto(li: HTMLElement) {
      const p = photos.find((x) => x.li === li)
      if (!p) return
      const i = dropPhoto(p)
      photoErr('')
      // keep focus in the list: the next tile's ✕, else the previous, else the picker
      const next = photos[i] || photos[i - 1]
      ;(next ? next.li.querySelector<HTMLElement>('.tile-remove')! : picker).focus()
    }

    if (photoBlock) {
      photoBlock.hidden = !photosOn
      if (photosOn) {
        picker.setAttribute('aria-describedby', 'hqPhotosErr')
        picker.addEventListener('change', () => { addFiles([...(picker.files ?? [])]); picker.value = '' }, { signal })
        list.addEventListener('click', (e) => {
          const rm = (e.target as HTMLElement).closest('.tile-remove')
          if (rm) removePhoto(rm.closest<HTMLElement>('.tile')!)
        }, { signal })
        for (const t of ['dragenter', 'dragover']) drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('dragover') }, { signal })
        for (const t of ['dragleave', 'dragend']) drop.addEventListener(t, (e) => { if (!drop.contains((e as DragEvent).relatedTarget as Node | null)) drop.classList.remove('dragover') }, { signal })
        drop.addEventListener('drop', (e) => {
          e.preventDefault()
          drop.classList.remove('dragover')
          if (e.dataTransfer && e.dataTransfer.files.length) addFiles([...e.dataTransfer.files])
        }, { signal })
      }
    }
    // A file dropped anywhere else would make the browser open it and lose the form.
    const offTarget = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files') && !(photosOn && drop.contains(e.target as Node))
    window.addEventListener('dragover', (e) => { if (offTarget(e)) { e.preventDefault(); e.dataTransfer!.dropEffect = 'none' } }, { signal })
    window.addEventListener('drop', (e) => { if (offTarget(e)) e.preventDefault() }, { signal })

    // ---- steps and sending ----
    let sending = false
    async function sendRequest() {
      const phone = form!.dataset.phone || null
      sending = true
      send.disabled = true
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        if (inFlight.size) {
          send.textContent = 'Uploading photos…'
          await Promise.allSettled([...inFlight])
        }
        const fd = new FormData(form!)
        fd.set('js', '1')
        const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), SEND_TIMEOUT_MS) })
        const r = await Promise.race([submitQuote(null, fd), timeout])
        if (r.ok) {
          quietStatus()
          step1.hidden = true
          step2.hidden = true
          steps.hidden = true
          $('hqRef').textContent = r.reference
          $('hqSent').hidden = false
          status.textContent = '' // focusing #hqSent already reads the confirmation
          for (const p of photos) if (p.url) { URL.revokeObjectURL(p.url); p.url = '' }
          bringIntoView()
          $('hqSent').focus({ preventScroll: true })
          return
        }
        if (r.fieldErrors) {
          const ids: Record<string, string> = { project: 'hqProject', property: 'hqProperty', timing: 'hqTiming', zip: 'hqZip', notes: 'hqNotes', name: 'hqName', phone: 'hqPhone', email: 'hqEmail' }
          const bad = Object.keys(ids).filter((k) => r.fieldErrors![k]).map((k) => { const el = $(ids[k]); setErr(el, r.fieldErrors![k]); return el as HTMLElement })
          if (bad.some((el) => step1.contains(el))) goStep(1)
          if (bad.length) { report(bad.filter((el) => !el.closest('[hidden]'))); return }
          showStatus(serverErrorMessage(phone)) // an error for a field the form doesn't show
          return
        }
        showStatus(r.error === 'rate' ? rateLimitedMessage(phone) : serverErrorMessage(phone))
      } catch {
        showStatus(serverErrorMessage(phone)) // network failure or no answer within SEND_TIMEOUT_MS
      } finally {
        clearTimeout(timer)
        send.innerHTML = sendHTML
        send.disabled = false
        sending = false
      }
    }

    $('hqNext').addEventListener('click', () => { if (checkStep1()) goStep(2) }, { signal })
    $('hqBack').addEventListener('click', () => goStep(1), { signal })
    form.addEventListener('submit', (e) => {
      e.preventDefault(); e.stopImmediatePropagation() // stop React's own form-action handling: only this path posts
      if (sending) return
      if (step2.hidden) { if (checkStep1()) goStep(2); return } // Enter pressed in step 1
      if (!checkStep2()) return
      if ($('hqHp').value) return // bots fill the hidden field (the server checks it too)
      if (form.dataset.sendMode === 'offline') {
        // The deployment can't take requests: never pretend the request was received.
        showStatus(form.dataset.offlineMessage ?? '')
        return
      }
      void sendRequest()
    }, { signal })

    // ---- start: JS mode shows one step at a time ----
    form.noValidate = true // JS mode uses the inline validation; no-JS keeps the browser's own checks
    $('hqT').value = String(Date.now()) // the server's "too fast" guard
    step2.hidden = true
    syncCallTime()

    window.genixHuQuote = { validZip, okType }

    // Back to the server-rendered (no-JS) state, so a StrictMode re-run starts clean.
    return () => {
      clearTimeout(statusTimer)
      $('hqT').value = ''
      quietStatus()
      status.textContent = ''
      form.noValidate = false
      step1.hidden = false
      step2.hidden = false
      steps.hidden = false
      steps.children[1].classList.remove('on')
      callTime.hidden = true
      $('hqSent').hidden = true
      send.innerHTML = sendHTML
      send.disabled = false
      for (const p of [...photos]) dropPhoto(p)
      inFlight.clear()
      $('hqPhotosErr').textContent = ''
      if (photoBlock) { photoBlock.hidden = true; photoBlock.classList.remove('invalid') }
      picker.removeAttribute('aria-describedby')
      delete window.genixHuQuote
    }
  })
  return null
}
