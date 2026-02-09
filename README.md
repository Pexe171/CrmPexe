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
- `MERCADOPAGO_ACCESS_TOKEN` (obrigatória para pagamentos) — token de API do Mercado Pago.
- `MERCADOPAGO_PUBLIC_KEY` (obrigatória para pagamentos) — chave pública do Mercado Pago.
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
- `WORKSPACE_RETENTION_DAYS` (opcional, padrão `30`) — dias de retenção para exclusão LGPD do workspace.

#### Produção — variáveis mínimas obrigatórias
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_PUBLIC_KEY`
- `MERCADOPAGO_WEBHOOK_SECRET`

#### 3.2 Web (`apps/web/.env`)
Crie um arquivo `apps/web/.env` baseado no exemplo.

```bash
cp apps/web/.env.example apps/web/.env
```

Variáveis usadas pela Web:
- `NEXT_PUBLIC_API_URL` (opcional, padrão `http://localhost:3001`) — URL base da API.
- `NEXT_PUBLIC_WHATSAPP_LINK` (opcional, padrão `https://wa.me/5511999999999`) — link direto para contato no WhatsApp.

###  4 — Gerar client Prisma e aplicar migrations
**Objetivo:** preparar o banco e o client do Prisma.

```bash
pnpm prisma:generate
pnpm prisma:migrate:dev
```

> **Nota:** `pnpm prisma:migrate` foi padronizado para usar `prisma migrate deploy`, adequado para ambientes não interativos (CI/produção). Para criar/rodar migrations em desenvolvimento, use `pnpm prisma:migrate:dev`.
> **Nota (Turbo):** se o Turbo exibir `Could not find task prisma:migrate:dev`, confirme que o `turbo.json` possui a task `prisma:migrate:dev` definida. Este repositório já inclui essa task para evitar o erro.

#### Problemas comuns — `prisma:generate` falhando
Se aparecer erro de validação informando que um campo de relação não tem lado oposto, verifique se o modelo relacionado contém o back-reference (por exemplo, `Workspace.summaries`, `User.teamMemberships` e `AutomationTemplateVersion.currentVersionTemplate`). Essas relações são obrigatórias para o Prisma validar o schema e gerar o client corretamente.

Se o erro mencionar que uma relação **one-to-one** precisa de campo único (ex.: `A one-to-one relation must use unique fields on the defining side`), confirme que o campo FK do lado definidor está marcado com `@unique` (por exemplo, `currentVersionId @unique`).

#### Problemas comuns — `prisma:migrate` com P3006/P1014
Se o `pnpm prisma:migrate` falhar com `P3006` dizendo `unsafe use of new value` ao adicionar um novo valor em enum (ex.: `PENDING_CONFIG`), garanta que a migration faça o `ALTER TYPE` e **comite** a transação antes de atualizar registros ou defaults com o novo valor. Isso evita o erro do PostgreSQL no banco shadow.

Se o `pnpm prisma:migrate` falhar com `P3006`/`P1014` dizendo que a tabela `AiUsageLog` não existe na shadow database, revise o histórico de migrations e garanta que a migration `20260209022359_v2` **não** execute `ALTER TABLE`/constraints em `AiUsageLog` quando a tabela ainda não foi criada (ela só aparece em `20260630090000_add_ai_usage_logs`). A solução recomendada é usar `ALTER TABLE IF EXISTS` e `DROP CONSTRAINT IF EXISTS` para proteger o fluxo em bancos limpos.

Se o `pnpm prisma:migrate` falhar com `P3006`/`P1014` dizendo que a tabela `AutomationTemplateVersion` não existe na shadow database, confirme que a migration `20260209022359_v2` usa `ALTER TABLE IF EXISTS` e `DROP CONSTRAINT IF EXISTS` ao tocar em `AutomationTemplateVersion`. Essa tabela só é criada mais tarde (em `20261015120000_support_impersonation_automation_template_versions`), então a migration precisa ser tolerante em bancos limpos.

Se aparecer `P3006`/`P1014` mencionando que a tabela `AutomationTemplate` não existe na shadow database, confirme que a migration `20260131034627_novos` garante a criação de `AutomationTemplate`/`AutomationInstance` antes de alterar constraints. Isso impede falhas quando a shadow database aplica migrations antigas em sequência. 

Se aparecer o erro `constraint "AutomationInstance_templateId_fkey" ... does not exist` durante a criação da shadow database, confirme que a migration `20260131034627_novos` usa `DROP CONSTRAINT IF EXISTS` para evitar falhas quando a constraint ainda não foi criada em ambientes limpos.

Se o erro citar `IntegrationAccount`, `MessageTemplate` ou `Notification` como tabelas inexistentes, verifique se a migration `20260131034627_novos` está protegendo os `ALTER TABLE` com `to_regclass` (executar apenas quando a tabela existe). Essas tabelas só são criadas em migrations posteriores e não devem quebrar a aplicação sequencial no banco shadow.

