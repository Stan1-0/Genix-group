# The Genix Group: websites

Source for **thegenixgroup.com** and the three division sites (Logistics, Home Upgrades,
Multimedia). One Next.js 16 app with an embedded Payload CMS 3 serves all four domains,
routed by host in `web/src/proxy.ts`.

## Repository layout

| Path | What it is |
|---|---|
| [`web/`](web) | The production app (Next.js + Payload + Postgres). **Deploy this folder.** |
| [`design/`](design) | Static HTML prototypes, brand assets and logo-tracing tools. Reference only; not deployed. |
| [`docs/`](docs) | Specs and implementation plans. |

## Getting started

Everything you need to run, test and deploy is in **[`web/README.md`](web/README.md)**:

- [Run locally](web/README.md#run-locally)
- [Tests](web/README.md#test)
- [Deploy to Vercel](web/README.md#deploy-vercel) (Root Directory = `web`)

## Conventions

- **Secrets never go in git.** Copy `web/.env.example` to `web/.env` locally; production values live in Vercel.
- **Branches:** work on a feature branch, open a PR into `main`. CI (typecheck + unit tests) must pass.
- **Formatting:** Prettier (`web/.prettierrc.json`) and `.editorconfig`; line endings are LF (`.gitattributes`).
- **Database changes:** create a migration (`npx payload migrate:create <name>`) and commit `web/src/migrations/`.
- **Brand:** the gold X in the GENIX logo is a trademark: show the logo whole, never reshape or reuse the X.
