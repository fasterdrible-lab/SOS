# CHANGELOG — SalesOS

## [V.1.15.4] — 2026-10-30

### Fase 10.7 — Backup do banco de producao
- Backup diario as 03:30 (Brasilia) na VPS, com validacao do dump, retencao de 14 dias e copia do `.env`.
- Restauracao testada em banco temporario, com resultado igual ao da producao.
- Pendente (tarefa 10.8): copiar os backups para fora da VPS.

**Arquivos criados:**
- `.gitattributes`
- `deploy/backup.sh`
- `deploy/salesos-backup.service`
- `deploy/salesos-backup.timer`

**Arquivos alterados:**
- `docs/TASKS.md`
- `docs/CURRENT_STATE.md`
- `CHANGELOG.md`

## [V.1.15.3] — 2026-10-30

### Fase 10.4 — Limite de uso da rota publica do IA SDR
- Criado `lib/sdr/usage-limits.ts`: ate 30 mensagens do lead por conversa e 300 por organizacao em 24h. Acima disso, a rota responde 429 sem chamar a IA.
- Adicionado limite por IP em `/api/sdr/` no nginx (12 requisicoes por minuto, rajada de 10).

**Arquivos criados:**
- `apps/web/lib/sdr/usage-limits.ts`

**Arquivos alterados:**
- `apps/web/app/api/sdr/[organizationId]/conversations/[conversationId]/messages/route.ts`
- `deploy/nginx-saleos.conf`
- `docs/TASKS.md`
- `docs/CURRENT_STATE.md`
- `CHANGELOG.md`

## [V.1.15.2] — 2026-10-30

### Fase 10.1 — Preparacao para publicacao em saleos.tech
- Adicionado `postinstall: prisma generate`, necessario para build em ambiente limpo.
- Criado `scripts/create-admin.mjs` (`npm run create-admin`) para o primeiro acesso em banco vazio, ja que o app nao tem pagina de cadastro.
- Validado em clone limpo: `npm ci`, `npm run build` e primeiro login em `next start`.

### Fase 10.2 — Publicacao na VPS
- Destino alterado pelo usuario de Vercel/Railway para a VPS `200.141.20.162`, compartilhada com o SALE-IA.
- App e PostgreSQL em Docker (`/opt/salesos`), com o app restrito a `127.0.0.1:3010` e o banco sem porta publicada; site proprio no nginx para `saleos.tech`.
- Migrations aplicadas no banco de producao, que segue vazio.

### Fase 10.3 — Dominio e HTTPS
- `saleos.tech` apontado para a VPS e certificado Let's Encrypt emitido, com redirecionamento de HTTP para HTTPS.
- Login, criacao e troca de organizacao testados pelo dominio real, com dados de teste removidos ao final.
- Admin de producao criado pelo usuario (tarefa 10.5). Pendente (tarefa 10.6): restaurar o `CNAME www`.
- **Bug: o link "Solicitar acesso" da tela de login levava a um 404**, pois `/register` nunca existiu. Substituido por um aviso de que o acesso e liberado pelo administrador (`apps/web/app/(auth)/login/page.tsx`). Cadastro publico nao foi criado.

**Arquivos criados:**
- `apps/web/scripts/create-admin.mjs`
- `apps/web/Dockerfile`
- `apps/web/.dockerignore`
- `deploy/docker-compose.yml`
- `deploy/nginx-saleos.conf`

**Arquivos alterados:**
- `apps/web/package.json`
- `docs/ARCHITECTURE.md`
- `docs/TASKS.md`
- `docs/CURRENT_STATE.md`
- `CHANGELOG.md`

## [V.1.15.1] — 2026-10-30

### Fase 9.1 — Validacao de ponta a ponta contra o banco real
- App exercitado contra o banco de desenvolvimento (`salesos-postgres`) com 47 verificacoes HTTP, todas aprovadas: autenticacao, multi-organizacao, isolamento entre organizacoes, CRM, diagnostico, integracoes e tratamento de erro da IA.
- Corrigido `docs/CURRENT_STATE.md`: as migrations ja estavam aplicadas e sem desvio em relacao ao schema, ao contrario do que o documento dizia.
- Respostas reais da IA seguem sem validacao (tarefa 9.2, bloqueada): falta uma chave Anthropic valida.
- Nenhum codigo foi alterado nesta tarefa.

**Arquivos alterados:**
- `docs/TASKS.md`
- `docs/CURRENT_STATE.md`
- `CHANGELOG.md`

## [V.1.15.0] — 2026-09-10

