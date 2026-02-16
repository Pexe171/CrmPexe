# Frontend Web (Dashboard CRM)

Aplicação principal do dashboard do CrmPexe, construída com **React + Vite + TypeScript**.

## Executar localmente

```bash
pnpm install
pnpm --filter crmpexe-web dev
```

Aplicação disponível em `http://localhost:8080`.

## Integração com o backend

As chamadas da API usam as variáveis:

- `VITE_API_BASE_URL` (padrão recomendado: `/api`)
- `VITE_API_PROXY_TARGET` (desenvolvimento, padrão: `http://localhost:3001`)

Com isso:

- Em **dev**, o Vite faz proxy de `/api` para o backend.
- Em **produção**, o Nginx reverso encaminha `/api` para o serviço `api`.

## Build de produção

```bash
pnpm --filter crmpexe-web build
```

Os arquivos estáticos serão gerados em `dist/`.
