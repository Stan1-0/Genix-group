# Genix websites (Next.js 16 + Payload 3)

One app serves thegenixgroup.com and the three division subdomains.

## Run locally
```bash
docker compose up -d          # Postgres 17 on :5434 (dbs: genix, genix_test)
cp .env.example .env          # then set PAYLOAD_SECRET
npm install
npm run seed                  # the four site records (+ optional dev admin)
npm run dev
```
Sites: http://localhost:3000 (hub, admin at /admin), http://logistics.localhost:3000,
http://homeupgrades.localhost:3000, http://multimedia.localhost:3000.

## Test
`npm run test:unit` · `npm run test:int` (needs Docker Postgres) · `npm run test:e2e` (starts `npm run dev`).

## Deploy
Production migrations run via `npm run build:vercel` (set as the build command in `vercel.json`); create new migrations with `npx payload migrate:create <name>` after changing collections.

### Deploy (Vercel)
- **Root Directory**: set the Vercel project's Root Directory to `web`. If it's left at the repo root, `vercel.json` (and its migrating build command) is ignored and the wrong build runs.
- **Neon preview branching**: enable Neon's Vercel integration with preview branching on. Each preview deployment then migrates its own database branch — never production. Without it, every preview would run `payload migrate` straight against the production database.
- **Required environment variables**, per environment:
  - All environments: `DATABASE_URL`, `PAYLOAD_SECRET`, `BLOB_READ_WRITE_TOKEN`.
  - All environments: `ROOT_DOMAIN=thegenixgroup.com`. Never `localhost:3000` in Vercel — it breaks subdomain routing and generated URLs.
  - Production only: `ALLOW_INDEXING=1`.
- **Seed data** (optional, one-time): after the first deploy, `npm run seed` against the Neon database populates the four site records and any coverage/phone data needed for launch content.
