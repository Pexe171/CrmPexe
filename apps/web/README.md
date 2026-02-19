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


## Autenticação e rotas

- `/` é rota protegida (dashboard).
- `/login` executa login OTP com a API.
- O frontend envia cookies com `credentials: include` para manter sessão com `HttpOnly`.
- Caso a API responda HTML ao invés de JSON, a UI exibe mensagem de erro amigável indicando provável falha de proxy/base URL.

## Gestão de agentes (novo fluxo)

A rota `/agents` agora suporta fluxo completo, sem dados fake:

- upload do arquivo JSON do agente;
- importação do template e publicação no n8n pelo Super Admin/Admin;
- geração de URL de instalação por workspace;
- ativação do agente na conta do usuário com variáveis em JSON.

Exemplo de URL gerada:

```
/agents?agent=<agentTemplateId>&workspace=<workspaceId>
```
