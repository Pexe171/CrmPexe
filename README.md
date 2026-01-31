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
- `OTP_DAILY_LIMIT` (opcional, padrão `20`) — limite diário de OTP por e-mail.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (opcional) — envio de e-mail OTP.
- `CORS_ORIGIN` (opcional, padrão `http://localhost:3000`) — origens permitidas.
- `REDIS_URL` (opcional) **ou** `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` — configuração da fila de processamento de IA.
- `AI_PROCESSING_CONCURRENCY` (opcional, padrão `3`).
- `INTEGRATION_ENCRYPTION_KEY` (opcional) — chave para criptografia de integrações.
- `MERCADOPAGO_WEBHOOK_SECRET` (**obrigatória em produção**) — segredo para validar assinatura do webhook de billing.
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
- `WORKSPACE_RETENTION_DAYS` (opcional, padrão `30`) — dias de retenção para exclusão LGPD do workspace.

> Observação: `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_PUBLIC_KEY` existem no `.env.example`, mas **não são usadas pelo código atual** (mantidas para futuras integrações).

#### 3.2 Web (`apps/web/.env`)
Crie um arquivo `apps/web/.env` baseado no exemplo.

```bash
cp apps/web/.env.example apps/web/.env
```

Variáveis usadas pela Web:
- `NEXT_PUBLIC_API_URL` (opcional, padrão `http://localhost:3001`) — URL base da API.

###  4 — Gerar client Prisma e aplicar migrations
**Objetivo:** preparar o banco e o client do Prisma.

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

#### Problemas comuns — `prisma:generate` falhando
Se aparecer erro de validação informando que um campo de relação não tem lado oposto, verifique se o modelo relacionado contém o back-reference (por exemplo, `Workspace.summaries`, `User.teamMemberships` e `AutomationTemplateVersion.currentVersionTemplate`). Essas relações são obrigatórias para o Prisma validar o schema e gerar o client corretamente.

Se o erro mencionar que uma relação **one-to-one** precisa de campo único (ex.: `A one-to-one relation must use unique fields on the defining side`), confirme que o campo FK do lado definidor está marcado com `@unique` (por exemplo, `currentVersionId @unique`).

#### Problemas comuns — `prisma:migrate` com P3006/P1014
Se o `pnpm prisma:migrate` falhar com `P3006`/`P1014` dizendo que a tabela `AiUsageLog` não existe na shadow database, revise o histórico de migrations e garanta que a migration `20260126000030_novos` **não** execute alterações na tabela `AiUsageLog` (ela só é criada em `20260630090000_add_ai_usage_logs`). Isso evita o erro de tabela inexistente durante a aplicação sequencial das migrations.

Se aparecer `P3006`/`P1014` mencionando que a tabela `AutomationTemplate` não existe na shadow database, confirme que a migration `20260126000030_novos` garante a criação de `AutomationTemplate`/`AutomationInstance` antes de alterar constraints. Isso impede falhas quando a shadow database aplica migrations antigas em sequência. 

Se aparecer o erro `constraint "AutomationInstance_templateId_fkey" ... does not exist` durante a criação da shadow database, confirme que a migration `20260126000030_novos` usa `DROP CONSTRAINT IF EXISTS` para evitar falhas quando a constraint ainda não foi criada em ambientes limpos.

Se o erro citar `IntegrationAccount`, `MessageTemplate` ou `Notification` como tabelas inexistentes, verifique se a migration `20260126000030_novos` está protegendo os `ALTER TABLE` com `to_regclass` (executar apenas quando a tabela existe). Essas tabelas só são criadas em migrations posteriores e não devem quebrar a aplicação sequencial no banco shadow.

### PASSO 5 — Iniciar a API e o Front-end
**Objetivo:** subir os serviços de aplicação.

```bash
pnpm dev
```

- API disponível em: `http://localhost:3001/api` (health: `/api/health`).
- Web disponível em: `http://localhost:3000`.