### Fase 8.3 — Pagina "Meus Clientes"
- Criado `lib/organizations/client-summary.ts` (`getConsultantClients`): para cada `OrganizationMember` do usuario, roda em paralelo `getExecutiveKpis` (reaproveitado de `lib/dashboard/kpis.ts`), o `Diagnostic` mais recente e a contagem de `ActionTask` (total/`DONE`), devolvendo um resumo por cliente (score de maturidade, pipeline total, progresso do plano de acao).
- Criada a pagina `app/(app)/clientes/page.tsx` (ja linkada na sidebar desde a FASE 1, ate entao sem destino): tabela com uma linha por organizacao-cliente do consultor, badge "Ativa" na organizacao atualmente ativa da sessao.
- Criado `client-access-button.tsx` (Client Component): troca a organizacao ativa por linha via `POST /api/session/organization` (tarefa 8.1) e redireciona para `/dashboard`.
- Criado `new-client-dialog.tsx` (Client Component): cria uma organizacao via `POST /api/organizations` (tarefa 8.2) e encadeia a troca de organizacao (8.1) para o consultor cair direto no `/dashboard` do cliente recem-criado.
- FASE 8 (Dashboard Consultoria / Meus Clientes, Modulo 7) concluida: com 8.1 + 8.2 + 8.3, o consultor consegue de fato gerenciar multiplas organizacoes-cliente pela UI, nao so no schema — fecha o ultimo modulo do produto principal ainda nao construido em `docs/ARCHITECTURE.md`.

**Arquivos criados:**
- `apps/web/lib/organizations/client-summary.ts`
- `apps/web/app/(app)/clientes/page.tsx`
- `apps/web/app/(app)/clientes/client-access-button.tsx`
- `apps/web/app/(app)/clientes/new-client-dialog.tsx`

**Arquivos alterados:**
- `docs/TASKS.md`
- `docs/CURRENT_STATE.md`

## [V.1.14.0] — 2026-09-10

### Fase 8.2 — Consultor cria uma nova organizacao-cliente
- Criada a rota `POST /api/organizations` (autenticada): cria uma nova `Organization` a partir de apenas um nome e um `OrganizationMember` aninhado para o usuario logado, na mesma escrita do Prisma.
- Criado `lib/organizations/slug.ts` (`slugifyOrganizationName`) para gerar o `slug` unico exigido pelo schema automaticamente a partir do nome (normaliza acentos, minusculas, hifens); em caso de colisao, a rota tenta ate 5 sufixos aleatorios (`crypto.randomUUID()`).
- Criada validacao Zod `organizationInputSchema` (`name` obrigatorio, 2-120).
- **Decisao de role:** o membro criado recebe `role = "CONSULTANT"` (nao `ADMIN`, como o titulo original da tarefa em `docs/TASKS.md` sugeria) — o enum `Role` (`OWNER`/`ADMIN`/`CONSULTANT`/`MEMBER`) existia desde a FASE 1 mas nunca foi usado por nenhuma logica do app; `CONSULTANT` e o valor semanticamente correto para "um consultor que passa a gerenciar uma organizacao-cliente".
- Decisao deliberada: a rota nao troca a organizacao ativa da sessao automaticamente — "criar organizacao" (8.2) e "trocar de organizacao" (8.1, `POST /api/session/organization`) ficam como operacoes separadas e componiveis pela futura UI (`/clientes`, tarefa 8.3).
- Ainda sem UI — endpoint validavel via chamada direta.

**Arquivos criados:**
- `apps/web/lib/organizations/slug.ts`
- `apps/web/lib/validations/organization.ts`
- `apps/web/app/api/organizations/route.ts`

**Arquivos alterados:**
- `docs/TASKS.md`
- `docs/CURRENT_STATE.md`

## [V.1.13.0] — 2026-09-10

### Fase 8.1 — Sessao multi-organizacao (trocar organizacao ativa)
- Fundacao tecnica para o consultor navegar entre organizacoes-cliente: a sessao (`lib/auth.ts`) passa a suportar trocar o `organizationId` ativo, via `unstable_update` (NextAuth v5) + `trigger: "update"` no callback `jwt`. Nenhuma pagina/rota existente precisou mudar — todas continuam lendo `session.user.organizationId` normalmente.
- O payload de `update()` vem do cliente, entao o callback `jwt` **revalida no banco** (`OrganizationMember`) que o usuario realmente pertence a organizacao solicitada antes de trocar `token.organizationId`/`token.role`; caso contrario o token fica inalterado.
- Criada validacao Zod `sessionOrganizationInputSchema` e a rota `POST /api/session/organization` (autenticada): confere a posse via `OrganizationMember.findUnique` (404 se o usuario nao pertence aquela organizacao) e, caso pertenca, chama `unstable_update({ user: { organizationId } })`.
- Ainda sem UI (`/clientes`, tarefa 8.3) e sem forma de o consultor ter uma segunda organizacao-cliente (tarefa 8.2) — 8.1 fecha apenas o mecanismo de troca, testavel via chamada direta ao endpoint.

**Arquivos criados:**
- `apps/web/lib/validations/session-organization.ts`
- `apps/web/app/api/session/organization/route.ts`

