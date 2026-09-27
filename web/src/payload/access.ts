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
