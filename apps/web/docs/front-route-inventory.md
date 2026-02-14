# Inventário de rotas e links do front (`apps/web`)

## Fonte do menu lateral/topbar do dashboard

A navegação principal do dashboard está centralizada em `apps/web/components/sidebar-nav.tsx`, nas estruturas:

- `clientSections`: menu lateral do cliente (dashboard).
- `superAdminSections`: menu lateral do super admin.
- `sidebarExtraSections` em `app/dashboard/dashboard-client.tsx`: adiciona atalhos extras para perfis admin/super admin.

## Itens atuais do menu

### Cliente (`clientSections`)

1. `/dashboard` — Visão Geral
2. `/inbox` — Atendimento
3. `/dashboard/channels` — Canais & Redes
4. `/dashboard/agents` — Agentes
5. `/workspaces` — Workspaces
6. `/dashboard/settings/ai` — Inteligência Artificial
7. `/dashboard/settings/email` — E-mail (SMTP)
8. `/dashboard/settings/developers` — Chaves & API

### Super Admin (`superAdminSections`)

1. `/super-admin` — Visão geral
2. `/super-admin/marketplace` — Agentes do CRM
3. `/super-admin/support` — Impersonação
4. `/super-admin/templates` — Templates

### Atalhos extras do dashboard (`sidebarExtraSections`)

- Admin:
  - `/admin/message-templates`
- Super Admin:
  - `/super-admin`

## Rotas existentes vs rotas quebradas

Validação automatizada com `pnpm --filter crmpexe-web check:routes`.

### Rotas existentes (`app/**/page.tsx`)

- `/`
- `/admin`
- `/admin/agents/catalog`
- `/admin/agents/import`
- `/admin/message-templates`
- `/dashboard`
- `/dashboard/agents`
- `/dashboard/channels`
- `/dashboard/settings/ai`
- `/dashboard/settings/developers`
- `/dashboard/settings/email`
- `/dashboard/workspace-agents/available`
- `/dashboard/workspace-agents/my`
- `/inbox`
- `/login`
- `/register`
- `/super-admin`
- `/super-admin/marketplace`
- `/super-admin/support`
- `/super-admin/templates`
- `/workspaces`

### Rotas quebradas

- Nenhuma rota quebrada encontrada nas referências internas de navegação (`href`, `redirect`, `router.push`, `router.replace`).

## Pós-login

O pós-login continua apontando para `/dashboard`, conforme fluxo documentado:

- `app/login/login-form.tsx`: `router.replace("/dashboard")` após autenticação OTP.
- `app/login/page.tsx`: se já estiver autenticado, redireciona para `/dashboard`.
