# CrmPexe

Plataforma CRM com API em NestJS e front-end em Next.js, organizada como monorepo com Turborepo.

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
- [Estrutura do repositório](#estrutura-do-repositório)
- [Fluxos comuns](#fluxos-comuns)
- [Interface](#interface)
- [Produção com Docker](#produção-com-docker)
- [Troubleshooting](#troubleshooting)
- [Licença](#licença)

## Visão geral

O CrmPexe é um monorepo que centraliza a API (NestJS) e a aplicação web (Next.js). O projeto utiliza Postgres, Redis e N8N via Docker Compose para serviços auxiliares.

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Docker e Docker Compose

## Tecnologias

- **API**: NestJS, Prisma, PostgreSQL
- **Web**: Next.js, React, Tailwind CSS
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

Principais variáveis do Web (`apps/web/.env`):

- `NEXT_PUBLIC_API_URL`: URL da API
- `NEXT_PUBLIC_WHATSAPP_LINK`: link do WhatsApp

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

- Web: `http://localhost:3000`
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
- `pnpm test`: testes
- `pnpm typecheck`: checagem de tipos
- `pnpm format`: formatação com Prettier

## Estrutura do repositório

```
apps/
  api/        # API NestJS
  web/        # Front-end Next.js
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

## Interface

### Barra lateral de navegação

A aplicação web conta com uma barra lateral fixa no desktop e recolhível no mobile, com hierarquia por seções (início rápido, atendimento, vendas & CRM, operações e integrações). Os itens recebem ícones e destaque visual para facilitar a descoberta das funcionalidades principais.

A barra lateral também aceita itens dinâmicos com `emoji` quando não houver componente de ícone disponível, evitando falhas de renderização em seções extras carregadas por perfil (ex.: Admin e Super Admin).

## Produção com Docker

### Build de imagens (multi-stage)

Este repositório possui Dockerfiles otimizados para produção:

- `apps/api/Dockerfile`: build da API NestJS com geração do Prisma Client no build.
- `apps/web/Dockerfile`: build do Next.js em modo `standalone` para reduzir o tamanho final da imagem.

### Subir stack de produção

1. Crie os arquivos de ambiente de produção (não commite segredos):

```bash
cp apps/api/.env.production.example apps/api/.env.production
cp apps/web/.env.production.example apps/web/.env.production
```

2. Defina segredos sensíveis (`JWT_*`, `MERCADOPAGO_*`, `GEMINI_*`) via CI/CD, secret manager ou injeção segura no servidor.

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

### Next.js em modo standalone

O front-end já está configurado com `output: "standalone"` em `apps/web/next.config.js`, requisito do Dockerfile do web para copiar apenas os artefatos necessários de produção.

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

- **Erro de conexão com o banco**: confirme se o Docker está rodando e se o `DATABASE_URL` está correto.
- **Erro com Prisma**: rode `pnpm prisma:generate` e depois `pnpm prisma:migrate:dev`.
- **Portas ocupadas**: altere as portas nos scripts ou finalize processos que estejam usando 3000/3001.
- **401 nas variáveis do workspace**: no front-end utilize o endpoint `/api/workspace-variables` (proxy da Web) para garantir o envio de cookies de autenticação.

## Licença

Este projeto está sob licença proprietária (verifique com o time responsável).
