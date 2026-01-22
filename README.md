# CrmPexe

Plataforma SaaS multi-tenant de CRM de atendimento + automações.

## Stack
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend**: NestJS + TypeScript
- **DB**: PostgreSQL
- **ORM**: Prisma
- **Cache/filas**: Redis + BullMQ (base preparada)
- **Auth**: JWT + Refresh + cookies httpOnly + RBAC (em evolução)
- **Infra local**: docker-compose (postgres, redis, n8n opcional)

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
pnpm dev:api
```

API disponível em `http://localhost:3001/api/health`.

### Endpoints de autenticação
```
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

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

### Endpoints de conversas e mensagens
```
GET /api/conversations
GET /api/conversations/:id
POST /api/conversations/:id/messages
```

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
pnpm dev:web
```

Web disponível em `http://localhost:3000`.
Inbox disponível em `http://localhost:3000/inbox`.

## Entregáveis por passo
- **Arquivos modificados**: sempre listar no PR e no summary do trabalho.
- **Comandos para rodar**: documentados nesta seção.
- **Checklist de validação**: ver abaixo.

### Checklist de validação
- [ ] `docker compose up -d`
- [ ] `pnpm install`
- [ ] `cd apps/api && cp .env.example .env && pnpm prisma:generate && pnpm prisma:migrate && pnpm prisma db seed (opcional) && pnpm dev:api`
- [ ] `cd apps/web && cp .env.example .env.local && pnpm dev:web`
- [ ] `cd apps/api && pnpm test`

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
