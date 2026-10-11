import { getPayload } from 'payload'
import config from '@payload-config'
import { seedProjects } from './projects'

try {
  const payload = await getPayload({ config })
  const { created, skipped } = await seedProjects(payload)
  created.forEach((t) => console.log(`projects/${t}: created`))
  skipped.forEach((t) => console.log(`projects/${t}: exists, left as is`))
  console.log('Saved. The site shows these within an hour, or straight away after the next deploy.')
  process.exit(0)
} catch (e) {
  console.error(e)
  process.exit(1)
}
