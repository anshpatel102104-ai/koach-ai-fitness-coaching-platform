# Deployment

Koach AI is a static single-page app (Vite build) served on **Cloudflare
Workers static assets**. Deploys run `wrangler deploy`, which uploads the
`dist/` build output to Cloudflare — this is the current Workers/Pages unified
flow, **not** the legacy Cloudflare Pages "build command + output directory"
flow.

> Migration note: earlier this project was set up for Cloudflare Pages, where a
> `wrangler.toml`/`wrangler.jsonc` was *not* used and SPA routing relied on a
> `public/_redirects` fallback rule. Both of those are obsolete under Workers
> static assets — see below.

## `wrangler.jsonc`

The repo root contains [`wrangler.jsonc`](./wrangler.jsonc), which drives the
deploy:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "koach-ai-fitness-coaching-platform",
  "compatibility_date": "2026-07-18",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```

- **`name`** must match the Worker name shown in the Cloudflare dashboard. If
  it doesn't, a Workers Builds git deploy fails with a name-mismatch error.
- **`compatibility_date`** pins runtime behavior; bump it deliberately, not
  automatically.
- **`assets.directory: "./dist"`** is the Vite build output that gets uploaded.
- **`assets.not_found_handling: "single-page-application"`** returns
  `index.html` with a `200 OK` for any path that doesn't match a static asset,
  so client-side (React Router) routes resolve on hard refresh / deep link.
  This is the native Workers-assets replacement for the old
  `public/_redirects` `/* /index.html 200` SPA hack.
- **No `main` field.** This is a pure static SPA with no Worker-side logic, and
  Workers static assets supports assets-only deployment with no script entry.
  (An `assets.binding` is only valid alongside `main`, so it is also omitted.)

### Why there is no `public/_redirects`

Under Cloudflare Pages, SPA fallback required a `public/_redirects` file
containing `/* /index.html 200`. Workers static assets handles this natively
via `not_found_handling: "single-page-application"`, so no `_redirects` file is
needed and none is kept in this repo. (Workers static assets *does* still
support a `_redirects` file for genuine path-to-path redirects if you ever need
them — but it is not the mechanism for SPA fallback and would be redundant with
`not_found_handling` here.)

## Deploying from the Cloudflare dashboard (Workers Builds)

Cloudflare's dashboard now uses one unified Workers/Pages flow. Connect the git
repo once and every push to the production branch builds and deploys:

1. In the Cloudflare dashboard, go to **Workers & Pages**.
2. **Create application → Import a repository**, pick the Git account, and
   select `koach-ai-fitness-coaching-platform`. (For an existing Worker:
   **Settings → Builds → Connect**.)
3. Configure the build. The connect screen asks for two commands, not the old
   single "build command + output directory" pair:
   - **Build command** *(optional)*: `npm run build`
   - **Deploy command**: `npx wrangler deploy` (this is the default; it reads
     `wrangler.jsonc` and uploads `./dist`).
   - **Preview / non-production branch deploy command** *(optional)*, if you
     enable non-production branch builds:
     `npx wrangler versions upload` (uploads a preview version without
     promoting it to production).
4. Add the runtime environment variables listed below under **Settings →
   Variables & Secrets** (build-time `VITE_*` vars must be present for the
   build step, since Vite inlines them at build time).
5. **Save and Deploy.** Subsequent pushes to the production branch redeploy
   automatically.

> The Worker name configured in the dashboard must equal the `name` in
> `wrangler.jsonc` (`koach-ai-fitness-coaching-platform`), or the build fails.

## Deploying from the command line

```bash
npm ci
npm run build          # emits ./dist
npx wrangler deploy    # reads wrangler.jsonc, uploads ./dist
```

Validate config changes without deploying:

```bash
npx wrangler deploy --dry-run
```

## Environment variables

These come from [`.env.example`](./.env.example). `VITE_*` variables are read at
**build time** by Vite and inlined into the bundle, so they must be set for the
build step (locally in `.env.local`, or as build variables in Workers Builds).
Server-side secrets are set on Supabase, not in the frontend build, and must
never be `VITE_`-prefixed.

| Variable | Where | Required | Description |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Frontend (build) | Yes | Supabase project URL for the data facade. |
| `VITE_SUPABASE_ANON_KEY` | Frontend (build) | Yes | Supabase anon key. **Anon key only — never the service role in frontend env.** |
| `SUPABASE_URL` | Edge Function (server) | Server | Auto-injected for deployed Supabase functions. |
| `SUPABASE_ANON_KEY` | Edge Function (server) | Server | Auto-injected for deployed Supabase functions. |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function (server) | Server | Auto-injected; server-side only, never in the browser bundle. |
| `SUPABASE_JWT_SECRET` | Edge Function (server) | Server | Signs the short-lived portal JWT (`validateInviteToken`). |
| `APP_URL` | Edge Function (server) | Server | Base URL used to build the `/client-setup` invite link. |

Set server-side secrets with `supabase secrets set` — they are not part of the
Cloudflare deploy.
