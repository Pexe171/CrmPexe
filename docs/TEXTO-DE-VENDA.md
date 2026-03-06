# CrmPexe (AtendeAi) — Texto de Venda

**Use este material em landing pages, Hotmart, Gumroad, e-mails ou redes sociais. Ajuste preço e contato conforme seu canal.**

---

## Título principal (headline)

**CRM Omnichannel + WhatsApp + IA: código completo, documentado e pronto para deploy. Atendimento, pipeline de vendas e automações em um único sistema.**

---

## O problema que seu cliente vive

- **Atendimento espalhado:** WhatsApp em um lugar, e-mail em outro, planilha de vendas em terceiro. Nada conversa entre si.
- **Pipeline no Excel:** negócios perdidos no meio do caminho, estágios desatualizados, zero visão em tempo real.
- **Custo alto de CRM:** soluções enterprise caras ou ferramentas genéricas que não integram WhatsApp e IA do jeito que o negócio precisa.
- **Dependência de desenvolvedor para tudo:** cada automação ou “bot” vira projeto, prazo e orçamento.
- **Multi-equipe / multi-cliente:** agências e operadores precisam de workspaces separados, sem misturar dados.

Se você é **agência, operador de atendimento, dono de software house ou revendedor**, sabe que montar um CRM assim do zero leva meses e custa caro. E comprar “caixa preta” sem código trava sua evolução.

---

## A solução: CrmPexe (AtendeAi)

O **CrmPexe** é uma **plataforma CRM omnichannel** com **código-fonte completo** em TypeScript. Você recebe:

- **Back-end:** API em NestJS + Prisma + PostgreSQL + Redis.
- **Front-end:** React 18 + Vite + Tailwind + interface moderna (shadcn/Radix).
- **Infraestrutura:** Docker Compose para subir Postgres, Redis e n8n em poucos comandos.
- **Integrações nativas:** WhatsApp (Evolution API ou sessão integrada), OpenAI e n8n para automações e agentes de IA.

Ou seja: **não é template de landing page**. É um **sistema completo**, com autenticação, workspaces, conversas em tempo real, pipeline de vendas, dashboard, tags, filas, gestão de agentes e construtor de fluxos. Tudo documentado e organizado em monorepo (Turborepo + pnpm).

---

## Para quem é este produto

- **Agências de marketing e atendimento** que querem um CRM próprio para clientes, sem depender de ferramentas caras ou limitadas.
- **Software houses e devs** que precisam de uma base sólida para entregar CRM white-label ou customizado em menos tempo.
- **Operadores de WhatsApp Business** que querem centralizar conversas, pipeline e relatórios em um só lugar.
- **Empreendedores** que desejam revender ou licenciar um CRM completo em vez de construir do zero.
- **Empresas** que buscam controle total do código e dos dados, com possibilidade de hospedar no próprio servidor.

---

## O que o sistema faz (funcionalidades explicadas)

### 1. **Dashboard**
- KPIs de vendas e atendimento.
- Gráficos (ex.: Recharts).
- Conversas recentes e funil de conversão.
- Visão rápida do que importa para gestão.

### 2. **Conversas (chat em tempo real)**
- Lista de conversas por canal (ex.: WhatsApp).
- Chat ao vivo com **WebSocket** — mensagens aparecem na hora, sem recarregar.
- Painel do contato ao lado do chat.
- Painéis redimensionáveis para melhor uso da tela.
- Histórico de mensagens enviadas e recebidas.

### 3. **Pipeline de vendas (Kanban)**
- Negócios (Deals) organizados em **colunas por estágio**: Leads, Qualificação, Proposta, Negociação, Fechado, etc.
- **Arrastar e soltar** o card de um negócio para outra coluna atualiza o estágio no banco.
- Visual claro do funil e do que está parado em cada etapa.

### 4. **Integrações**
- **WhatsApp:**
  - **Evolution API (recomendado):** cliente informa URL e token; conecta via QR Code ou via API Oficial da Meta (token + ID do número). Tudo pelo painel, sem Postman.
  - **Sessão integrada:** geração de QR no próprio sistema (útil em cenários controlados).
- **OpenAI:** cadastro de API Key para uso em resumos, classificação e sugestões no atendimento.
- **n8n:** URL e API Token para automações e agentes. Segredos armazenados de forma segura.

### 5. **Gestão de agentes (IA)**
- **Admin:** importar agentes a partir de JSON do n8n, publicar, listar e excluir. Atribuir agentes a workspaces com data de validade.
- **Workspace:** catálogo de agentes disponíveis, ativar/desativar por workspace.
- Integração direta com n8n para orquestrar fluxos e IA.

### 6. **Automações — Construtor de fluxo**
- Interface visual com **nós** (Gatilho, Ação, OpenAI) e **conexões** entre eles.
- Montagem de fluxos de bot e automação sem escrever código.
- Salvamento como template de automação (categoria flow-builder) e uso no sistema.

### 7. **Configurações**
- **Tags:** criar, editar e excluir tags usadas em conversas e negócios.
- **Filas:** criar, editar e excluir filas para organização de atendimento.

