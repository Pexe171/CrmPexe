# CrmPexe (AtendeAi)

Plataforma CRM omnichannel com gestão de agentes IA integrados ao n8n, API em NestJS e front-end em React + Vite, organizada como monorepo com Turborepo.

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Docker e Docker Compose

> ⚠️ Este repositório usa **exclusivamente pnpm**. Não use `npm` ou `yarn`.

## Setup rápido (5 passos)

### 1) Instalar dependências

```bash
pnpm install
```

### 2) Subir Postgres e Redis

```bash
docker compose up -d postgres redis
```

> O n8n é opcional: `docker compose up -d n8n` (só necessário para publicar agentes).

### 3) Configurar variáveis de ambiente

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### 4) Preparar banco de dados

```bash
pnpm prisma:migrate:dev
pnpm prisma:generate
```

Opcional — criar usuário admin e workspace inicial:

```bash
cd apps/api && npx prisma db seed
```

O seed cria apenas:
- Usuário admin: `davidhenriquesms18@gmail.com`
- Workspace: "Workspace Demo" (código `DEMO01`)

### 5) Rodar em modo desenvolvimento

```bash
pnpm dev
```

- **Web**: http://localhost:8080
- **API**: http://localhost:3001

---

## Como usar o sistema

### Login (OTP)

1. Acesse http://localhost:8080 → redireciona para `/login`
2. Informe o e-mail cadastrado e clique **Receber código OTP**
3. O código OTP é enviado por e-mail (se SMTP estiver configurado)
4. Informe o código e clique **Entrar**

### Páginas disponíveis

| Rota | Página | Descrição |
|------|--------|-----------|
| `/` | Dashboard | KPIs, gráficos de vendas, conversas recentes, funil de conversão |
| `/agents` | Gestão de Agentes | Importar JSON do n8n, publicar, listar, excluir agentes |
| `/conversations` | Conversas | Visualizar conversas com leads (split-panel com chat) |
| `/integrations` | Integrações | Conectar WhatsApp (QR Code), OpenAI, Email e outros |
| `/admin/workspaces` | Admin: Workspaces | Buscar workspaces, atribuir agentes com data de validade |
| `/login` | Login | Autenticação via OTP |

### Fluxo completo: importar e ativar um agente

#### 1. Admin importa o JSON do n8n

1. Vá em `/agents` → aba **Importar JSON**
2. Faça upload do arquivo `.json` exportado do n8n
3. Preencha nome, categoria e descrição
4. Clique **Importar JSON e publicar**
5. O sistema automaticamente:
   - Valida o schema (precisa ter `nodes` e `connections`)
   - Extrai variáveis (`{{OPENAI_KEY}}`, `{{WHATSAPP_TOKEN}}`, etc.)
   - Cria versão draft e publica no n8n

#### 2. Admin atribui agente a um workspace

1. Vá em `/admin/workspaces`
2. Busque e selecione o workspace do cliente
3. Clique **Adicionar Agente**
4. Selecione o agente publicado
5. Defina a validade (data de expiração ou vazio para sem limite)
6. Confirme

#### 3. Cliente ativa o agente

1. O cliente acessa `/agents` → aba **Adicionar ao Workspace**
2. Seleciona o agente e o workspace
3. Preenche as variáveis necessárias (ex: API key da OpenAI)
4. Clica **Adicionar agente**

### Conectar WhatsApp

1. Vá em `/integrations`
2. Clique **Adicionar WhatsApp**
3. Configure a URL e Token da API (Evolution API ou compatível)
4. Clique **Gerar QR Code**
5. Escaneie o QR Code com o celular (WhatsApp → Aparelhos conectados)
6. O sistema faz polling automático e confirma a conexão

### Visualizar conversas com leads

1. Vá em `/conversations`
2. Selecione uma conversa na lista à esquerda
3. Visualize as mensagens no painel direito
4. As conversas aparecem automaticamente quando leads entram em contato via WhatsApp ou outros canais

---

## Tecnologias

| Camada | Stack |
|--------|-------|
| **API** | NestJS, Prisma, PostgreSQL, Redis, BullMQ |
| **Web** | React 18, Vite, Tailwind CSS, Radix UI, React Query |
| **Infra** | Docker, n8n, Evolution API (WhatsApp) |
| **Monorepo** | Turborepo, pnpm workspaces |

## Estrutura do repositório

