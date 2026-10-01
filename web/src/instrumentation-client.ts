import { initBotId } from 'botid/client/core'

// The quote form posts its Server Action to the Logistics home page.
initBotId({ protect: [{ path: '/', method: 'POST' }] })