**Arquivos alterados:**
- `apps/web/lib/auth.ts`
- `docs/TASKS.md`
- `docs/CURRENT_STATE.md`

## [V.1.12.0] — 2026-09-10

### Fase 8 (planejamento) — Dashboard Consultoria / Meus Clientes
- Ultimo modulo do produto principal ainda nao construido (`docs/ARCHITECTURE.md`, Modulo 7). Investigacao encontrou o item de sidebar "Meus Clientes" (`/clientes`, grupo "Consultoria") ja scaffoldado desde a FASE 1 mas sem pagina de destino, cujo nome no plural aponta para uma visao cross-cliente (multi-organizacao) desde o inicio do produto — coerente com o North Star do `CLAUDE.md`.
- Identificadas duas lacunas que bloqueiam essa visao hoje: (1) a sessao (`lib/auth.ts`) fixa uma unica `organizationId` por login e nunca troca, apesar do schema `User`<->`Organization` ja ser N:N via `OrganizationMember`; (2) nao existe nenhum fluxo de criacao de organizacao/associacao de membro no app (as linhas atuais foram inseridas manualmente para o usuario demo).
- Perguntado ao usuario entre (a) dashboard de engajamento dentro de uma unica organizacao, sem mudar auth, ou (b) visao cross-cliente real: optou-se por (b), alinhado ao item de sidebar ja existente e ao North Star do produto.
- Detalhada a FASE 8 em `docs/TASKS.md`, quebrada em 3 subtarefas incrementais e dependentes entre si: (8.1) sessao multi-organizacao (trocar organizacao ativa), (8.2) consultor cria uma nova organizacao-cliente, (8.3) pagina "Meus Clientes" com listagem + metricas resumidas por cliente + acesso (troca de organizacao).
- Corrigida a rota do Modulo 7 em `docs/ARCHITECTURE.md` (estava `/consultoria`, divergente da rota real ja scaffoldada `/clientes`) e adicionado o fluxo "Troca de Organizacao Ativa".
- Nenhum codigo foi alterado nesta tarefa — apenas planejamento e correcao de documentacao.

**Arquivos alterados:**
- `docs/TASKS.md`
- `docs/CURRENT_STATE.md`
- `docs/ARCHITECTURE.md`
- `CHANGELOG.md`

## [V.1.11.0] — 2026-09-09

### Fase 7.2 — Consultor Digital: pagina de chat
- Criada a pagina autenticada `app/(app)/consultor/page.tsx` (ja linkada na sidebar, ate entao sem destino): busca a sessao, o historico existente da conversa (`prisma.consultantConversation.findUnique`) e o status da integracao Anthropic, repassando para o componente de chat.
- Criado `consultant-chat.tsx` (Client Component): renderiza o historico + input quando a integracao existe; quando nao existe, mostra uma tela dedicada com CTA para `/configuracoes` (o proprio consultor pode resolver, diferente do lead no widget publico do IA SDR).
- FASE 7 (Consultor Digital) concluida. Com isso, os dois modulos de IA previstos em `docs/ARCHITECTURE.md` (IA SDR e Consultor Digital) estao implementados de ponta a ponta — nenhum dos dois foi exercitado ainda contra um banco real ou a API real da Anthropic neste ambiente.

**Arquivos criados:**
- `apps/web/app/(app)/consultor/page.tsx`
- `apps/web/app/(app)/consultor/consultant-chat.tsx`

**Arquivos alterados:**
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`

## [V.1.10.0] — 2026-09-09

### Fase 7.1 — Consultor Digital: backend (contexto + chat autenticado)
- Adicionados os models `ConsultantConversation` (`@@unique([organizationId])`, uma conversa continua por organizacao) e `ConsultantMessage` (+ enum `ConsultantMessageRole`: `USER`/`ASSISTANT`) ao schema Prisma, relacionados a `Organization`. Alteracao de schema solicitada explicitamente pelo usuario ao iniciar a tarefa 7.1. `npx prisma generate` executado (sem banco local disponivel para `migrate dev`).
- Adicionada `generateConsultantReply` a `lib/ai/anthropic-client.ts`: usa o modelo `claude-sonnet-5` (mais robusto que o `claude-haiku-4-5-20251001` do IA SDR) com resposta em texto livre, sem forcar `tool_choice`.
- Criadas rotas autenticadas `GET/POST /api/consultor/messages`: `GET` retorna o historico da conversa da organizacao; `POST` monta o contexto (ultimo `Diagnostic` + `getExecutiveKpis`), envia para a IA e persiste a mensagem do consultor + a resposta.
- Ao contrario do IA SDR (conversa publica por lead), esta rota e autenticada e mantem uma unica conversa continua por organizacao, contextualizada automaticamente a cada resposta.
- Ainda sem UI (`/consultor`, tarefa 7.2).

**Arquivos criados:**
- `apps/web/lib/validations/consultant-message.ts`
- `apps/web/app/api/consultor/messages/route.ts`

**Arquivos alterados:**
- `apps/web/prisma/schema.prisma`
- `apps/web/lib/ai/anthropic-client.ts`
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`

