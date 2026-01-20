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

## Como rodar localmente

### 1) Infraestrutura
```bash
docker compose up -d
```

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
pnpm dev:api
```

API disponível em `http://localhost:3001/api/health`.

### 4) Frontend (Web)
```bash
cd apps/web
cp .env.example .env.local
pnpm dev:web
```

Web disponível em `http://localhost:3000`.

## Entregáveis por passo
- **Arquivos modificados**: sempre listar no PR e no summary do trabalho.
- **Comandos para rodar**: documentados nesta seção.
- **Checklist de validação**: ver abaixo.

### Checklist de validação
- [ ] `docker compose up -d`
- [ ] `pnpm install`
- [ ] `cd apps/api && cp .env.example .env && pnpm prisma:generate && pnpm prisma:migrate && pnpm dev:api`
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
