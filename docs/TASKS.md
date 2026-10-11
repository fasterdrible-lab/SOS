# TASKS.md - SalesOS

## FASE 1 - Estrutura + Projeto Base concluida

| # | Tarefa | Status |
|---|--------|--------|
| 1.1 | Criar estrutura documental (CLAUDE.md, docs/) | done |
| 1.2 | Scaffold Next.js 16 (TypeScript + Tailwind + Shadcn) | done |
| 1.3 | Configurar Prisma 7 + schema multiempresa (PostgreSQL) | done |
| 1.4 | Configurar NextAuth v5 com multiempresa | done |
| 1.5 | Criar layout base (sidebar + header + design system SalesOS) | done |
| 1.6 | Tela de Login com identidade visual SalesOS | done |

## FASE 2 - Diagnostico Comercial + Dashboard Inicial

| # | Tarefa | Status |
|---|--------|--------|
| 2.1 | Formulario de Diagnostico Comercial (wizard multi-step) | done |
| 2.2 | Engine de scoring de maturidade comercial (algoritmo) | done |
| 2.3 | Pagina de resultado do diagnostico (nota + gargalos + recomendacoes) | done |
| 2.4 | Dashboard executivo com KPIs reais (puxando do banco) | done |

FASE 2 concluida.

## FASE 3 - CRM Inteligente (Modulo 2)

Paginas ja linkadas na sidebar (`components/app-sidebar.tsx`, grupo "CRM") e ainda nao implementadas: `/empresas`, `/contatos`, `/pipeline`. Usa os models `Company`, `Contact`, `Lead` e `Opportunity` ja existentes no schema (ver `docs/ARCHITECTURE.md`).

| # | Tarefa | Status |
|---|--------|--------|
| 3.1 | Empresas: listagem + cadastro (`/empresas`) | done |
| 3.2 | Contatos: listagem + cadastro vinculado a empresa (`/contatos`) | done |
| 3.3 | Pipeline de Oportunidades: board por estagio (`/pipeline`) | done |
| 3.4 | Criar oportunidade a partir do resultado do diagnostico | done |

FASE 3 concluida.

## FASE 5 - Preparacao de Integracao com IA

Solicitado pelo usuario: preparar a integracao com provedores de IA antes de construir os modulos de IA SDR/Consultor Digital, com uma tela de Configuracoes onde a organizacao cadastra suas proprias chaves de API. Pagina ja linkada no rodape da sidebar (`components/app-sidebar.tsx`): `/configuracoes`.

| # | Tarefa | Status |
|---|--------|--------|
| 5.1 | Configuracoes: integracoes de IA (chaves de API por organizacao) | done |

FASE 5 (preparacao) concluida. Os modulos que efetivamente consomem essas chaves (IA SDR, Consultor Digital) ainda nao foram planejados — ver `docs/ARCHITECTURE.md`.

## Tarefa: 5.1 - Configuracoes (integracoes de IA)