## [V.1.9.0] — 2026-09-09

### Fase 7 (planejamento) — Consultor Digital
- Detalhada a FASE 7 em `docs/TASKS.md`: Consultor Digital (Modulo 4), o segundo e ultimo modulo de IA previsto em `docs/ARCHITECTURE.md`, quebrado em 2 subtarefas — (7.1) backend com contexto automatico (ultimo diagnostico + KPIs do CRM) e endpoint de chat autenticado, (7.2) pagina `/consultor` consumindo esse endpoint.
- Diferenca de design em relacao ao IA SDR: conversa autenticada (nao publica) e com **uma unica conversa continua por organizacao** (nao uma por lead), contextualizada automaticamente a cada resposta com `Diagnostic` e `lib/dashboard/kpis.ts` ja existentes.
- Nenhum codigo foi alterado nesta tarefa — apenas planejamento.

**Arquivos alterados:**
- `docs/TASKS.md`
- `docs/CURRENT_STATE.md`
- `CHANGELOG.md`

## [V.1.8.0] — 2026-09-09

### Fase 6.4 — IA SDR: notificar o consultor quando um lead e qualificado
- Adicionado o campo `consultantSeenAt DateTime?` a `SdrConversation`, para saber quais leads qualificados (`HOT`) ainda nao foram vistos pelo consultor. `npx prisma generate` executado (sem banco local disponivel para `migrate dev`).
- Criado `lib/sdr/notifications.ts` com `getUnseenQualifiedLeadsCount` e `markQualifiedLeadsSeen`.
- `app/(app)/layout.tsx` passou a ser assincrono: busca a sessao e a contagem de leads qualificados nao vistos, repassando para `AppSidebar` via prop `qualifiedLeadsCount`.
- `AppSidebar` passou a exibir um badge dourado com essa contagem no item "IA SDR" — item que ja existia linkado para `/sdr`, mas ainda sem pagina de destino.
- Criada a pagina autenticada `app/(app)/sdr/page.tsx`: lista as conversas do IA SDR da organizacao (lead, classificacao, ultima mensagem, contagem de mensagens) e, ao carregar, marca as conversas `HOT` nao vistas como vistas — o badge some na navegacao seguinte.
- **Ajuste no middleware:** o allowlist publico adicionado na 6.2 (`/sdr`) foi restrito para `/sdr/` (com barra) em `lib/auth.config.ts`, para que apenas o widget publico (`/sdr/[organizationId]`) permaneca acessivel sem sessao — a nova pagina do consultor (`/sdr`, exata) volta a exigir login.
- FASE 6 (IA SDR) concluida: widget publico -> conversa com IA -> classificacao automatica -> Lead/Oportunidade no CRM -> notificacao ao consultor, fechando o funil descrito em `docs/ARCHITECTURE.md`.

**Arquivos criados:**
- `apps/web/lib/sdr/notifications.ts`
- `apps/web/app/(app)/sdr/page.tsx`

**Arquivos alterados:**
- `apps/web/prisma/schema.prisma`
- `apps/web/lib/auth.config.ts`
- `apps/web/app/(app)/layout.tsx`
- `apps/web/components/app-sidebar.tsx`
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`

## [V.1.7.0] — 2026-09-09

### Fase 6.3 — IA SDR: qualificacao gera Lead/Oportunidade no CRM
- "Qualificada" definido como classificacao `HOT` (a mais alta entre `COLD`/`WARM`/`HOT`). `COLD`/`WARM` nao geram registros no CRM.
- Criado `lib/sdr/lead-id.ts` com `sdrLeadId`/`sdrOpportunityId`, ids deterministicos a partir do `conversationId` (mesmo padrao de idempotencia sem alterar schema usado em `lib/diagnostico/action-plan-id.ts`, tarefa 4.3).
- `POST /api/sdr/[organizationId]/conversations/[conversationId]/messages` passa a criar automaticamente um `Lead` (`status = QUALIFIED`, `source = "IA SDR"`, `score = 80`) e uma `Opportunity` vinculada (`stage` inicial `PROSPECTING`) na primeira vez que a conversa for classificada como `HOT`; chamadas seguintes nao duplicam os registros.
- A sincronizacao com o CRM e um efeito colateral nao-critico: uma falha ao criar o Lead/Oportunidade nao impede a resposta da IA ao lead.

**Arquivos criados:**
- `apps/web/lib/sdr/lead-id.ts`

**Arquivos alterados:**
- `apps/web/app/api/sdr/[organizationId]/conversations/[conversationId]/messages/route.ts`
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`

## [V.1.6.0] — 2026-09-09

