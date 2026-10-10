import { initBotId } from 'botid/client/core'
import { BOTID_PROTECT } from '@/inquiries/bot-check'

// BotID vouches for the quote Server Action on every page with a form, and for Home Upgrades photo upload grants.
initBotId({ protect: BOTID_PROTECT.map((p) => ({ ...p })) })
