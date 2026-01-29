# CrmPexe

## Visão geral
O **CrmPexe** é um monorepo com uma API em NestJS e um front-end em Next.js para um CRM multi-tenant. A API expõe endpoints REST com autenticação por OTP/JWT, integrações e filas de processamento, enquanto o front-end consome a API e entrega a interface administrativa. Este README documenta exatamente o estado atual do projeto (scripts, variáveis, portas e fluxos locais).

## Arquitetura
- **apps/api**: Backend NestJS com Prisma e banco PostgreSQL. Porta padrão: **3001** (prefixo global `/api`).
- **apps/web**: Front-end Next.js. Porta padrão: **3000**.
- **Infra local (docker-compose)**: PostgreSQL, Redis e n8n opcionais para desenvolvimento.

## Pré-requisitos
- **Node.js** (compatível com o ecossistema do projeto).
- **pnpm 9.x** (package manager definido no root).
- **Docker + Docker Compose** (para banco/redis/n8n em dev).

## PASSO A PASSO — Ambiente local
> **Objetivo:** colocar API + Web rodando localmente com banco e configurações corretas.

### PASSO 1 — Instalar dependências
**Objetivo:** instalar pacotes do monorepo.

```bash
pnpm install
```

### PASSO 2 — Subir infraestrutura (Postgres/Redis/n8n)
**Objetivo:** iniciar serviços auxiliares via Docker.

```bash
docker compose up -d
```

Serviços e portas padrão:
- Postgres: `localhost:5432` (db `crmpexe`).
- Redis: `localhost:6379` (usado pela fila da API).
- n8n: `localhost:5678` (opcional para automações).

### PASSO 3 — Configurar variáveis de ambiente
**Objetivo:** garantir que API e Web tenham acesso às URLs e segredos necessários.

#### 3.1 API (`apps/api/.env`)
Crie um arquivo `apps/api/.env` baseado no exemplo.

```bash
cp apps/api/.env.example apps/api/.env
```

Variáveis usadas pela API hoje:
- `DATABASE_URL` (**obrigatória**) — conexão com o PostgreSQL.
- `JWT_ACCESS_SECRET` (**obrigatória em produção**) — segredo do access token.
- `JWT_REFRESH_SECRET` (**obrigatória em produção**) — segredo do refresh token.
- `JWT_ACCESS_EXPIRES_IN` (opcional, padrão `15m`).
- `JWT_REFRESH_EXPIRES_IN` (opcional, padrão `7d`).
- `OTP_TTL_MS` (opcional, padrão 10 min) — TTL do OTP.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (opcional) — envio de e-mail OTP.
- `CORS_ORIGIN` (opcional, padrão `http://localhost:3000`) — origens permitidas.
- `REDIS_URL` (opcional) **ou** `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` — configuração da fila de processamento de IA.
- `AI_PROCESSING_CONCURRENCY` (opcional, padrão `3`).
- `INTEGRATION_ENCRYPTION_KEY` (opcional) — chave para criptografia de integrações.
- `SLA_RESPONSE_SECONDS` (opcional, padrão `900`) — SLA de resposta em conversas.
- `NODE_ENV` (opcional) — ativa validações extras em produção.

> Observação: `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_PUBLIC_KEY` existem no `.env.example`, mas **não são usadas pelo código atual** (mantidas para futuras integrações).

#### 3.2 Web (`apps/web/.env`)
Crie um arquivo `apps/web/.env` baseado no exemplo.

```bash
cp apps/web/.env.example apps/web/.env
```

Variáveis usadas pela Web:
- `NEXT_PUBLIC_API_URL` (opcional, padrão `http://localhost:3001`) — URL base da API.

### PASSO 4 — Gerar client Prisma e aplicar migrations
**Objetivo:** preparar o banco e o client do Prisma.

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

### PASSO 5 — Iniciar a API e o Front-end
**Objetivo:** subir os serviços de aplicação.

```bash
pnpm dev
```

- API disponível em: `http://localhost:3001/api` (health: `/api/health`).
- Web disponível em: `http://localhost:3000`.

## Scripts úteis (root)
```bash
pnpm dev          # API + Web em paralelo
pnpm dev:api      # Apenas API
pnpm dev:web      # Apenas Web
pnpm build        # Build de todos os apps
pnpm lint         # Lint de todos os apps
pnpm test         # Testes de todos os apps
pnpm typecheck    # Typecheck de todos os apps
```


## Endpoints principais
- **Health check**: `GET /api/health` → `{ status: "ok", service: "crmpexe-api" }`.

## Super Admin
O portal de **Super Admin** permite visualizar todos os workspaces, status de assinatura, plano atual, uso de mensagens/automações e logs de erro. Para habilitar um usuário, defina o campo `isSuperAdmin` como `true` no cadastro do usuário (ex.: via seed ou update manual no banco).

Rotas protegidas (requer `isSuperAdmin`):
- **Lista de workspaces**: `GET /api/super-admin/workspaces` (retorna status, plano e uso consolidado).
- **Logs de erro**: `GET /api/super-admin/error-logs` (retorna falhas de IA com workspace e mensagem).
- **Impersonação de suporte**: `POST /api/super-admin/workspaces/:workspaceId/impersonate` (gera token temporário para entrar como membro do workspace e registra em audit log).

> Observação: o seed padrão já cria um usuário admin com `isSuperAdmin: true` e e-mail `davidhenriqusms18@gmail.com`.

## Modo suporte (impersonate)
- O super admin pode gerar um token temporário de suporte para entrar como membro de um workspace.
- Ao consumir o token no endpoint `POST /api/auth/impersonate`, a sessão recebe cookies temporários e a interface exibe o aviso **“Modo suporte ativo”**.
- O token é de uso único e expira automaticamente após alguns minutos (configurável por `SUPPORT_IMPERSONATION_TTL_MS`).

## Templates de automação (marketplace interno)
- Templates agora possuem **versionamento** (`v1`, `v2`, etc.) e **changelog**.
- Workspaces podem **fixar** uma versão específica ao instalar e, quando desejarem, **atualizar** a instância para a versão mais recente via endpoint `POST /api/automation-instances/:id/upgrade`.
- O agrupamento de versões é feito pela chave `templateKey`, permitindo múltiplas versões do mesmo template.


## Estrutura do repositório
```text
.
├── apps
│   ├── api   # NestJS + Prisma
│   └── web   # Next.js
├── docker-compose.yml
├── package.json
└── turbo.json
```

## Observações importantes
- O backend exige **JWT secrets em produção**; em desenvolvimento há fallback para segredos padrão.
- A API aplica **ValidationPipe** com `whitelist` e `forbidNonWhitelisted` para segurança de payloads.
- O prefixo global da API é `/api`, então todas as rotas são prefixadas automaticamente.