### Fase 6.2 — IA SDR: widget publico embarcavel
- Criada a pagina publica `/sdr/[organizationId]` (`page.tsx`, Server Component sem `auth()`): valida que a organizacao existe (404 caso contrario) e renderiza o widget de chat.
- Criado `chat-widget.tsx` (Client Component): janela de chat que inicia a conversa automaticamente no primeiro envio, troca mensagens com a IA e exibe um badge com a classificacao atual (Frio/Morno/Quente); trata organizacao sem integracao configurada com uma tela de "Atendimento indisponivel".
- **Correcao de bug encontrada ao construir esta tarefa:** o middleware global (`lib/auth.config.ts`, `callbacks.authorized`) bloqueava qualquer rota fora de `/login`, `/register` e `/api/auth/*` para quem nao tinha sessao — os endpoints "publicos" `/api/sdr/**` criados na tarefa 6.1 na pratica exigiam login. Adicionado allowlist explicito para `/sdr` e `/api/sdr`.

**Arquivos criados:**
- `apps/web/app/sdr/[organizationId]/page.tsx`
- `apps/web/app/sdr/[organizationId]/chat-widget.tsx`

**Arquivos alterados:**
- `apps/web/lib/auth.config.ts`
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`

## [V.1.5.0] — 2026-09-09

### Fase 6.1 — IA SDR: backend de conversa com classificacao automatica
- Adicionados os models `SdrConversation` e `SdrMessage` (+ enums `SdrLeadTemperature`: `COLD`/`WARM`/`HOT` e `SdrMessageRole`: `LEAD`/`ASSISTANT`) ao schema Prisma, relacionados a `Organization`. Alteracao de schema solicitada explicitamente pelo usuario ao iniciar a tarefa 6.1. `npx prisma generate` executado (sem banco local disponivel para `migrate dev` neste ambiente).
- Criado `lib/ai/anthropic-client.ts`: cliente fino (via `fetch`, sem SDK adicional) para `https://api.anthropic.com/v1/messages`, usando `tool_choice` forcado para garantir sempre uma resposta estruturada `{ reply, classification }` do modelo `claude-haiku-4-5-20251001`.
- Criadas rotas publicas (sem sessao de usuario) `POST /api/sdr/[organizationId]/conversations` (inicia conversa, valida organizacao + integracao Anthropic configurada) e `POST /api/sdr/[organizationId]/conversations/[conversationId]/messages` (envia mensagem do lead, persiste o historico, chama a IA com a chave descriptografada da organizacao e classifica automaticamente a conversa).
- A chave de API da organizacao nunca e retornada em nenhuma resposta HTTP; e descriptografada apenas em memoria no momento da chamada a Anthropic.
- Ainda sem widget/UI publica para o lead (tarefa 6.2) e sem geracao automatica de Lead/Oportunidade no CRM (tarefa 6.3).

**Arquivos criados:**
- `apps/web/lib/ai/anthropic-client.ts`
- `apps/web/lib/validations/sdr-conversation.ts`
- `apps/web/app/api/sdr/[organizationId]/conversations/route.ts`
- `apps/web/app/api/sdr/[organizationId]/conversations/[conversationId]/messages/route.ts`

