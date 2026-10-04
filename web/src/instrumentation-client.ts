import { initBotId } from 'botid/client/core'

// BotID protects the quote Server Action (POST /, both sites' home pages) and Home Upgrades photo upload grants (POST /uploads).
initBotId({ protect: [{ path: '/', method: 'POST' }, { path: '/uploads', method: 'POST' }] })
