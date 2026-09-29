'use client'
import { useEnhance } from './useEnhance'

declare global {
  interface Window { genixQuote?: { selectKind: (kind: string) => void; validZip: (v: string) => boolean } }
}

/** Logistics quote form from design/js/quote-form.js: two tabs, two steps, inline validation.
    Look-only: nothing is sent. On the production deployment (data-send-mode="offline") Send
    shows the call/email message instead of the confirmation. */
export function QuoteForm() {
  useEnhance((signal) => {
    const form = document.getElementById('quote-form') as HTMLFormElement | null
    if (!form) return
    const $ = (id: string) => document.getElementById(id) as HTMLInputElement
    const step1 = form.querySelector<HTMLElement>('[data-step="1"]')!
    const step2 = form.querySelector<HTMLElement>('[data-step="2"]')!
    const load = document.getElementById('qLoad') as HTMLSelectElement
    const status = document.getElementById('qStatus') as HTMLElement
    const originalLoadChildren = [...load.childNodes]
    const placeholder = load.querySelector('option[value=""]') as HTMLOptionElement
    const groups = [...load.querySelectorAll<HTMLOptGroupElement>('optgroup')].map((g) => ({ el: g, kind: g.dataset.kind, options: [...g.children] }))
    let statusTimer: ReturnType<typeof setTimeout> | undefined

    // ---- rules ----
    const validZip = (v: string) => /^\d{5}$/.test(v)
    const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10) }
    const validPhone = (v: string) => v.replace(/\D/g, '').length >= 10
    const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

    // ---- errors ----
    function setErr(input: HTMLElement, msg: string) {
      $(input.id + 'Err').textContent = msg || ''
      if (msg) input.setAttribute('aria-invalid', 'true')
      else input.removeAttribute('aria-invalid')
      input.closest('.field')!.classList.toggle('invalid', !!msg)
    }
    function report(bad: HTMLElement[]) {
      if (!bad.length) { status.textContent = ''; return true }
      const msg = bad.length === 1 ? '1 field needs attention.' : `${bad.length} fields need attention.`
      status.textContent = '' // clear first so an identical repeat message is re-announced
      clearTimeout(statusTimer)
      statusTimer = setTimeout(() => { status.textContent = msg }, 50)
      bad[0].focus()
      return false
    }

    // ---- bring the form back into view when a step swap leaves it under the sticky header ----
    function bringIntoView() {
      const header = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header')) || 76
      if (form!.getBoundingClientRect().top < header) {
        if (window.genixLenis) window.genixLenis.scrollTo(form!, { offset: -header })
        else form!.scrollIntoView({ block: 'start' })
      }
    }

    // ---- tabs: swap the "what's moving" options, keep everything else ----
    const kindOf = () => form.querySelector<HTMLInputElement>('input[name="kind"]:checked')!.value
    function showOptions(kind: string) {
      const group = groups.find((g) => g.kind === kind)!
      load.replaceChildren(placeholder, ...group.options)
      load.value = ''
      $('qPalletsField').hidden = true
      setErr(load, '')
    }
    function goStep(n: number) {
      step1.hidden = n !== 1
      step2.hidden = n !== 2
      bringIntoView()
      ;(n === 2 ? $('qStep2Title') : $('qStep1Title')).focus({ preventScroll: true })
    }
    function applyKind(kind: string) {
      showOptions(kind)
      if (!step2.hidden) goStep(1) // the load choice was reset: back to step 1
    }
    function selectKind(kind: string) {
      const radio = form!.querySelector<HTMLInputElement>(`input[name="kind"][value="${kind}"]`)
      if (!radio || radio.checked) return
      radio.checked = true
      applyKind(kind)
    }

    form.addEventListener('change', (e) => {
      const t = e.target as HTMLInputElement
      if (t.name === 'kind') applyKind(t.value)
      if (t === (load as unknown)) { $('qPalletsField').hidden = load.value !== 'pallets'; setErr(load, '') }
      if (t.id === 'qFlex') {
        const date = $('qDate')
        date.disabled = t.checked
        if (t.checked) { date.value = ''; setErr(date, '') }
      }
    }, { signal })
    form.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement
      if (t.id === 'qFrom' || t.id === 'qTo') {
        const filtered = t.value.replace(/\D/g, '').slice(0, 5)
        if (filtered !== t.value) t.value = filtered
        setErr(t, '')
      } else if (t.closest && t.closest('.field') && $(t.id + 'Err')) {
        setErr(t, '')
      }
    }, { signal })

    // ---- checks ----
    function checkStep1() {
      const bad: HTMLElement[] = []
      for (const zip of [$('qFrom'), $('qTo')]) {
        const msg = validZip(zip.value) ? '' : 'Enter a 5-digit ZIP code.'
        setErr(zip, msg); if (msg) bad.push(zip)
      }
      const date = $('qDate')
      if (!$('qFlex').checked) {
        const msg = !date.value ? 'Pick a date, or tick Flexible.' : date.value < todayISO() ? 'Pick a date from today on.' : ''
        setErr(date, msg); if (msg) bad.push(date)
      }
      const loadMsg = load.value ? '' : "Choose what's moving."
      setErr(load, loadMsg); if (loadMsg) bad.push(load)
      if (load.value === 'pallets') {
        const pallets = $('qPallets'), n = +pallets.value
        const msg = Number.isInteger(n) && n >= 1 && n <= 26 ? '' : 'Enter 1 to 26 pallets.'
        setErr(pallets, msg); if (msg) bad.push(pallets)
      }
      return report(bad)
    }
    function checkStep2() {
      const bad: HTMLElement[] = []
      const name = $('qName')
      const nameMsg = name.value.trim() ? '' : 'Enter your name.'
      setErr(name, nameMsg); if (nameMsg) bad.push(name)
      const phone = $('qPhone'), email = $('qEmail')
      const p = phone.value.trim(), m = email.value.trim()
      const neither = !p && !m ? 'Add a phone number or an email so we can reply.' : ''
      const phoneMsg = neither || (p && !validPhone(p) ? 'Enter a phone number with area code.' : '')
      const emailMsg = m && !validEmail(m) ? 'Enter an email like name@company.com.' : ''
      setErr(phone, phoneMsg); if (phoneMsg) bad.push(phone)
      setErr(email, emailMsg); if (emailMsg) bad.push(email)
      return report(bad)
    }

    // ---- steps and sending ----
    $('qNext').addEventListener('click', () => { if (checkStep1()) goStep(2) }, { signal })
    $('qBack').addEventListener('click', () => goStep(1), { signal })
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      if (step2.hidden) { if (checkStep1()) goStep(2); return } // Enter pressed in step 1
      if (!checkStep2()) return
      if ($('qHp').value) return // bots fill the hidden field (the real build also checks server-side)
      if (form.dataset.sendMode === 'offline') {
        // Look-only until the enquiry pipeline exists: never pretend the request was received.
        clearTimeout(statusTimer)
        status.classList.remove('sr-only') // the message must be visible, not screen-reader only
        status.style.cssText = 'margin-top:12px;font-weight:600'
        status.textContent = form.dataset.offlineMessage ?? ''
        status.focus()
        return
      }
      form.querySelector<HTMLElement>('.kind')!.hidden = true
      step1.hidden = true
      step2.hidden = true
      $('qRef').textContent = 'Request received'
      $('qSent').hidden = false
      status.textContent = '' // focusing #qSent already reads the confirmation
      bringIntoView()
      $('qSent').focus({ preventScroll: true })
    }, { signal })

    // ---- links elsewhere on the page ----
    document.querySelectorAll<HTMLElement>('a[data-kind]').forEach((a) => a.addEventListener('click', () => selectKind(a.dataset.kind!), { signal }))
    document.querySelectorAll<HTMLElement>('[data-start-quote]').forEach((a) =>
      a.addEventListener('click', (e) => {
        // The browser's own fragment jump would otherwise reset focus, since
        // #quote-form (a <form>) is not itself focusable; we own the scroll via Lenis's
        // anchors handling and the focus ourselves, so stop the native jump here.
        e.preventDefault()
        // Lenis is skipped under prefers-reduced-motion, so there's no smooth-scroll to bring
        // the form into view: do it ourselves in that case.
        if (!window.genixLenis) form.scrollIntoView({ block: 'start' })
        if (!$('qFrom').closest('[hidden]')) $('qFrom').focus({ preventScroll: true })
      }, { signal }))

    // ---- start: JS mode shows one step at a time ----
    form.noValidate = true // JS mode uses the custom inline validation; no-JS keeps the native one
    step2.hidden = true
    $('qDate').min = todayISO()
    showOptions(kindOf())

    window.genixQuote = { selectKind, validZip }

    // Back to the server-rendered (no-JS) state, so a StrictMode re-run starts clean.
    return () => {
      clearTimeout(statusTimer)
      form.noValidate = false
      step1.hidden = false
      step2.hidden = false
      form.querySelector<HTMLElement>('.kind')!.hidden = false
      $('qSent').hidden = true
      $('qPalletsField').hidden = false
      $('qDate').removeAttribute('min')
      // showOptions moved the options out of their <optgroup>s: put them back.
      for (const g of groups) g.el.replaceChildren(...g.options)
      load.replaceChildren(...originalLoadChildren)
      load.value = ''
      delete window.genixQuote
    }
  })
  return null
}