**Arquivos alterados:**
- `apps/web/prisma/schema.prisma`
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`

## [V.1.4.0] — 2026-09-09

### Fase 6 (planejamento) — IA SDR
- Entre os dois modulos de IA previstos (Modulo 3 — IA SDR, Modulo 4 — Consultor Digital), o usuario definiu priorizar o **IA SDR**.
- Detalhada a FASE 6 em `docs/TASKS.md`, quebrada em 4 subtarefas incrementais: (6.1) modelo de conversa do SDR + endpoint de chat com classificacao automatica via IA, (6.2) widget publico embarcavel, (6.3) conversa qualificada gera Lead/Oportunidade no CRM, (6.4) notificacao ao consultor.
- Nenhum codigo foi alterado nesta tarefa — apenas planejamento, conforme recomendado em `docs/CURRENT_STATE.md` ("definir e detalhar o proximo modulo de IA antes de iniciar nova implementacao").

**Arquivos alterados:**
- `docs/TASKS.md`
- `docs/CURRENT_STATE.md`
- `CHANGELOG.md`

## [V.1.3.1] — 2026-09-08

### Correcoes — encontradas ao rodar o app localmente pela primeira vez (Postgres via Docker + `prisma migrate dev` + fluxo completo testado no navegador)

- **Bug: diagnostico era salvo prematuramente ao avancar da etapa "Processo" para "Revisao".**
  Causa: o botao "Proximo"/"Salvar diagnostico" e o MESMO componente `<Button>` na mesma posicao da arvore, alternando `type="button"`/`type="submit"` via ternario. Ao clicar em "Proximo" no penultimo passo, o React atualiza o estado (`isLastStep` passa a `true`) e re-renderiza sincronamente ainda durante o mesmo evento de clique/tecla, trocando o `type` do botao para `"submit"` — e o navegador entao dispara a submissao nativa do formulario com base no `type` JA ATUALIZADO, pulando a tela de revisao. Reproduzido de forma deterministica tanto por mouse quanto por teclado (Enter).
  Correcao: `handleSubmit` deixou de depender do evento nativo do formulario; o botao final agora e sempre `type="button"` e chama `handleSubmit()` diretamente (`apps/web/app/(app)/diagnostico/wizard.tsx`).

- **Bug: selects de estagio/status/prioridade/empresa/contato mostravam o valor bruto (`PROSPECTING`, `PENDING`) em vez do rotulo (`Prospeccao`, `Pendente`).**
  Causa: `<Select.Value>` do Base UI, sem `items` no `Select.Root`, exibe o valor bruto por padrao. Correcao: passado um `children` (funcao `value => label`) para cada `<SelectValue>`, com fallback para o placeholder quando vazio. Afetava `opportunity-card.tsx` (estagio), `task-status-select.tsx` (status), `task-form-dialog.tsx` (prioridade), `contact-form-dialog.tsx` e `opportunity-form-dialog.tsx` (empresa/contato).

**Arquivos alterados:**
- `apps/web/app/(app)/diagnostico/wizard.tsx`
- `apps/web/app/(app)/pipeline/opportunity-card.tsx`
- `apps/web/app/(app)/pipeline/opportunity-form-dialog.tsx`
- `apps/web/app/(app)/planos/[id]/task-status-select.tsx`
- `apps/web/app/(app)/planos/[id]/task-form-dialog.tsx`
- `apps/web/app/(app)/contatos/contact-form-dialog.tsx`
- `docs/CURRENT_STATE.md`

## [V.1.3.0] — 2026-09-08

### Fase 5.1 — Configuracoes: Integracoes de IA
- Adicionado o model `ApiIntegration` (enum `ApiProvider`: `ANTHROPIC`, `OPENAI`) ao schema Prisma, relacionado a `Organization`, com chave unica por (organizacao, provedor). Alteracao de schema solicitada explicitamente pelo usuario. `npx prisma generate` executado (sem banco local disponivel para `migrate dev` neste ambiente).
- Criado `lib/security/crypto.ts` (AES-256-GCM) para criptografar/descriptografar/mascarar as chaves de API antes de persistir ou exibir.
- Criadas rotas `GET/POST /api/settings/integrations` e `DELETE /api/settings/integrations/[provider]`, isoladas por organizacao.
- Criada pagina `/configuracoes` (ja linkada na sidebar) com um card por provedor de IA, permitindo configurar, atualizar e remover a chave — nunca exibida em texto puro.
- Adicionada `INTEGRATION_ENCRYPTION_KEY` ao `.env.example`.
- Prepara a base para os futuros modulos de IA (IA SDR, Consultor Digital) consumirem uma chave por organizacao; nenhuma chamada de IA foi implementada nesta tarefa.

**Arquivos criados:**
- `apps/web/lib/security/crypto.ts`
- `apps/web/lib/validations/api-integration.ts`
- `apps/web/app/api/settings/integrations/route.ts`
- `apps/web/app/api/settings/integrations/[provider]/route.ts`
- `apps/web/app/(app)/configuracoes/page.tsx`
- `apps/web/app/(app)/configuracoes/integration-card.tsx`

**Arquivos alterados:**
- `apps/web/prisma/schema.prisma`
- `apps/web/.env.example`
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`

## [V.1.2.0] — 2026-09-08

### Fase 4.3 — Gerar Plano de Acao a partir do Diagnostico
- Criado `lib/diagnostico/action-plan-id.ts` com um `id` deterministico (`actionplan-diagnostico-<diagnosticId>`) para o `ActionPlan`, usado como chave de idempotencia sem alterar o schema.
- Criada rota `POST /api/diagnosticos/[id]/plano`: gera o `ActionPlan` com uma `ActionTask` por recomendacao do diagnostico; reaproveita o plano existente em chamadas repetidas.
- Pagina `/diagnostico/[id]` ganha o botao "Gerar plano de acao" (`create-plan-button.tsx`), ao lado do botao de oportunidade, que vira link para `/planos/[id]` apos a criacao.
- FASE 4 (Plano de Acao) concluida: Planos, Tarefas e a integracao Diagnostico -> Plano de Acao estao fechadas.

**Arquivos criados:**
- `apps/web/lib/diagnostico/action-plan-id.ts`
- `apps/web/app/api/diagnosticos/[id]/plano/route.ts`
- `apps/web/app/(app)/diagnostico/[id]/create-plan-button.tsx`

