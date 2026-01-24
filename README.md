# CrmPexe

Plataforma SaaS multi-tenant de CRM de atendimento + automações.

## Stack
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend**: NestJS + TypeScript
- **DB**: PostgreSQL
- **ORM**: Prisma
- **Cache/filas**: Redis + BullMQ (base preparada)
- **Auth**: OTP por e-mail + JWT + Refresh + cookies httpOnly + RBAC (em evolução)
- **Infra local**: docker-compose (postgres, redis, n8n)

## Estrutura do repositório
```
apps/
  api/        # NestJS + Prisma
  web/        # Next.js + Tailwind + shadcn/ui
```

## Instalação de bancos de dados (PostgreSQL e outros)

### PostgreSQL (recomendado)
Você pode usar o Postgres localmente no próprio computador **sem Docker**. Depois, ajuste o `DATABASE_URL` do `apps/api/.env`.

**macOS (Homebrew)**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu/Debian**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

**Windows (winget)**
```powershell
winget install PostgreSQL.PostgreSQL
```

**Exemplo de `DATABASE_URL` local**
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crmpexe?schema=public"
```

### MongoDB (opcional)
Caso queira explorar login/autenticação com MongoDB no futuro, você pode instalar localmente:

**macOS (Homebrew)**
```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

**Ubuntu/Debian**
```bash
sudo apt update
sudo apt install -y mongodb
sudo systemctl enable --now mongodb
```

**Windows (winget)**
```powershell
winget install MongoDB.Server
```

### MySQL (opcional)
```bash
brew install mysql
brew services start mysql
```

### SQLite (opcional)
```bash
brew install sqlite
```

## Como rodar localmente

### 1) Infraestrutura
```bash
docker compose up -d
```
> Se estiver usando PostgreSQL local instalado no seu computador, você pode pular o `docker compose` e apenas garantir que o serviço esteja rodando.

### n8n (automação visual)
Após subir o docker compose, o n8n estará disponível em `http://localhost:5678` com persistência em volume Docker (`n8n_data`). Use esse serviço apenas para testes locais por enquanto — a integração ainda não foi feita.

### 2) Dependências
```bash
pnpm install
```

### 3) Backend (API)
```bash
cd apps/api
cp .env.example .env
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma db seed # opcional
pnpm dev
```

API disponível em `http://localhost:3001/api/health`.

#### Observações sobre o Prisma
- Sempre que alterar o `schema.prisma`, rode `pnpm prisma:generate` antes de subir a API.
- Em caso de erro de validação relacional (ex.: `P1012`), rode `pnpm prisma format` e garanta que toda relação tenha o lado oposto definido.

### 4) Frontend (Web)
```bash
cd apps/web
cp .env.example .env # opcional (padrão http://localhost:3001)
pnpm dev
```

Frontend disponível em `http://localhost:3000`.

> **OTP por e-mail (Gmail SMTP)**
> Configure `SMTP_USER` e `SMTP_PASS` com uma senha de app do Gmail. Use `SMTP_FROM` para o remetente exibido.
> Sem SMTP válido o fluxo de OTP não envia códigos.

> **CORS (Frontend local)**
> Se o frontend estiver em outra origem, ajuste `CORS_ORIGIN` no `.env` da API (ex: `CORS_ORIGIN=http://localhost:3000` ou múltiplos separados por vírgula).

> **Workspace atual via header**
> Para reduzir latência de leitura do workspace atual, você pode enviar o header `X-Workspace-Id` em requisições que operam dados do tenant (companies, tasks, tags, conversations, custom fields, audit logs). Caso o header não seja enviado, a API continua usando o `currentWorkspaceId` salvo no usuário.
>
> **SLA (opcional)**
> Configure `SLA_RESPONSE_SECONDS` no `.env` da API para definir o tempo máximo de primeira resposta em segundos (padrão: 900).
>
> **KPIs no dashboard (Frontend)**
> Para ajustar a meta de SLA exibida nos gráficos de BI, defina `NEXT_PUBLIC_SLA_RESPONSE_SECONDS` no `.env.local` do frontend (padrão: 900).

> **Criptografia de integrações**
> Configure `INTEGRATION_ENCRYPTION_KEY` no `.env` da API com uma chave de 32 bytes (base64 ou hex). Exemplo:
> ```bash
> # base64
> openssl rand -base64 32
> # hex
> openssl rand -hex 32
> ```

> **Integração n8n (API)**
> Para consumir o n8n via backend, crie uma conta de integração do tipo `N8N` e salve os segredos via `PUT /api/integration-accounts/:id/secret` com as chaves:
> - `baseUrl`: URL base do n8n (ex: `http://localhost:5678`)
> - `apiKey`: API key gerada no n8n

### Endpoints de autenticação
```
POST /api/auth/request-otp
POST /api/auth/verify-otp
POST /api/auth/refresh
POST /api/auth/logout
```

**Fluxo OTP**
- **Cadastro**: envie `name`, `contact`, `email` e `emailConfirmation` para `/api/auth/request-otp`. Confirme com `/api/auth/verify-otp`.
- **Login**: envie apenas `email` para `/api/auth/request-otp` e confirme o código com `/api/auth/verify-otp`.

