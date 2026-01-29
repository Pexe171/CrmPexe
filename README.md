# CrmPexe

CRM multi-tenant com API em NestJS e front-end em Next.js, organizado em monorepo com Turbo. Este README descreve **os passos reais** para instalar, configurar e executar o projeto localmente, incluindo variáveis de ambiente, banco de dados e scripts disponíveis.

## Visão geral

- **API**: NestJS, Prisma, autenticação JWT e módulos de domínio (ex.: empresas, contatos, negócios, tarefas, automações, integrações).
- **Web**: Next.js (React) para a interface do CRM.
- **Infra local**: Postgres (obrigatório), Redis e n8n (opcionais/apoio às automações).

## Estrutura do repositório

```
/apps
  /api     # NestJS + Prisma
  /web     # Next.js
```

## Requisitos

- **Node.js 20+**
- **pnpm 9+** (conforme `packageManager` no `package.json`)
- **Docker** (para subir Postgres/Redis/n8n localmente)

## PASSO 1 — Clonar o repositório

**Objetivo:** obter o código localmente.

```bash
git clone <url-do-repositorio>
cd CrmPexe
```

## PASSO 2 — Instalar dependências

**Objetivo:** instalar dependências do monorepo.

```bash
pnpm install
```

## PASSO 3 — Configurar variáveis de ambiente

**Objetivo:** habilitar a execução da API e do front-end.

Copie os arquivos de exemplo e ajuste os valores conforme necessário:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### Variáveis da API (`apps/api/.env`)

| Variável | Descrição | Exemplo |
| --- | --- | --- |
| `DATABASE_URL` | URL do Postgres usado pelo Prisma | `postgresql://crmpexe:crmpexe@localhost:5432/crmpexe?schema=public` |
| `JWT_ACCESS_SECRET` | Segredo do JWT de acesso | `change-me` |
| `JWT_REFRESH_SECRET` | Segredo do JWT de refresh | `change-me` |
| `SMTP_HOST` | Host SMTP para envio de e-mails | `smtp.gmail.com` |
| `SMTP_PORT` | Porta SMTP | `465` |
| `SMTP_USER` | Usuário SMTP | `seu-email@gmail.com` |
| `SMTP_PASS` | Senha SMTP (app password) | `sua-senha-de-app` |
| `SMTP_FROM` | Remetente dos e-mails | `CrmPexe <seu-email@gmail.com>` |
| `OTP_TTL_MS` | TTL do OTP em milissegundos | `600000` |
| `MERCADOPAGO_ACCESS_TOKEN` | Token do Mercado Pago | `seu-access-token` |
| `MERCADOPAGO_PUBLIC_KEY` | Public key do Mercado Pago | `sua-public-key` |

> **Nota:** Em produção, `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` são obrigatórios; a API falha ao iniciar sem eles.

### Variáveis do Web (`apps/web/.env`)

| Variável | Descrição | Exemplo |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | URL base da API | `http://localhost:3001` |

## PASSO 4 — Subir infraestrutura local (Postgres/Redis/n8n)

**Objetivo:** disponibilizar os serviços necessários localmente.

```bash
docker compose up -d
```

Serviços disponíveis após o comando:

- **Postgres**: `localhost:5432` (obrigatório)
- **Redis**: `localhost:6379` (apoio para filas/automação)
- **n8n**: `localhost:5678` (orquestração de automações)

## PASSO 5 — Gerar Prisma Client e aplicar migrations

**Objetivo:** preparar o banco de dados com o schema do Prisma.

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

> Isso executa `prisma generate` e `prisma migrate dev` no app **crmpexe-api**.

## PASSO 6 — Executar API e Web em desenvolvimento

**Objetivo:** subir ambos os apps localmente.

### Opção A — Subir tudo em paralelo

```bash
pnpm dev
```

### Opção B — Subir separadamente

```bash
pnpm dev:api
pnpm dev:web
```

### Endpoints locais

- **API**: `http://localhost:3001/api`
- **Health check**: `http://localhost:3001/api/health`
- **Web**: `http://localhost:3000`

## Scripts úteis

### Raiz do monorepo

| Script | Descrição |
| --- | --- |
| `pnpm dev` | Sobe API e Web em paralelo via Turbo |
| `pnpm dev:api` | Sobe somente a API |
| `pnpm dev:web` | Sobe somente o Web |
| `pnpm build` | Build de todos os apps |
| `pnpm lint` | Lint em todos os apps |
| `pnpm test` | Testes em todos os apps |
| `pnpm typecheck` | Typecheck em todos os apps |
| `pnpm format` | Formata arquivos `.ts`, `.tsx` e `.md` |
| `pnpm prisma:generate` | Gera o Prisma Client da API |
| `pnpm prisma:migrate` | Executa migrations da API |

### API (NestJS)

| Script | Descrição |
| --- | --- |
| `pnpm --filter crmpexe-api dev` | API com hot reload |
| `pnpm --filter crmpexe-api build` | Build da API |
| `pnpm --filter crmpexe-api start` | Executa API buildada |
| `pnpm --filter crmpexe-api test` | Testes unitários |
| `pnpm --filter crmpexe-api test:e2e` | Testes e2e |
| `pnpm --filter crmpexe-api prisma:studio` | Prisma Studio |

### Web (Next.js)

| Script | Descrição |
| --- | --- |
| `pnpm --filter crmpexe-web dev` | Front-end em modo dev |
| `pnpm --filter crmpexe-web build` | Build do front-end |
| `pnpm --filter crmpexe-web start` | Executa front-end buildado |
| `pnpm --filter crmpexe-web lint` | Lint do front-end |

## Observações importantes

- A API expõe rotas com prefixo `/api` e habilita CORS com base em `CORS_ORIGIN` (padrão: `http://localhost:3000`).
- O ambiente local padrão utiliza Postgres em `localhost:5432`. Ajuste `DATABASE_URL` se necessário.
- O repositório segue práticas de multi-tenant no schema Prisma com `workspaceId` como escopo principal.

## Fluxo recomendado de desenvolvimento

1. Subir infraestrutura com Docker.
2. Configurar `.env` da API e Web.
3. Rodar migrations e gerar Prisma Client.
4. Subir API e Web em paralelo.
5. Validar `GET /api/health`.

---

Se precisar de ajustes adicionais de documentação ou setup, descreva o cenário desejado para garantir que o README continue refletindo exatamente o comportamento real do sistema.