**Arquivos alterados:**
- `apps/web/app/(app)/diagnostico/[id]/page.tsx`
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`

## [V.1.1.0] — 2026-09-08

### Documentacao — README do projeto
- Reescrito `apps/web/README.md` (ainda com o boilerplate do `create-next-app`) explicando o que o SalesOS realmente faz: o loop Diagnostico -> Score/Insights -> CRM -> Dashboard -> Plano de Acao, multiempresa, stack e como rodar localmente.

### Fase 4.2 — Plano de Acao: Detalhe (Tarefas)
- Criada validacao Zod `actionTaskInputSchema`/`actionTaskStatusUpdateSchema` e rotas `GET/POST /api/action-plans/[id]/tasks` + `PATCH /api/action-plans/[id]/tasks/[taskId]`, sempre checando a posse do plano pai pela organizacao.
- Criada pagina `/planos/[id]` com cabecalho do plano e tabela de tarefas (titulo, responsavel, prioridade, prazo, status), dialog de criacao (`task-form-dialog.tsx`) e select de status por linha (`task-status-select.tsx`).
- `/planos` passa a linkar o titulo de cada plano para o seu detalhe.

**Arquivos criados:**
- `apps/web/lib/validations/action-task.ts`
- `apps/web/app/api/action-plans/[id]/tasks/route.ts`
- `apps/web/app/api/action-plans/[id]/tasks/[taskId]/route.ts`
- `apps/web/app/(app)/planos/[id]/page.tsx`
- `apps/web/app/(app)/planos/[id]/task-form-dialog.tsx`
- `apps/web/app/(app)/planos/[id]/task-status-select.tsx`

**Arquivos alterados:**
- `apps/web/app/(app)/planos/page.tsx`
- `apps/web/README.md`
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`

## [V.1.0.0] — 2026-09-08

### Fase 4.1 — Plano de Acao: Listagem e Cadastro
- Definida a FASE 4 (Plano de Acao) em `docs/TASKS.md`, cobrindo a pagina `/planos` ja linkada na sidebar.
- Criada validacao Zod `actionPlanInputSchema` e rota `GET/POST /api/action-plans`, isolada por `organizationId`, com contagem de tarefas por plano.
- Criada pagina `/planos` com tabela de planos (titulo, objetivo, status, tarefas, criado em) e estado vazio, e dialog de cadastro (`action-plan-form-dialog.tsx`).

**Arquivos criados:**
- `apps/web/lib/validations/action-plan.ts`
- `apps/web/app/api/action-plans/route.ts`
- `apps/web/app/(app)/planos/page.tsx`
- `apps/web/app/(app)/planos/action-plan-form-dialog.tsx`

**Arquivos alterados:**
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`

## [V.0.9.0] — 2026-09-08

### Fase 3.4 — Criar Oportunidade a partir do Diagnostico
- Criado `lib/diagnostico/opportunity-marker.ts` com um marcador textual (`[diagnostico:<id>]`) gravado em `Opportunity.notes`, usado para idempotencia sem alterar o schema.
- Criada rota `POST /api/diagnosticos/[id]/oportunidade`: encontra/cria a `Company` pelo nome do diagnostico e cria a `Opportunity` inicial em `PROSPECTING` com valor igual ao ticket medio; reaproveita a oportunidade existente em chamadas repetidas.
- Pagina `/diagnostico/[id]` ganha o botao "Criar oportunidade no CRM" (`create-opportunity-button.tsx`), que vira link para o pipeline apos a criacao.
- FASE 3 (CRM Inteligente) concluida: Empresas, Contatos, Pipeline e a integracao Diagnostico -> CRM -> Dashboard estao fechadas.

**Arquivos criados:**
- `apps/web/lib/diagnostico/opportunity-marker.ts`
- `apps/web/app/api/diagnosticos/[id]/oportunidade/route.ts`
- `apps/web/app/(app)/diagnostico/[id]/create-opportunity-button.tsx`

**Arquivos alterados:**
- `apps/web/app/(app)/diagnostico/[id]/page.tsx`
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`

## [V.0.8.0] — 2026-09-08

### Fase 3.3 — CRM Inteligente: Pipeline de Oportunidades
- Criada validacao Zod `opportunityInputSchema`/`opportunityStageUpdateSchema` e rotas `GET/POST /api/opportunities` + `PATCH /api/opportunities/[id]`, isoladas por `organizationId`.
- Criada pagina `/pipeline` com board de 6 colunas (uma por estagio), contagem e soma de valor por coluna, dialog de criacao (`opportunity-form-dialog.tsx`) e card com select de estagio (`opportunity-card.tsx`).
- Oportunidades criadas aqui passam a alimentar de verdade os KPIs do dashboard (Pipeline Total, Oportunidades, Taxa de Conversao).

**Arquivos criados:**
- `apps/web/lib/validations/opportunity.ts`
- `apps/web/app/api/opportunities/route.ts`
- `apps/web/app/api/opportunities/[id]/route.ts`
- `apps/web/app/(app)/pipeline/page.tsx`
- `apps/web/app/(app)/pipeline/opportunity-form-dialog.tsx`
- `apps/web/app/(app)/pipeline/opportunity-card.tsx`

