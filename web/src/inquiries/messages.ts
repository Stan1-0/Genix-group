export const rateLimitedMessage = (phone: string | null) =>
  phone ? `Too many requests. Please call us at ${phone}.` : 'Too many requests. Please email hello@thegenixgroup.com.'

export const serverErrorMessage = (phone: string | null) =>
  phone ? `Couldn't send. Try again, or call ${phone}.` : "Couldn't send. Try again, or email hello@thegenixgroup.com."
