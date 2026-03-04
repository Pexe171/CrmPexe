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

> O n8n é opcional: `docker compose up -d n8n` (automações e workflows). API e n8n compartilham a rede `crm_network` para comunicação interna.

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

### Login (OTP)

1. Acesse http://localhost:8080 → redireciona para `/login`
2. Informe o e-mail cadastrado e clique **Receber código OTP**
3. O código OTP é enviado por e-mail (se SMTP estiver configurado)
4. Informe o código e clique **Entrar**
5. O token é salvo no navegador; a API só é chamada quando há token (evita requisições desnecessárias)

### Sem workspace

Se o usuário ainda não tiver workspace, ao entrar aparece a tela **Escolha seu workspace**: pode **Criar novo workspace** (nome + senha) ou **Entrar em um workspace** (código + senha fornecidos pelo administrador).

### Páginas disponíveis

| Rota | Página | Descrição |
|------|--------|-----------|
| `/` | Dashboard | KPIs, gráficos de vendas, conversas recentes, funil de conversão |
| `/conversations` | Conversas | Lista de conversas, chat em tempo real (WebSocket), painel do contato; painéis redimensionáveis |
| `/sales` | Pipeline | Kanban de negócios (Deals) por estágio; arrastar e soltar para mudar estágio |
| `/agents` | Gestão de Agentes | Importar JSON do n8n, publicar, listar, excluir agentes |
| `/automations/flow` | Fluxo (Bot) | Construtor visual de fluxos com React Flow; nós Gatilho, Ação, OpenAI; salvar como template |
| `/integrations` | Integrações | Cards OpenAI e N8N (modal com chaves); WhatsApp: sessão integrada (QR no sistema) ou API externa; QR em tempo real via WebSocket |
| `/settings/tags` | Configurações: Tags | Listar, criar, editar e excluir tags (tabela + DropdownMenu) |
| `/settings/queues` | Configurações: Filas | Listar, criar, editar e excluir filas |
| `/admin/workspaces` | Admin: Workspaces | Buscar workspaces, atribuir agentes com data de validade |
| `/workspace-setup` | Escolha de workspace | Criar ou entrar em workspace (quando não há workspace definido) |
| `/login` | Login | Autenticação via OTP |

### Chat em tempo real (Conversas)

- A API emite evento `newMessage` via WebSocket (namespace `/conversations`) quando uma mensagem é criada (envio ou recebimento).
- O front conecta com `workspaceId` e atualiza a lista de mensagens na hora com Zustand.
- Mensagens são mescladas (API + pendentes do socket) para evitar duplicidade.

### Pipeline (Vendas)

- Colunas: Leads, Qualificação, Proposta, Negociação, Fechado (+ Sem estágio / Outros).
- Arrastar um card para outra coluna chama `PATCH /api/deals/:id/stage` e atualiza o estágio no banco.

### Construtor de fluxo (Automations)

- Em `/automations/flow` é possível adicionar nós (Gatilho, Ação, OpenAI), conectar com edges e clicar em **Salvar**.
- O JSON (nodes + edges) é enviado para `POST /api/automations/flow` e gravado como template de automação (categoria `flow-builder`).

### Conectar WhatsApp

1. Vá em `/integrations` e crie uma integração WhatsApp (**Nova Integração** ou card).
2. Escolha **Sessão integrada** (QR gerado pelo próprio sistema, sem API externa) ou **API externa** (Evolution ou compatível).
3. Sessão integrada: clique **Gerar QR Code**; o QR pode ser atualizado em tempo real via WebSocket (`whatsapp_qr_update`). Ao conectar, o evento `whatsapp_connected` dispara e um toast confirma.
4. API externa: informe URL e Token da API, depois **Gerar QR Code** e escaneie no celular (WhatsApp → Aparelhos conectados).
5. Em ambiente local (PC), a conexão pode falhar por restrições do WhatsApp; para uso estável, rode a API em uma VPS.

### Integrações OpenAI e N8N

- Clique nos cards **OpenAI** ou **N8N** na página de Integrações.
- No modal, preencha Nome e chaves (API Key para OpenAI; URL e API Key para N8N), com validação via react-hook-form + zod.
- Ao salvar, a conta é criada e os segredos gravados.

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
- `POST /api/agent-templates/import` — Importar JSON do n8n
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
- **401 no frontend**: o front só chama `/auth/me` quando existe `crm_token` no localStorage; sem token, redireciona para `/login` sem bater na API
- **Muitos 401 em /auth/me**: atualização feita para não chamar a API sem token e com `refetchOnWindowFocus: false` e `staleTime` na query de auth
- **WhatsApp “Falha na conexão” em ambiente local**: comum em redes domésticas; para uso estável, rode a API em uma VPS

## Licença

Licença proprietária — consulte o time responsável.
