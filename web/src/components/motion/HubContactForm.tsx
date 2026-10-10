'use client'
import { useEnhance } from './useEnhance'
import { submitQuote } from '@/inquiries/actions'
import { parseHubMessage } from '@/inquiries/forms/hub'
import { rateLimitedMessage, serverErrorMessage } from '@/inquiries/messages'

const SEND_TIMEOUT_MS = 15_000
const ORDER = ['name', 'email', 'phone', 'about', 'message'] as const
type Key = (typeof ORDER)[number]
const FIELD_ID: Record<Key, string> = { about: 'hcAbout', name: 'hcName', email: 'hcEmail', phone: 'hcPhone', message: 'hcMessage' }

/** Hub Contact form (design/hub-contact.html): validates with the same parser as the server, sends through
    submitQuote and shows the reference in place. Offline mode shows the call/email message and posts nothing. */
export function HubContactForm() {
  useEnhance((signal) => {
    const form = document.getElementById('message') as HTMLFormElement | null
    if (!form) return
    const $ = (id: string) => document.getElementById(id) as HTMLElement
    const status = $('hcStatus')
    const sent = $('hcSent')
    const hidden: HTMLElement[] = []
    let statusTimer: ReturnType<typeof setTimeout> | undefined
    const focusTarget = (k: Key) => (k === 'about' ? form.querySelector<HTMLInputElement>('input[name="about"]')! : $(FIELD_ID[k]))

    function setErr(k: Key, msg: string) {
      $(FIELD_ID[k] + 'Err').textContent = msg
      const el = $(FIELD_ID[k]) // for "about" this is the fieldset
      if (msg) el.setAttribute('aria-invalid', 'true')
      else el.removeAttribute('aria-invalid')
      ;(k === 'about' ? el : el.closest('.field'))!.classList.toggle('invalid', !!msg)
    }
    // A visible message (offline, rate limit, server error) vs. the screen-reader-only announcements.
    function showStatus(msg: string) {
      clearTimeout(statusTimer)
      status.classList.remove('sr-only')
      status.textContent = msg
      status.focus()
    }
    function raw() {
      const fd = new FormData(form!)
      return Object.fromEntries(ORDER.map((k) => [k, fd.get(k) ?? '']))
    }
    function show(errors: Record<string, string | undefined>) {
      ORDER.forEach((k) => setErr(k, errors[k] ?? ''))
      const bad = ORDER.filter((k) => errors[k])
      status.classList.add('sr-only')
      clearTimeout(statusTimer)
      status.textContent = '' // clear first so an identical repeat message is re-announced
      if (bad.length) {
        const msg = bad.length === 1 ? '1 field needs attention.' : `${bad.length} fields need attention.`
        statusTimer = setTimeout(() => { status.textContent = msg }, 50)
        focusTarget(bad[0]).focus()
      }
    }

    form.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement
      const k = t.name === 'about' ? 'about' : ORDER.find((o) => FIELD_ID[o] === t.id)
      if (k) setErr(k, '')
    }, { signal })

    form.addEventListener('submit', (e) => {
      e.preventDefault(); e.stopImmediatePropagation() // stop React's own form-action handling: only this path posts
      const parsed = parseHubMessage(raw())
      if (!parsed.ok) { show(parsed.errors); return }
      show({})
      if (($('hcHp') as HTMLInputElement).value) return // bots fill the hidden field (the server checks too)
      if (form.dataset.sendMode === 'offline') { showStatus(form.dataset.offlineMessage ?? ''); return }
      const send = $('hcSend') as HTMLButtonElement
      send.disabled = true
      const fd = new FormData(form)
      fd.set('js', '1')
      const phone = form.dataset.phone || null
      let timer: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), SEND_TIMEOUT_MS) })
      Promise.race([submitQuote(null, fd), timeout])
        .then((r) => {
          if (r.ok) {
            status.classList.add('sr-only')
            status.textContent = ''
            for (const el of form.querySelectorAll<HTMLElement>(':scope > :not(#hcSent):not(#hcStatus):not(input[type="hidden"])')) { el.hidden = true; hidden.push(el) }
            $('hcRef').textContent = r.reference
            sent.hidden = false
            sent.focus()
            return
          }
          if (r.fieldErrors) { show(r.fieldErrors); return }
          showStatus(r.error === 'rate' ? rateLimitedMessage(phone) : serverErrorMessage(phone))
        })
        .catch(() => showStatus(serverErrorMessage(phone))) // network failure or no answer within SEND_TIMEOUT_MS
        .finally(() => { clearTimeout(timer); send.disabled = false })
    }, { signal })

    form.noValidate = true // JS mode uses the inline messages; no-JS keeps native validation
    ;($('hcT') as HTMLInputElement).value = String(Date.now()) // the server's "too fast" guard
    // Back to the server-rendered (no-JS) state, so a StrictMode re-run starts clean.
    return () => {
      clearTimeout(statusTimer)
      form.noValidate = false
      ;($('hcT') as HTMLInputElement).value = ''
      status.classList.add('sr-only')
      status.textContent = ''
      for (const el of hidden) el.hidden = false
      sent.hidden = true
      ORDER.forEach((k) => setErr(k, ''))
    }
  })
  return null
}
