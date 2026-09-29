/** tel: href for a display phone number; the prototype's placeholder number when none is set. */
export const telHref = (phone: string | null) => (phone ? `tel:${phone.replace(/[^+\d]/g, '')}` : 'tel:+10000000000')