Se o erro mencionar `Notification` ao tentar remover o `DEFAULT` do `id`, confirme que a migration `20260131034627_novos` usa `ALTER TABLE IF EXISTS "Notification"` para não falhar quando a tabela ainda não foi criada na shadow database.

#### Problemas comuns — `prisma:seed` com P2021/P2022
Se o seed falhar com `P2021` (tabela inexistente) ou `P2022` (coluna inexistente), significa que as migrations não foram aplicadas no banco atual. O seed **não** cria colunas, enums ou tabelas; ele apenas usa o schema vigente. Garanta que todas as migrations foram aplicadas e rode o fluxo abaixo:

```bash
pnpm prisma:migrate:dev
pnpm prisma:generate
pnpm prisma:seed
```

### PASSO 5 — Iniciar a API e o Front-end
**Objetivo:** subir os serviços de aplicação.

```bash
pnpm dev
```

- API disponível em: `http://localhost:3001/api` (health: `/api/health`).
- Web disponível em: `http://localhost:3000`.

### Observações técnicas rápidas
- A API propaga o header `x-correlation-id` nas respostas para facilitar rastreamento de logs distribuídos. Se o cliente não enviar esse header, um valor é gerado automaticamente.  
- Respostas de rate limit usam status **429** e mensagens amigáveis para orientar o tempo de espera.
- Tipagem do `correlationId`: além da extensão global do `Request` em `src/types/express/index.d.ts`, os middlewares/filtros críticos usam um tipo local (`RequestWithCorrelationId`) para manter o TypeScript estrito sem erro em watch mode.
- O `tsconfig` da API inclui `typeRoots` para garantir que as extensões de tipos globais sejam carregadas no build e no watch mode.
- Para evitar erro `Cannot find module './types/express'` no runtime, **não importe** esse arquivo no bootstrap da API. A extensão de tipos é carregada automaticamente pelo TypeScript via `typeRoots`/`include`. 
- Se um controller usar `AccessTokenGuard`, o módulo correspondente deve importar `AuthModule` para garantir que `JwtService` e o próprio guard estejam disponíveis no contexto de injeção.
- O módulo `TeamsModule` já importa `AuthModule` para evitar erro de injeção do `JwtService` ao usar `AccessTokenGuard`.
- O módulo `KnowledgeBaseModule` também importa `AuthModule` para permitir o uso do `AccessTokenGuard` sem falhas de injeção.

### Página "Minhas Instalações" (Web)
**Objetivo:** acompanhar automações instaladas do marketplace com controle de status e configuração.

- Rota: `/marketplace/instalacoes`.
- Lista cards das automações instaladas e exibe status, data e variáveis configuradas.
- Botão **Ligar/Desligar** aciona os endpoints `POST /api/automations/:id/enable` e `POST /api/automations/:id/disable`.
- Botão **Configurar** abre um modal para editar as variáveis específicas de cada instância.

### Página "Agentes disponíveis" (Web)
**Objetivo:** visualizar o catálogo de agentes e gerenciar o fluxo de liberação por workspace.

- Rota: `/marketplace`.
- O cliente **nunca** compra ou libera acesso sozinho: apenas visualiza o catálogo e registra interesse.
- O super admin é o único que libera a automação para um workspace específico, sempre pelo painel do super admin.
- Quando o agente está liberado (`isUnlocked`), o botão **Configurar** direciona para o setup da automação.
- Quando o agente ainda não foi liberado, o botão **Tenho Interesse** abre um modal de confirmação e registra o interesse via API.
- Após registrar interesse (`hasRequestedInterest`), o botão fica desabilitado com o rótulo **Solicitação Enviada**.
- Quando não há agentes, o botão **Contactar no WhatsApp** direciona para o link configurado em `NEXT_PUBLIC_WHATSAPP_LINK`.
- O time admin configura os agentes, incluindo descrição, ping técnico e JSON de configuração, direto no painel do super admin.

### Funil de vendas (Kanban)
**Objetivo:** visualizar leads por etapa e mover cards com atualização em tempo real.

- Exibição no dashboard com colunas: **Novo**, **Contato**, **Proposta** e **Fechado**.
- Arrastar um card dispara atualização do status via API.
- Endpoint: `PATCH /api/conversations/:id/status`
  - Body: `{ "status": "NEW" | "CONTACTED" | "PROPOSAL" | "CLOSED" }`
- Atalhos do dashboard (workspaces, integrações e ações) ficam concentrados no menu lateral.

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
- **Desenvolvimento:** usar `pnpm prisma:migrate:dev` (gera/roda migrations locais).
- **CI/Produção:** aplicar **apenas** migrations já versionadas com:

```bash
pnpm prisma:migrate
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
pnpm prisma:migrate:dev # Gerar/rodar migrations locais (interativo)
pnpm prisma:migrate     # Aplicar migrations versionadas (não interativo)
```

