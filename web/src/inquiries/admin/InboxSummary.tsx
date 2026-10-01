import type { Payload, TypedUser } from 'payload'

/** Above the Inquiries list: "3 new · 1 email not sent", scoped by the viewer's access. */
export async function InboxSummary({ payload, user }: { payload: Payload; user?: TypedUser }) {
  const scope = { overrideAccess: false, user } as const
  const [fresh, unsent] = await Promise.all([
    payload.count({ collection: 'inquiries', where: { status: { equals: 'new' } }, ...scope }),
    payload.count({ collection: 'inquiries', where: { emailSent: { equals: false } }, ...scope }),
  ])
  const parts = [`${fresh.totalDocs} new`]
  if (unsent.totalDocs) parts.push(`⚠ ${unsent.totalDocs} email${unsent.totalDocs === 1 ? '' : 's'} not sent`)
  return <p style={{ margin: '0 0 16px', fontWeight: 600 }}>{parts.join(' · ')}</p>
}