```
apps/
  api/          # API NestJS (porta 3001)
  web/          # Front-end React + Vite (porta 8080)
```

## Scripts úteis

| Comando | O que faz |
|---------|-----------|
| `pnpm dev` | Roda API + Web em modo dev |
| `pnpm dev:api` | Roda apenas a API |
| `pnpm dev:web` | Roda apenas o Web |
| `pnpm build` | Build de produção |
| `pnpm lint` | Lint (ESLint) |
| `pnpm test` | Testes (Jest + Vitest) |
| `pnpm typecheck` | Checagem de tipos (TypeScript) |
| `pnpm format` | Formatação (Prettier) |
| `pnpm prisma:generate` | Gera Prisma Client |
| `pnpm prisma:migrate:dev` | Roda migrações em dev |

## Variáveis de ambiente

### API (`apps/api/.env`)

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Conexão com Postgres |
| `JWT_ACCESS_SECRET` | Segredo JWT (access token) |
| `JWT_REFRESH_SECRET` | Segredo JWT (refresh token) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | SMTP para envio de OTP |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` | IA (resumo, classificação, sugestão) |
| `N8N_BASE_URL`, `N8N_API_TOKEN` | Integração n8n |
| `MERCADOPAGO_ACCESS_TOKEN` | Billing (Mercado Pago) |
| `WHATSAPP_WEBHOOK_SECRET` | Segredo para validar webhooks WhatsApp |

### Web (`apps/web/.env`)

| Variável | Descrição |
|----------|-----------|
| `VITE_API_BASE_URL` | URL base da API (recomendado `/api`) |
| `VITE_API_PROXY_TARGET` | Alvo do proxy Vite (ex: `http://localhost:3001`) |

## Endpoints da API (principais)

### Autenticação
- `POST /api/auth/request-otp` — Solicitar código OTP
- `POST /api/auth/verify-otp` — Verificar OTP e autenticar
- `GET /api/auth/me` — Dados do usuário logado

### Agentes (Admin)
- `POST /api/agent-templates/import` — Importar JSON do n8n
- `POST /api/agent-templates/:id/publish` — Publicar no n8n
- `GET /api/agent-templates` — Listar agentes
- `GET /api/agent-templates/:id` — Detalhes do agente
- `PATCH /api/agent-templates/:id` — Atualizar agente
- `DELETE /api/agent-templates/:id` — Arquivar agente

### Agentes (Workspace)
- `GET /api/workspace-agents/catalog` — Catálogo de agentes disponíveis
- `POST /api/workspace-agents/:id/activate` — Ativar agente no workspace
- `POST /api/workspace-agents/:id/deactivate` — Desativar agente
- `GET /api/workspace-agents` — Listar agentes do workspace

### Agentes (Admin → Workspace)
- `GET /api/workspace-agents/admin/workspaces` — Buscar workspaces
- `GET /api/workspace-agents/admin/workspaces/:id/agents` — Agentes de um workspace
- `POST /api/workspace-agents/admin/assign` — Atribuir agente a workspace (com validade)

### Integrações
- `GET /api/integration-accounts` — Listar integrações
- `POST /api/integration-accounts` — Criar integração
- `PUT /api/integration-accounts/:id/secret` — Configurar segredos
- `POST /api/integration-accounts/:id/whatsapp/qr` — Gerar QR Code do WhatsApp
- `GET /api/integration-accounts/:id/whatsapp/status` — Status da conexão

### Conversas
- `GET /api/conversations` — Listar conversas
- `GET /api/conversations/:id` — Detalhes com mensagens

### Dashboard
- `GET /api/dashboard/sales` — KPIs e métricas

## Produção com Docker

```bash
# Build e subir stack completa
docker compose -f docker-compose.prod.yml up -d --build
```

O `docker-compose.prod.yml` inclui healthchecks, limites de recursos e restart automático. A API executa `prisma migrate deploy` automaticamente no startup.

## Troubleshooting

- **Erro de conexão com banco**: confirme se Docker está rodando e `DATABASE_URL` está correto
- **Erro com Prisma**: rode `pnpm prisma:generate` e depois `pnpm prisma:migrate:dev`
- **Portas ocupadas**: finalize processos nas portas 8080/3001
- **401 no frontend**: mantenha `VITE_API_BASE_URL=/api` no `.env` do web

## Licença

Licença proprietária — consulte o time responsável.
