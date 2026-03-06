# Revisão de QA – CrmPexe

Documento gerado a partir da análise de QA do projeto. Lista o que foi verificado e as correções aplicadas.

---

## 1. Frontend

### 1.1 Tratamento de erros

- **Error Boundary global:** Implementado em `apps/web/src/components/ErrorBoundary.tsx`. A árvore da aplicação é envolvida no `App.tsx`; em caso de erro de renderização, o usuário vê uma tela com mensagem em português e botões "Recarregar página" e "Ir para o início". Em dev, a mensagem do erro é exibida.
- **errorElement nas rotas:** O router (React Router) usa um layout com `errorElement` para que falhas em rotas protegidas ou em carregamento de páginas exibam um fallback em PT ("Erro ao carregar esta página") em vez da tela genérica do React.

### 1.2 Consistência de texto (português)

- Ajustes de ortografia em telas visíveis ao usuário:
  - "Validando sessao" → "Validando sessão"
  - "Integracao/Integracoes" → "Integração/Integrações"
  - "sessao integrada", "proprio" → "sessão integrada", "próprio"
  - "Configuracao necessaria" → "Configuração necessária"
  - "Conexao" → "Conexão"
  - "expiracao", "Atribuicao" → "expiração", "Atribuição"
  - "Gestao de Agentes" → "Gestão de Agentes"
  - "Variaveis necessarias" → "Variáveis necessárias"
  - "Acoes" (Conversas) → "Ações"

### 1.3 Validação e edge cases

- **Login:** Uso de `email.trim()` e `code.trim()` antes de enviar; não envia OTP com e-mail vazio.
- **API client:** Respostas 204 (No Content) são tratadas sem chamar `response.json()`, evitando erro em endpoints que não retornam corpo.

---

## 2. Backend

### 2.1 Segurança (JWT)

- **Comentários:** Em `access-token.guard.ts` e `auth.service.ts` foi documentado que o fallback `dev_access_secret` / `dev_refresh_secret` é apenas para desenvolvimento.
- **Produção:** O `main.ts` já exige `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` em produção e impede o bootstrap da API se estiverem ausentes.

### 2.2 Mensagens da API

- "Token de acesso invalido." → "Token de acesso inválido." no guard de autenticação.

### 2.3 Variáveis de ambiente

- **`.env.example` da API:** Incluída seção **Redis** (rate limit, filas): `REDIS_HOST`, `REDIS_PORT`, com `REDIS_URL` e `REDIS_PASSWORD` comentados como opcionais.

---

## 3. O que permanece como está (decisões)

- **Header `x-workspace-id`:** A API aceita o header opcionalmente; quando não é enviado, o workspace é resolvido pelo contexto do usuário. O frontend não envia o header hoje; o comportamento atual é intencional.
- **Token em localStorage:** O access token continua em `localStorage` (vulnerável a XSS). Migrar para cookie httpOnly exigiria mudanças em CORS, cliente e fluxo de login; fica como melhoria futura.
- **Idioma:** Mensagens de UI e API estão em português; não foi feita internacionalização.

---

## 4. Implementações da análise QA sênior (segurança, resposta, otimização)

- **CORS WebSocket:** Gateway de conversas passou a usar `CorsIoAdapter`, que aplica `CORS_ORIGIN` ao Socket.IO (em vez de `origin: true`).
- **Helmet:** Adicionado na API para headers de segurança (X-Content-Type-Options, X-Frame-Options, etc.).
- **Validação OTP:** DTO `verify-otp` com `@Length(6, 6)` e `@Matches(/^\d{6}$/)`.
- **Resposta de erro padronizada:** `HttpExceptionFilter` passa a incluir `errorCode` (ex.: `VALIDATION_ERROR`, `UNAUTHORIZED`) e opcionalmente `details` para erros de validação.
- **Payload de integração:** `UpsertIntegrationSecretDto` com validador que limita número de chaves e tamanho dos valores.
- **WorkspaceContextService:** Serviço centralizado para `resolveWorkspaceId` e `normalizeWorkspaceId`; `AuditLogsService` refatorado para usá-lo (outros módulos podem migrar gradualmente).
- **Lazy loading:** Rotas do front com `React.lazy` e `Suspense` e fallback "Carregando...".
- **Dependências removidas:** API: `body-parser`. Web: `@dnd-kit/sortable`, `@fontsource/space-grotesk`, `date-fns`, `embla-carousel-react`; componente `carousel` removido. Export não usado `reducer` removido de `use-toast.ts`.
- **Variáveis de ambiente:** `.env.example` da API atualizado com `RATE_LIMIT_REDIS_*`, `AI_PROCESSING_CONCURRENCY`, `WHATSAPP_SUPPORT_URL`, `NEXT_PUBLIC_WHATSAPP_LINK`.

## 5. Sugestões para próximas revisões (baixa prioridade)

- Adicionar testes E2E para fluxos críticos (login, integrações, conversas).
- Revisar endpoints sensíveis (impersonation, admin, billing) quanto a checagem de role e workspace.
- **Token em cookie httpOnly:** Migrar access token de `localStorage` para cookie httpOnly (exige ajustes em CORS, cliente e fluxo de login).
- **CSRF:** Considerar token CSRF ou double-submit cookie para ações sensíveis (alterar senha, billing).
- **Padrão de listagens:** Opcional padronizar respostas de listagem com `{ data, meta }` (total, page, limit/cursor) para facilitar tabelas e paginação no front.
- Manter `.env.example` da API e da web alinhados às variáveis usadas no código.

---

*Última revisão: aplicada às alterações descritas neste documento (incl. plano de análise QA sênior).*