### PASSO 55 — Backups e migrações seguras
**Objetivo:** garantir continuidade e restauração rápida do banco PostgreSQL.

#### Backup do Postgres (dump lógico)
Exemplo de backup completo (estrutura + dados):

```bash
pg_dump "$DATABASE_URL" --format=custom --file=backup/crmpexe_$(date +%F).dump
```

Restauração do backup:

```bash
pg_restore --dbname="$DATABASE_URL" --clean --if-exists backup/crmpexe_2024-01-01.dump
```

Boas práticas:
- Agendar o backup diário (cron) e manter **retenção** mínima (ex.: 30 dias).
- Armazenar em local seguro (bucket privado) com criptografia em repouso.
- Validar restauração periodicamente em ambiente de staging.

#### Estratégia de migração (Prisma migrate)
Fluxo recomendado:
- **Desenvolvimento:** usar `pnpm prisma:migrate` (gera/roda migrations locais).
- **Produção:** aplicar **apenas** migrations já versionadas com:

```bash
pnpm --filter crmpexe-api prisma migrate deploy
```

Checklist para migrações seguras:
- Revisar o SQL gerado (ex.: locks e alteração de coluna).
- Preferir migrations pequenas e previsíveis.
- Garantir backup antes de aplicar em produção.

Campos adicionados ao workspace:
- `brandName`: nome do sistema exibido no front-end (padrão: nome do workspace).
- `brandLogoUrl`: URL pública da logo (opcional).
- `brandPrimaryColor` / `brandSecondaryColor`: cores principais para botões e destaque.
- `customDomain`: domínio customizado do cliente (opcional).
- `locale`: idioma padrão (inicialmente `pt-BR`).

Endpoints relevantes:
- **Consultar workspace atual:** `GET /api/workspaces/current`
- **Atualizar branding (admin/owner):** `PATCH /api/workspaces/:id/branding`
  - Body: `{ brandName, brandLogoUrl, brandPrimaryColor, brandSecondaryColor, customDomain, locale }`

No front-end, o layout aplica as cores e o nome do sistema via CSS variables e atualiza o título da aba quando o usuário está autenticado.

### PASSO 58 — Permissões avançadas (ABAC)
**Objetivo:** além do RBAC, aplicar políticas por atribuição, tags e unidades (empresas).

Regras implementadas:
- **Admin** (role `ADMIN` ou `Owner` do workspace) vê todas as conversas.
- **Agentes** (demais usuários) veem **apenas** conversas atribuídas a eles.
- **Restrição por tags**: quando `allowedTagIds` está preenchido no membro do workspace, a conversa só aparece se o contato tiver alguma dessas tags.
- **Restrição por unidades**: quando `allowedUnitIds` está preenchido, a conversa só aparece se o contato estiver associado a uma empresa (`companyId`) dentro dessa lista.

Endpoint para configurar políticas de membros (admin/owner):
- `PATCH /api/workspaces/:id/members/:memberId/policies`
  - Body: `{ allowedTagIds?: string[], allowedUnitIds?: string[] }`

### PASSO 59 — Times, filas e distribuição automática
**Objetivo:** organizar o atendimento por times e filas com distribuição round-robin por canal.

Novas entidades:
- **Team**: agrupa agentes dentro do workspace.
- **TeamMember**: liga usuários a um time (com posição e status ativo).
- **Queue**: define fila por canal e o time responsável.

Fluxo de distribuição:
1. Uma nova conversa inbound é criada.
2. A API identifica a fila ativa do canal (`Queue.channel`).
3. O próximo membro ativo do time é selecionado via round-robin.
4. A conversa é atribuída automaticamente e o responsável recebe a notificação.

Endpoints principais:
- **Times**
  - `GET /api/teams`
  - `POST /api/teams`
  - `PATCH /api/teams/:id`
  - `DELETE /api/teams/:id`
  - `POST /api/teams/:id/members`
  - `PATCH /api/teams/:id/members/:memberId`
  - `DELETE /api/teams/:id/members/:memberId`
