# IT Ticketing System

Internal IT service-desk / ticketing platform built with Next.js 16 (App Router, Turbopack),
React 19, Tailwind CSS 4, Drizzle ORM and PostgreSQL (Neon).

## Features

- Ticket intake, triage, assignment and SLA tracking
- Asset, meter, unit, user and role management
- Audit log capture on every mutation
- Public trackable report links (`/track/[token]`, `/r/[token]`)
- PDF generation for reports
- Bootstrap + seed data for a fresh database

## Requirements

- Node.js 20+ (developed on Node 24)
- A PostgreSQL database (Neon recommended)

> **Windows note:** Turbopack needs the `@next/swc-win32-x64-msvc` native binding. If you see
> `Turbopack is not supported on this platform (win32/x64)`, the native package is corrupt or
> missing — run `npm install` and confirm the file is ~130 MB:
> `node_modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node`

## Local setup

```bash
npm install
cp .env.example .env      # Windows: Copy-Item .env.example .env
```

Fill in `.env`:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | Full PostgreSQL connection string |
| `NEXT_PUBLIC_APP_URL` | yes | Base URL of the app, no trailing slash |
| `NEXT_PUBLIC_BUILDING_NAME` | no | Building/site name shown in UI and PDFs |
| `NEXT_PUBLIC_BUILDING_TZ` | no | IANA timezone used for SLA math, e.g. `Europe/Lisbon` |

Apply the schema and seed the database:

```bash
npm run db:push      # or: npm run db:migrate
npm run db:seed      # npm run db:seed -- --reset to wipe and reseed
```

Then start the dev server:

```bash
npm run dev
```

Other scripts:

```bash
npm run build       # production build
npm start           # serve the production build (run `npm run build` first)
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```

## Deploying to Vercel

1. Push this repository to GitHub, then in Vercel choose **Add New → Project** and import it.
   Vercel detects Next.js automatically; leave the build command as the default
   (`next build`) and the output directory as default.
2. Add the environment variables under **Project → Settings → Environment Variables**
   (mark them for *Production*, *Preview* and *Development* as needed):

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | your Neon connection string |
   | `NEXT_PUBLIC_APP_URL` | the `https://*.vercel.app` URL of the deployment |
   | `NEXT_PUBLIC_BUILDING_NAME` | your building name |
   | `NEXT_PUBLIC_BUILDING_TZ` | your IANA timezone |

3. Deploy. Vercel runs `next build` and serves the output.

### Getting the Neon connection string

In the Neon console: **Project → Connection Details**, copy the **pooled** URI. It looks like:

```
postgresql://USER:PASSWORD@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
```

Use the **pooled** host (`-pooler.`) for serverless deployments so connections scale with
concurrent lambdas. Keep the password out of git — store it only in Vercel environment
variables and, for local work, in `.env` (git-ignored).

### Applying migrations against the production database

Schema changes are applied from your machine against the same Neon database:

```bash
# .env must contain the production DATABASE_URL
npm run db:push
```

Do not run migrations as a Vercel build step — the build environment has no database access.

## Project structure

```
src/app/            routes (App Router), route handlers under src/app/api
src/app/actions/    server actions
src/db/             drizzle schema, pool, bootstrap and seed scripts
src/lib/            auth, permissions, SLA, workflow, PDF, audit helpers
drizzle/            generated SQL migrations
```
