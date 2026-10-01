/** BotID runs only for JS submissions: a plain (no-JS) form post never carries the BotID token,
    so checking it would mark every no-JS visitor as a bot. Those rely on the honeypot and rate limit. */
export function botCheckFor(js: boolean, checkBotId: () => Promise<{ isBot: boolean }>): () => Promise<boolean> {
  return js ? async () => (await checkBotId()).isBot : async () => false
}