- **Filas**
  - `GET /api/queues`
  - `POST /api/queues`
  - `PATCH /api/queues/:id`
  - `DELETE /api/queues/:id`

### PASSO 62 — Base de conhecimento + respostas rápidas
**Objetivo:** centralizar artigos e respostas prontas para consulta e uso durante o atendimento.

Funcionalidades:
- Cadastro e manutenção de artigos da base de conhecimento.
- Cadastro de respostas rápidas com atalho opcional.
- Busca rápida direto no inbox para inserir o conteúdo no rascunho da mensagem.

Endpoints principais:
- **Base de conhecimento**
  - `GET /api/knowledge-base-articles`
  - `POST /api/knowledge-base-articles`
  - `PATCH /api/knowledge-base-articles/:id`
  - `DELETE /api/knowledge-base-articles/:id`
- **Respostas rápidas**
  - `GET /api/canned-responses`
  - `POST /api/canned-responses`
  - `PATCH /api/canned-responses/:id`
  - `DELETE /api/canned-responses/:id`

### PASSO 63 — Busca global
**Objetivo:** pesquisar rapidamente contatos, conversas, mensagens, deals e tarefas.

Endpoint principal:
- `GET /api/global-search?query=texto`

No front-end, a busca global está disponível em `/search` e retorna resultados agrupados por entidade.

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
- **LGPD (exportação/exclusão)**: `GET /api/workspaces/:id/export` e `DELETE /api/workspaces/:id` (requer autenticação).

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

## Marketplace de agentes de IA
O CrmPexe agora possui um **marketplace de agentes de IA** com dados prontos para o front-end e para parceiros que desejam publicar soluções no ecossistema.

Rotas da API:
- **Resumo do marketplace**: `GET /api/marketplace/summary`
- **Categorias disponíveis**: `GET /api/marketplace/categories`
- **Lista de agentes**: `GET /api/marketplace/agents`
  - Filtros opcionais: `?category=atendimento` e `?search=texto`
- **Criar categoria (super admin)**: `POST /api/marketplace/categories`
- **Atualizar categoria (super admin)**: `PATCH /api/marketplace/categories/:id`
- **Remover categoria (super admin)**: `DELETE /api/marketplace/categories/:id`
- **Criar agente (super admin)**: `POST /api/marketplace/agents`
- **Atualizar agente (super admin)**: `PATCH /api/marketplace/agents/:id`
- **Remover agente (super admin)**: `DELETE /api/marketplace/agents/:id`

Front-end:
- A página `/marketplace` apresenta o catálogo de agentes, métricas e integrações em um layout completo pronto para o CRM de IA.
- O painel `/super-admin/marketplace` permite que o super admin altere preço, descrição, SLA e outros campos dos agentes.
- O CRM possui telas detalhadas para dashboard, inbox, empresas, workspaces e busca global, com seções explicativas e métricas operacionais.
- O tema visual do CRM segue uma identidade escura (preto com azul) para reforçar o posicionamento premium do marketplace.
- O menu lateral com botão ☰ abre um painel deslizante, com grupos detalhados e emojis para navegação rápida do cliente e do super admin.

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
- O fluxo de OTP invalida códigos anteriores ao gerar um novo e aplica limite diário por e-mail. A verificação usa um fingerprint simples (hash de IP + user-agent) para balancear tentativas de login.

## Checklist de deploy
- [ ] Atualizar variáveis de ambiente (incluindo `DATABASE_URL` e `WORKSPACE_RETENTION_DAYS`).
- [ ] Gerar build (`pnpm build`) e rodar migrations em produção (`pnpm --filter crmpexe-api prisma migrate deploy`).
- [ ] Garantir backup recente do Postgres (dump validado).
- [ ] Reiniciar serviços (API/Web/filas) com zero-downtime quando possível.
- [ ] Verificar health checks e rotas críticas pós-deploy.

## Roadmap (pendências priorizadas)
- **Rotation de secrets**: permitir recriptografar integrações quando a chave de criptografia mudar.
