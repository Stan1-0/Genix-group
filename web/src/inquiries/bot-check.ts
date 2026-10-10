/** BotID runs only for JS submissions: a plain (no-JS) form post never carries the BotID token,
    so checking it would mark every no-JS visitor as a bot. Those rely on the honeypot and rate limit. */
export function botCheckFor(js: boolean, checkBotId: () => Promise<{ isBot: boolean }>): () => Promise<boolean> {
  return js ? async () => (await checkBotId()).isBot : async () => false
}

/** Paths whose POSTs BotID vouches for (client side). A Server Action posts to the page its form is on, so every
    page with a quote form must be listed: in production an unlisted path is checked without the browser's token
    and comes back as a bot, which silently drops the request behind a fake reference. */
export const BOTID_PROTECT = [
  { path: '/', method: 'POST' }, // division home pages
  { path: '/contact', method: 'POST' }, // Contact pages (divisions and the hub)
  { path: '/uploads', method: 'POST' }, // Home Upgrades photo upload grants
] as const
