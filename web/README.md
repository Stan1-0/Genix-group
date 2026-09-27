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