**Arquivos alterados:**
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`

## [V.0.7.0] — 2026-09-08

### Fase 3.2 — CRM Inteligente: Contatos
- Criada validacao Zod `contactInputSchema` e rota `GET/POST /api/contacts`, isolada por `organizationId`, com checagem de posse da empresa vinculada.
- Criada pagina `/contatos` com tabela de contatos (nome, empresa, cargo, contato) e estado vazio, e dialog de cadastro (`contact-form-dialog.tsx`) com select de empresas.

**Arquivos criados:**
- `apps/web/lib/validations/contact.ts`
- `apps/web/app/api/contacts/route.ts`
- `apps/web/app/(app)/contatos/page.tsx`
- `apps/web/app/(app)/contatos/contact-form-dialog.tsx`

**Arquivos alterados:**
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`

## [V.0.6.0] — 2026-09-08

### Fase 3.1 — CRM Inteligente: Empresas
- Definida a FASE 3 (CRM Inteligente) em `docs/TASKS.md`, cobrindo as paginas `/empresas`, `/contatos` e `/pipeline` ja linkadas na sidebar.
- Criada validacao Zod `companyInputSchema` e rota `GET/POST /api/companies`, isolada por `organizationId`.
- Criada pagina `/empresas` com tabela de empresas e estado vazio, e dialog de cadastro (`company-form-dialog.tsx`).

**Arquivos criados:**
- `apps/web/lib/validations/company.ts`
- `apps/web/app/api/companies/route.ts`
- `apps/web/app/(app)/empresas/page.tsx`
- `apps/web/app/(app)/empresas/company-form-dialog.tsx`

**Arquivos alterados:**
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`

## [V.0.5.0] — 2026-09-08

### Fase 2.4 — Dashboard Executivo com KPIs Reais
- Criado `lib/dashboard/kpis.ts` com `getExecutiveKpis`, calculando Pipeline Total, Leads Ativos, Oportunidades e Taxa de Conversao a partir de `Lead`/`Opportunity`, filtrados por organizacao, com variacao vs mes anterior.
- `apps/web/app/(app)/dashboard/page.tsx` passa a ser Server Component assincrona, substituindo os KPIs fixos por dados reais do banco.
- FASE 2 (Diagnostico Comercial + Dashboard Inicial) concluida.

**Arquivos criados:**
- `apps/web/lib/dashboard/kpis.ts`

**Arquivos alterados:**
- `apps/web/app/(app)/dashboard/page.tsx`
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`

## [V.0.4.0] — 2026-09-08

### Fase 2.3 — Pagina de Resultado do Diagnostico
- Refatorado `lib/scoring/maturity.ts` para expor `calculateMaturityPillars`, reaproveitado pelo scoring e pelos novos insights.
- Criado `lib/scoring/insights.ts` com `generateBottlenecks` e `generateRecommendations`, derivados dos mesmos pilares do score.
- `POST /api/diagnosticos` passa a gravar `bottlenecks` e `recommendations` junto com `maturityScore`.
- Criada pagina `/diagnostico/[id]` (Server Component) exibindo nota, gargalos e recomendacoes, isolada por `organizationId`.
- Tela final do wizard agora linka para o resultado do diagnostico criado.

**Arquivos criados:**
- `apps/web/lib/scoring/insights.ts`
- `apps/web/app/(app)/diagnostico/[id]/page.tsx`

**Arquivos alterados:**
- `apps/web/lib/scoring/maturity.ts`
- `apps/web/app/api/diagnosticos/route.ts`
- `apps/web/app/(app)/diagnostico/wizard.tsx`
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`

## [V.0.3.0] — 2026-09-08

### Fase 2.2 — Engine de Scoring de Maturidade Comercial
- Criada engine de scoring (`apps/web/lib/scoring/maturity.ts`) com 4 pilares ponderados: CRM em uso, processo comercial documentado, taxa de conversao e leads por vendedor.
- `POST /api/diagnosticos` passa a calcular e gravar `maturityScore` no momento da criacao do diagnostico.

**Arquivos criados:**
- `apps/web/lib/scoring/maturity.ts`

**Arquivos alterados:**
- `apps/web/app/api/diagnosticos/route.ts`
- `docs/SPEC.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`

## [V.0.1.0] — 2026-05-29

### Fase 1 — Estrutura Documental
- Criação do CLAUDE.md com visão, stack e regras do projeto
- Criação do CHANGELOG.md
- Criação de docs/CURRENT_STATE.md
- Criação de docs/TASKS.md
- Criação de docs/ARCHITECTURE.md
- Leitura e ingestão do Prompt Mestre V.1.0

**Arquivos criados:**
- `CLAUDE.md`
- `CHANGELOG.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