### Objetivo
Implementar a pagina `/configuracoes` (ja linkada na sidebar): permitir que cada organizacao configure, atualize e remova suas proprias chaves de API para os provedores de IA (Anthropic, OpenAI), deixando a integracao pronta para os futuros modulos de IA.

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/SPEC.md`
- `apps/web/components/app-sidebar.tsx`
- `apps/web/app/(app)/empresas/page.tsx` e `company-form-dialog.tsx` (padrao de listagem + dialog de cadastro)
- `apps/web/.env.example`
- `apps/web/prisma/schema.prisma` (models `Organization`)

### Arquivos alterados
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `apps/web/prisma/schema.prisma` (novo model `ApiIntegration` + enum `ApiProvider`)
- `apps/web/.env.example`
- `apps/web/lib/security/crypto.ts` (novo)
- `apps/web/lib/validations/api-integration.ts` (novo)
- `apps/web/app/api/settings/integrations/route.ts` (novo)
- `apps/web/app/api/settings/integrations/[provider]/route.ts` (novo)
- `apps/web/app/(app)/configuracoes/page.tsx` (novo)
- `apps/web/app/(app)/configuracoes/integration-card.tsx` (novo)

### Arquivos proibidos
- Sidebar/layout global (apenas leitura, sem alterar).
- Auth global.
- Empresas, Contatos, Pipeline, Diagnostico, Dashboard e Planos (fora do escopo desta tarefa).

### Reutilizacao
- `auth()` para sessao/tenant.
- `prisma` para persistencia/leitura.
- Componentes UI existentes: Card, Dialog, Badge, Input, Label, Button, SidebarTrigger, Separator.

### Implementacao
- Adicionado o model `ApiIntegration` (com enum `ApiProvider`: `ANTHROPIC`, `OPENAI`) ao schema Prisma, relacionado a `Organization`, com `@@unique([organizationId, provider])`. Alteracao de schema explicitamente solicitada pelo usuario nesta tarefa.
- Executado `npx prisma generate` para atualizar o client (sem banco de dados local disponivel neste ambiente para rodar `migrate dev` — a migration precisa ser criada/aplicada na primeira vez que houver um banco disponivel).
- Criado `lib/security/crypto.ts` com `encryptSecret`/`decryptSecret` (AES-256-GCM, chave derivada via SHA-256 de `INTEGRATION_ENCRYPTION_KEY`) e `maskSecret` (mascara a chave para exibicao).
- Criada validacao Zod `apiIntegrationInputSchema`/`apiIntegrationDeleteSchema`.
- Criadas rotas `GET/POST /api/settings/integrations` (lista mascarada; upsert por organizacao+provedor) e `DELETE /api/settings/integrations/[provider]`.
- Criada pagina Server Component `/configuracoes` com um card por provedor, e `integration-card.tsx` (Client Component) com dialog para salvar a chave e acao de remover.
- Adicionada `INTEGRATION_ENCRYPTION_KEY` ao `.env.example`.

### Criterios de aceite
- Usuario autenticado acessa `/configuracoes` e ve o status (configurado/nao) de cada provedor.
- Usuario consegue salvar, atualizar e remover a chave de cada provedor.
- Chave nunca e exibida em texto puro (nem na API, nem na UI) — apenas mascarada.
- Build passa.

### Teste manual
- Abrir `/configuracoes` sem nenhuma integracao (ambos os cards "Nao configurado").
- Configurar uma chave para Anthropic, confirmar que aparece mascarada apos `router.refresh()`.
- Remover a chave e confirmar que o card volta para "Nao configurado".

### Edge cases
- Sem sessao ou sem organizacao: API retorna 401.
- Chave muito curta ou payload invalido: API retorna 400.
- Remover integracao inexistente: API retorna 404.
- `INTEGRATION_ENCRYPTION_KEY` ausente no ambiente: operacoes de criptografia falham com 500 (erro generico, sem vazar detalhes).

## FASE 6 - IA SDR (Modulo 3)

Solicitado pelo usuario: entre os dois modulos de IA previstos em `docs/ARCHITECTURE.md` (Modulo 3 — IA SDR e Modulo 4 — Consultor Digital), priorizar o IA SDR. Objetivo do modulo: um widget publico onde o lead conversa com a IA (usando a chave Anthropic configurada pela organizacao em `/configuracoes`), a conversa e classificada automaticamente e, quando qualificada, gera Lead/Oportunidade no CRM e notifica o consultor — fechando o funil "Lead acessa widget -> conversa com Claude -> classificacao automatica -> Oportunidade criada no CRM -> consultor notificado" (`docs/ARCHITECTURE.md`).

Quebrado em subtarefas incrementais, cada uma entregavel e testavel isoladamente:

| # | Tarefa | Status |
|---|--------|--------|
| 6.1 | Modelo de conversa do SDR + endpoint de chat com classificacao automatica via IA | done |
| 6.2 | Widget publico embarcavel para o lead conversar (sem autenticacao) | done |
| 6.3 | Conversa qualificada gera Lead/Oportunidade no CRM automaticamente | done |
| 6.4 | Notificar o consultor quando um lead e qualificado | done |

FASE 6 concluida.

## FASE 7 - Consultor Digital (Modulo 4)

Segundo (e ultimo) modulo de IA previsto em `docs/ARCHITECTURE.md`: um assistente de IA que usa o diagnostico e os dados do CRM da organizacao para dar recomendacoes continuas ao consultor, reduzindo o trabalho manual de analise (North Star: "um consultor gerencia 5x mais clientes sem aumentar carga operacional"). Pagina ja linkada na sidebar (`components/app-sidebar.tsx`, grupo "Inteligencia") e ainda nao implementada: `/consultor`.

Ao contrario do IA SDR (conversa publica e generica com um lead), o Consultor Digital e uma conversa **autenticada e contextualizada**: a IA recebe automaticamente um resumo do ultimo diagnostico (`Diagnostic.maturityScore`/`bottlenecks`/`recommendations`) e dos KPIs atuais do CRM (`lib/dashboard/kpis.ts`, ja usado no `/dashboard`) como contexto de cada resposta — sem que o consultor precise copiar/colar esses dados manualmente.

Quebrado em 2 subtarefas incrementais:

| # | Tarefa | Status |
|---|--------|--------|
| 7.1 | Backend: contexto (diagnostico + KPIs) + endpoint de chat autenticado com a IA | done |
| 7.2 | Pagina `/consultor`: chat autenticado consumindo o endpoint da 7.1 | done |

FASE 7 concluida.

## FASE 8 - Dashboard Consultoria / Meus Clientes (Modulo 7)

Ultimo modulo do produto principal ainda nao construido (`docs/ARCHITECTURE.md`, Modulo 7). O item de sidebar "Meus Clientes" (`components/app-sidebar.tsx`, grupo "Consultoria", `href: "/clientes"`) ja existe desde o scaffold inicial (FASE 1) mas nunca teve pagina de destino, e o nome no plural sinaliza a intencao original do produto: o usuario logado e um consultor de uma consultoria de vendas, e cada `Organization` do schema e um **cliente** desse consultor — reflete o North Star do `CLAUDE.md` ("um consultor gerencia 5x mais clientes sem aumentar carga operacional").

Investigacao ao planejar esta fase revelou duas lacunas que bloqueiam essa visao hoje:
- A sessao (`lib/auth.ts`, callback `jwt`) fixa um unico `organizationId` por login (o primeiro `OrganizationMember` encontrado, por `createdAt`) e nunca troca depois disso — apesar do schema ja ser N:N (`User` <-> `Organization` via `OrganizationMember`), nao ha em nenhuma parte do app um mecanismo de trocar a organizacao ativa da sessao.
- Nao existe nenhum fluxo (pagina, API ou seed) que crie uma nova `Organization`/`OrganizationMember` hoje — as unicas linhas existentes no banco foram inseridas manualmente para o usuario demo (nao ha `app/(auth)/register`, API de registro nem seed no repositorio). Ou seja, mesmo depois de resolver a troca de organizacao, um consultor ainda nao teria como adicionar um segundo cliente sem essa peca.

### Decisao de escopo (perguntada ao usuario)
Avaliadas duas abordagens para o Modulo 7: (a) dashboard de engajamento dentro de uma unica organizacao, sem mudar auth, ou (b) visao cross-cliente real (multi-organizacao), que exige a mudanca estrutural descrita acima. Optou-se por (b), alinhado ao North Star do produto e ao item de sidebar "Meus Clientes" (plural) ja existente desde a FASE 1.

### Nota de nomenclatura
`docs/ARCHITECTURE.md` listava o Modulo 7 como "Dashboard Consultoria -> /app/(app)/consultoria"; a rota real ja scaffoldada na sidebar e `/clientes` ("Meus Clientes"). `docs/ARCHITECTURE.md` foi corrigido para refletir a rota real.

Quebrada em 3 subtarefas incrementais e dependentes entre si (cada uma so faz sentido apos a anterior):

| # | Tarefa | Status |
|---|--------|--------|
| 8.1 | Sessao multi-organizacao: trocar a organizacao ativa entre as que o consultor pertence | done |
| 8.2 | Consultor cria uma nova organizacao-cliente (e vira membro dela) | done |
| 8.3 | Pagina "Meus Clientes" (`/clientes`): listagem com metricas resumidas por cliente + acessar (troca a organizacao ativa) | done |

FASE 8 concluida.

## Tarefa: 8.1 - Sessao multi-organizacao (trocar organizacao ativa)

### Objetivo
Dar a fundacao tecnica que falta para o consultor navegar entre as organizacoes-cliente as quais pertence: a sessao (JWT) passa a poder trocar de `organizationId` ativo, sem quebrar nenhuma rota/pagina existente (todas continuam lendo `session.user.organizationId` exatamente como hoje). Sem UI ainda (isso e a tarefa 8.3) — validavel via chamada direta ao endpoint mantendo o cookie de sessao entre as chamadas.

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `apps/web/lib/auth.ts` (sessao JWT atual, `organizationId` fixo desde o login)
- `apps/web/types/next-auth.d.ts` (tipos de `Session`/`JWT`)
- `apps/web/app/api/settings/integrations/[provider]/route.ts` (padrao de rota autenticada + checagem de posse)
- trecho `OrganizationMember` do schema Prisma (`@@unique([organizationId, userId])`)

### Arquivos alterados
- `docs/TASKS.md`
- `docs/CURRENT_STATE.md`
- `CHANGELOG.md`
- `apps/web/lib/auth.ts` (callback `jwt` passa a tratar `trigger === "update"`)
- `apps/web/lib/validations/session-organization.ts` (novo)
- `apps/web/app/api/session/organization/route.ts` (novo)

### Arquivos proibidos
- `apps/web/lib/auth.config.ts` (middleware) — a nova rota ja cai no caso padrao (exige sessao), nao precisou de allowlist.
- `apps/web/types/next-auth.d.ts` — os tipos de `Session`/`JWT` ja cobrem `organizationId`/`role`, nao precisou de alteracao.
- Sidebar/layout global, paginas de `(app)/**` — sem UI nesta tarefa (fica para 8.3).
- Empresas, Contatos, Pipeline, Diagnostico, Dashboard, Planos, Configuracoes, IA SDR, Consultor Digital (fora do escopo; nenhuma dessas rotas foi tocada, todas continuam lendo `session.user.organizationId` sem alteracao).

### Reutilizacao
- `auth()` para validar a sessao atual antes de trocar.
- `prisma.organizationMember` (ja existente) para validar a posse antes de trocar e depois de trocar (checagem em dois pontos, ver Implementacao).
- Mecanismo nativo do NextAuth v5 (`unstable_update`, `trigger: "update"` no callback `jwt`) em vez de inventar um esquema de cookie/token proprio.

### Implementacao
- `lib/auth.ts` exporta `unstable_update` (alem de `handlers`, `auth`, `signIn`, `signOut` ja existentes).
- Callback `jwt` ganhou um segundo bloco, alem do existente (que so roda no login): quando `trigger === "update"` e o payload de `update()` traz `user.organizationId`, o callback **revalida no banco** que existe um `OrganizationMember` para aquele `token.id` + `organizationId` antes de sobrescrever `token.organizationId`/`token.role` — o payload de `update()` vem do cliente, entao a sessao nunca pode confiar nele sem checar a membership (mesmo padrao de "nunca confiar em input sem checar posse" usado em `contacts`/`opportunities`). Se a organizacao nao pertencer ao usuario, o token fica inalterado (sem erro, apenas noop).
- Criada validacao Zod `sessionOrganizationInputSchema` (`organizationId` obrigatorio).
- Criada rota `POST /api/session/organization`: autenticada, valida o payload, confere a posse (`OrganizationMember.findUnique` pelo par `organizationId_userId`) e retorna 404 se o usuario nao pertence aquela organizacao (erro claro para a futura UI da tarefa 8.3); caso pertenca, chama `unstable_update({ user: { organizationId } })`, que reemite o cookie de sessao com o `organizationId` novo.
- Dupla checagem de posse (na rota e dentro do callback `jwt`) e deliberada: a rota da uma resposta HTTP clara (404) para a UI, e o callback e a fronteira de confianca real do token — protege mesmo se `update()` for chamado de outro lugar no futuro.

### Criterios de aceite
- Usuario autenticado, membro de 2+ organizacoes, consegue trocar a organizacao ativa via `POST /api/session/organization` e a sessao (`session.user.organizationId`) reflete a nova organizacao nas chamadas seguintes.
- Tentar trocar para uma organizacao da qual o usuario NAO e membro retorna 404, sem alterar a sessao.
- Nenhuma pagina/rota existente precisou de alteracao — todas continuam funcionando exatamente como antes (`npm run build` passa).
- Sem sessao: 401.

### Teste manual
- Sem banco de dados local disponivel neste ambiente (mesma limitacao ja registrada em `docs/CURRENT_STATE.md`): validado por `npm run build` (typecheck cobre inclusive o compound key `organizationId_userId` do Prisma) e leitura de codigo. Teste manual real (2 `OrganizationMember` para o mesmo usuario, `POST /api/session/organization` mantendo o cookie de sessao, confirmar `GET /api/auth/session` refletindo a troca, e confirmar 404 para uma organizacao alheia) fica pendente para quando houver um banco de desenvolvimento disponivel — mesmo item ja listado em "O Que Falta" de `docs/CURRENT_STATE.md`.

### Edge cases
- Payload sem `organizationId` ou vazio: 400.
- `organizationId` de uma organizacao inexistente ou de outro usuario: 404, sessao inalterada.
- `update()` chamado sem `user.organizationId` no payload (uso futuro para outros campos de sessao): callback nao mexe em `token.organizationId`.
- Usuario com uma unica organizacao tentando "trocar" para a mesma: funciona normalmente (idempotente, apenas reconfirma a posse).

## Tarefa: 8.2 - Consultor cria uma nova organizacao-cliente

### Objetivo
Dar ao consultor uma forma de adicionar um novo cliente ao sistema: criar uma nova `Organization` e virar membro dela imediatamente. Sem isso, a troca de organizacao da tarefa 8.1 nunca teria uma segunda organizacao real para trocar, e "Meus Clientes" (8.3) nunca listaria mais de um cliente — nao existe, em nenhum outro lugar do app, um fluxo que crie `Organization`/`OrganizationMember` (nem pagina de registro, nem seed). Sem UI ainda (isso e a tarefa 8.3) — validavel via chamada direta ao endpoint.

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `apps/web/app/api/session/organization/route.ts` (tarefa 8.1 — padrao de rota autenticada recem-criada nesta mesma fase)
- `apps/web/app/api/companies/route.ts` (padrao de `POST` com validacao Zod)
- trecho `Organization`/`OrganizationMember`/enum `Role` do schema Prisma

### Arquivos alterados
- `docs/TASKS.md`
- `docs/CURRENT_STATE.md`
- `CHANGELOG.md`
- `apps/web/lib/organizations/slug.ts` (novo)
- `apps/web/lib/validations/organization.ts` (novo)
- `apps/web/app/api/organizations/route.ts` (novo)

### Arquivos proibidos
- `apps/web/lib/auth.ts`/`apps/web/lib/auth.config.ts` — a nova rota ja cai no caso padrao do middleware (exige sessao); a sessao nao e trocada automaticamente ao criar (ver Implementacao).
- Sidebar/layout global, paginas de `(app)/**` — sem UI nesta tarefa (fica para 8.3).
- Empresas, Contatos, Pipeline, Diagnostico, Dashboard, Planos, Configuracoes, IA SDR, Consultor Digital (fora do escopo).

### Reutilizacao
- `auth()` para identificar o usuario logado.
- `prisma.organization`/`prisma.organizationMember` (ja existentes no schema desde a FASE 1, nunca usados por nenhuma rota ate agora).
- Nested write do Prisma (`organization.create({ data: { members: { create: {...} } } } })`) para criar `Organization` + `OrganizationMember` na mesma transacao implicita, em vez de duas chamadas separadas.

### Implementacao
- Criado `lib/organizations/slug.ts` com `slugifyOrganizationName(name)`: normaliza acentos (`NFD` + remove diacriticos via `̀-ͯ`), minusculas, troca tudo que nao for alfanumerico por hifen. `Organization.slug` e `@unique` no schema mas nunca e lido por nenhuma rota/pagina hoje — gerado automaticamente a partir do nome, sem pedir ao usuario.
- Criada validacao Zod `organizationInputSchema` (`name` obrigatorio, 2-120).
- Criada rota `POST /api/organizations`: autenticada (401 sem sessao); gera um slug unico (`generateUniqueSlug`, tenta o slug base e, em caso de colisao, ate 5 vezes com um sufixo aleatorio de 6 caracteres via `crypto.randomUUID()`); cria a `Organization` com um `OrganizationMember` aninhado para o usuario logado.
- **Decisao de role:** o membro criado recebe `role: "CONSULTANT"`, nao `ADMIN` como o titulo original da tarefa sugeria. O enum `Role` (`OWNER`/`ADMIN`/`CONSULTANT`/`MEMBER`) ja existia no schema desde a FASE 1 mas nunca foi usado por nenhuma logica do app (`role` e apenas armazenado/exibido, nunca checado em nenhum `if`) — `CONSULTANT` e semanticamente o valor correto para "um consultor que passa a gerenciar uma organizacao-cliente", entao a implementacao usa o valor mais correto do enum ja existente em vez do que foi escrito de forma imprecisa no planejamento da fase.
- **Decisao deliberada:** a rota NAO troca a organizacao ativa da sessao automaticamente. Criar organizacao (8.2) e trocar de organizacao (8.1) ficam como operacoes separadas e componiveis — a futura UI (8.3) pode encadear "criar" -> `POST /api/session/organization` (8.1) -> redirecionar, sem que 8.2 precise saber de sessao/JWT.

### Criterios de aceite
- Usuario autenticado consegue criar uma nova organizacao informando apenas o nome, via `POST /api/organizations`, e passa a ser `OrganizationMember` (`role = CONSULTANT`) dela imediatamente.
- Duas organizacoes com o mesmo nome nao colidem (`slug` gerado com sufixo unico quando necessario).
- Sem sessao: 401. Nome vazio ou muito curto: 400.
- A organizacao ativa da sessao (`session.user.organizationId`) NAO muda ao criar uma nova organizacao (fica para a UI da tarefa 8.3 decidir se troca, via 8.1).
- Build passa.

### Teste manual
- Sem banco de dados local disponivel neste ambiente (mesma limitacao ja registrada em `docs/CURRENT_STATE.md`): validado por `npm run build` e leitura de codigo. Teste manual real (criar 2 organizacoes com o mesmo nome e confirmar slugs distintos; confirmar o `OrganizationMember` criado com `role = CONSULTANT`; encadear com `POST /api/session/organization` da tarefa 8.1 para trocar para a organizacao recem-criada) fica pendente para quando houver um banco de desenvolvimento disponivel.

### Edge cases
- Nome com apenas caracteres especiais/acentos (ex: "___"): `slugifyOrganizationName` cai no fallback `"organizacao"` em vez de gerar um slug vazio.
- Nome repetido varias vezes seguidas: cada tentativa gera um sufixo aleatorio novo; apos 5 tentativas malsucedidas (extremamente improvavel), usa um ultimo sufixo aleatorio sem checar novamente.
- Payload sem `name`: 400, sem criar nada no banco.

## Tarefa: 8.3 - Pagina "Meus Clientes"

### Objetivo
Fechar a FASE 8: implementar `/clientes` (ja linkada na sidebar desde a FASE 1, grupo "Consultoria", ate entao sem destino) como a visao cross-cliente do consultor — lista todas as organizacoes das quais ele e membro, com metricas resumidas por cliente, um botao para acessar cada uma (trocando a organizacao ativa via 8.1) e um formulario para adicionar um novo cliente (via 8.2). Com isso, o fluxo completo do Modulo 7 fica utilizavel de ponta a ponta pela primeira vez.

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `apps/web/app/api/session/organization/route.ts` (tarefa 8.1) e `apps/web/app/api/organizations/route.ts` (tarefa 8.2) — contratos consumidos pela pagina
- `apps/web/app/(app)/planos/page.tsx` e `action-plan-form-dialog.tsx` (padrao de listagem Server Component + dialog client-side de criacao)
- `apps/web/app/(app)/dashboard/page.tsx` (`getExecutiveKpis`, formatacao de moeda)
- `apps/web/components/app-sidebar.tsx` (item "Meus Clientes" ja existente, `href: "/clientes"`)
- trecho `OrganizationMember`/`Organization`/`Diagnostic`/`ActionTask`/enum `Role`/`TaskStatus` do schema Prisma

### Arquivos alterados
- `docs/TASKS.md`
- `docs/CURRENT_STATE.md`
- `CHANGELOG.md`
- `apps/web/lib/organizations/client-summary.ts` (novo)
- `apps/web/app/(app)/clientes/page.tsx` (novo)
- `apps/web/app/(app)/clientes/client-access-button.tsx` (novo)
- `apps/web/app/(app)/clientes/new-client-dialog.tsx` (novo)

### Arquivos proibidos
- Sidebar/layout global — o item "Meus Clientes" ja existia, so passou a ter pagina de destino.
- Schema Prisma.
- `apps/web/app/api/session/organization/route.ts` (8.1) e `apps/web/app/api/organizations/route.ts` (8.2) — apenas consumidas, nao alteradas.
- Empresas, Contatos, Pipeline, Diagnostico, Dashboard, Planos, Configuracoes, IA SDR, Consultor Digital (fora do escopo; `getExecutiveKpis` e apenas reutilizado).

### Reutilizacao
- `auth()` para sessao/usuario (mesmo padrao de `/configuracoes`, `/consultor`).
- `getExecutiveKpis` de `lib/dashboard/kpis.ts` (ja usado no `/dashboard`), chamado uma vez por organizacao do consultor.
- Componentes UI existentes: Card, Table, Dialog, Badge, Input, Label, Button, SidebarTrigger, Separator.
- Padrao de dialog client-side com `fetch` + estado de erro sem perder o texto digitado, ja validado em `action-plan-form-dialog.tsx`/`contact-form-dialog.tsx`.
- `POST /api/session/organization` (8.1) e `POST /api/organizations` (8.2), encadeados no client (criar -> trocar -> redirecionar), sem que nenhuma das duas rotas precise saber da outra.

### Implementacao
- Criado `lib/organizations/client-summary.ts` com `getConsultantClients(userId)`: busca todos os `OrganizationMember` do usuario (com a `Organization`) e, para cada um, roda em paralelo `getExecutiveKpis`, o `Diagnostic` mais recente (`maturityScore`) e a contagem de `ActionTask` (total e `DONE`) da organizacao — devolve `{ organizationId, name, role, maturityScore, pipelineTotal, tasksDone, tasksTotal }` por cliente.
- Criada a pagina `/clientes` (Server Component): busca a sessao e `getConsultantClients`, renderiza uma tabela (cliente, papel, maturidade, pipeline, progresso do plano de acao, acesso) com estado vazio quando o consultor ainda nao tem nenhuma organizacao.
- Criado `client-access-button.tsx` (Client Component): por linha, chama `POST /api/session/organization` e redireciona para `/dashboard`; a organizacao atualmente ativa (`session.user.organizationId`) mostra um badge "Ativa" no lugar do botao, em vez de permitir "acessar" a organizacao em que o consultor ja esta.
- Criado `new-client-dialog.tsx` (Client Component): formulario com o nome do cliente, chama `POST /api/organizations` (8.2) e, em caso de sucesso, encadeia `POST /api/session/organization` (8.1) com o `id` retornado para ja entrar na organizacao recem-criada e redireciona para `/dashboard`; se a criacao falhar, mantem o dialog aberto com o erro e o texto digitado; se so a troca falhar, fecha o dialog e atualiza a listagem (o cliente foi criado, so nao trocou automaticamente).

### Criterios de aceite
- Consultor autenticado acessa `/clientes` e ve todas as organizacoes das quais e membro, com metricas resumidas por cliente.
- Organizacao atualmente ativa aparece com badge "Ativa" em vez de botao de acesso.
- Botao "Acessar" em outra organizacao troca a organizacao ativa e leva ao `/dashboard` daquele cliente.
- Formulario "Novo cliente" cria uma organizacao, o consultor vira membro dela e e levado direto ao `/dashboard` da organizacao recem-criada.
- Consultor sem nenhuma organizacao ainda: pagina mostra estado vazio com CTA para criar o primeiro cliente.
- Build passa.

### Teste manual
- Sem banco de dados local disponivel neste ambiente (mesma limitacao ja registrada em `docs/CURRENT_STATE.md`): validado por `npm run build` e leitura de codigo. Teste manual real (acessar `/clientes` com 2+ organizacoes, confirmar metricas corretas por cliente, trocar de organizacao pelo botao "Acessar" e confirmar o `/dashboard` refletindo o cliente certo, criar um novo cliente pelo dialog e confirmar que cai nele automaticamente) fica pendente para quando houver um banco de desenvolvimento disponivel.

### Edge cases
- Consultor sem nenhuma organizacao: lista vazia, sem erro.
- Cliente sem diagnostico: coluna de maturidade mostra "Sem diagnostico" em vez de `0/100` (evita confundir "sem dado" com "nota zero").
- Cliente sem nenhum plano de acao: coluna de plano mostra "Sem plano de acao" em vez de `0/0`.
- Falha ao trocar de organizacao (ex: `OrganizationMember` removido entre o carregamento da pagina e o clique): erro exibido inline no botao, sem navegar.

## Tarefa: 7.2 - Pagina do Consultor Digital

### Objetivo
Implementar a pagina `/consultor` (ja linkada na sidebar, grupo "Inteligencia", ate entao sem destino): interface de chat autenticada consumindo o backend da tarefa 7.1.

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/SPEC.md`
- `apps/web/app/api/consultor/messages/route.ts` (tarefa 7.1 — contrato consumido pela pagina)
- `apps/web/app/sdr/[organizationId]/chat-widget.tsx` (tarefa 6.2 — padrao de UI de chat ja usado no projeto)
- `apps/web/app/(app)/configuracoes/page.tsx` (padrao de pagina autenticada que le `ApiIntegration` diretamente via Prisma)

### Arquivos alterados
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `apps/web/app/(app)/consultor/page.tsx` (novo)
- `apps/web/app/(app)/consultor/consultant-chat.tsx` (novo)

### Arquivos proibidos
- Sidebar/layout global.
- Schema Prisma.
- Rotas/paginas do IA SDR — apenas lidas como referencia de padrao, nao alteradas.
- `/api/consultor/messages` (tarefa 7.1) — apenas consumida, nao alterada.
- Empresas, Contatos, Pipeline, Diagnostico, Dashboard, Planos e Configuracoes (fora do escopo desta tarefa).

### Reutilizacao
- `auth()` e `prisma` para ler a conversa existente e o status da integracao Anthropic diretamente na Server Component (mesmo padrao de `/configuracoes`), evitando uma chamada `GET` extra do client no primeiro load.
- `POST /api/consultor/messages` (tarefa 7.1) para enviar mensagens.
- Componentes UI existentes: Card, Button, Input, ScrollArea.
- Padrao de chat client-side ja validado em `chat-widget.tsx` (tarefa 6.2): mensagem otimista local, `fetch` para o endpoint, tratamento de erro sem perder o texto digitado.
- Paleta SalesOS (`#1E1B3A` + `#D4A64F`).

### Implementacao
- Criada a pagina `app/(app)/consultor/page.tsx` (Server Component): busca `auth()`, o historico existente via `prisma.consultantConversation.findUnique` e o status da integracao Anthropic via `prisma.apiIntegration.findUnique`, repassando ambos para `ConsultantChat`.
- Criado `consultant-chat.tsx` (Client Component): quando `hasIntegration` e falso, mostra uma tela dedicada com link para `/configuracoes` (diferente do widget do IA SDR — aqui o proprio consultor pode resolver, entao o CTA leva direto a acao); caso contrario, renderiza o chat (historico + input), com mensagem otimista do usuario e `POST /api/consultor/messages` para obter a resposta da IA.

### Criterios de aceite
- Usuario autenticado acessa `/consultor` e ve o historico existente da conversa da organizacao (ou estado vazio, se ainda nao houver).
- Consultor envia uma mensagem e ve a resposta contextualizada da IA aparecer no chat.
- Organizacao sem integracao Anthropic configurada: pagina mostra CTA para `/configuracoes` em vez do chat.
- Build passa.

### Teste manual
- Acessar `/consultor` sem integracao Anthropic configurada e confirmar o CTA para `/configuracoes`.
- Configurar a integracao, voltar a `/consultor`, enviar uma pergunta e confirmar a resposta da IA no chat.
- Recarregar a pagina e confirmar que o historico da conversa persiste.

### Edge cases
- Organizacao sem diagnostico/KPIs relevantes: chat funciona normalmente (contexto mais enxuto, tratado no backend da 7.1).
- Erro ao enviar mensagem (502/500 do backend): mensagem de erro local, sem perder o texto ja digitado nem duplicar o envio.
- Mensagem vazia: botao de enviar desabilitado.

## Tarefa: 7.1 - Backend do Consultor Digital (contexto + chat autenticado)

### Objetivo
Criar o backend que permite ao consultor logado conversar com a IA (Anthropic) configurada em `/configuracoes`, com cada resposta contextualizada automaticamente pelo ultimo diagnostico e pelos KPIs atuais da organizacao. Uma unica conversa continua por organizacao (nao por lead, como no IA SDR) — reflete o uso real: um historico estrategico crescente com o "consultor digital" daquela conta. Sem UI ainda (isso e a tarefa 7.2) — validavel via chamada direta ao endpoint.

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/SPEC.md`
- `apps/web/lib/ai/anthropic-client.ts` (tarefa 6.1 — cliente Anthropic existente, especifico do IA SDR ate aqui)
- `apps/web/app/api/sdr/[organizationId]/conversations/[conversationId]/messages/route.ts` (padrao de chat com IA + persistencia de historico)
- `apps/web/lib/dashboard/kpis.ts` (`getExecutiveKpis`, ja usado no `/dashboard`, reaproveitado como contexto)
- `apps/web/app/api/diagnosticos/[id]/plano/route.ts` (padrao de leitura do ultimo `Diagnostic` da organizacao)
- trecho `Organization`/`Diagnostic`/`ApiIntegration` do schema Prisma

### Arquivos alterados
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `apps/web/prisma/schema.prisma` (novos models `ConsultantConversation` (`@@unique([organizationId])`, uma por organizacao) e `ConsultantMessage` + enum `ConsultantMessageRole` (`USER`/`ASSISTANT`) — requer aprovacao explicita do usuario antes de alterar, como nas tarefas anteriores de schema)
- `apps/web/lib/ai/anthropic-client.ts` (nova funcao `generateConsultantReply`, resposta livre em texto — sem forcar tool/classificacao como no IA SDR)
- `apps/web/lib/validations/consultant-message.ts` (novo)
- `apps/web/app/api/consultor/messages/route.ts` (novo: `GET` retorna o historico da conversa da organizacao, `POST` envia uma mensagem e recebe a resposta contextualizada)

### Arquivos proibidos
- Sidebar/layout global (apenas leitura, sem alterar).
- Rotas/paginas do IA SDR (`/sdr`, `/api/sdr/**`) — apenas lidas como referencia de padrao, nao alteradas.
- Empresas, Contatos, Pipeline, Diagnostico, Dashboard, Planos e Configuracoes (fora do escopo desta tarefa; `Diagnostic` e os KPIs sao apenas lidos via Prisma/`getExecutiveKpis`).

### Reutilizacao
- `auth()` para sessao/tenant (rota autenticada, ao contrario do IA SDR).
- `prisma` para persistencia/leitura.
- `decryptSecret` de `lib/security/crypto.ts` para a chave Anthropic da organizacao.
- `getExecutiveKpis` de `lib/dashboard/kpis.ts` para o resumo de CRM no contexto.
- Estrutura do cliente Anthropic (`fetch` + `tool_choice`/texto livre) ja validada em `lib/ai/anthropic-client.ts`.

### Implementacao
- Adicionados os models `ConsultantConversation` (`@@unique([organizationId])`, uma conversa continua por organizacao) e `ConsultantMessage` (+ enum `ConsultantMessageRole`: `USER`/`ASSISTANT`) ao schema Prisma, relacionados a `Organization`. Alteracao de schema explicitamente solicitada pelo usuario ao pedir a execucao desta tarefa. `npx prisma generate` executado (sem banco local disponivel para `migrate dev`).
- Adicionada `generateConsultantReply` a `lib/ai/anthropic-client.ts`: usa o modelo `claude-sonnet-5` (mais robusto que o `claude-haiku-4-5-20251001` do IA SDR, adequado ao raciocinio estrategico do consultor) e resposta em texto livre (sem `tool_choice` forcado, diferente do IA SDR).
- Criada validacao Zod `consultantMessageInputSchema` (conteudo obrigatorio, 1-4000 chars).
- Criada rota `GET/POST /api/consultor/messages` (autenticada, isolada por `organizationId` da sessao): `GET` retorna o historico da conversa da organizacao (vazio se ainda nao existir); `POST` faz upsert da `ConsultantConversation` (uma por organizacao), monta o contexto (`buildContext`: ultimo `Diagnostic` + `getExecutiveKpis`), chama a IA com o historico completo e persiste a mensagem do usuario + a resposta da IA.

### Criterios de aceite
- Usuario autenticado com `organizationId` consegue enviar uma mensagem para `POST /api/consultor/messages` e recebe uma resposta da IA que reflete o ultimo diagnostico e os KPIs atuais da organizacao (ex: cita a nota de maturidade ou um gargalo real quando perguntado).
- Organizacao sem diagnostico ainda: endpoint funciona normalmente, apenas sem esse trecho do contexto (sem erro).
- Organizacao sem integracao Anthropic configurada: 422, sem chamar a IA.
- Sem sessao/organizacao: 401.
- Historico da conversa persistido e reaproveitado (uma conversa por organizacao) em chamadas seguintes.
- Build passa.

### Teste manual
- Com uma organizacao com diagnostico + chave Anthropic configurados, enviar uma pergunta generica (ex: "o que devo priorizar?") via REST client e confirmar que a resposta referencia dados reais da organizacao.
- Repetir sem diagnostico cadastrado e confirmar resposta ainda assim util (sem quebrar).
- Repetir sem integracao Anthropic e confirmar 422.

### Edge cases
- Organizacao sem `Diagnostic`: contexto de diagnostico omitido, sem erro.
- Organizacao sem `ApiIntegration` Anthropic: 422.
- Mensagem vazia: 400.
- Erro da API da Anthropic: 502, sem expor detalhes do provedor (mesmo padrao do IA SDR).

## Tarefa: 6.4 - Notificar o consultor quando um lead e qualificado

### Objetivo
Dar visibilidade in-app ao consultor quando o IA SDR qualifica um lead (`HOT`), fechando o ultimo trecho do funil descrito em `docs/ARCHITECTURE.md`. Sem infraestrutura de email/push no projeto ainda, a notificacao desta tarefa e in-app: um contador na sidebar + uma pagina autenticada listando as conversas do IA SDR, reaproveitando o item "IA SDR" que ja existe (mas ainda nao tinha destino) em `components/app-sidebar.tsx` (`href: "/sdr"`), conforme o modulo ja previsto em `docs/ARCHITECTURE.md` (`Modulo 3 — IA SDR → /app/(app)/sdr`).

### Nota (ajuste necessario ao middleware)
A rota publica do widget (`/sdr/[organizationId]`, tarefa 6.2) e a nova pagina autenticada do consultor (`/sdr`) compartilham o mesmo prefixo. O allowlist do middleware adicionado na 6.2 (`nextUrl.pathname.startsWith("/sdr")`) precisa ser restrito para `"/sdr/"` (com barra), publicando apenas as subrotas com `organizationId` e mantendo `/sdr` (exato) protegido por sessao como qualquer pagina de `(app)`.

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/SPEC.md`
- `apps/web/lib/auth.config.ts` (allowlist ajustado na 6.2)
- `apps/web/components/app-sidebar.tsx` (item "IA SDR" ja existente, sem pagina)
- `apps/web/app/(app)/layout.tsx` (layout autenticado, hoje sem dados)
- `apps/web/app/(app)/empresas/page.tsx` e `apps/web/app/(app)/pipeline/page.tsx` (padrao de pagina autenticada + header)
- trecho `SdrConversation` do schema Prisma

### Arquivos alterados
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `apps/web/prisma/schema.prisma` (novo campo `consultantSeenAt DateTime?` em `SdrConversation` — requer aprovacao explicita do usuario antes de alterar, como nas tarefas anteriores de schema)
- `apps/web/lib/auth.config.ts` (allowlist `/sdr/` em vez de `/sdr`)
- `apps/web/lib/sdr/notifications.ts` (novo)
- `apps/web/app/(app)/layout.tsx` (passa a buscar sessao + contador de leads qualificados nao vistos)
- `apps/web/components/app-sidebar.tsx` (badge de contagem no item "IA SDR")
- `apps/web/app/(app)/sdr/page.tsx` (novo)

### Arquivos proibidos
- Schema Prisma alem do campo `consultantSeenAt` acima.
- Empresas, Contatos, Pipeline, Diagnostico, Dashboard, Planos e Configuracoes (fora do escopo desta tarefa; `Opportunity` e apenas referenciada via link para `/pipeline`).
- Endpoints publicos do IA SDR (tarefas 6.1/6.3) — apenas lidos, nao alterados.

### Reutilizacao
- `auth()` para sessao/tenant na pagina `/sdr` e no layout autenticado.
- `prisma` para persistencia/leitura.
- Componentes UI existentes: Card, Table, Badge, Separator, SidebarTrigger.
- Paleta SalesOS (`#1E1B3A` + `#D4A64F`).

### Implementacao
- Adicionado o campo `consultantSeenAt DateTime?` a `SdrConversation`. Alteracao de schema explicitamente solicitada pelo usuario ao pedir a execucao desta tarefa. `npx prisma generate` executado (sem banco local disponivel para `migrate dev`).
- Ajustado o allowlist do middleware (`lib/auth.config.ts`) de `/sdr` para `/sdr/` (com barra): agora apenas as subrotas com `organizationId` (o widget publico) sao publicas; `/sdr` (exato, a nova pagina do consultor) volta a exigir sessao como qualquer rota de `(app)`.
- Criado `lib/sdr/notifications.ts` com `getUnseenQualifiedLeadsCount(organizationId)` (conta conversas `HOT` com `consultantSeenAt` nulo) e `markQualifiedLeadsSeen(organizationId)` (`updateMany` idempotente).
- `app/(app)/layout.tsx` passou a ser assincrono: busca sessao + `getUnseenQualifiedLeadsCount` e repassa como prop `qualifiedLeadsCount` para `AppSidebar`.
- `components/app-sidebar.tsx` passou a aceitar `qualifiedLeadsCount` e exibe um badge dourado com a contagem no item "IA SDR" (`href: "/sdr"`) quando maior que zero.
- Criada a pagina autenticada `app/(app)/sdr/page.tsx` (reaproveitando o item de sidebar ja existente, ate entao sem destino): lista as `SdrConversation` da organizacao (lead, classificacao, ultima mensagem, contagem de mensagens, atualizada em) e, ao carregar, chama `markQualifiedLeadsSeen` — o badge some na proxima navegacao.

### Criterios de aceite
- Item "IA SDR" na sidebar mostra um badge com a contagem de conversas `HOT` ainda nao vistas pelo consultor (0 = sem badge).
- Pagina `/sdr` (autenticada) lista as conversas do IA SDR da organizacao (lead, classificacao, ultima mensagem, se gerou Lead/Oportunidade) e, ao ser carregada, marca as conversas `HOT` como vistas (o badge some).
- `/sdr` sem sessao/organizacao: lista vazia (mesmo padrao de `/empresas`, `/pipeline`), sem vazar dados de outra organizacao.
- `/sdr/[organizationId]` (widget publico, tarefa 6.2) continua acessivel sem login.
- Build passa.

### Teste manual
- Com uma conversa `HOT` existente, acessar o app autenticado e conferir o badge no item "IA SDR" da sidebar.
- Clicar em "IA SDR", conferir a conversa na lista e que o badge desaparece ao recarregar a sidebar.
- Acessar `/sdr/<organizationId>` (widget) sem estar logado e confirmar que continua funcionando normalmente.

### Edge cases
- Organizacao sem nenhuma conversa do IA SDR: pagina `/sdr` mostra estado vazio, sem badge na sidebar.
- Conversa que nunca chegou a `HOT`: nao conta para o badge, mas aparece na listagem (classificacao Frio/Morno).
- Duas abas abertas simultaneamente: a segunda a visitar `/sdr` nao encontra mais conversas para marcar como vistas (idempotente via `updateMany` condicional).

## Tarefa: 6.3 - Conversa qualificada gera Lead/Oportunidade no CRM automaticamente

### Objetivo
Quando uma conversa do IA SDR for classificada como `HOT` (pronto para falar com um consultor/comprar), gerar automaticamente um `Lead` e uma `Opportunity` no CRM da organizacao, fechando o trecho "classificacao automatica -> Oportunidade criada no CRM" do funil descrito em `docs/ARCHITECTURE.md`.

### Decisao de escopo
"Qualificada" = classificacao `HOT` (a mais alta das 3 definidas em `lib/ai/anthropic-client.ts`). `COLD`/`WARM` nao geram registros no CRM nesta tarefa — evita popular o CRM com curiosos ainda em exploracao.

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/SPEC.md`
- `apps/web/app/api/sdr/[organizationId]/conversations/[conversationId]/messages/route.ts` (tarefa 6.1)
- `apps/web/app/api/diagnosticos/[id]/oportunidade/route.ts` e `lib/diagnostico/opportunity-marker.ts` (padrao de idempotencia find-or-create ja usado)
- `apps/web/lib/diagnostico/action-plan-id.ts` (padrao de id deterministico para idempotencia sem alterar schema)
- trecho `Lead`/`Opportunity`/enum `LeadStatus` do schema Prisma

### Arquivos alterados
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `apps/web/lib/sdr/lead-id.ts` (novo, ids deterministicos de idempotencia)
- `apps/web/app/api/sdr/[organizationId]/conversations/[conversationId]/messages/route.ts`

### Arquivos proibidos
- Sidebar/layout global.
- Auth global (alem do que ja foi ajustado na 6.2).
- Schema Prisma.
- Empresas, Contatos, Pipeline, Diagnostico, Dashboard, Planos e Configuracoes (fora do escopo desta tarefa; `Lead`/`Opportunity` sao apenas reutilizados via Prisma).

### Reutilizacao
- `prisma` para persistencia/leitura, reaproveitando os models `Lead` e `Opportunity` ja usados no CRM (3.x).
- Padrao de idempotencia via id deterministico sem alterar schema, ja usado em `lib/diagnostico/action-plan-id.ts` (4.3).

### Implementacao
- Criado `lib/sdr/lead-id.ts` com `sdrLeadId(conversationId)` e `sdrOpportunityId(conversationId)`, gerando ids deterministicos (`lead-sdr-<conversationId>`, `opportunity-sdr-<conversationId>`) para idempotencia sem alterar o schema — mesmo padrao de `lib/diagnostico/action-plan-id.ts` (4.3).
- `POST /api/sdr/[organizationId]/conversations/[conversationId]/messages` ganhou `qualifyLead()`: apos atualizar `SdrConversation.classification`, se o resultado for `HOT`, verifica se o Lead deterministico ja existe (idempotencia) e, caso nao exista, cria o `Lead` (`status = QUALIFIED`, `source = "IA SDR"`, `score = 80`, nome/email/telefone vindos da conversa) e a `Opportunity` vinculada (`stage` inicial `PROSPECTING`, default do schema).
- A chamada a `qualifyLead()` fica em um `try/catch` isolado: uma falha ao gravar no CRM nao impede a resposta da IA ao lead; a proxima mensagem classificada `HOT` tenta novamente (o Lead ainda nao existiria).

### Criterios de aceite
- Ao receber uma resposta classificada como `HOT` pela primeira vez em uma conversa, o backend cria um `Lead` (`status = QUALIFIED`, `source = "IA SDR"`) e uma `Opportunity` vinculada (`stage` inicial `PROSPECTING`, default do schema) na organizacao da conversa.
- Novas mensagens na mesma conversa (mesmo se a classificacao continuar `HOT`) nao duplicam o Lead nem a Oportunidade.
- Falha ao criar o Lead/Oportunidade nao derruba a resposta do chat ao lead (efeito colateral nao-critico).
- Build passa.

### Teste manual
- Conversar com o widget ate a IA classificar como `HOT`; confirmar que um novo Lead e uma nova Oportunidade aparecem em `/contatos`... (Lead nao tem tela dedicada ainda) e `/pipeline`, respectivamente.
- Continuar a conversa apos a qualificacao e confirmar que nao ha duplicacao de Lead/Oportunidade.

### Edge cases
- Conversa sem `leadName` informado: Lead criado com nome generico ("Lead do IA SDR").
- Classificacao oscila entre `HOT` e `WARM` ao longo da conversa: Lead/Oportunidade sao criados apenas na primeira vez que `HOT` e atingido.
- Erro ao gravar Lead/Oportunidade (ex: banco indisponivel no momento): a resposta da IA ainda e retornada ao lead; a sincronizacao com o CRM fica pendente para a proxima mensagem que atingir `HOT` novamente (nao ha retry automatico nesta tarefa).

## Tarefa: 6.2 - Widget publico embarcavel para o lead conversar

### Objetivo
Criar uma pagina publica (`/sdr/[organizationId]`) onde o lead efetivamente conversa com a IA configurada pela organizacao, consumindo os endpoints da tarefa 6.1. Precisa ser acessivel sem login (para ser embutida no site da organizacao, ex: via `iframe`).

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/SPEC.md`
- `apps/web/proxy.ts` e `apps/web/lib/auth.config.ts` (middleware global de protecao de rotas)
- `apps/web/app/api/sdr/[organizationId]/conversations/route.ts` e `.../messages/route.ts` (contratos consumidos pelo widget)
- `apps/web/app/(app)/diagnostico/wizard.tsx` (padrao de componente client com estados de loading/erro)
- `apps/web/app/layout.tsx` (root layout, sem auth)

### Arquivos alterados
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `apps/web/lib/auth.config.ts` (allowlist de rotas publicas no middleware — ver "Nota" abaixo)
- `apps/web/app/sdr/[organizationId]/page.tsx` (novo)
- `apps/web/app/sdr/[organizationId]/chat-widget.tsx` (novo)

### Nota (bug encontrado ao iniciar esta tarefa)
O middleware global (`lib/auth.config.ts`, `callbacks.authorized`) bloqueia hoje **todas** as rotas exceto `/login`, `/register` e `/api/auth/*` para quem nao tem sessao — ou seja, os endpoints "publicos" `/api/sdr/**` criados na tarefa 6.1 na pratica exigiam login, o que quebra o proposito do widget. Corrigir isso (allowlist de `/sdr` e `/api/sdr`) faz parte desta tarefa; e a unica excecao ao "Arquivos proibidos: Auth global" das tarefas anteriores, estritamente para tornar as rotas do IA SDR de fato publicas.

### Arquivos proibidos
- Sidebar/layout da area autenticada (`app/(app)/**`).
- Schema Prisma.
- Rotas de autenticacao (`lib/auth.ts`, providers) alem do ajuste pontual de allowlist acima.
- Empresas, Contatos, Pipeline, Diagnostico, Dashboard, Planos e Configuracoes (fora do escopo desta tarefa).

### Reutilizacao
- `prisma` apenas para validar que a organizacao existe (nome exibido no widget) — sem `auth()`.
- Endpoints `POST /api/sdr/[organizationId]/conversations` e `.../messages` da tarefa 6.1.
- Componentes UI existentes: Card, Button, Input, Badge, ScrollArea.
- Paleta SalesOS (`#1E1B3A` + `#D4A64F`, ver `CLAUDE.md`).

### Implementacao
- Adicionado allowlist de `/sdr` e `/api/sdr` no `callbacks.authorized` de `lib/auth.config.ts`, corrigindo o bug descrito na "Nota" acima (as rotas do IA SDR estavam de fato bloqueadas para quem nao tinha sessao).
- Criada pagina publica `app/sdr/[organizationId]/page.tsx` (Server Component, sem `auth()`): valida que a organizacao existe via `prisma.organization.findUnique` (404 caso contrario) e renderiza o widget.
- Criado `chat-widget.tsx` (Client Component): mantem `conversationId`/historico local; na primeira mensagem, chama `POST /api/sdr/[organizationId]/conversations` (`ensureConversation`) e em seguida `POST .../messages`; exibe a resposta da IA e um badge com a classificacao (Frio/Morno/Quente); trata 422 (integracao ausente) como tela de "Atendimento indisponivel" e outros erros como mensagem local, sem perder o texto digitado.

### Criterios de aceite
- `/sdr/[organizationId]` acessivel sem sessao/login, para uma organizacao com integracao Anthropic configurada.
- Lead consegue enviar mensagens e ver as respostas da IA em uma janela de chat.
- Primeira mensagem enviada cria a conversa automaticamente (sem etapa extra obrigatoria).
- Organizacao inexistente: pagina retorna 404.
- Organizacao sem integracao Anthropic: widget exibe mensagem de indisponibilidade (sem quebrar).
- Build passa.

### Teste manual
- Acessar `/sdr/<organizationId-valido>` sem estar logado, enviar uma mensagem e confirmar resposta da IA + atualizacao de classificacao.
- Acessar `/sdr/<organizationId-invalido>` e confirmar 404.
- Acessar `/sdr/<organizationId-sem-integracao>` e confirmar mensagem de indisponibilidade.

### Edge cases
- Erro de rede/IA durante o envio: mensagem de erro local, sem perder o texto digitado.
- Mensagem vazia: botao de enviar desabilitado.
- Reload da pagina: nova conversa e iniciada (sem persistencia de conversationId no client nesta tarefa — fora de escopo do MVP).

## Tarefa: 6.1 - Modelo de conversa do SDR + endpoint de chat com classificacao automatica

### Objetivo
Criar a base de dados e o endpoint que permitem a um lead conversar com a IA (Anthropic) configurada pela organizacao em `/configuracoes`, com cada conversa sendo classificada automaticamente (ex: temperatura/qualificacao do lead) ao final de cada mensagem. Sem UI de widget ainda (isso e a tarefa 6.2) — esta tarefa fecha o backend e pode ser validada via chamada direta ao endpoint (ex: script/REST client).

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/SPEC.md`
- `apps/web/app/api/settings/integrations/route.ts` e `apps/web/lib/security/crypto.ts` (como ler/descriptografar a chave de IA da organizacao)
- `apps/web/lib/validations/api-integration.ts`
- trecho `Organization`/`ApiIntegration`/enum `ApiProvider` do schema Prisma
- `apps/web/app/api/diagnosticos/route.ts` (padrao de rota autenticada vs. publica — aqui o endpoint de chat precisa ser acessivel sem sessao de usuario, apenas identificando a organizacao dona do widget)

### Arquivos alterados
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `apps/web/prisma/schema.prisma` (novos models `SdrConversation`/`SdrMessage` + enum de classificacao — requer aprovacao explicita do usuario antes de alterar, como nas tarefas anteriores de schema)
- `apps/web/lib/validations/sdr-conversation.ts` (novo)
- `apps/web/lib/ai/anthropic-client.ts` (novo, cliente fino para chamar a Anthropic com a chave descriptografada da organizacao)
- `apps/web/app/api/sdr/[organizationId]/conversations/route.ts` (novo, inicia conversa)
- `apps/web/app/api/sdr/[organizationId]/conversations/[conversationId]/messages/route.ts` (novo, envia mensagem do lead e recebe resposta classificada da IA)

### Arquivos proibidos
- Sidebar/layout global.
- Auth global (este endpoint e deliberadamente publico/sem sessao de usuario, mas nao deve reutilizar nem modificar `lib/auth.ts`).
- Empresas, Contatos, Pipeline, Diagnostico, Dashboard, Planos e Configuracoes (fora do escopo desta tarefa; `ApiIntegration` e apenas lido, nao alterado).

### Reutilizacao
- `prisma` para persistencia/leitura.
- `decryptSecret` de `lib/security/crypto.ts` para obter a chave de IA em texto puro apenas no momento da chamada ao provedor (nunca retornada na resposta da API).
- Model `ApiIntegration` (5.1) para saber se a organizacao tem uma chave Anthropic configurada.

### Implementacao
- Adicionados os models `SdrConversation` e `SdrMessage` (+ enums `SdrLeadTemperature`: `COLD`/`WARM`/`HOT` e `SdrMessageRole`: `LEAD`/`ASSISTANT`) ao schema Prisma, relacionados a `Organization`. Alteracao de schema explicitamente solicitada pelo usuario ao pedir a execucao desta tarefa. Executado `npx prisma generate` (sem banco local disponivel neste ambiente para `migrate dev`).
- Criado `lib/ai/anthropic-client.ts`: chama `https://api.anthropic.com/v1/messages` via `fetch` (sem SDK adicional), usando `tool_choice` forcado para obter sempre `{ reply, classification }` estruturado do modelo `claude-haiku-4-5-20251001`. Classificacao fora do enum esperado e normalizada para `COLD` em vez de falhar.
- Criada validacao Zod `sdrStartConversationSchema` (lead opcional: nome/email/telefone) e `sdrMessageInputSchema` (conteudo obrigatorio, 1-2000 chars).
- Criada rota `POST /api/sdr/[organizationId]/conversations`: publica (sem `auth()`), confere organizacao e integracao Anthropic antes de criar a conversa.
- Criada rota `POST /api/sdr/[organizationId]/conversations/[conversationId]/messages`: publica, confere posse da conversa pela organizacao, persiste a mensagem do lead, monta o historico completo, chama a Anthropic com a chave descriptografada da organizacao, persiste a resposta da IA e atualiza `SdrConversation.classification`. Erros da Anthropic retornam 502 generico.

### Criterios de aceite
- Endpoint aceita `organizationId` de uma organizacao com integracao Anthropic configurada e cria/continua uma conversa.
- Cada mensagem do lead gera uma resposta da IA e uma classificacao automatica (ex: `COLD`/`WARM`/`HOT` ou score) persistida na conversa.
- Organizacao sem chave Anthropic configurada: endpoint retorna erro claro (422), sem expor detalhes internos.
- Chave de API nunca e retornada em nenhuma resposta do endpoint.
- Build passa.

### Teste manual
- Com uma organizacao com chave Anthropic valida em `/configuracoes`, iniciar uma conversa via REST client e trocar algumas mensagens; confirmar respostas da IA e classificacao evoluindo.
- Repetir com uma organizacao sem chave configurada e confirmar erro tratado (sem 500 vazando stacktrace).

### Edge cases
- `organizationId` inexistente: 404.
- Organizacao existe mas sem `ApiIntegration` Anthropic: 422.
- Chave Anthropic invalida/expirada (erro do provedor): erro tratado, sem derrubar o processo.
- Mensagem vazia do lead: 400.

## FASE 4 - Plano de Acao (Modulo 5)

Pagina ja linkada na sidebar (`components/app-sidebar.tsx`, grupo "Inteligencia") e ainda nao implementada: `/planos`. Usa os models `ActionPlan` e `ActionTask` ja existentes no schema (ver `docs/ARCHITECTURE.md`).

| # | Tarefa | Status |
|---|--------|--------|
| 4.1 | Planos de Acao: listagem + cadastro (`/planos`) | done |
| 4.2 | Detalhe do plano: tarefas do plano (criar + mudar status) | done |
| 4.3 | Gerar plano de acao a partir das recomendacoes do diagnostico | done |

FASE 4 concluida.

## Tarefa: 4.1 - Planos de Acao (listagem + cadastro)

### Objetivo
Implementar a pagina `/planos` (ja linkada na sidebar): listar os planos de acao da organizacao e permitir cadastrar um novo.

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/SPEC.md`
- `apps/web/app/(app)/empresas/page.tsx` e `company-form-dialog.tsx` (padrao de listagem + dialog de cadastro)
- `apps/web/app/api/companies/route.ts`
- trecho `ActionPlan`/`ActionTask`/enum `PlanStatus` do schema Prisma

### Arquivos alterados
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `apps/web/lib/validations/action-plan.ts`
- `apps/web/app/api/action-plans/route.ts`
- `apps/web/app/(app)/planos/page.tsx`
- `apps/web/app/(app)/planos/action-plan-form-dialog.tsx`

### Implementacao
- Criada validacao Zod `actionPlanInputSchema` (titulo 2-160, objetivo 2-500, ambos obrigatorios).
- Criada rota `GET/POST /api/action-plans`, filtrada/gravada por `organizationId` da sessao; `GET` inclui `_count.tasks` por plano.
- Criada pagina Server Component `/planos` com tabela (titulo, objetivo, status, tarefas, criado em) e estado vazio.
- Criado `action-plan-form-dialog.tsx` (Client Component) com dialog + formulario, `fetch` para `POST /api/action-plans` e `router.refresh()` apos salvar.

### Arquivos proibidos
- Sidebar/layout global.
- Auth global.
- Schema Prisma sem aprovacao.
- Empresas, Contatos, Pipeline, Diagnostico e Dashboard (fora do escopo desta tarefa).

### Reutilizacao
- `auth()` para sessao/tenant.
- `prisma` para persistencia/leitura.
- Componentes UI existentes: Card, Table, Dialog, Input, Label, Textarea, Button, Badge, SidebarTrigger, Separator.

### Criterios de aceite
- Usuario autenticado acessa `/planos` e ve os planos da propria organizacao.
- Botao "Novo plano" abre formulario e cria o plano via API (status inicial `ACTIVE`, default do schema).
- Backend valida sessao, tenant e payload (titulo e objetivo obrigatorios).
- Build passa.

### Teste manual
- Abrir `/planos` sem nenhum plano cadastrado (estado vazio).
- Criar um plano e confirmar que aparece na listagem com status "Ativo" e 0 tarefas.

### Edge cases
- Sem sessao ou sem organizacao: API retorna 401.
- Titulo ou objetivo vazio/muito curto: API retorna 400.
- Plano de outra organizacao: nunca aparece na listagem (`findMany` filtrado por `organizationId`).

## Tarefa: 4.2 - Detalhe do plano (tarefas: criar + mudar status)

### Objetivo
Implementar a pagina `/planos/[id]`: mostrar o plano e permitir criar/gerenciar suas tarefas (`ActionTask`).

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/SPEC.md`
- `apps/web/app/(app)/planos/page.tsx` e `action-plan-form-dialog.tsx`
- `apps/web/app/(app)/pipeline/opportunity-card.tsx` (padrao de select por linha/card para mudar estado)
- `apps/web/app/api/opportunities/[id]/route.ts` (padrao de `PATCH` com checagem de posse)
- trecho `ActionTask`/enums `Priority`/`TaskStatus` do schema Prisma

### Arquivos alterados
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `apps/web/lib/validations/action-task.ts`
- `apps/web/app/api/action-plans/[id]/tasks/route.ts`
- `apps/web/app/api/action-plans/[id]/tasks/[taskId]/route.ts`
- `apps/web/app/(app)/planos/[id]/page.tsx`
- `apps/web/app/(app)/planos/[id]/task-form-dialog.tsx`
- `apps/web/app/(app)/planos/[id]/task-status-select.tsx`
- `apps/web/app/(app)/planos/page.tsx` (titulo do plano passa a linkar para o detalhe)

### Arquivos proibidos
- Sidebar/layout global.
- Auth global.
- Schema Prisma sem aprovacao.
- Empresas, Contatos, Pipeline, Diagnostico e Dashboard (fora do escopo desta tarefa).

### Reutilizacao
- `auth()` para sessao/tenant.
- `prisma` para persistencia/leitura.
- Componentes UI existentes: Card, Table, Dialog, Select, Input, Label, Textarea, Button, Badge, SidebarTrigger, Separator.
- Padrao de `PATCH` com checagem de posse ja usado em `opportunities/[id]`.

### Implementacao
- Criada validacao Zod `actionTaskInputSchema` (titulo obrigatorio, descricao/responsavel/prazo/prioridade opcionais, prioridade default `MEDIUM`) e `actionTaskStatusUpdateSchema`.
- Criadas rotas `GET/POST /api/action-plans/[id]/tasks` (checando que o plano pertence a organizacao antes de listar/criar) e `PATCH /api/action-plans/[id]/tasks/[taskId]` (checando que a tarefa pertence a um plano da organizacao antes de atualizar o status).
- Criada pagina Server Component `/planos/[id]`: busca o plano com as tarefas (404 se nao encontrado/outra organizacao) e renderiza cabecalho + tabela de tarefas.
- Criado `task-form-dialog.tsx` (Client Component) para criar tarefa e `task-status-select.tsx` (Client Component) com select de status por linha, chamando `PATCH` e `router.refresh()`.
- `/planos` passa a linkar o titulo de cada plano para `/planos/[id]`.

### Criterios de aceite
- Usuario autenticado acessa `/planos/[id]` de um plano da propria organizacao e ve suas tarefas.
- Botao "Nova tarefa" cria tarefa com status inicial "Pendente".
- Select de status na linha move a tarefa para outro status e persiste no banco.
- Plano de outra organizacao ou inexistente retorna 404.
- Build passa.

### Teste manual
- Abrir um plano sem tarefas (estado vazio) e criar a primeira tarefa.
- Mudar o status de uma tarefa pelo select e confirmar que persiste apos o refresh.
- Acessar `/planos/<id-invalido>` e confirmar 404.

### Edge cases
- Sem sessao ou sem organizacao: pagina retorna 404 (via `notFound()`); APIs retornam 401.
- Titulo de tarefa vazio: API retorna 400.
- Tentar atualizar tarefa de um plano de outra organizacao: `PATCH` retorna 404.

## Tarefa: 4.3 - Gerar plano de acao a partir das recomendacoes do diagnostico

### Objetivo
Fechar mais um loop entre Diagnostico e execucao: gerar um `ActionPlan` com uma `ActionTask` por recomendacao, diretamente da pagina de resultado do diagnostico.

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/SPEC.md`
- `apps/web/app/(app)/diagnostico/[id]/page.tsx` e `create-opportunity-button.tsx` (padrao de conversao com idempotencia)
- `apps/web/app/api/diagnosticos/[id]/oportunidade/route.ts`
- `apps/web/lib/scoring/insights.ts` (formato de `DiagnosticInsight`)
- trecho `ActionPlan`/`ActionTask`/`Diagnostic` do schema Prisma

### Arquivos alterados
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `apps/web/lib/diagnostico/action-plan-id.ts`
- `apps/web/app/api/diagnosticos/[id]/plano/route.ts`
- `apps/web/app/(app)/diagnostico/[id]/page.tsx`
- `apps/web/app/(app)/diagnostico/[id]/create-plan-button.tsx`

### Arquivos proibidos
- Sidebar/layout global.
- Auth global.
- Schema Prisma sem aprovacao.
- Empresas, Contatos, Pipeline e listagem/detalhe de Planos (fora do escopo desta tarefa; apenas reutilizados via Prisma).

### Reutilizacao
- `auth()` para sessao/tenant.
- `prisma` para persistencia/leitura, reaproveitando os models `ActionPlan`/`ActionTask` ja usados em 4.1/4.2.
- Padrao de idempotencia sem alterar schema, ja usado em `lib/diagnostico/opportunity-marker.ts` (3.4) — aqui via `id` deterministico em vez de marcador em texto, pois `ActionPlan` nao tem campo livre (`notes`) para isso.
- Tipo `DiagnosticInsight` de `lib/scoring/insights.ts`.

### Implementacao
- Criado helper `lib/diagnostico/action-plan-id.ts` com `diagnosticActionPlanId(id)`, gerando um `id` deterministico (`actionplan-diagnostico-<diagnosticId>`) para o `ActionPlan`, usado como chave de idempotencia sem precisar de campo extra no schema.
- Criada rota `POST /api/diagnosticos/[id]/plano`: busca o diagnostico (404 se nao encontrado/outra organizacao), reaproveita o plano existente pelo id deterministico, senao cria o `ActionPlan` (`title`/`objective` com nome e nota da empresa) com uma `ActionTask` por item de `Diagnostic.recommendations`.
- `apps/web/app/(app)/diagnostico/[id]/page.tsx` passa a checar se ja existe plano com o id deterministico e renderiza `CreatePlanButton` ao lado do `CreateOpportunityButton`.
- Criado `create-plan-button.tsx` (Client Component): botao "Gerar plano de acao" que vira link "Ver plano de acao" (para `/planos/[id]`) apos gerar (ou se ja existir).

### Criterios de aceite
- Na pagina de resultado, usuario consegue gerar um plano de acao com um clique, com uma tarefa por recomendacao.
- Clicar novamente (ou recarregar a pagina) nao duplica o plano nem as tarefas.
- Link "Ver plano de acao" leva ao detalhe correto em `/planos/[id]`.
- Build passa.

### Teste manual
- Criar um diagnostico, abrir o resultado e clicar em "Gerar plano de acao"; confirmar que o plano aparece em `/planos` com uma tarefa por recomendacao.
- Recarregar a pagina de resultado e confirmar que o botao virou "Ver plano de acao" (sem duplicar).

### Edge cases
- Diagnostico de outra organizacao ou inexistente: API retorna 404.
- Diagnostico convertido em plano duas vezes: retorna o mesmo plano (mesmo `id`), sem duplicar tarefas.
- Diagnostico com apenas a recomendacao generica: plano criado com uma unica tarefa.

## Tarefa: 3.1 - Empresas (listagem + cadastro)

### Objetivo
Implementar a pagina `/empresas` (ja linkada na sidebar): listar empresas da organizacao e permitir cadastrar uma nova.

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/SPEC.md`
- `apps/web/components/app-sidebar.tsx`
- `apps/web/lib/auth.ts`
- `apps/web/lib/db.ts`
- `apps/web/app/(app)/diagnostico/page.tsx` e `wizard.tsx` (padrao de pagina autenticada + formulario)
- trecho `Company` do schema Prisma
- componentes UI: `table.tsx`, `dialog.tsx`, `input.tsx`, `label.tsx`, `button.tsx`

### Arquivos alterados
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `apps/web/lib/validations/company.ts`
- `apps/web/app/api/companies/route.ts`
- `apps/web/app/(app)/empresas/page.tsx`
- `apps/web/app/(app)/empresas/company-form-dialog.tsx`

### Implementacao
- Criada validacao Zod `companyInputSchema` (nome obrigatorio 2-120, segmento/telefone/site opcionais, email opcional e validado).
- Criada rota `GET/POST /api/companies`, filtrada/gravada por `organizationId` da sessao.
- Criada pagina Server Component `/empresas` com tabela de empresas e estado vazio.
- Criado `company-form-dialog.tsx` (Client Component) com dialog + formulario, `fetch` para `POST /api/companies` e `router.refresh()` apos salvar.

### Arquivos proibidos
- Sidebar/layout global.
- Auth global.
- Schema Prisma sem aprovacao.
- Diagnostico e Dashboard (fora do escopo desta tarefa).

### Reutilizacao
- `auth()` para sessao/tenant.
- `prisma` para persistencia/leitura.
- Componentes UI existentes: Card, Table, Dialog, Input, Label, Button, Badge, SidebarTrigger, Separator.

### Criterios de aceite
- Usuario autenticado acessa `/empresas` e ve as empresas da propria organizacao.
- Botao "Nova empresa" abre formulario e cria a empresa via API.
- Backend valida sessao, tenant e payload (nome obrigatorio).
- Build passa.

### Teste manual
- Abrir `/empresas` sem nenhuma empresa cadastrada (estado vazio).
- Criar uma empresa e confirmar que aparece na listagem.

### Edge cases
- Sem sessao ou sem organizacao: API retorna 401.
- Nome vazio ou muito curto: API retorna 400.
- Empresa de outra organizacao: nunca aparece na listagem (`findMany` filtrado por `organizationId`).

## Tarefa: 3.2 - Contatos (listagem + cadastro vinculado a empresa)

### Objetivo
Implementar a pagina `/contatos` (ja linkada na sidebar): listar contatos da organizacao e permitir cadastrar um novo, opcionalmente vinculado a uma empresa.

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/SPEC.md`
- `apps/web/app/(app)/empresas/page.tsx` e `company-form-dialog.tsx` (padrao de listagem + dialog de cadastro)
- `apps/web/app/api/companies/route.ts`
- trecho `Contact`/`Company` do schema Prisma
- componentes UI: `select.tsx`

### Arquivos alterados
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `apps/web/lib/validations/contact.ts`
- `apps/web/app/api/contacts/route.ts`
- `apps/web/app/(app)/contatos/page.tsx`
- `apps/web/app/(app)/contatos/contact-form-dialog.tsx`

### Arquivos proibidos
- Sidebar/layout global.
- Auth global.
- Schema Prisma sem aprovacao.
- Empresas, Diagnostico e Dashboard (fora do escopo desta tarefa).

### Reutilizacao
- `auth()` para sessao/tenant.
- `prisma` para persistencia/leitura.
- Componentes UI existentes: Card, Table, Dialog, Select, Input, Label, Button, Badge, SidebarTrigger, Separator.

### Implementacao
- Criada validacao Zod `contactInputSchema` (nome obrigatorio 2-120, `companyId`/cargo/telefone opcionais, email opcional e validado).
- Criada rota `GET/POST /api/contacts`, filtrada/gravada por `organizationId`; ao informar `companyId`, valida que a empresa pertence a mesma organizacao antes de gravar.
- Criada pagina Server Component `/contatos` que busca contatos (com empresa) e empresas em paralelo, renderiza tabela e estado vazio.
- Criado `contact-form-dialog.tsx` (Client Component) com dialog + formulario + `Select` de empresas, `fetch` para `POST /api/contacts` e `router.refresh()` apos salvar.

### Criterios de aceite
- Usuario autenticado acessa `/contatos` e ve os contatos da propria organizacao.
- Botao "Novo contato" abre formulario, permite selecionar empresa (opcional) e cria o contato via API.
- Backend valida sessao, tenant, payload e propriedade da empresa vinculada.
- Build passa.

### Teste manual
- Abrir `/contatos` sem nenhum contato cadastrado (estado vazio).
- Criar um contato sem empresa e outro vinculado a uma empresa existente; confirmar que ambos aparecem corretamente na listagem.

### Edge cases
- Sem sessao ou sem organizacao: API retorna 401.
- Nome vazio ou muito curto: API retorna 400.
- `companyId` de outra organizacao ou inexistente: API retorna 400 antes de gravar.
- Contato sem empresa: coluna "Empresa" mostra "-".

## Tarefa: 3.3 - Pipeline de Oportunidades (board por estagio)

### Objetivo
Implementar a pagina `/pipeline` (ja linkada na sidebar): board com as oportunidades da organizacao agrupadas por estagio, permitindo criar uma oportunidade e mover o estagio.

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/SPEC.md`
- `apps/web/app/(app)/contatos/page.tsx` e `contact-form-dialog.tsx` (padrao de listagem + dialog com select)
- `apps/web/app/api/contacts/route.ts`
- `apps/web/lib/dashboard/kpis.ts` (estagios abertos/fechados ja usados no dashboard)
- trecho `Opportunity`/enum `OpportunityStage` do schema Prisma

### Arquivos alterados
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `apps/web/lib/validations/opportunity.ts`
- `apps/web/app/api/opportunities/route.ts`
- `apps/web/app/api/opportunities/[id]/route.ts`
- `apps/web/app/(app)/pipeline/page.tsx`
- `apps/web/app/(app)/pipeline/opportunity-form-dialog.tsx`
- `apps/web/app/(app)/pipeline/opportunity-card.tsx`

### Arquivos proibidos
- Sidebar/layout global.
- Auth global.
- Schema Prisma sem aprovacao.
- Empresas, Contatos, Diagnostico e Dashboard (fora do escopo desta tarefa).

### Reutilizacao
- `auth()` para sessao/tenant.
- `prisma` para persistencia/leitura.
- Componentes UI existentes: Card, Dialog, Select, Input, Label, Button, Badge, SidebarTrigger, Separator.
- Estagios abertos/fechados ja definidos em `lib/dashboard/kpis.ts` (mesma nomenclatura do enum `OpportunityStage`).

### Implementacao
- Criada validacao Zod `opportunityInputSchema` (titulo obrigatorio, valor >= 0, `companyId`/`contactId`/data prevista opcionais) e `opportunityStageUpdateSchema`.
- Criada rota `GET/POST /api/opportunities`, filtrada/gravada por `organizationId`, validando posse de `Company`/`Contact` vinculados.
- Criada rota `PATCH /api/opportunities/[id]` para atualizar apenas o estagio, com checagem de posse (404 se nao encontrada na organizacao).
- Criada pagina Server Component `/pipeline` que busca oportunidades (com empresa/contato), empresas e contatos, agrupando por estagio em 6 colunas com contagem e soma de valor.
- Criado `opportunity-form-dialog.tsx` (Client Component) para criar oportunidade (estagio inicial sempre `PROSPECTING`).
- Criado `opportunity-card.tsx` (Client Component) com select de estagio por card, chamando `PATCH` e `router.refresh()`.

### Criterios de aceite
- Usuario autenticado acessa `/pipeline` e ve as oportunidades da propria organizacao agrupadas por estagio.
- Botao "Nova oportunidade" cria oportunidade em "Prospeccao".
- Select no card move a oportunidade para outro estagio e persiste no banco.
- Backend valida sessao, tenant, payload e propriedade de empresa/contato/oportunidade.
- Build passa.

### Teste manual
- Abrir `/pipeline` sem nenhuma oportunidade (todas as colunas vazias).
- Criar uma oportunidade e confirmar que aparece em "Prospeccao".
- Mover a oportunidade para outro estagio pelo select e confirmar que ela migra de coluna apos o refresh.

### Edge cases
- Sem sessao ou sem organizacao: APIs retornam 401.
- Titulo vazio ou valor negativo: API retorna 400.
- `companyId`/`contactId` de outra organizacao ou inexistente: API retorna 400 antes de gravar.
- Mover oportunidade inexistente ou de outra organizacao: `PATCH` retorna 404.

## Tarefa: 3.4 - Criar oportunidade a partir do resultado do diagnostico

### Objetivo
Fechar o loop entre Diagnostico e CRM: permitir gerar uma empresa + oportunidade no pipeline diretamente da pagina de resultado do diagnostico.

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/SPEC.md`
- `apps/web/app/(app)/diagnostico/[id]/page.tsx`
- `apps/web/app/api/opportunities/route.ts`
- `apps/web/app/api/companies/route.ts`
- trecho `Company`/`Opportunity`/`Diagnostic` do schema Prisma

### Arquivos alterados
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `apps/web/lib/diagnostico/opportunity-marker.ts`
- `apps/web/app/api/diagnosticos/[id]/oportunidade/route.ts`
- `apps/web/app/(app)/diagnostico/[id]/page.tsx`
- `apps/web/app/(app)/diagnostico/[id]/create-opportunity-button.tsx`

### Arquivos proibidos
- Sidebar/layout global.
- Auth global.
- Schema Prisma sem aprovacao.
- Empresas, Contatos e Pipeline (fora do escopo desta tarefa; apenas reutilizados via Prisma).

### Reutilizacao
- `auth()` para sessao/tenant.
- `prisma` para persistencia/leitura, reaproveitando os models `Company` e `Opportunity` ja usados em 3.1/3.3.
- Componente `Button` existente.

### Implementacao
- Criado helper `lib/diagnostico/opportunity-marker.ts` com `diagnosticOpportunityMarker(id)`, gerando um marcador textual (`[diagnostico:<id>]`) usado para idempotencia sem alterar o schema.
- Criada rota `POST /api/diagnosticos/[id]/oportunidade`: busca o diagnostico (404 se nao encontrado/outra organizacao), reaproveita oportunidade existente com o marcador, senao encontra/cria a `Company` pelo nome e cria a `Opportunity` inicial (`PROSPECTING`, valor = `averageTicket`).
- `apps/web/app/(app)/diagnostico/[id]/page.tsx` passa a checar se ja existe oportunidade com o marcador e renderiza `CreateOpportunityButton`.
- Criado `create-opportunity-button.tsx` (Client Component): botao "Criar oportunidade no CRM" que vira link "Ver oportunidade no pipeline" apos a criacao (ou se ja existir).

### Criterios de aceite
- Na pagina de resultado, usuario consegue criar uma oportunidade a partir do diagnostico com um clique.
- Empresa e reaproveitada se ja existir com o mesmo nome na organizacao.
- Clicar novamente (ou recarregar a pagina) nao duplica a oportunidade.
- Build passa.

### Teste manual
- Criar um diagnostico, abrir o resultado e clicar em "Criar oportunidade no CRM"; confirmar que a oportunidade aparece em `/pipeline` na coluna "Prospeccao".
- Recarregar a pagina de resultado e confirmar que o botao virou "Ver oportunidade no pipeline" (sem duplicar).

### Edge cases
- Diagnostico de outra organizacao ou inexistente: API retorna 404.
- Empresa com mesmo nome ja cadastrada: reaproveitada em vez de duplicada.
- Diagnostico convertido duas vezes (ex: duplo clique): retorna a mesma oportunidade.

## Tarefa: 2.1 - Formulario de Diagnostico Comercial

### Objetivo
Criar wizard multi-step para coletar e salvar dados iniciais do diagnostico comercial.

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `CHANGELOG.md`
- `apps/web/app/(app)/layout.tsx`
- `apps/web/app/(app)/dashboard/page.tsx`
- `apps/web/components/app-sidebar.tsx`
- `apps/web/lib/auth.ts`
- `apps/web/lib/db.ts`
- `apps/web/prisma/schema.prisma`
- componentes UI usados na tarefa

### Arquivos alterados
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `apps/web/lib/validations/diagnostic.ts`
- `apps/web/app/api/diagnosticos/route.ts`
- `apps/web/app/(app)/diagnostico/page.tsx`
- `apps/web/app/(app)/diagnostico/wizard.tsx`

### Arquivos proibidos
- Schema Prisma
- Login
- Sidebar
- Dashboard
- Hooks globais
- Arquivos de auth fora do uso/import existente

### Reutilizacao
- `auth()` para sessao/tenant.
- `prisma` para persistencia.
- Componentes UI existentes: Card, Button, Input, Textarea, Label, Progress, Badge, SidebarTrigger.

### Implementacao
- Criado wizard com etapas Empresa, Numeros comerciais, Processo e Revisao.
- Criada rota `POST /api/diagnosticos`.
- Criada validacao Zod compartilhada.
- Gravacao usa `organizationId` da sessao.

### Criterios de aceite
- Usuario autenticado acessa `/diagnostico`.
- Wizard permite avancar/voltar por etapas.
- Campos obrigatorios bloqueiam avancar.
- Envio mostra loading e sucesso.
- Backend valida sessao, tenant e payload.
- Build passa.

### Teste manual
- Abrir `/diagnostico`.
- Preencher campos obrigatorios.
- Avancar ate revisao.
- Enviar e confirmar mensagem de sucesso.

### Edge cases
- Sem sessao ou sem organizacao: API retorna 401.
- Payload invalido: API retorna 400.
- Erro inesperado: API retorna 500 generico.

## Tarefa: 2.2 - Engine de scoring de maturidade comercial

### Objetivo
Calcular nota inicial de maturidade comercial a partir do diagnostico salvo.

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/SPEC.md`
- `apps/web/lib/validations/diagnostic.ts`
- `apps/web/app/api/diagnosticos/route.ts`
- trecho `Diagnostic` do schema Prisma

### Arquivos alterados
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `apps/web/lib/scoring/maturity.ts`
- `apps/web/app/api/diagnosticos/route.ts`

### Arquivos proibidos
- UI fora do diagnostico.
- Auth global.
- Schema Prisma sem aprovacao.

### Implementacao
- Criada `calculateMaturityScore` em `lib/scoring/maturity.ts`, funcao pura com 4 pilares ponderados (CRM, processo documentado, conversao, leads por vendedor), cada um escalado ate um benchmark e somado ate 100 pts.
- `POST /api/diagnosticos` agora calcula o score apos validar o payload e grava em `Diagnostic.maturityScore` na mesma criacao.

### Criterios de aceite
- Scoring calculado no backend.
- Nenhuma regra sensivel de scoring fica apenas no frontend.
- Resultado salvo em `maturityScore`.
- Build passa.

### Teste manual
- Criar diagnostico e confirmar score salvo (via `select` no retorno da API).

### Edge cases
- Dados numericos zerados (monthlyLeads, sellers minimo 1): pilar de leads fica 0.
- Conversao 0%: pilar de conversao fica 0.
- CRM vazio/ausente: pilar de CRM fica 0.
- Processo/dor com texto minimo valido (10 caracteres): pilar de processo proximo de 0, sem erro.

## Tarefa: 2.3 - Pagina de resultado do diagnostico

### Objetivo
Exibir a nota de maturidade comercial, gargalos e recomendacoes de um diagnostico salvo.

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/SPEC.md`
- `apps/web/lib/scoring/maturity.ts`
- `apps/web/app/api/diagnosticos/route.ts`
- `apps/web/app/(app)/diagnostico/wizard.tsx`
- trecho `Diagnostic` do schema Prisma

### Arquivos alterados
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `apps/web/lib/scoring/maturity.ts`
- `apps/web/lib/scoring/insights.ts`
- `apps/web/app/api/diagnosticos/route.ts`
- `apps/web/app/(app)/diagnostico/wizard.tsx`
- `apps/web/app/(app)/diagnostico/[id]/page.tsx`

### Arquivos proibidos
- Auth global.
- Schema Prisma sem aprovacao.
- Sidebar/Dashboard.

### Implementacao
- `calculateMaturityScore` refatorado para expor `calculateMaturityPillars` (ratios 0-1 por pilar), reaproveitado pelo scoring e pelos insights.
- Criado `lib/scoring/insights.ts` com `generateBottlenecks` e `generateRecommendations`: cada pilar abaixo de 50% do benchmark gera um gargalo e uma recomendacao correspondente; sem gargalos, recomendacao generica de escala.
- `POST /api/diagnosticos` grava `bottlenecks` e `recommendations` (Json) junto com `maturityScore`.
- Nova pagina Server Component `/diagnostico/[id]` busca o diagnostico por `id` + `organizationId` da sessao e renderiza nota, gargalos e recomendacoes; diagnostico nao encontrado ou de outra organizacao retorna 404.
- Tela final do wizard agora linka para `/diagnostico/[id]` ("Ver resultado").

### Criterios de aceite
- Usuario autenticado acessa `/diagnostico/[id]` de um diagnostico da propria organizacao.
- Pagina mostra nota, gargalos e recomendacoes.
- Diagnostico de outra organizacao ou inexistente retorna 404.
- Build passa.

### Teste manual
- Criar diagnostico pelo wizard, clicar em "Ver resultado" e conferir nota/gargalos/recomendacoes exibidos.
- Acessar `/diagnostico/<id-invalido>` e confirmar 404.

### Edge cases
- Diagnostico sem gargalos: lista de gargalos mostra mensagem vazia e recomendacoes mostram a generica de escala.
- Usuario sem sessao ou sem organizacao: pagina retorna 404 em vez de vazar dados.
- Diagnostico pertence a outra organizacao: `findFirst` filtrado por `organizationId` nao retorna e a pagina responde 404.

## Tarefa: 2.4 - Dashboard executivo com KPIs reais

### Objetivo
Substituir os KPIs fixos do dashboard por valores reais calculados a partir do banco, por organizacao.

### Arquivos a ler
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/SPEC.md`
- `apps/web/app/(app)/dashboard/page.tsx`
- `apps/web/lib/auth.ts`
- `apps/web/lib/db.ts`
- trechos `Lead` e `Opportunity` do schema Prisma

### Arquivos alterados
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `apps/web/lib/dashboard/kpis.ts`
- `apps/web/app/(app)/dashboard/page.tsx`

### Arquivos proibidos
- Sidebar/layout global.
- Auth global.
- Schema Prisma sem aprovacao.
- Diagnostico (form e resultado).

### Reutilizacao
- `auth()` para sessao/tenant.
- `prisma` para persistencia/leitura.
- Componentes UI existentes: Card, Badge, Separator, SidebarTrigger.

### Implementacao
- Criado `lib/dashboard/kpis.ts` com `getExecutiveKpis(organizationId)`: calcula Pipeline Total, Leads Ativos, Oportunidades e Taxa de Conversao via Prisma (`Lead`/`Opportunity`), com variacao mes atual vs mes anterior.
- `apps/web/app/(app)/dashboard/page.tsx` agora e Server Component assincrona: busca `auth()`, chama `getExecutiveKpis` quando ha `organizationId` (senao usa KPIs zerados) e renderiza os 4 cards com dados reais e indicador de alta/baixa.

### Criterios de aceite
- Dashboard exibe Pipeline Total, Leads Ativos, Oportunidades e Taxa de Conversao reais, filtrados por organizacao.
- Sem organizacao na sessao, dashboard nao falha (KPIs zerados).
- Build passa.

### Teste manual
- Acessar `/dashboard` sem dados de CRM e confirmar KPIs zerados sem erro.
- Popular `Lead`/`Opportunity` de uma organizacao (via seed/Studio) e confirmar que os KPIs refletem os dados.

### Edge cases
- Organizacao sem leads/oportunidades: todos os KPIs ficam 0, taxa de conversao 0%.
- Mes anterior sem nenhum registro: variacao mostra +100% quando ha volume no mes atual, 0% quando ambos os meses estao zerados.
- Todas as oportunidades fechadas como `CLOSED_LOST`: taxa de conversao 0%.
