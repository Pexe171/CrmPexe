# AGENTS.md

## Cursor Cloud specific instructions

### Overview

CrmPexe (AtendeAi) is a TypeScript monorepo with two apps:
- **API** (`apps/api`): NestJS + Prisma + PostgreSQL (port 3001)
- **Web** (`apps/web`): React + Vite + Tailwind CSS (port **8081** in dev)

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
cd /workspace/apps/web && npx vite &                  # Web on port 8081
```

Or from root: `unset DATABASE_URL && pnpm dev` (runs both via Turborepo).

### Running checks

Standard commands from `package.json` scripts:
- `pnpm lint` — ESLint (web has 3 pre-existing lint errors, non-blocking)
- `pnpm test` — Jest (API, 34 tests) + Vitest (Web, 1 test)
- `pnpm build` — production build
- `pnpm typecheck` — TypeScript type checking

### OTP login in dev (no SMTP)

There is no real SMTP configured locally. The OTP has a short effective TTL (~60s), so **request + brute-force + verify must happen in a single script** to avoid expiry. Use this all-in-one Node script:

```bash
cd /workspace/apps/api && unset DATABASE_URL && node -e "
const http = require('http');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();
function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({ hostname:'localhost', port:3001, path, method:'POST', headers:{'Content-Type':'application/json','Content-Length':data.length} }, res => { let b=''; res.on('data',c=>b+=c); res.on('end',()=>resolve(JSON.parse(b))); });
    req.on('error', reject); req.end(data);
  });
}
(async () => {
  const email = 'davidhenriquesms18@gmail.com';
  await post('/api/auth/request-otp', { email });
  const otp = await prisma.otpCode.findFirst({ where: { email, usedAt: null }, orderBy: { createdAt: 'desc' } });
  if (!otp) { console.log('No OTP found'); return; }
  let code;
  for (let i = 100000; i < 1000000; i++) {
    if (crypto.createHash('sha256').update(i.toString()).digest('hex') === otp.codeHash) { code = i.toString(); break; }
  }
  const r = await post('/api/auth/verify-otp', { email, code });
  console.log(JSON.stringify(r));
})().finally(() => prisma.\\\$disconnect());
"
```

The result JSON contains `user` and `tokens.accessToken` for subsequent API calls.

### Initial DB setup (first time only)

Before running Prisma migrations, the shadow database must exist:

```bash
sudo docker exec crmpexe-postgres psql -U crmpexe -c "CREATE DATABASE crmpexe_shadow;" 2>/dev/null || true
```

### Seeded data

Run `cd /workspace/apps/api && unset DATABASE_URL && npx prisma db seed` to create:
- **Workspace Demo** (code `DEMO01`, password `123456`)
- **Admin user**: `davidhenriquesms18@gmail.com` (role ADMIN)
- 2 published agent templates and 1 marketplace automation template
