# Organização do Backend (API)

Este documento centraliza a organização da API, a convenção de nomenclatura e o inventário de scripts para facilitar manutenção, onboarding e limpeza técnica.

## 1) Mapa de pastas da API

Base: `apps/api/src`

### Núcleo da aplicação

- `main.ts`: bootstrap do NestJS.
- `app.module.ts`: composição de módulos de domínio.
- `app.controller.ts` / `app.service.ts`: endpoints e serviço básicos de health/boas-vindas.

### Infraestrutura e base comum

- `prisma/`: integração com banco via Prisma (`PrismaModule` e `PrismaService`).
- `common/filters/`: filtros globais de exceção.
- `common/logging/`: correlação, middleware e logger estruturado.
- `common/rate-limit/`: decorators, guard e serviço de limitação de requisições.
- `types/`: tipagens globais/augmentations TypeScript.

### Domínios de negócio (feature-first)

Cada pasta de domínio segue, em geral, o padrão:

- `<dominio>.module.ts`: define providers/controllers/imports.
- `<dominio>.controller.ts`: camada HTTP.
- `<dominio>.service.ts`: regras de negócio.
- `dto/`: contratos de entrada.
- subpastas específicas (`providers/`, `interfaces/`, `connectors/`) quando necessário.

Domínios atuais mapeados:

- `auth`, `workspaces`, `workspace-variables`, `workspace-agents`
- `conversations`, `channels`, `integration-accounts`
- `tasks`, `deals`, `tags`, `teams`, `queues`
- `companies`, `custom-field-definitions`, `knowledge-base`, `canned-responses`
- `dashboard`, `global-search`, `notifications`, `webhooks`, `support`, `audit-logs`
- `automations`, `automation-engine`, `billing`, `ai`, `n8n`, `marketplace`, `agent-templates`, `super-admin`

## 2) Nomenclatura padrão de arquivos

- **Módulos**: `<dominio>.module.ts`
- **Controllers**: `<dominio>.controller.ts`
- **Services**: `<dominio>.service.ts`
- **DTOs**: nome semântico em `kebab-case` + sufixo `.dto.ts` (ex.: `create-team.dto.ts`)
- **Guards/Decorators/Interceptors**: sufixo explícito (`.guard.ts`, `.decorator.ts`, `.interceptor.ts`)
- **Interfaces e providers**: em subpastas dedicadas quando representam contratos de integração

> Regra prática: pelo nome do arquivo deve ser possível entender o papel técnico sem abrir o código.

## 3) Inventário dos scripts do backend (`apps/api/package.json`)

### Execução e build

- `pnpm --filter crmpexe-api dev`: inicia API em watch (`nest start --watch`).
- `pnpm --filter crmpexe-api build`: gera build (`nest build`).
- `pnpm --filter crmpexe-api start`: roda build gerado (`node dist/main.js`).

### Qualidade

- `pnpm --filter crmpexe-api lint`: lint do backend (`eslint ... --fix`).
- `pnpm --filter crmpexe-api typecheck`: valida tipos (`tsc --noEmit`).
- `pnpm --filter crmpexe-api test`: executa testes unitários (`jest`).
- `pnpm --filter crmpexe-api test:e2e`: executa testes de integração/e2e.

### Banco (Prisma)

- `pnpm --filter crmpexe-api prisma:generate`: gera cliente Prisma.
- `pnpm --filter crmpexe-api prisma:migrate:dev`: cria/aplica migração de dev.
- `pnpm --filter crmpexe-api prisma:migrate`: aplica migrações em deploy.
- `pnpm --filter crmpexe-api prisma:studio`: abre Prisma Studio.

## 4) Limpeza aplicada e itens obsoletos

### Removido nesta reorganização

- Arquivo duplicado e fora do padrão de runtime: `apps/api/prisma/prisma.service.ts`.
  - A versão válida e utilizada pela aplicação está em `apps/api/src/prisma/prisma.service.ts`.

### Como identificar obsolescência de forma segura

1. Confirmar se o módulo participa do grafo do `AppModule` (direto ou indireto).
2. Confirmar imports/referências reais com `rg` antes de remover.
3. Rodar `typecheck` e `test` após remoções.
4. Preferir remoção incremental (pequenos PRs) para facilitar rollback.

## 5) Próximos passos recomendados

- Consolidar um `README.md` interno de cada domínio crítico (`auth`, `conversations`, `workspaces`).
- Criar ADR curta para padrões arquiteturais (injeção, erros, transações, integrações externas).
- Adicionar checagem de arquivos órfãos no CI (script simples com relatório de imports).