### RBAC do marketplace (ADMIN vs USER)
- O papel global do usuário agora é armazenado em `User.role` com o enum `UserRole` (`ADMIN` | `USER`).
- Novos cadastros via `/api/auth/request-otp` recebem por padrão o papel `USER`.
- O backend inclui o `role` no payload JWT e na resposta de `/api/auth/verify-otp` e `/api/auth/refresh`.
- O frontend grava o papel em cookie httpOnly (`crmpexe_role`) e redireciona:
  - `ADMIN` → `/admin/automations`
  - `USER` → `/dashboard`
- Privilégios de `ADMIN`:
  - Criar `AutomationTemplates` (`POST /api/automation-templates`).
  - Visualizar auditoria global usando `GET /api/audit-logs?scope=global`.
- O grupo `/admin` no Next.js possui um `layout.tsx` que bloqueia acesso para usuários sem `role=ADMIN`.

> Após atualizar o Prisma, rode `pnpm prisma:migrate` e `pnpm prisma:generate` em `apps/api`.

### Endpoints de workspaces
```
POST /api/workspaces
GET /api/workspaces
POST /api/workspaces/:id/switch
```

### Endpoints de empresas
```
POST /api/companies
GET /api/companies
GET /api/companies/:id
PATCH /api/companies/:id
DELETE /api/companies/:id
```

### Endpoints de tarefas
```
GET /api/tasks
POST /api/tasks
PATCH /api/tasks/:id
DELETE /api/tasks/:id
```

### Endpoints de negócios (deals)
```
POST /api/deals
PATCH /api/deals/:id/stage
```

### Endpoints de conversas e mensagens
```
GET /api/conversations
GET /api/conversations/:id
POST /api/conversations/:id/messages
POST /api/conversations/:id/send
PATCH /api/conversations/:id/assign
PATCH /api/conversations/:id/close
```

### Endpoints de notificações
```
GET /api/notifications
PATCH /api/notifications/:id/read
```

### Endpoints de canais (webhooks)
```
POST /api/channels/:channel/webhook
POST /api/webhooks/whatsapp
```

### Endpoints de templates de mensagens (admin)
```
GET /api/message-templates
POST /api/message-templates
DELETE /api/message-templates/:id
```

### Endpoints de automações (templates + provisionamento mock)
```
GET /api/automation-templates
POST /api/automation-templates
POST /api/automation-templates/:id/install
GET /api/automation-instances
```
> O provisionamento atual usa conectores mock, retornando ações simuladas para preparar a integração real.
>
> **Compatibilidade com definições do n8n**
> A montagem do payload de automações agora normaliza `definition`, `meta` e `settings` para objetos antes do spread. Isso evita erros de compilação quando o template possui valores não-objetos nesses campos.

### Motor interno de automações (pré-n8n)
Enquanto o n8n não está integrado, existe um motor interno simples com dois gatilhos:
- `message.inbound.created`: ao receber mensagem inbound, cria uma task e adiciona tag no contato.
- `deal.stage.changed`: ao trocar a etapa de um negócio, cria uma task e adiciona tag no negócio.

Essas ações são disparadas automaticamente pelos endpoints de mensagens inbound e atualização de etapa de negócio.

### Endpoints de integrações (admin)
```
GET /api/integration-accounts
POST /api/integration-accounts
PATCH /api/integration-accounts/:id
DELETE /api/integration-accounts/:id
PUT /api/integration-accounts/:id/secret
POST /api/integration-accounts/:id/whatsapp/qr
GET /api/integration-accounts/:id/whatsapp/status
POST /api/integration-accounts/:id/whatsapp/sms/request
POST /api/integration-accounts/:id/whatsapp/sms/verify
```

### Integrações WhatsApp (segredos criptografados)
- Cadastre uma conta do tipo **WHATSAPP** por workspace em `IntegrationAccount`.
- Salve as credenciais via `PUT /api/integration-accounts/:id/secret` com `payload` contendo `apiUrl`, `apiToken` e (opcional) `webhookToken`.
- O envio em `/api/conversations/:id/send` usa essas credenciais descriptografadas para chamar o provedor.

### Conexão WhatsApp via QR code (gateway)
Para conectar WhatsApp via QR code, use um gateway que exponha endpoints de QR/status (ex.: wppconnect, venon-bot, etc.) e configure os segredos:
- `apiUrl`: URL base do gateway (ex.: `https://gateway.seudominio.com`).
- `apiToken`: token Bearer para autenticação no gateway.
- `qrEndpoint` (opcional): caminho do endpoint de QR code (padrão `/whatsapp/qr`).
- `statusEndpoint` (opcional): caminho do endpoint de status (padrão `/whatsapp/status`).
- `smsRequestEndpoint` (opcional): caminho do endpoint para solicitar SMS (padrão `/whatsapp/sms/request`).
- `smsVerifyEndpoint` (opcional): caminho do endpoint para validar o SMS (padrão `/whatsapp/sms/verify`).

