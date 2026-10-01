import type { Access, FieldAccess, Where } from 'payload'

type StaffUser = { id: string | number; role?: 'admin' | 'editor' | null; divisions?: string[] | null }
const staff = (user: unknown) => (user ?? null) as StaffUser | null

export const anyone: Access = () => true
export const isLoggedIn: Access = ({ req }) => Boolean(req.user)
export const isAdmin: Access = ({ req }) => staff(req.user)?.role === 'admin'
export const isAdminField: FieldAccess = ({ req }) => staff(req.user)?.role === 'admin'

export const isAdminOrSelf: Access = ({ req }) => {
  const u = staff(req.user)
  if (!u) return false
  if (u.role === 'admin') return true
  return { id: { equals: u.id } } as Where
}

/** Admins edit every site record; editors only their assigned divisions. */
export const canEditSite: Access = ({ req }) => {
  const u = staff(req.user)
  if (!u) return false
  if (u.role === 'admin') return true
  const divisions = u.divisions ?? []
  return divisions.length ? ({ key: { in: divisions } } as Where) : false
}

/** The public (no user) and admins can read every site record, e.g. for the live site render.
    Editors can only read the divisions they are assigned, so the admin UI matches what they may edit. */
export const canReadSite: Access = ({ req }) => {
  const u = staff(req.user)
  if (!u) return true
  if (u.role === 'admin') return true
  const divisions = u.divisions ?? []
  return divisions.length ? ({ key: { in: divisions } } as Where) : false
}

/** Admins see every inquiry; editors only their assigned divisions; the public nothing. */
export const canReadInquiry: Access = ({ req }) => {
  const u = staff(req.user)
  if (!u) return false
  if (u.role === 'admin') return true
  const divisions = u.divisions ?? []
  return divisions.length ? ({ division: { in: divisions } } as Where) : false
}
