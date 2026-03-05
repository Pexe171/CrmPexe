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

### 2b) (Opcional) Ativar o n8n

Para usar **automações, workflows e gestão de agentes**, suba o container do n8n:

```bash
docker compose up -d n8n
```

- Interface do n8n: http://localhost:5678 (quando estiver rodando).
- A API acessa o n8n em `http://n8n:5678` na rede `crm_network`; configure `N8N_BASE_URL` e `N8N_API_TOKEN` no `.env` da API.

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
- **WebSocket**: mesmo host da API, namespace `/conversations`

---

## Como usar o sistema

### Primeiro acesso

1. **Abrir o sistema**  
   Acesse o front (ex.: http://localhost:8080 em dev; a porta pode variar conforme o `vite.config.ts`). Se não estiver logado, será redirecionado para `/login`.

2. **Login com OTP**
   - Informe o e-mail cadastrado e clique em **Receber código OTP**.
   - O código é enviado por e-mail (configure SMTP no `.env` da API para funcionar).
   - Digite o código recebido e clique em **Entrar**.
   - O token fica salvo no navegador; as chamadas à API usam esse token.

3. **Workspace**
   - Se você ainda não tiver workspace, aparece a tela **Escolha seu workspace**.
   - **Criar novo workspace:** informe nome e senha do workspace.
   - **Entrar em um workspace:** use o código e a senha fornecidos pelo administrador.

Após o login, o menu lateral permite ir para Dashboard, Conversas, Pipeline, Integrações, Agentes, Automações e Configurações.

### Páginas e o que fazer em cada uma

| Rota | Página | O que você pode fazer |
|------|--------|------------------------|
| `/` | **Dashboard** | Ver KPIs, gráficos de vendas, conversas recentes e funil de conversão. |
| `/conversations` | **Conversas** | Ver lista de conversas, abrir chat em tempo real (WebSocket), ver painel do contato e enviar mensagens. Painéis são redimensionáveis. |
| `/sales` | **Pipeline** | Ver negócios (Deals) em colunas (Leads, Qualificação, Proposta, Negociação, Fechado, etc.). Arrastar um card para outra coluna altera o estágio do negócio. |
| `/integrations` | **Integrações** | Configurar WhatsApp (QR ou Evolution), OpenAI e N8N. Ver sessões ativas e chaves salvas. |
| `/agents` | **Gestão de Agentes** | Importar agentes (JSON do n8n), publicar, listar e excluir. Admin pode atribuir agentes a workspaces. |
| `/automations/flow` | **Fluxo (Bot)** | Montar fluxos visuais com nós (Gatilho, Ação, OpenAI), conectar com setas e salvar como template de automação. |
| `/settings/tags` | **Configurações: Tags** | Criar, editar e excluir tags usadas em conversas e negócios. |
| `/settings/queues` | **Configurações: Filas** | Criar, editar e excluir filas para organização de atendimento. |
| `/admin/workspaces` | **Admin: Workspaces** | (Admin) Buscar workspaces e atribuir agentes com data de validade. |
| `/workspace-setup` | **Escolha de workspace** | Aparece quando o usuário ainda não tem workspace; criar novo ou entrar em um existente. |
| `/login` | **Login** | Autenticação via OTP por e-mail. |

### Conversas (chat em tempo real)

- Em **Conversas** você vê a lista de conversas e, ao clicar em uma, o chat à direita.
- Novas mensagens (enviadas ou recebidas) aparecem na hora via WebSocket.
- O sistema evita duplicidade mesclando mensagens da API com as do socket.

### Pipeline (vendas)

- Cada negócio aparece como card em uma coluna (estágio).
- **Arrastar o card** para outra coluna atualiza o estágio no banco (`PATCH /api/deals/:id/stage`).

### Conectar WhatsApp

Tudo é feito pelo painel: o cliente **não precisa** usar Postman nem gerar nada fora do CrmPexe. Recomendado usar **API externa (Evolution)** para evitar bloqueios do WhatsApp.

1. Vá em **Integrações** e crie uma integração do tipo **WhatsApp** (botão **Nova Integração** ou card WhatsApp).
2. Escolha **API externa (Evolution) — recomendado** ou **Sessão integrada** (QR no próprio sistema; costuma falhar em PC/VPS).

**API externa (Evolution) — fluxo prático para o cliente:**

1. **Passo 1:** informe a **URL da Evolution** e o **Token** (fornecidos por quem instalou a Evolution). Clique em **Salvar e ir para passo 2**.
2. **Passo 2:** escolha uma opção:
   - **Conectar via QR Code (Gratuito)** — clique em **Gerar QR Code**; o sistema cria a instância e mostra o QR na tela. Escaneie com o WhatsApp (Aparelhos conectados). Se o QR expirar, use **Tentar novamente**.
   - **Conectar via API Oficial (Meta)** — preencha **Token da Meta** e **ID do número de telefone** (obtidos no [Painel de Desenvolvedores da Meta](https://developers.facebook.com/)). Clique em **Conectar via API Oficial**. O CRM cria a instância na Evolution.

As conversas passam a aparecer em **Conversas**.  
**Sessão integrada:** use **Gerar QR Code** no painel; em rede local ou VPS o WhatsApp costuma bloquear — nesses casos prefira Evolution.  
Guia completo: [docs/EVOLUTION-SETUP.md](docs/EVOLUTION-SETUP.md) (inclui instruções para quem instala a Evolution).

### Integrações OpenAI e N8N

- Na página **Integrações**, clique no card **OpenAI** ou **N8N**.
- No modal: informe **Nome** e as chaves (API Key para OpenAI; URL e API Key para N8N).
- Ao salvar, a conta é criada e os segredos ficam gravados e criptografados.

### Construtor de fluxo (Automations)

- Em **Automações** → **Fluxo** você monta o bot com nós (Gatilho, Ação, OpenAI) e conexões entre eles.
- Ao clicar em **Salvar**, o fluxo é enviado como template de automação (categoria `flow-builder`).

---

## Tecnologias

| Camada | Stack |
|--------|-------|
| **API** | NestJS, Prisma, PostgreSQL, Redis, BullMQ, Socket.IO, EventEmitter2 |
| **Web** | React 18, Vite, Tailwind CSS, Radix UI (shadcn), React Query, Zustand, Socket.IO Client, React Flow, @dnd-kit |
| **Infra** | Docker, n8n (rede `crm_network`), Evolution API (WhatsApp opcional) |
| **Monorepo** | Turborepo, pnpm workspaces |

## Estrutura do repositório

```
apps/
  api/          # API NestJS (porta 3001) + WebSocket namespace /conversations
  web/          # Front-end React + Vite (porta 8080)
```

Principais pastas no front:
- `apps/web/src/pages/` — Páginas (Conversations, Pipeline, Integrations, Settings/Tags, Settings/Queues, Automations/FlowBuilder, etc.)
- `apps/web/src/components/` — UI (shadcn), kanban, flow-nodes, integrations
- `apps/web/src/hooks/` — useAuthMe, useSocket
- `apps/web/src/stores/` — conversation-messages, whatsapp-socket (Zustand)
- `apps/web/src/lib/api/` — Cliente HTTP e funções por domínio (auth, conversations, deals, integrations, etc.)

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
| `N8N_BASE_URL`, `N8N_API_TOKEN` | Integração n8n (em Docker use `http://n8n:5678`) |
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
- `POST /api/auth/verify-otp` — Verificar OTP e autenticar (retorna `user` e `accessToken`)
- `GET /api/auth/me` — Dados do usuário logado (requer token)

### WebSocket (Socket.IO)
- Namespace `/conversations`: conexão com `auth.workspaceId` (e opcionalmente `auth.token`). Eventos recebidos: `newMessage`, `whatsapp_qr_update`, `whatsapp_connected`.

### Conversas
- `GET /api/conversations` — Listar conversas
- `GET /api/conversations/:id` — Detalhes com mensagens
- `POST /api/conversations/:id/messages` — Registrar mensagem enviada
- `POST /api/conversations/:id/send` — Enviar mensagem (canal)
- `PATCH /api/conversations/:id/assign` — Atribuir conversa
- `PATCH /api/conversations/:id/status` — Atualizar status

### Negócios (Deals)
- `GET /api/deals` — Listar negócios
- `POST /api/deals` — Criar negócio
- `PATCH /api/deals/:id/stage` — Atualizar estágio

### Automações / Fluxo
- `POST /api/automations/flow` — Salvar fluxo do construtor (nodes + edges) como template

### Agentes (Admin)
- `POST /api/agent-templates/import` — Importar JSON do n8n (body até 100MB; use o JSON exportado do workflow)
- `POST /api/agent-templates/:id/publish` — Publicar no n8n
- `GET /api/agent-templates` — Listar agentes
- Outros: ver código em `apps/api/src/agent-templates`, `workspace-agents`

### Agentes (Workspace)
- `GET /api/workspace-agents/catalog` — Catálogo de agentes disponíveis
- `POST /api/workspace-agents/:id/activate` — Ativar agente no workspace
- `POST /api/workspace-agents/:id/deactivate` — Desativar agente
- `GET /api/workspace-agents` — Listar agentes do workspace

### Integrações
- `GET /api/integration-accounts` — Listar integrações
- `POST /api/integration-accounts` — Criar integração
- `PUT /api/integration-accounts/:id/secret` — Configurar segredos
- `POST /api/integration-accounts/:id/whatsapp/qr` — Gerar QR Code (API externa)
- `POST /api/integration-accounts/:id/whatsapp/native/start` — Iniciar sessão integrada (Baileys)
- `GET /api/integration-accounts/:id/whatsapp/native/status` — Status da sessão integrada

### Tags e Filas
- `GET /api/tags`, `POST /api/tags`, `PATCH /api/tags/:id`, `DELETE /api/tags/:id`
- `GET /api/queues`, `POST /api/queues`, `PATCH /api/queues/:id`, `DELETE /api/queues/:id`

### Dashboard
- `GET /api/dashboard/sales` — KPIs e métricas

## Produção com Docker

```bash
# Build e subir stack completa
docker compose -f docker-compose.prod.yml up -d --build
```

O `docker-compose.prod.yml` inclui healthchecks, limites de recursos e restart automático. A API executa `prisma migrate deploy` automaticamente no startup.

No `docker-compose.yml` (e prod), a rede `crm_network` une postgres, redis, n8n e api; a API pode acessar o n8n em `http://n8n:5678` quando a integração N8N estiver configurada com essa baseUrl.

## Troubleshooting

- **Erro de conexão com banco**: confirme se Docker está rodando e `DATABASE_URL` está correto
- **Erro com Prisma**: rode `pnpm prisma:generate` e depois `pnpm prisma:migrate:dev`
- **Portas ocupadas**: finalize processos nas portas 8080/3001
- **"request entity too large" ao importar agente (JSON do n8n)**: a API aceita body até 100MB. Se o erro persistir, reinicie a API (`pnpm dev:api` ou o processo que atende na porta 3001) para carregar o body parser com o limite correto.
- **401 no frontend**: o front só chama `/auth/me` quando existe `crm_token` no localStorage; sem token, redireciona para `/login` sem bater na API
- **Muitos 401 em /auth/me**: atualização feita para não chamar a API sem token e com `refetchOnWindowFocus: false` e `staleTime` na query de auth
- **WhatsApp “Falha na conexão” em ambiente local**: comum em redes domésticas; para uso estável, rode a API em uma VPS

## Licença

Licença proprietária — consulte o time responsável.
