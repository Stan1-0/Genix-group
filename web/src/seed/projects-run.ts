import { seedTarget } from './target'

const target = seedTarget(process.env)
console.log(`Seeding projects into database host: ${target.dbHost || '(none)'} (${target.local ? 'local' : 'remote'}); Blob storage: ${target.blob ? 'on' : 'off (files stay on local disk)'}`)
if (!target.ok) {
  console.error(`Refusing to seed: ${target.reason}`)
  process.exit(1)
}

try {
  const { getPayload } = await import('payload')
  const { default: config } = await import('@payload-config')
  const { seedProjects } = await import('./projects')
  const payload = await getPayload({ config })
  const { created, skipped } = await seedProjects(payload)
  created.forEach((t) => console.log(`projects/${t}: created`))
  skipped.forEach((t) => console.log(`projects/${t}: exists, left as is`))
  console.log('Saved. The site shows these after any project is next saved in the admin (that refreshes the cache).')
  process.exit(0)
} catch (e) {
  console.error(e)
  process.exit(1)
}