## Proxy de autenticação no Next.js
O front-end possui rotas internas que repassam cookies da sessão para a API, evitando chamadas diretas do navegador para o backend quando o token está em cookie HTTP-only. Essas rotas são usadas pelos componentes de branding e modo suporte para evitar erros 401 no carregamento inicial.

- `GET /api/auth/me` → proxy para `GET /api/auth/me` da API.
- `GET /api/workspaces/current` → proxy para `GET /api/workspaces/current` da API.


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

## Admin e Super Admin (acesso e credenciais)
> **Resumo rápido:** o login é via **OTP por e-mail**, não existe senha fixa. Após informar o e-mail, o código chega via SMTP configurado (ou pelo log do back-end em dev).

### URLs principais
- **Login (admin/workspace):** `http://localhost:3000/login`
- **Dashboard admin (workspace):** `http://localhost:3000/dashboard`
- **Portal Super Admin:** `http://localhost:3000/super-admin`

### Credenciais padrão (seed)
- **E-mail admin (workspace):** `davidhenriquesms18@gmail.com`
- **Senha:** não existe (login via OTP).
- **Logo/branding padrão:** herdado do workspace (exibido no topo do login e no painel).

> Observação: o seed **não** marca o usuário como super admin. Para liberar o portal super admin, defina `isSuperAdmin: true` no usuário (via Prisma Studio, update manual no banco ou ajuste do seed).

### Seed Admin (base inicial)
Executa a criação do workspace demo + usuário admin padrão:

```bash
pnpm --filter crmpexe-api prisma db seed
```

O seed cria (ou atualiza, de forma idempotente):
- **Workspace:** `Workspace Demo`
- **Usuário admin:** `davidhenriquesms18@gmail.com` com `role: ADMIN`
- **Role/Admin + permission `workspace.manage`** vinculados ao workspace
- **Template base de automação + categoria** (apenas se as tabelas de marketplace existirem no banco)

> Dica: para transformar o usuário em super admin, atualize `isSuperAdmin` para `true` no banco após rodar o seed.

## Super Admin
O portal de **Super Admin** permite visualizar todos os workspaces, status de assinatura, plano atual, uso de mensagens/automações e logs de erro. Para habilitar um usuário, defina o campo `isSuperAdmin` como `true` no cadastro do usuário (ex.: via update manual no banco).

Rotas protegidas (requer `isSuperAdmin`):
- **Lista de workspaces**: `GET /api/super-admin/workspaces` (retorna status, plano e uso consolidado).
- **Logs de erro**: `GET /api/super-admin/error-logs` (retorna falhas de IA com workspace e mensagem).

> Observação: o seed padrão cria **apenas** o admin do workspace (sem flag de super admin).

## Automações (marketplace interno)
Templates de automação agora possuem **versionamento** e **changelog**. Cada nova versão criada por um super admin registra o histórico e permite que workspaces escolham manter a versão atual ou atualizar para a mais recente.

Fluxos suportados:
- **Criar template**: `POST /api/automation-templates` (já cria a versão inicial, restrito ao super admin).
- **Criar nova versão**: `POST /api/automation-templates/:id/versions` (restrito ao super admin).
- **Listar versões**: `GET /api/automation-templates/:id/versions`.
- **Instalar versão específica**: `POST /api/automation-templates/:id/install` (payload com `versionId` opcional).
- **Atualizar instância**: `POST /api/automations/:id/update-version`.

> Observação: instâncias armazenam o `templateVersionId` para permitir fixar ou atualizar versões com segurança. No painel de automações do workspace é possível fixar a versão desejada ou atualizar para a última versão publicada.

### Tela de histórico de execuções (Web)
**Objetivo:** acompanhar execuções de uma automação específica com detalhes de input/output.

- Rota: `/admin/automations/:id/history`.
- Lista cronológica com ID, data, duração e status da execução.
- Clique em uma execução para abrir um painel lateral com o input (gatilho) e output (resultado) formatados como blocos de código.
- Visual com fundo preto e detalhes em azul para manter o padrão do painel administrativo.

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
- Endpoints de **auth** e **webhooks** aplicam rate limit por IP e workspace. Tentativas de login inválidas são bloqueadas após exceder o limite configurado.
- O fluxo de OTP invalida códigos anteriores ao gerar um novo e aplica limite diário por e-mail. A verificação usa um fingerprint simples (hash de IP + user-agent) para balancear tentativas de login.

## Checklist de deploy
- [ ] Atualizar variáveis de ambiente (incluindo `DATABASE_URL` e `WORKSPACE_RETENTION_DAYS`).
- [ ] Gerar build (`pnpm build`) e rodar migrations em produção (`pnpm --filter crmpexe-api prisma migrate deploy`).
- [ ] Garantir backup recente do Postgres (dump validado).
- [ ] Reiniciar serviços (API/Web/filas) com zero-downtime quando possível.
- [ ] Verificar health checks e rotas críticas pós-deploy.

## Roadmap (pendências priorizadas)
- **Rotation de secrets**: permitir recriptografar integrações quando a chave de criptografia mudar.