### 8. **Workspaces (multi-tenant)**
- Cada cliente ou equipe em um **workspace** com código e senha.
- Criar novo workspace ou entrar em um existente.
- Admin gerencia workspaces e atribui agentes.

### 9. **Autenticação**
- Login por **OTP por e-mail** (código de uso único).
- Configuração de SMTP no servidor para envio real dos códigos.
- Token JWT e fluxo seguro de acesso.

### 10. **Billing (Mercado Pago)**
- Suporte a integração com Mercado Pago (variável de ambiente documentada), pronto para evoluir para planos e cobrança.

---

## Tecnologia: por que isso importa para você

- **Stack atual:** NestJS, Prisma, PostgreSQL, Redis, BullMQ, Socket.IO no back-end; React 18, Vite, Tailwind, React Query, Zustand, React Flow, @dnd-kit no front. Fácil de contratar dev ou dar manutenção.
- **Monorepo:** API e Web em um único repositório, com scripts únicos (`pnpm dev`, `pnpm build`, etc.). Deploy e CI/CD simplificados.
- **Docker:** ambiente de produção descrito em `docker-compose.prod.yml`, com healthchecks e restart automático. Migrações do Prisma rodam no startup da API.
- **Documentação:** README completo, tabela de endpoints, variáveis de ambiente explicadas, guia de WhatsApp/Evolution e arquivo AGENTS.md com dicas para desenvolvedores.
- **Testes e qualidade:** Jest (API) e Vitest (Web), além de typecheck e lint. Base estável para evoluir sem quebrar.

Você não compra um “projeto de faculdade”. Você compra uma **base profissional** que pode customizar, white-label e escalar.

---

## O que você recebe na compra

- **Código-fonte completo** da API (NestJS) e do front-end (React), em monorepo.
- **README** com setup em 5 passos, descrição de páginas, comandos e troubleshooting.
- **Documentação de API** (endpoints principais listados no README).
- **Exemplos de ambiente** (`.env.example` na API e no Web).
- **Schema Prisma** e migrações para recriar o banco em qualquer servidor.
- **Seed** opcional para criar usuário admin e workspace de demonstração.
- **Docker Compose** para desenvolvimento e produção (Postgres, Redis, n8n opcional).
- **Licença** conforme definido pelo vendedor (verifique no momento da compra).

---

## Diferenciais em uma frase

| Diferencial | Explicação |
|------------|------------|
| **Omnichannel + WhatsApp** | Conversas centralizadas; conexão via Evolution API ou sessão integrada, configurável pelo painel. |
| **Pipeline visual** | Kanban de negócios com drag-and-drop; estágios customizáveis pela lógica do negócio. |
| **IA e automação** | Integração n8n + OpenAI; agentes importáveis e atribuíveis por workspace; construtor de fluxo visual. |
| **Multi-workspace** | Vários “clientes” ou equipes no mesmo sistema, com isolamento de dados. |
| **Código aberto para você** | TypeScript em todo o stack; sem caixa preta; você adapta, revende ou hospeda onde quiser. |
| **Deploy em produção** | Docker Compose de produção pronto; menos trabalho de DevOps. |

---

## Perguntas frequentes (sugestão)

**Preciso saber programar?**  
Para **usar** o sistema (atendimento, pipeline, integrações), não: a interface cobre isso. Para **instalar em servidor, alterar código ou integrar com outros sistemas**, sim — ou alguém técnico no seu time.

**Funciona com WhatsApp Business oficial?**  
Sim. Há suporte à conexão via **API Oficial da Meta** (token + ID do número), além da Evolution API. O README e o guia de Evolution explicam os passos.

**Posso revender ou usar como white-label?**  
Depende da licença que o vendedor oferecer. O produto em si suporta multi-workspace e personalização; a parte comercial é definida no contrato ou na página de venda.

**Onde posso hospedar?**  
Em qualquer VPS ou servidor com Docker (Linux recomendado). O projeto inclui `docker-compose.prod.yml` para subir a stack completa.

**Tem suporte a outros canais além do WhatsApp?**  
A arquitetura é omnichannel (conversas, contatos, mensagens). O WhatsApp é a integração de canal mais pronta; outros canais podem ser adicionados no código usando a mesma base.

---

## Chamada para ação (CTA)

Exemplo de texto final para página de venda ou e-mail:

> **Pare de depender de CRM caro ou de projeto do zero.**  
> Com o CrmPexe você tem em mãos um CRM omnichannel completo: conversas em tempo real, pipeline de vendas, WhatsApp (Evolution ou API Oficial), agentes de IA com n8n e construtor de fluxos. Código em TypeScript, documentado e com Docker para produção.  
>  
> **[Adquira agora / Solicite demonstração / Entre em contato]** — [seu link ou e-mail]

---

## Versão curta (para redes sociais ou anúncios)

**CRM completo com WhatsApp + Pipeline + IA (n8n/OpenAI). Código-fonte em NestJS + React, multi-workspace, Docker pronto. Para agências, software houses e quem quer revender ou white-label. [Link]**

---

*Documento gerado para uso comercial do CrmPexe (AtendeAi). Ajuste preços, garantias e canais de contato conforme sua estratégia de venda.*
