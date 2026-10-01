'use client'
import { useDocumentInfo } from '@payloadcms/ui'
import { useState } from 'react'

export function ResendButton() {
  const { id } = useDocumentInfo()
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle')
  const [note, setNote] = useState('')
  if (!id) return null
  async function resend() {
    setState('sending')
    try {
      const res = await fetch(`/api/inquiries/${id}/resend`, { method: 'POST', credentials: 'include' })
      const body = (await res.json().catch(() => ({}))) as { emailSent?: boolean; lastEmailError?: string | null }
      setState(res.ok && body.emailSent ? 'done' : 'failed')
      setNote(res.ok ? (body.emailSent ? 'Email sent. Reload to see the updated status.' : `Still not sent: ${body.lastEmailError ?? 'unknown error'}`) : 'Could not resend.')
    } catch {
      setState('failed')
      setNote('Could not resend.')
    }
  }
  return (
    <div style={{ marginBottom: 24 }}>
      <button type="button" className="btn btn--style-secondary btn--size-small" onClick={resend} disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Send email again'}
      </button>
      {note && <p role="status" style={{ marginTop: 8 }}>{note}</p>}
    </div>
  )
}
