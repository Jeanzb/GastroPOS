# Render Deployment

This repo deploys to Render with the root `render.yaml` Blueprint.

## Services

- `gastroia-api`: Docker web service for the NestJS API.
- `gastroia-web`: static deployment of the Electron/Vite renderer for browser access.
- `gastroia-postgres`: managed PostgreSQL.
- `gastroia-redis`: Render Key Value, Redis-compatible cache.

## First Deploy

1. Commit and push `render.yaml`, `Dockerfile.api`, and `.dockerignore` to `main`.
2. Open the Blueprint URL:
   `https://dashboard.render.com/blueprint/new?repo=https://github.com/Jeanzb/GastroIA`
3. Review the generated resources.
4. Fill the secret env vars marked as not synced:
   - `SEED_OWNER_PASSWORD`
   - `SEED_PLATFORM_OWNER_PASSWORD`
5. Apply the Blueprint.

The API container runs Prisma migrations during startup. It also runs the
initial seed only when the database has no platform users, tenants or tenant
users.

## Initial Platform User

On the first successful `gastroia-api` startup, the container runs:

```bash
bun apps/api/scripts/seed-if-empty.ts
```

That creates the platform owner, the BASIC plan/features, the demo tenant,
branch, inventory categories, tables and starter products using the `SEED_*`
env vars. The script skips automatically after initial data exists.

## Production URLs

- API health: `https://gastroia-api.onrender.com/api/v1/health/live`
- Web app: `https://gastroia-web.onrender.com`

If Render changes the generated service slug because a name is already taken,
update:

- `CORS_ORIGINS` on `gastroia-api`
- `VITE_API_BASE_URL` and `VITE_API_ORIGIN` on `gastroia-web`

## Custom Domain

Add the domain in Render Dashboard under the target service, then point DNS:

- Subdomain: CNAME to `<service>.onrender.com`
- Apex: flattened CNAME or Render-provided A record

After the domain is verified, update `CORS_ORIGINS` and the web build env vars to
use the custom API domain.
