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

`npm run test:e2e` needs `python` on PATH (not only `python3`); it also serves `design/` on :4321 (and reuses whatever is already serving :4321) and compares every ported section with its prototype (`tests/e2e/parity.e2e.spec.ts`; diffs land in `test-results/parity/`). After changing a prototype's CSS run `npm run port:css`.

Known issue: `npx eslint` crashes repo-wide (circular ESLint config, pre-existing), so lint is not part of the checks yet.

Other known issues (inherited from the approved prototypes, left as designed):
- 404 pages: with two root layouts under a dynamic `[site]` segment, Next serves 404s from its client-rendered error shell (dev and production). The layout's early <head> script is therefore not run there (nothing on a 404 needs it), and dev logs React's "Encountered a script tag while rendering React component". Next's documented remedy, `global-not-found.js`, is experimental and would drop per-site theming.
- Logistics: with JavaScript off, the quote form shows step 2 and its ghost Back button (`#qBack`) fails color-contrast (white on the light card). The prototype has the same issue; axe is checked after JS has run.

## Contact pages

`/contact` on Logistics and Home Upgrades reuses each home page's quote form through `src/components/forms/*`. Change a form there once and both pages update. Hub and Multimedia have no Contact page yet (`/contact` is a 404 there).

## Deploy (Vercel)
The repo is ready to import as one Vercel project serving all four domains.

1. **Push the repo** to GitHub (or GitLab/Bitbucket) and import it in Vercel.
2. **Root Directory: `web`.** At the repo root, `vercel.json` is ignored and the build skips migrations.
   Framework preset: Next.js. Node.js: 24.x (from `package.json` `engines`).
3. **Database: Neon** via the Vercel Marketplace integration, with **preview branching on**, so each
   preview deployment migrates its own database branch and never production. The integration sets
   `DATABASE_URL`.
4. **Uploads: Vercel Blob.** Create a Blob store and connect it; it sets `BLOB_READ_WRITE_TOKEN`.
5. **Environment variables** (Settings → Environment Variables):

   | Variable | Production | Preview | Notes |
   |---|---|---|---|
   | `DATABASE_URL` | Neon (integration) | Neon branch (integration) | |
   | `PAYLOAD_SECRET` | long random string | a different one | e.g. `openssl rand -hex 32` |
   | `BLOB_READ_WRITE_TOKEN` | Blob (integration) | Blob (integration) | |
   | `ROOT_DOMAIN` | `thegenixgroup.com` | `thegenixgroup.com` | never `localhost:3000` |
   | `ALLOW_INDEXING` | `1` | *(unset)* | unset = `robots.txt` blocks search engines |

   Leave `SEED_ADMIN_*` unset in Vercel.
   The app refuses to start in production without `PAYLOAD_SECRET`, `DATABASE_URL` and (on Vercel)
   `BLOB_READ_WRITE_TOKEN`; the error names what is missing (`src/payload/env.ts`).
6. **Deploy.** The build command (`npm run build:vercel`, from `vercel.json`) runs
   `payload migrate`, then `next build`. The build reads the CMS, so it fails loudly if the database
   is unreachable instead of shipping default content.
7. **Starter content** (once, after the first successful deploy): from this folder, with the Neon
   production connection string,
   ```bash
   DATABASE_URL="<neon production url>" npm run seed
   ```
   This creates the four site records, and leaves any existing record alone. Schema push only runs
   against local databases (`src/payload/local-db.ts`), so this never changes the Neon schema.
8. **First admin:** open `https://thegenixgroup.com/admin` and create the first user; the first
   user becomes admin. Invite editors from the admin afterwards.
   `VERCEL_ENV` is baked in at build time (it decides whether the Logistics quote form, without email
   keys, saves and logs emails (non-production) or says it can't take requests online yet (production)).
   Promoting a preview deployment to production therefore needs a fresh production build, not a
   promote, or the form would behave like a preview in production.
9. **Domains:** add `thegenixgroup.com`, `logistics.thegenixgroup.com`,
   `homeupgrades.thegenixgroup.com` and `multimedia.thegenixgroup.com` to the same project.
   `www.thegenixgroup.com` should redirect to the apex.
10. **Check:** each domain shows its own site; `/admin` works on the apex only; each host serves
    its own `/sitemap.xml` and `robots.txt`.

**Preview deployments** run on `*.vercel.app` hosts, which don't match any site. Add
`?site=logistics` (or `hub`, `homeupgrades`, `multimedia`) once; it is remembered in a cookie.

**Changing collections later:** run `npx payload migrate:create <name>` against your local
database, commit the new files in `src/migrations/`, and the next deploy applies them. If a change
alters the `SiteData` shape, bump `SITE_DATA_SHAPE` in `src/sites/data.ts`.

### Enquiry emails
On production the quote form says it can't take requests online yet until `RESEND_API_KEY`, `INQUIRY_TO` and `IP_HASH_SALT` are all set (`IP_HASH_SALT` is required for live in production). Outside production without keys, the form saves the inquiry and logs the emails instead of sending them.
1. Resend: add and verify the domain `thegenixgroup.com` (add its DNS records in Vercel → Domains).
2. Vercel → Settings → Environment Variables (Production): `RESEND_API_KEY`, `INQUIRY_TO=hello@thegenixgroup.com`,
   `INQUIRY_FROM=quotes@thegenixgroup.com`, `IP_HASH_SALT` (e.g. `openssl rand -hex 32`), `CRON_SECRET` (same way).
3. Redeploy. Failed emails are retried daily at 14:00 UTC and from the "Send email again" button in /admin.

`CRON_SECRET` is needed for the daily retry; without it, failed emails only go out when someone presses "Send email again" in /admin.
Vercel BotID needs no dashboard setup: it works once the site is deployed on Vercel, and local dev always passes the check.

### Home Upgrades photos (Cloudinary)
The Home Upgrades quote form lets visitors attach up to 5 photos. They are stored on Cloudinary.
1. Create a free account at cloudinary.com.
2. Vercel → Settings → Environment Variables, **Production only**: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. When adding each one, **untick Preview and Development** so only Production is ticked. Redeploy.

Without all three the photo block is hidden and `/uploads` returns 404; the form still works with links only.

**Warning: put real Cloudinary keys only in Vercel's Production environment, never in a local `web/.env` and not in Preview.** The daily cleanup deletes photos not referenced by the database it is connected to, so a local or preview database pointed at the live Cloudinary account would treat customers' photos as orphans. Two guards back this up:
- The cleanup runs **only on Production** (`VERCEL_ENV=production`); on Preview, locally and in tests it deletes nothing.
- If more than half of the photos older than 24 hours (and more than 10) look unreferenced, it **aborts, deletes nothing and logs** `photo cleanup aborted: … check DATABASE_URL / Cloudinary keys` in the Vercel function logs. Check that Production's `DATABASE_URL` and Cloudinary keys belong together.

Uploads are private (`authenticated`). Thumbnails in emails and /admin are signed URLs; full-size links expire (30 days in emails, 1 hour in /admin). Photos not attached to a saved enquiry are deleted by the daily cron after 24 hours, and deleting an inquiry in /admin deletes its photos (except any another enquiry still uses).

### Privacy policy
The group's privacy policy is `web/src/legal/privacy.tsx`, served at `thegenixgroup.com/privacy` (division sites redirect there; the quote forms and every footer link to it). When a new service provider handles visitors' data, a new kind of data is collected, or a new business gets a form, update the text and `PRIVACY_UPDATED` in that file. The hub's mailing address appears on the page only when street, city, state and ZIP are all filled in under Admin → Sites → hub.
