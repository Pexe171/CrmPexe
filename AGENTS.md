# AGENTS.md

## Cursor Cloud specific instructions

### Overview

CrmPexe (AtendeAi) is a TypeScript monorepo with two apps:
- **API** (`apps/api`): NestJS + Prisma + PostgreSQL (port 3001)
- **Web** (`apps/web`): React + Vite + Tailwind CSS (port 8080)

Infrastructure: PostgreSQL 16 and Redis 7 via Docker Compose. See `README.md` for full command reference.

### Critical gotcha: DATABASE_URL environment variable

The Cloud VM may inject a `DATABASE_URL` environment variable that overrides the one in `apps/api/.env`. Before starting the API dev server, **always** run `unset DATABASE_URL` in the same shell. The correct value is already in `apps/api/.env` (pointing to `localhost:5432`). If you skip this step, the API will fail to connect to the database.

### Starting infrastructure services

```bash
sudo dockerd &>/dev/null &   # only if Docker daemon is not running
sudo docker compose up -d postgres redis   # required
```

n8n (`sudo docker compose up -d n8n`) is optional; only needed for automation/agents marketplace features.

### Starting dev servers

```bash
unset DATABASE_URL
cd /workspace/apps/api && npx nest start --watch &   # API on port 3001
cd /workspace/apps/web && npx vite &                  # Web on port 8080
```

Or from root: `unset DATABASE_URL && pnpm dev` (runs both via Turborepo).

### Running checks

Standard commands from `package.json` scripts:
- `pnpm lint` — ESLint (web has 3 pre-existing lint errors, non-blocking)
- `pnpm test` — Jest (API, 34 tests) + Vitest (Web, 1 test)
- `pnpm build` — production build
- `pnpm typecheck` — TypeScript type checking

### OTP login in dev (no SMTP)

There is no real SMTP configured locally. To authenticate:
1. Request OTP: `POST http://localhost:3001/api/auth/request-otp` with `{"email":"davidhenriquesms18@gmail.com"}`
2. Retrieve OTP from DB by brute-forcing the SHA-256 hash (6-digit code, 100000-999999):
   ```bash
   cd /workspace/apps/api && unset DATABASE_URL && node -e "
   const { PrismaClient } = require('@prisma/client');
   const crypto = require('crypto');
   const prisma = new PrismaClient();
   (async () => {
     const otp = await prisma.otpCode.findFirst({ where: { email: 'davidhenriquesms18@gmail.com', usedAt: null }, orderBy: { createdAt: 'desc' } });
     if (!otp) { console.log('No OTP found'); return; }
     for (let i = 100000; i < 1000000; i++) {
       if (crypto.createHash('sha256').update(i.toString()).digest('hex') === otp.codeHash) { console.log('OTP:', i); break; }
     }
   })().finally(() => prisma.\$disconnect());
   "
   ```
3. Verify OTP: `POST http://localhost:3001/api/auth/verify-otp` with `{"email":"...","code":"<otp>"}`

### Seeded data

Run `cd /workspace/apps/api && unset DATABASE_URL && npx prisma db seed` to create:
- **Workspace Demo** (code `DEMO01`, password `123456`)
- **Admin user**: `davidhenriquesms18@gmail.com` (role ADMIN)
- 2 published agent templates and 1 marketplace automation template