O backend chama o gateway com `Authorization: Bearer <apiToken>` e o header `X-Integration-Account-Id`. O gateway deve responder:
```json
{
  "qr": "string-ou-null",
  "status": "connecting | connected | disconnected"
}
```

Na UI admin (`/admin/integrations`), clique em **Gerar QR code** para exibir e conectar o WhatsApp.

### Conexão WhatsApp via SMS (gateway)
Para autenticar como no WhatsApp Web via SMS, use os endpoints do gateway com os segredos acima.
Fluxo sugerido:
1. `POST /api/integration-accounts/:id/whatsapp/sms/request` com `{ "phone": "+55..." }`.
2. `POST /api/integration-accounts/:id/whatsapp/sms/verify` com `{ "phone": "+55...", "code": "123456" }`.

Na UI admin (`/admin/integrations`), use a seção **Conexão via SMS** para solicitar e validar o código.

### Endpoints de tags
```
GET /api/tags
POST /api/tags
PATCH /api/tags/:id
DELETE /api/tags/:id
```

### Endpoints de custom fields (admin)
```
GET /api/custom-field-definitions?entity=COMPANY
POST /api/custom-field-definitions
PATCH /api/custom-field-definitions/:id
DELETE /api/custom-field-definitions/:id
```

### Endpoints de auditoria
```
GET /api/audit-logs?page=1&perPage=20
```

### 4) Frontend (Web)
```bash
cd apps/web
cp .env.example .env.local
pnpm dev
```

Web disponível em `http://localhost:3000`.
Inbox disponível em `http://localhost:3000/inbox`.

## Como rodar em produção

> **Pré-requisitos**: PostgreSQL e Redis prontos, variáveis de ambiente preenchidas e dependências instaladas.

### 1) Variáveis de ambiente
- `apps/api/.env` com `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`,
  `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `OTP_TTL_MS`.
- `apps/web/.env.local` com `NEXT_PUBLIC_API_URL` apontando para a API (ex: `https://api.seudominio.com`).

### 2) Build
```bash
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm build
```

### 3) Start
```bash
NODE_ENV=production pnpm --filter crmpexe-api start
NODE_ENV=production pnpm --filter crmpexe-web start
```

API disponível em `https://api.seudominio.com/api/health`.
Web disponível em `https://seudominio.com`.

## Como rodar testes

```bash
pnpm test
```

**Testes específicos da API**
```bash
pnpm --filter crmpexe-api test
pnpm --filter crmpexe-api test:e2e
```

**Checagens adicionais**
```bash
pnpm lint
pnpm typecheck
```

## Entregáveis por passo
- **Arquivos modificados**: sempre listar no PR e no summary do trabalho.
- **Comandos para rodar**: documentados nesta seção.
- **Checklist de validação**: ver abaixo.

### Checklist de validação
- [ ] `docker compose up -d`
- [ ] `pnpm install`
- [ ] `cd apps/api && cp .env.example .env && pnpm prisma:generate && pnpm prisma:migrate && pnpm prisma db seed (opcional) && pnpm dev`
- [ ] `cd apps/web && cp .env.example .env.local && pnpm dev`
- [ ] `cd apps/api && pnpm test`

## Troubleshooting rápido
- **Erro `User.contact` não existe no banco**: rode as migrations da API (`cd apps/api && pnpm prisma:migrate`). Se estiver com banco antigo, considere `pnpm prisma migrate reset` (isso apaga os dados locais).
- **CORS ao chamar a API**: confira se `CORS_ORIGIN` aponta para a URL do frontend (ex: `http://localhost:3000`).

## Mapa macro de módulos (visão de produto)

### Núcleo SaaS
- **Auth & Conta**: login, reset, sessões.
- **Workspaces/Tenants**: empresa/cliente.
- **RBAC**: papéis/permissões.
- **Licenças & Planos**: assinatura, limites.
- **Auditoria & Logs**: quem fez o quê.

### CRM “clássico”
- **Contatos**: pessoas.
- **Empresas**: contas.
- **Negócios/Pipeline**: funil, etapas.
- **Tarefas/Atividades**: follow-up.
- **Tags/Custom Fields**: personalização.

### Atendimento
- **Inbox**: visão consolidada.
- **Conversas**: threads.
- **Mensagens**: in/out.
- **Atribuição**: responsável, fila.
- **SLA**: tempo de resposta.
- **Canais**: WhatsApp, Instagram, webchat, e-mail.

### Integrações & Automação
- **Central de Integrações**: credenciais.
- **Templates de Automação**: biblioteca.
- **Instalar Automação**: provisionar workflow.
- **Execuções & Erros**: observabilidade.
- **Webhooks**: eventos internos/externos.

### Dashboards
- **KPI Atendimento**: volume, TMR, SLA.
- **KPI Comercial**: pipeline, conversão.
- **KPI Automação**: execuções, falhas.

### IA
- **Resumo de conversa**.
- **Classificação de lead**.
- **Sugestão de resposta**.
- **Extração para campos**: preencher CRM automaticamente.

### Admin (interno)
- **Super Admin**: ver todos tenants.
- **Suporte/Impersonate**.
- **Gestão de Templates**: publicar/versões.
