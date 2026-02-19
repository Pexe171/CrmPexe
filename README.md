# CrmPexe

Plataforma CRM com API em NestJS e front-end em React + Vite, organizada como monorepo com Turborepo.

## Sumário

- [Visão geral](#visão-geral)
- [Pré-requisitos](#pré-requisitos)
- [Tecnologias](#tecnologias)
- [Configuração do ambiente](#configuração-do-ambiente)
  - [1) Clonar e instalar dependências](#1-clonar-e-instalar-dependências)
  - [2) Subir serviços de infraestrutura](#2-subir-serviços-de-infraestrutura)
  - [3) Configurar variáveis de ambiente](#3-configurar-variáveis-de-ambiente)
  - [4) Preparar banco de dados](#4-preparar-banco-de-dados)
- [Como rodar](#como-rodar)
  - [Modo desenvolvimento (API + Web)](#modo-desenvolvimento-api--web)
  - [Rodar apenas API](#rodar-apenas-api)
  - [Rodar apenas Web](#rodar-apenas-web)
- [Scripts úteis](#scripts-úteis)
- [Limpeza técnica recente](#limpeza-técnica-recente)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Documentação do backend (API)](#documentação-do-backend-api)
- [Fluxos comuns](#fluxos-comuns)
- [Fluxo do Super Admin para publicar molde n8n](#fluxo-do-super-admin-para-publicar-molde-n8n)
- [Integração WhatsApp (QR + Evolution)](#integração-whatsapp-qr--evolution)
- [Omnichannel verdadeiro (além do WhatsApp)](#omnichannel-verdadeiro-além-do-whatsapp)
- [Dashboard analítico avançado](#dashboard-analítico-avançado)
- [Interface](#interface)
- [Produção com Docker](#produção-com-docker)
- [Troubleshooting](#troubleshooting)
- [Licença](#licença)

## Visão geral

O CrmPexe é um monorepo que centraliza a API (NestJS) e a aplicação web (React + Vite). O projeto utiliza Postgres, Redis e N8N via Docker Compose para serviços auxiliares.

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Docker e Docker Compose

> ⚠️ **Gerenciador de pacotes oficial:** este repositório usa **exclusivamente pnpm**.
> Não use `npm install` nem `yarn`, e não adicione `package-lock.json` ou `yarn.lock` na raiz.
> O lockfile oficial e única fonte de verdade é o `pnpm-lock.yaml`.

## Tecnologias

- **API**: NestJS, Prisma, PostgreSQL
- **Web**: React, Vite, Tailwind CSS
- **Infra**: Docker, Redis, N8N
- **Monorepo**: Turborepo, pnpm workspaces

## Configuração do ambiente

### 1) Clonar e instalar dependências

```bash
pnpm install
```

### 2) Subir serviços de infraestrutura

```bash
docker compose up -d
```

Isso inicializa:

- Postgres em `localhost:5432`
- Redis em `localhost:6379`
- N8N em `http://localhost:5678`
- Login padrão n8n local (primeiro start com volume limpo): `admin@crmpexe.com.br` / `CrmPexe@2026!`
- Token de API n8n local: `crmpexe-local-token-2026`

> ℹ️ No n8n, `N8N_USER_MANAGEMENT_ADMIN_USER` e `N8N_USER_MANAGEMENT_ADMIN_PASSWORD` só são aplicados na criação inicial do usuário admin. Se o volume `n8n_data` já existir, o login antigo continua valendo.

> ⚠️ Antes de usar o n8n em ambientes compartilhados, altere usuário, senha e `N8N_API_KEY` no `docker-compose.yml` para valores seguros e mantenha-os fora de versionamento quando possível.

Se aparecer **"Wrong username or password"** no ambiente local, faça reset do n8n (isso remove workflows/dados locais do n8n):

```bash
docker compose down
docker volume rm crmpexe_n8n_data
docker compose up -d n8n
```

Depois do reset, entre novamente em `http://localhost:5678` com as credenciais acima.

### 3) Configurar variáveis de ambiente

Copie os arquivos de exemplo e preencha conforme necessário:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Principais variáveis da API (`apps/api/.env`):

- `DATABASE_URL`: conexão com Postgres
- `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET`: segredos JWT
- `SMTP_*`: envio de e-mails
- `MERCADOPAGO_*`: integração Mercado Pago
- `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`: provedor real de IA para resumo, classificação, sugestão e extração
- `WHATSAPP_WEBHOOK_SECRET`: segredo obrigatório para validar assinatura HMAC SHA-256 do webhook
- `WHATSAPP_WEBHOOK_SIGNATURE_HEADER`: nome do header da assinatura do webhook (ex.: `x-whatsapp-signature`)
- `EMAIL_WEBHOOK_SIGNATURE_HEADER`: nome do header da assinatura de webhook de e-mail (ex.: `x-email-signature`)
- `RATE_LIMIT_REDIS_ENABLED`: habilita/desabilita Redis no rate limit (`true` por padrão)
- `RATE_LIMIT_REDIS_FAILURE_POLICY`: política quando Redis estiver indisponível (`memory`, `allow` ou `deny`; padrão `memory`)

Principais variáveis do Web (`apps/web/.env`):

- `VITE_API_BASE_URL`: URL base da API (recomendado `/api`)
- `VITE_API_PROXY_TARGET`: alvo do proxy local do Vite (ex.: `http://localhost:3001`)

### 4) Preparar banco de dados

```bash
pnpm prisma:migrate:dev
pnpm prisma:generate
```

> Em produção use `pnpm prisma:migrate`.

## Como rodar

### Modo desenvolvimento (API + Web)

```bash
pnpm dev
```

- Web: `http://localhost:8080`
- API: `http://localhost:3001`

### Rodar apenas API

```bash
pnpm dev:api
```

### Rodar apenas Web

```bash
pnpm dev:web
```

## Scripts úteis

- `pnpm build`: build de todos os apps
- `pnpm lint`: lint geral
- `pnpm test`: testes (na API executa `prisma generate` automaticamente antes)
- `pnpm typecheck`: checagem de tipos (na API executa `prisma generate` automaticamente antes)
- `pnpm format`: formatação com Prettier

## Limpeza técnica recente

- Removidas dependências não utilizadas da API: `@nestjs/passport`, `passport` e `passport-jwt` (e o tipo `@types/passport-jwt`).
- Removido o arquivo vazio `apps/api/install_fix.sh`, que não possuía uso no fluxo de build, execução ou deploy.
- Atualizado o `pnpm-lock.yaml` para refletir a redução de dependências do workspace.
- Removida a funcionalidade de gestão de templates de mensagem no Admin (`/admin/message-templates`), incluindo página do Web e módulo dedicado da API.

## QA e pontos de melhoria

### Checklist de QA executado

Para validar a saúde do monorepo, executei o fluxo completo de qualidade:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

### Resultado atual

- ✅ **Lint** concluído com sucesso no monorepo.
- ✅ **Typecheck** concluído com sucesso no monorepo.
- ✅ **Testes automatizados da API** passando (`32/32`).
- ✅ **Build (API + Web)** concluído com sucesso.
- ⚠️ Permanecem apenas _warnings_ não bloqueantes no Web:
  - uso de `<img>` em telas de login/cadastro (recomendação de migrar para `next/image`);
  - tipo `Workspace` importado e não utilizado em `/super-admin/marketplace`.

### Melhorias recomendadas (ordem sugerida)

1. **Migrar imagens para `next/image`** nas telas de autenticação para otimização de LCP.
2. **Remover import não utilizado** em `super-admin/marketplace` para zerar warnings de lint.
3. **Adicionar gate de qualidade no CI** com etapas separadas (`lint`, `typecheck`, `test`, `build`) e falha rápida.
4. **Tratar warning de teardown dos testes da API** (Jest) com `--detectOpenHandles` para eliminar possíveis vazamentos de recursos.

## Documentação do backend (API)

A documentação de organização da API (mapa de pastas, nomenclatura de arquivos, inventário de scripts e critérios de obsolescência) está em:

- `apps/api/docs/backend-organizacao.md`

Também foi removido um arquivo duplicado/obsoleto do Prisma em `apps/api/prisma/prisma.service.ts`, mantendo apenas a implementação oficial em `apps/api/src/prisma/prisma.service.ts`.

## Estrutura do repositório

```
apps/
  api/        # API NestJS
  web/        # Front-end React + Vite
```

## Fluxos comuns

### Atualizar dependências e rodar tudo

```bash
pnpm install
pnpm dev
```

### Rodar somente o back-end com banco local

```bash
docker compose up -d
pnpm dev:api
```

### Validar acesso a automações

O acesso às automações é liberado quando o workspace possui aprovação (`status=APPROVED`) para o template correspondente. Garanta que a liberação esteja registrada antes de ativar fluxos.

### Fluxo de login

Após validar o OTP com sucesso, o front-end redireciona o usuário para `/` (dashboard principal protegido por sessão).

Se o usuário abrir a aplicação sem sessão válida, o front redireciona automaticamente para `/login`.


### Login e sessão no frontend

- A rota `/` agora é protegida: se a API responder que não há sessão, o usuário vai para `/login`.
- A tela `/login` usa fluxo OTP (`/api/auth/request-otp` e `/api/auth/verify-otp`).
- Todas as chamadas web usam `credentials: include` para suportar cookies HttpOnly emitidos pela API.
- Quando a API retorna HTML por engano (ex.: proxy/configuração incorreta), o front mostra erro claro de resposta inválida em vez de quebrar no parse JSON.

### Inventário de rotas do front (`apps/web`)

Para evitar links antigos apontando para páginas removidas, existe a checagem automatizada:

```bash
pnpm --filter crmpexe-web test
```

Esse comando executa a suíte de testes do frontend para validar integrações e comportamento base da interface.

O inventário detalhado (menu atual, rotas existentes e rotas quebradas) está em:

- `apps/web/src/test/example.test.ts`

## Fluxo do Super Admin para publicar molde n8n

Antes de disponibilizar uma automação no marketplace, o Super Admin deve transformar o JSON exportado do n8n em um **molde reutilizável**:

1. Crie e valide o fluxo diretamente no n8n.
2. Exporte o JSON do fluxo.
3. Abra o JSON em um editor de texto e substitua segredos fixos por variáveis:
   - `sk-proj-...` → `{{OPENAI_KEY}}`
   - token do WhatsApp → `{{WHATSAPP_TOKEN}}`
4. Publique esse JSON com variáveis no painel de Super Admin em **Templates de automação**, no campo **Definition JSON**.

Esse processo garante que o template seja instalado em múltiplos workspaces sem vazar credenciais pessoais.

## Momento da instalação ("mágica" do backend)

Quando o usuário clica em **Instalar Agente** no marketplace, o backend executa automaticamente as etapas abaixo para gerar um fluxo exclusivo por workspace:

1. **Busca do molde**: carrega o `definitionJson/workflowData` do `AutomationTemplate` aprovado.
2. **Busca e descriptografia dos segredos**: lê as integrações ativas do workspace (`IntegrationAccount` + `IntegrationSecret`) e descriptografa os segredos.
3. **Substituição de placeholders**: aplica substituição global em todo o JSON do fluxo (todas as ocorrências por string), evitando cenários em que apenas o primeiro token `{{OPENAI_KEY}}` seria trocado.
4. **Pré-voo obrigatório**: antes do deploy, valida se placeholders obrigatórios foram resolvidos. Se faltar a chave da OpenAI, retorna o erro: `Por favor, configure sua Integração com OpenAI antes de instalar este agente.`
5. **Resultado**: gera um payload final válido e funcional, isolado por cliente/workspace.
6. **Webhook por instalação** (quando o primeiro nó é webhook): define um `path` único no formato `crmpexe-{workspaceId}-{instanceId}` para evitar colisão entre clientes.

Além dos segredos de integrações, o sistema também reaproveita variáveis de workspace como fonte de placeholders.

## Comunicação com n8n no deploy e vínculo de instância

No deploy de uma automação, o CRM segue um fluxo transacional para garantir rastreabilidade e controle operacional:

1. **Conexão**: o backend usa a integração `N8N` ativa do workspace para autenticar na API do n8n.
2. **Envio**: o payload final (JSON do workflow já com placeholders resolvidos) é enviado para criação/atualização no n8n.
3. **Ativação no payload**: o backend envia sempre `active: true` no JSON de criação/atualização do workflow no n8n, evitando fluxos criados em estado pausado.
4. **Ativação operacional**: após criar/atualizar, o CRM também chama o endpoint de ativação do workflow no n8n.
5. **Resposta**: o n8n retorna o identificador do fluxo, e o backend normaliza esse ID para string (`externalWorkflowId`).
6. **Vínculo no banco**: a `AutomationInstance` persiste a relação `workspace + template + versão + n8nWorkflowId`, permitindo auditoria e operação posterior.
7. **Controle**: ao desativar no painel, o CRM chama o endpoint de *deactivate* no n8n usando o `externalWorkflowId` salvo e mantém o estado interno sincronizado.

Com isso, cada instalação fica isolada por cliente/workspace e pode ser gerenciada com segurança durante todo o ciclo de vida.

## Integração WhatsApp (QR + Evolution)

A central de integrações em `/dashboard/settings` permite conectar WhatsApp de duas formas:

- **Via QR Code**: o usuário gera e lê o QR no WhatsApp.
- **Via Evolution API**: com `apiUrl` e `apiToken` configurados nos segredos da integração.

Se o cliente ainda não tiver API Evolution (ou API compatível), o sistema retorna um aviso de configuração ausente e exibe uma ação para contato com suporte.

### Sessões do WhatsApp

No estado atual do projeto, as sessões ficam **vinculadas ao perfil do usuário** (`profileUserId`) e à conta de integração.

Isso permite isolar sessões por perfil enquanto o compartilhamento por workspace não é implementado.

Variável opcional para link de suporte:

- `WHATSAPP_SUPPORT_URL` (API)
- `NEXT_PUBLIC_WHATSAPP_LINK` (Web, fallback)

## Omnichannel verdadeiro (além do WhatsApp)

### Configuração pelo painel (cliente)

A configuração das APIs deve ser feita pelo cliente no painel **Dashboard > Configurações** (seções de IA, E-mail e Developers), sem depender de hardcode no deploy.

No painel, o cliente pode cadastrar contas por tipo (`OPENAI`, `WHATSAPP`, `EMAIL`, `INSTAGRAM_DIRECT`, `FACEBOOK_MESSENGER`, `VOIP`, `N8N`) e salvar os segredos da integração por workspace na tabela `IntegrationSecret` (payload criptografado).

Além do fluxo de WhatsApp, o backend possui suporte de canal com mapeamento dedicado no tipo de conta de integração:

- `INSTAGRAM_DIRECT`
- `FACEBOOK_MESSENGER`
- `EMAIL`
- `VOIP`

Os canais aceitos na camada de atendimento são: `whatsapp`, `instagram`, `messenger`, `email` e `voip`.

### Envio real de e-mail

O canal `email` usa provedor real SMTP (via `nodemailer`) para envio outbound.

### Configuração de IA por workspace

No painel de configurações do dashboard, o cliente deve criar uma integração do tipo `OPENAI` e salvar os segredos no bloco de credenciais da própria conta. Esses dados ficam persistidos de forma criptografada em `IntegrationSecret`.

Segredos esperados na integração `OPENAI`:

- `apiKey` (sensível)
- `model`
- `baseUrl`

Quando as chaves não são informadas na integração, o backend mantém fallback para variáveis de ambiente (`apps/api/.env`).

Segredos esperados na integração `EMAIL` (ou fallback para variáveis de ambiente da API):

- `smtpHost` / `SMTP_HOST`
- `smtpPort` / `SMTP_PORT`
- `smtpUser` / `SMTP_USER`
- `smtpPass` / `SMTP_PASS`
- `smtpFrom` / `SMTP_FROM`
- `smtpSecure` / `SMTP_SECURE` (opcional)

Para webhook inbound, configure `webhookSecret` na integração e envie a assinatura HMAC SHA-256 no header definido por `EMAIL_WEBHOOK_SIGNATURE_HEADER` (padrão `x-email-signature`).

## Dashboard analítico avançado

O endpoint `GET /api/dashboard/sales` passa a retornar indicadores de gestão com foco em operação comercial e atendimento:

- **SLA de primeira resposta**: `slaPrimeiraResposta.tempoMedioSegundos`.
- **Conversão por etapa do funil**: `conversaoEntreEtapas` com quantidade e taxa de conversão.
- **Produtividade por usuário/vendedor**: `produtividadeUsuarios` com conversas fechadas, mensagens enviadas e taxa de fechamento.

A interface `/dashboard` consome esses dados para destacar KPIs operacionais e visão de cobertura omnichannel.

## Onboarding de workspace

Após o login (OTP), o usuário continua sendo redirecionado para `/dashboard`.

Quando ainda não possui nenhum vínculo **aprovado** em workspace, o dashboard exibe duas ações:

- **Criar Workspace** (`POST /api/workspaces`)
  - Campos: `name` e `password`.
  - Resultado: cria workspace, gera `code`, cria vínculo do criador como `OWNER` com status `APPROVED`, e define o workspace como atual.
- **Entrar em Workspace** (`POST /api/workspaces/join`)
  - Campos: `code` e `password`.
  - Resultado: se credenciais corretas, cria/atualiza solicitação com status `PENDING` (não concede acesso imediato).

Consulta de status de vínculos do usuário:

- `GET /api/me/workspaces`

Modelagem adicionada no Prisma:

- `Workspace`: agora com `code` e `passwordHash`.
- `WorkspaceMembership`: tabela de solicitação/vínculo (`role`: `OWNER|MEMBER`; `status`: `PENDING|APPROVED|REJECTED`).

## Interface

### Barra lateral de navegação

A aplicação web conta com uma barra lateral fixa no desktop e recolhível no mobile, com hierarquia por seções (início rápido, atendimento, vendas & CRM, operações e integrações). Os itens recebem ícones e destaque visual para facilitar a descoberta das funcionalidades principais.

A identidade do produto no cabeçalho lateral foi padronizada para **AtendeAi**.

A barra lateral também aceita itens dinâmicos com `emoji` quando não houver componente de ícone disponível, evitando falhas de renderização em seções extras carregadas por perfil (ex.: Admin e Super Admin).

Para manter a consistência visual do layout escuro, o scroll interno da barra lateral usa trilha transparente e thumb com estilo discreto.

## Produção com Docker

### Build de imagens (multi-stage)

Este repositório possui Dockerfiles otimizados para produção:

- `apps/api/Dockerfile`: build da API NestJS com geração do Prisma Client no build.
- `apps/web/Dockerfile`: build do frontend React (Vite) e publicação dos arquivos estáticos com `serve`.

### Subir stack de produção

1. Crie os arquivos de ambiente de produção (não comite segredos):

```bash
cp apps/api/.env.production.example apps/api/.env.production
cp apps/web/.env.production.example apps/web/.env.production
```

2. Defina segredos sensíveis (`JWT_*`, `MERCADOPAGO_*`, `OPENAI_*`) via CI/CD, secret manager ou injeção segura no servidor.

3. Gere os certificados de origem do Cloudflare e salve em `infra/certs/` com os nomes (recomendado para SSL/TLS em modo **Full (Strict)** no Cloudflare):
   - `origin-cert.pem`
   - `origin-key.pem`

4. Crie o volume externo do PostgreSQL (persistência entre recriações do container):

```bash
docker volume create postgres_data
```

5. Suba os containers:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Healthchecks e ordem de subida

O `docker-compose.prod.yml` inclui healthchecks para PostgreSQL e Redis. A API só inicia após os dois serviços ficarem saudáveis, reduzindo erros de conexão no boot.

### Limites de recursos

Para evitar saturação da VPS, os serviços de produção possuem limites de CPU e memória definidos diretamente no Compose (`cpus` e `mem_limit`). Ajuste esses valores conforme o tamanho do seu servidor.

### Frontend React + Vite em produção

O frontend gera artefatos estáticos em `apps/web/dist` e o container `web` os publica na porta `8080`.

### Migrações Prisma em produção

A API executa automaticamente, no startup do container:

```bash
npx prisma migrate deploy
```

> Não use `prisma db push` em produção.

### CORS seguro

Em produção, a API exige `CORS_ORIGIN` explícito e bloqueia `*`.

### Reverse proxy + SSL (Cloudflare)

- O arquivo `infra/nginx/default.conf` configura o Nginx na frente de `api` e `web`.
- No Cloudflare, use modo SSL/TLS **Full (Strict)** para criptografia ponta a ponta com certificado de origem.

### Disponibilidade e reinício automático

Todos os serviços no `docker-compose.prod.yml` usam `restart: always`.

### Armazenamento persistente

Volumes persistentes incluídos:

- `postgres_data`
- `redis_data`
- `uploads_data` (reservado para armazenamento local de arquivos da API)

## Troubleshooting

### Erro NestJS no `WorkspaceAgentsModule` (JwtService não resolvido)

Se a API subir com erro parecido com:

```
Nest can't resolve dependencies of the AccessTokenGuard (?, PrismaService)
Please make sure that the argument JwtService at index [0] is available in the WorkspaceAgentsModule context.
```

a causa é o `WorkspaceAgentsModule` não importar o `AuthModule` (que exporta `JwtModule` e `AccessTokenGuard`).

Solução aplicada neste repositório:

- Garantir `AuthModule` em `imports` de `apps/api/src/workspace-agents/workspace-agents.module.ts`.

Depois disso, o `AccessTokenGuard` volta a ter `JwtService` disponível no contexto do módulo e a API inicializa normalmente.


### Erro de injeção no `AccessTokenGuard` dentro de `AgentTemplatesModule`

Se a API subir com o erro abaixo:

```
Nest can't resolve dependencies of the AccessTokenGuard (?, PrismaService)
```

garanta que o módulo que usa `@UseGuards(AccessTokenGuard)` importe o `AuthModule`, pois ele exporta `JwtModule` e o próprio `AccessTokenGuard`.

Neste projeto, isso já foi corrigido em `apps/api/src/agent-templates/agent-templates.module.ts` com `imports: [PrismaModule, AuthModule]`.


- **Erro de conexão com o banco**: confirme se o Docker está rodando e se o `DATABASE_URL` está correto.
- **Erro com Prisma**: rode `pnpm prisma:generate` e depois `pnpm prisma:migrate:dev`.
- **Portas ocupadas**: altere as portas nos scripts ou finalize processos que estejam usando 8080/3001.
- **401 nas variáveis do workspace**: no front-end utilize o endpoint `/api/workspace-variables` (proxy da Web) para garantir o envio de cookies de autenticação.
- **401 no dashboard/tarefas**: no frontend mantenha `VITE_API_BASE_URL=/api` para que o Nginx (produção) ou proxy do Vite (desenvolvimento) encaminhe corretamente as chamadas para a API.

## Licença

Este projeto está sob licença proprietária (verifique com o time responsável).

## Módulo de Agents (importação, publicação e ativação por workspace)

Foi adicionado um domínio completo de **Agents** com versionamento, governança e integração n8n.

### Principais fluxos

- **Admin interno** importa JSON e salva como **draft versionado** (`v1`, `v2`, ...).
- **Super-admin** publica versão draft no n8n.
- **Workspace cliente** ativa/desativa apenas agents publicados e permitidos.
- Toda ação crítica gera evento de **auditoria**.

### Novas variáveis de ambiente (API)

- `N8N_BASE_URL`: URL principal da API do n8n para publicação de agents (opcional).
- `N8N_LOCAL_BASE_URL`: fallback local (padrão `http://localhost:5678`).
- `N8N_INTERNAL_BASE_URL`: fallback interno em rede Docker (padrão `http://n8n:5678`).
- `N8N_API_TOKEN`: token da API do n8n (opcional; quando vazio o serviço tenta sem header).
- `N8N_DELETE_PREVIOUS_WORKFLOW_ON_ACTIVATE`: quando `true`, remove do n8n o workflow antigo após troca de versão ativa no workspace.

### Endpoints principais

Admin/Super-admin:

- `POST /api/agent-templates/import`
- `POST /api/agent-templates/:id/publish`
- `GET /api/agent-templates`
- `GET /api/agent-templates/:id/versions`
- `POST /api/agent-templates/:id/versions/:version/rollback`

Workspace cliente:

- `GET /api/workspace-agents/catalog`
- `POST /api/workspace-agents/:agentTemplateId/activate`
- `POST /api/workspace-agents/:agentTemplateId/deactivate`
- `GET /api/workspace-agents`

### Banco de dados

Entidades novas no Prisma:

- `AgentTemplate`
- `AgentTemplateVersion`
- `WorkspaceAgent`
- `AgentAuditLog`

Índices adicionados:

- `agentTemplateId + version`
- `workspaceId + isActive`
- `status + category`

### OpenAPI

Especificação inicial dos endpoints em:

- `apps/api/docs/agents.openapi.yaml`

### Seed de exemplo

O seed agora cria também **2 agents publicados**:

- `Agente SDR WhatsApp`
- `Agente Suporte Omnichannel`

### Uso do n8n via Docker do próprio sistema

Sim, o módulo de publicação agora tenta automaticamente usar o n8n local do stack Docker (`localhost:5678`) e também o hostname interno (`n8n:5678`) quando a API roda em container na mesma rede.

Ordem de tentativa de publicação:

1. `N8N_BASE_URL` (se definido)
2. `N8N_LOCAL_BASE_URL`
3. `N8N_INTERNAL_BASE_URL`

Isso facilita desenvolvimento local e ambientes dockerizados sem depender de configuração manual extra.


### Governança de workflows antigos no n8n (troca de versão)

Ao trocar a versão ativa no workspace, o backend agora tenta automaticamente:

1. **desativar** o workflow anterior no n8n (`POST /workflows/:id/deactivate`), e
2. **deletar** o workflow anterior (`DELETE /workflows/:id`) quando `N8N_DELETE_PREVIOUS_WORKFLOW_ON_ACTIVATE=true`.

Esse fluxo evita acúmulo de workflows inativos “fantasmas” na instância compartilhada do n8n e registra resultado em auditoria.

## Fluxo de URL para adicionar agentes

A tela `/agents` foi estruturada para operar somente com dados reais da API (sem dados fake), em três etapas:

1. **Super Admin / Admin interno — importar JSON e publicar no n8n**
   - faz upload do arquivo JSON do agente;
   - revisa nome, categoria e descrição;
   - clica em **Importar JSON e publicar** para executar importação de template e publicação no n8n.

2. **Super Admin / Admin interno — gerar URL de instalação**
   - seleciona o agente já publicado;
   - seleciona o workspace de destino;
   - clica em **Gerar URL de instalação** para criar link compartilhável com `agent` e `workspace` na query string.

3. **Conta de usuário — adicionar agente**
   - abre a URL recebida;
   - confirma o agente e o workspace disponível;
   - informa variáveis do agente em JSON;
   - clica em **Adicionar agente** para ativar no workspace (com troca automática de workspace quando necessário).

Esse fluxo atende separação por cliente/workspace e evita confusão operacional no uso dos agentes.
