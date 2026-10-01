import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Sites } from './collections/Sites'
import { Inquiries } from './collections/Inquiries'
import { InquiryCounters } from './collections/InquiryCounters'
import { RateHits } from './collections/RateHits'
import { assertProductionEnv } from './payload/env'
import { isLocalDatabase } from './payload/local-db'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

assertProductionEnv(process.env)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Sites, Inquiries, InquiryCounters, RateHits],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    // Local dev and tests sync the schema automatically. Every other database
    // (Neon production and preview branches) changes only through migrations,
    // run by `npm run build:vercel` (see vercel.json) — never on connect, since
    // prodMigrations auto-migrating hangs a local `next build` against the
    // push-created dev DB.
    push: process.env.NODE_ENV !== 'production' && isLocalDatabase(process.env.DATABASE_URL),
  }),
  sharp,
  plugins: [
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: { media: true },
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }),
  ],
})
