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
- `JWT_IMPERSONATION_EXPIRES_IN` (opcional, padrão `15m`) — validade do token temporário de suporte.
- `OTP_TTL_MS` (opcional, padrão 10 min) — TTL do OTP.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (opcional) — envio de e-mail OTP.
- `CORS_ORIGIN` (opcional, padrão `http://localhost:3000`) — origens permitidas.
- `REDIS_URL` (opcional) **ou** `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` — configuração da fila de processamento de IA.
- `AI_PROCESSING_CONCURRENCY` (opcional, padrão `3`).
- `INTEGRATION_ENCRYPTION_KEY` (opcional) — chave para criptografia de integrações.
- `SLA_RESPONSE_SECONDS` (opcional, padrão `900`) — SLA de resposta em conversas.
- `NODE_ENV` (opcional) — ativa validações extras em produção.
- `AUTH_RATE_LIMIT_WINDOW_MS` (opcional, padrão `600000`) — janela do rate limit em endpoints de auth (ms).
- `AUTH_RATE_LIMIT_MAX` (opcional, padrão `20`) — limite máximo por janela em auth.
- `WEBHOOK_RATE_LIMIT_WINDOW_MS` (opcional, padrão `300000`) — janela do rate limit em webhooks (ms).
- `WEBHOOK_RATE_LIMIT_MAX` (opcional, padrão `120`) — limite máximo por janela em webhooks.
- `LOGIN_MAX_ATTEMPTS` (opcional, padrão `5`) — tentativas de login antes do bloqueio temporário.
- `LOGIN_WINDOW_MS` (opcional, padrão `900000`) — janela para contabilizar tentativas de login.
- `LOGIN_BLOCK_MS` (opcional, padrão `900000`) — tempo de bloqueio após exceder tentativas.
- `CAPTCHA_REQUIRED` (opcional, padrão `false`) — força captcha em auth quando `true`.
- `CAPTCHA_SECRET` (opcional) — segredo para validar captcha simples via token.

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
- **Revogar refresh tokens do workspace**: `POST /api/auth/revoke-refresh-tokens` (requer header `x-workspace-id` e usuário com role `ADMIN`).

## Suporte (impersonate)
O modo de suporte permite que um **super admin** gere um token temporário para entrar como membro de um workspace. Todas as ações são registradas no audit log com a ação `IMPERSONATION_STARTED`.

Rotas principais:
- **Gerar token de suporte**: `POST /api/support/impersonations` (payload com `workspaceId`, `userId` e `reason` opcional).
- **Listar membros do workspace**: `GET /api/support/workspaces/:id/members` (para selecionar o usuário a ser impersonado).
- **Consultar sessão atual**: `GET /api/auth/me` (retorna se o usuário está em modo suporte).

> Observação: o front-end exibe um aviso “Modo suporte ativo” quando o token temporário está em uso. O portal do super admin agora possui uma tela dedicada para iniciar a impersonação.

## Super Admin
O portal de **Super Admin** permite visualizar todos os workspaces, status de assinatura, plano atual, uso de mensagens/automações e logs de erro. Para habilitar um usuário, defina o campo `isSuperAdmin` como `true` no cadastro do usuário (ex.: via seed ou update manual no banco).

Rotas protegidas (requer `isSuperAdmin`):
- **Lista de workspaces**: `GET /api/super-admin/workspaces` (retorna status, plano e uso consolidado).
- **Logs de erro**: `GET /api/super-admin/error-logs` (retorna falhas de IA com workspace e mensagem).

> Observação: o seed padrão já cria um usuário admin com `isSuperAdmin: true`.

Seed padrão:
- **E-mail do super admin**: `davidhenriqusms18@gmail.com` (recebe OTP real durante os testes).

## Automações (marketplace interno)
Templates de automação agora possuem **versionamento** e **changelog**. Cada nova versão criada por um super admin registra o histórico e permite que workspaces escolham manter a versão atual ou atualizar para a mais recente.

Fluxos suportados:
- **Criar template**: `POST /api/automation-templates` (já cria a versão inicial, restrito ao super admin).
- **Criar nova versão**: `POST /api/automation-templates/:id/versions` (restrito ao super admin).
- **Listar versões**: `GET /api/automation-templates/:id/versions`.
- **Instalar versão específica**: `POST /api/automation-templates/:id/install` (payload com `versionId` opcional).
- **Atualizar instância**: `POST /api/automations/:id/update-version`.

> Observação: instâncias armazenam o `templateVersionId` para permitir fixar ou atualizar versões com segurança. No painel de automações do workspace é possível fixar a versão desejada ou atualizar para a última versão publicada.

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
- O backend gera **logs JSON** com `correlationId` por request (header `x-correlation-id`) e registra chamadas externas (n8n, WhatsApp, billing) com tempo e status.
- Endpoints de **auth** e **webhooks** aplicam rate limit por IP e workspace. Tentativas de login inválidas são bloqueadas após exceder o limite configurado. Captcha pode ser habilitado via variáveis de ambiente.

## Roadmap (pendências priorizadas)
- **Rotation de secrets**: permitir recriptografar integrações quando a chave de criptografia mudar.
