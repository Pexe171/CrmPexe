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

## Troubleshooting

- **Erro de conexão com o banco**: confirme se o Docker está rodando e se o `DATABASE_URL` está correto.
- **Erro com Prisma**: rode `pnpm prisma:generate` e depois `pnpm prisma:migrate:dev`.
- **Portas ocupadas**: altere as portas nos scripts ou finalize processos que estejam usando 3000/3001.

## Licença

Este projeto está sob licença proprietária (verifique com o time responsável).
