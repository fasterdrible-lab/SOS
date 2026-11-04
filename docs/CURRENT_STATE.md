# CURRENT_STATE.md - SalesOS

**Versao atual:** V.1.20.0 em producao (`salesos-web:10`)
**Data:** 2026-11-04
**Fase:** Prompt Mestre V2 - FASES V2-1 a V2-3 e V2-4.1 publicadas; proxima: V2-4.2

## Estado Atual
`https://saleos.tech` esta no ar, com app e banco em Docker na VPS `200.141.20.162` (`/opt/salesos`), atras do nginx, ao lado da producao do SALE-IA. Operacao em `docs/DEPLOY.md`; uso das telas em `docs/GUIA_DE_USO.md`.

- **Codigo:** branch `feat/saleos-v2`, alinhada com `main` no GitHub. A producao roda exatamente esse codigo.
- **Producao:** imagem `salesos-web:10` desde 2026-11-04, `next` 16.4.3, `next-auth` 5.0.0-beta.32. 6 migrations aplicadas. Imagem `salesos-web:9` mantida na VPS, mas a migration `20261103000000_pipelines` nao e aditiva: reverter para ela exige restaurar o backup `salesos-20261103-024921` (`docs/DEPLOY.md`).
- **Dados:** 1 usuario (admin, papel `CONSULTANT`), 1 cliente e 1 empresa. Nenhuma oportunidade, meta ou chave de IA cadastrada.
- **Prompt Mestre V2** (`docs/AUDITORIA_V2.md`, `docs/TASKS.md`), publicado em 2026-10-31:
  - V2-1.1: papeis (administrador, gestor, vendedor), dono da oportunidade, sessao revalidada no banco, `AuditLog` e correcao de falhas criticas do `next` e do `next-auth`.
  - V2-1.2: historico de etapas, datas reais de ganho e perda, motivo de perda, reabertura restrita, valores em `Decimal`, criacao idempotente.
  - V2-1.3: lint zerado, erros da API padronizados, logs seguros e CI no GitHub Actions.
  - V2-2.1: Meu Dia como pagina inicial, metas mensais, cabecalho global com Sair e menu filtrado pelo papel.
  - V2-2.2 (publicada em 2026-11-02): busca global, notificacoes e tema claro no cabecalho.
  - V2-3 (publicada em 2026-11-02): Dashboard Executivo com filtros de periodo e vendedor, funil, saude, metas, time, origem e motivos de perda.
  - V2-4.1 (publicada em 2026-11-04): funis e etapas configuraveis, status (em andamento, ganha, perdida) separado da etapa.
- **Testes:** 70 unitarios e 93 de integracao; o CI roda todos a cada push.
- **Protecoes:** limite de uso do IA SDR (conversa, organizacao e IP), backup diario local e criptografado no Backblaze B2 (ultimo manual: `salesos-20261103-024921`, antes da publicacao da V2-4.1), `www.saleos.tech` com certificado.
- **IA:** nenhuma chave cadastrada em producao; IA SDR e Consultor Digital ainda nao respondem (tarefa 9.2).

## Historico anterior ao Prompt Mestre V2

Antes disso, a Tarefa 9.1 foi concluida: o app foi exercitado contra o banco real de desenvolvimento (container Docker `salesos-postgres`, porta 5437, migrations ja aplicadas e sem desvio em relacao ao schema) com um roteiro HTTP de 47 verificacoes, todas aprovadas, sem alteracao de codigo. As respostas reais da IA continuam sem validacao (tarefa 9.2), por falta de uma chave Anthropic valida.

Antes desta fase, a Tarefa 8.3 foi concluida: a pagina `/clientes` (ja linkada na sidebar desde a FASE 1, ate entao sem destino) lista todas as organizacoes das quais o consultor e membro, com metricas resumidas por cliente (score do ultimo diagnostico, pipeline total, progresso do plano de acao), um botao "Acessar" por linha (troca a organizacao ativa via `POST /api/session/organization`, tarefa 8.1, e leva ao `/dashboard` daquele cliente) e um formulario "Novo cliente" que cria a organizacao (`POST /api/organizations`, tarefa 8.2) e ja entra nela automaticamente. Com isso, o Modulo 7 (Dashboard Consultoria) fica utilizavel de ponta a ponta pela primeira vez: um consultor consegue gerenciar multiplas organizacoes-cliente de fato, nao so no schema.

FASE 8 concluida: 8.1 (sessao multi-organizacao), 8.2 (criar organizacao-cliente) e 8.3 (pagina "Meus Clientes") fecham o ultimo modulo do produto principal ainda nao construido (`docs/ARCHITECTURE.md`, Modulo 7). Ver `docs/TASKS.md` para o detalhamento completo das 3 subtarefas.

Antes desta fase, a Tarefa 7.2 havia concluido a FASE 7 (Consultor Digital): a pagina `/consultor` e uma interface de chat autenticada que mostra o historico existente, permite enviar mensagens e ve as respostas da IA contextualizadas pelo ultimo diagnostico e pelos KPIs do CRM (backend da tarefa 7.1). Organizacao sem integracao Anthropic configurada ve um CTA direto para `/configuracoes` em vez do chat. Com isso, os dois modulos de IA previstos em `docs/ARCHITECTURE.md` (IA SDR e Consultor Digital) estao implementados de ponta a ponta.

Primeira execucao end-to-end do app localmente (Postgres via Docker + `prisma migrate dev` + usuario demo) revelou e corrigiu 2 bugs reais (ver `CHANGELOG.md` V.1.3.1): submissao prematura do wizard de diagnostico e selects exibindo o valor bruto em vez do rotulo.

## Estrutura Relevante
```
apps/web/app/(app)/diagnostico/page.tsx           -> pagina autenticada do diagnostico (form)
apps/web/app/(app)/diagnostico/wizard.tsx         -> wizard multi-step
apps/web/app/(app)/diagnostico/[id]/page.tsx      -> pagina de resultado (nota + gargalos + recomendacoes + criar oportunidade/plano)
apps/web/app/(app)/diagnostico/[id]/create-opportunity-button.tsx -> botao/link de conversao para oportunidade
apps/web/app/(app)/diagnostico/[id]/create-plan-button.tsx -> botao/link de conversao para plano de acao
apps/web/app/(app)/configuracoes/page.tsx         -> tela de configuracoes (integracoes de IA)
apps/web/app/(app)/configuracoes/integration-card.tsx -> card por provedor com dialog de chave de API
apps/web/app/(app)/dashboard/page.tsx             -> dashboard executivo com KPIs reais
apps/web/app/(app)/empresas/page.tsx              -> listagem de empresas (CRM)
apps/web/app/(app)/empresas/company-form-dialog.tsx -> dialog de cadastro de empresa
apps/web/app/(app)/contatos/page.tsx              -> listagem de contatos (CRM)
apps/web/app/(app)/contatos/contact-form-dialog.tsx -> dialog de cadastro de contato
apps/web/app/(app)/pipeline/page.tsx              -> board de oportunidades por estagio (CRM)
apps/web/app/(app)/pipeline/opportunity-form-dialog.tsx -> dialog de criacao de oportunidade
apps/web/app/(app)/pipeline/opportunity-card.tsx  -> card com select de estagio
apps/web/app/(app)/planos/page.tsx                -> listagem de planos de acao
apps/web/app/(app)/planos/action-plan-form-dialog.tsx -> dialog de cadastro de plano
apps/web/app/(app)/planos/[id]/page.tsx           -> detalhe do plano (tarefas)
apps/web/app/(app)/planos/[id]/task-form-dialog.tsx -> dialog de criacao de tarefa
apps/web/app/(app)/planos/[id]/task-status-select.tsx -> select de status por tarefa
apps/web/app/api/diagnosticos/route.ts            -> criacao do diagnostico + calculo do score/insights
apps/web/app/api/diagnosticos/[id]/oportunidade/route.ts -> conversao do diagnostico em empresa + oportunidade
apps/web/app/api/diagnosticos/[id]/plano/route.ts -> geracao de plano de acao a partir das recomendacoes
apps/web/app/api/settings/integrations/route.ts   -> listagem/upsert de integracoes de IA (mascaradas)
apps/web/app/api/settings/integrations/[provider]/route.ts -> remocao de integracao de IA
apps/web/app/api/companies/route.ts               -> listagem/criacao de empresas
apps/web/app/api/contacts/route.ts                -> listagem/criacao de contatos
apps/web/app/api/opportunities/route.ts           -> listagem/criacao de oportunidades
apps/web/app/api/opportunities/[id]/route.ts      -> atualizacao de estagio da oportunidade
apps/web/app/api/action-plans/route.ts            -> listagem/criacao de planos de acao
apps/web/app/api/action-plans/[id]/tasks/route.ts -> listagem/criacao de tarefas do plano
apps/web/app/api/action-plans/[id]/tasks/[taskId]/route.ts -> atualizacao de status da tarefa
apps/web/lib/validations/diagnostic.ts            -> schema Zod compartilhado (diagnostico)
apps/web/lib/validations/company.ts               -> schema Zod compartilhado (empresa)
apps/web/lib/validations/contact.ts               -> schema Zod compartilhado (contato)
apps/web/lib/validations/opportunity.ts           -> schema Zod compartilhado (oportunidade)
apps/web/lib/validations/action-plan.ts           -> schema Zod compartilhado (plano de acao)
apps/web/lib/validations/action-task.ts           -> schema Zod compartilhado (tarefa do plano)
apps/web/lib/diagnostico/opportunity-marker.ts    -> marcador de idempotencia diagnostico->oportunidade
apps/web/lib/diagnostico/action-plan-id.ts        -> id deterministico de idempotencia diagnostico->plano de acao
apps/web/lib/security/crypto.ts                   -> criptografia (AES-256-GCM) e mascaramento de chaves de API
apps/web/lib/validations/api-integration.ts       -> schema Zod compartilhado (integracao de IA)
apps/web/lib/scoring/maturity.ts                  -> engine de scoring de maturidade comercial
apps/web/lib/scoring/insights.ts                  -> geracao de gargalos e recomendacoes
apps/web/lib/dashboard/kpis.ts                    -> KPIs resumidos (Consultor Digital e Meus Clientes)
apps/web/lib/dashboard/period.ts                  -> periodos do dashboard e comparacao (regra pura)
apps/web/lib/dashboard/metrics.ts                 -> funil, time, origens, motivos e ciclo (regra pura)
apps/web/lib/dashboard/executive.ts               -> consultas do Dashboard Executivo e filtro de vendedor
apps/web/app/(app)/dashboard/dashboard-filters.tsx -> filtros de periodo e vendedor
apps/web/app/api/dashboard/route.ts               -> Dashboard Executivo em JSON
apps/web/lib/pipelines/defaults.ts                -> funil padrao e ids deterministicos
apps/web/lib/pipelines/edit.ts                    -> plano de edicao das etapas (regra pura)
apps/web/lib/pipelines/service.ts                 -> funil padrao, listagem de funis e validacao de etapa
apps/web/lib/validations/pipeline.ts              -> schema Zod do funil
apps/web/app/api/pipelines/route.ts               -> lista e cria funis
apps/web/app/api/pipelines/[id]/route.ts          -> edita etapas e arquiva funil
apps/web/app/(app)/pipeline/pipeline-editor-dialog.tsx -> dialogo "Funis" (gestor e administrador)
apps/web/lib/ai/anthropic-client.ts               -> cliente fino da Anthropic (chat + classificacao via tool use)
apps/web/lib/validations/sdr-conversation.ts      -> schema Zod compartilhado (conversa/mensagem do IA SDR)
apps/web/app/api/sdr/[organizationId]/conversations/route.ts -> inicia conversa do IA SDR (publico)
apps/web/app/api/sdr/[organizationId]/conversations/[conversationId]/messages/route.ts -> envia mensagem do lead + resposta/classificacao da IA (publico)
apps/web/app/sdr/[organizationId]/page.tsx        -> pagina publica do widget do IA SDR
apps/web/app/sdr/[organizationId]/chat-widget.tsx -> janela de chat client-side do IA SDR
apps/web/lib/sdr/lead-id.ts                       -> ids deterministicos de idempotencia conversa IA SDR -> Lead/Oportunidade
apps/web/lib/sdr/notifications.ts                 -> contagem/marcacao de leads qualificados vistos pelo consultor
apps/web/app/(app)/sdr/page.tsx                   -> console autenticado de conversas do IA SDR (consultor)
apps/web/app/(app)/layout.tsx                     -> layout autenticado: sidebar, cabecalho global, cliente ativo e aviso sem cliente
apps/web/components/app-sidebar.tsx               -> menu lateral filtrado pelo papel, com badge de leads qualificados no item "IA SDR"
apps/web/lib/validations/consultant-message.ts    -> schema Zod compartilhado (mensagem do Consultor Digital)
apps/web/app/api/consultor/messages/route.ts      -> historico/envio de mensagem do Consultor Digital (autenticado, contextualizado)
apps/web/app/(app)/consultor/page.tsx             -> pagina autenticada de chat do Consultor Digital
apps/web/app/(app)/consultor/consultant-chat.tsx  -> componente client-side do chat do Consultor Digital
apps/web/lib/validations/session-organization.ts  -> schema Zod compartilhado (troca de organizacao ativa)
apps/web/app/api/session/organization/route.ts    -> troca a organizacao ativa da sessao (revalida posse no banco)
apps/web/lib/organizations/slug.ts                -> geracao de slug unico a partir do nome da organizacao
apps/web/lib/validations/organization.ts          -> schema Zod compartilhado (criacao de organizacao)
apps/web/app/api/organizations/route.ts           -> cria organizacao-cliente + membro (role CONSULTANT)
apps/web/lib/organizations/client-summary.ts      -> metricas resumidas por cliente do consultor (score, pipeline, plano de acao)
apps/web/app/(app)/clientes/page.tsx              -> pagina "Meus Clientes" (listagem cross-organizacao)
apps/web/app/(app)/clientes/client-access-button.tsx -> botao que troca a organizacao ativa por linha
apps/web/app/(app)/clientes/new-client-dialog.tsx -> dialog de criacao de cliente (cria + troca + redireciona)
docs/SPEC.md                                      -> spec das Fases 2, 3, 4, 6 e 7
docs/DEPLOY.md                                    -> operacao de producao (publicar, backups, restauracao, diagnostico)
apps/web/lib/sdr/usage-limits.ts                  -> limites de mensagens do IA SDR por conversa e por organizacao
apps/web/scripts/create-admin.mjs                 -> cria usuario ou redefine a senha (nao ha cadastro publico)
apps/web/Dockerfile                               -> imagem de producao
deploy/docker-compose.yml                         -> app + PostgreSQL na VPS
deploy/nginx-saleos.conf                          -> site saleos.tech + limite por IP do IA SDR
deploy/backup.sh                                  -> backup diario, local e no Backblaze B2
deploy/setup-offsite.sh                           -> configura ou troca a chave do Backblaze
deploy/salesos-backup.service, .timer             -> agendamento do backup
README.md                                         -> indice da documentacao
docs/GUIA_DE_USO.md                               -> uso das telas, papeis e metas (para usuarios)
docs/AUDITORIA_V2.md                              -> Etapa Zero do Prompt Mestre V2
.github/workflows/ci.yml                          -> CI: lint, tipos, testes, migrations, build e integracao
apps/web/lib/authz/permissions.ts                 -> papeis, matriz de permissoes e escopo de oportunidades do vendedor
apps/web/lib/authz/guard.ts                       -> denyUnless: 403 padronizado nas rotas
apps/web/lib/audit/record.ts                      -> gravacao no AuditLog
apps/web/components/access-denied.tsx             -> tela "Acesso restrito"
apps/web/lib/api/errors.ts                        -> erros padronizados { error, code, fields? } e log seguro
apps/web/lib/api/handler.ts                       -> withApiErrors: 500 em JSON para erro inesperado
apps/web/lib/opportunities/rules.ts               -> regras de etapa, probabilidade e vinculo contato-empresa
apps/web/lib/opportunities/create.ts              -> criacao de oportunidade com historico; serializacao do Decimal
apps/web/lib/time/business-calendar.ts            -> dia, mes e dias uteis no fuso de Brasilia
apps/web/lib/meu-dia/goal-progress.ts             -> calculo da meta, ideal, projecao, conversao e ticket
apps/web/lib/meu-dia/summary.ts                   -> indicadores do Meu Dia por papel
apps/web/lib/navigation.ts                        -> itens do menu e titulos do cabecalho
apps/web/lib/validations/goal.ts                  -> schema Zod das metas
apps/web/components/app-header.tsx                -> cabecalho global com menu do usuario (Trocar de cliente, Sair)
apps/web/app/(app)/meu-dia/page.tsx               -> pagina Meu Dia
apps/web/app/(app)/meu-dia/goal-dialog.tsx        -> dialogo de metas da equipe e por vendedor
apps/web/app/api/meu-dia/route.ts                 -> indicadores do Meu Dia em JSON
apps/web/app/api/goals/route.ts                   -> grava e remove metas (auditado)
apps/web/lib/theme.ts                             -> tema claro/escuro (cookie `salesos-theme`, escuro por padrao)
apps/web/components/theme-toggle.tsx              -> botao de tema do cabecalho
apps/web/lib/notifications/build.ts               -> lista de notificacoes a partir das contagens (regra pura)
apps/web/lib/notifications/summary.ts             -> contagens das notificacoes por papel
apps/web/components/notifications-menu.tsx        -> sino com contador no cabecalho
apps/web/app/api/notifications/route.ts           -> notificacoes em JSON
apps/web/lib/search/query.ts                      -> normalizacao e limites do termo de busca
apps/web/lib/search/global-search.ts              -> busca por papel em negociacoes, empresas, contatos e planos
apps/web/components/global-search.tsx             -> dialogo de busca (Ctrl+K)
apps/web/app/api/search/route.ts                  -> busca global em JSON
apps/web/tests/support.mjs                        -> cliente HTTP e travas de ambiente dos testes de integracao
apps/web/tests/*.test.mjs                         -> testes unitarios (permissoes, etapas, erros, calendario, metas)
apps/web/tests/*.integration.mjs                  -> testes HTTP (autorizacao, regras comerciais, erros, Meu Dia)
```

## Funcionalidades Concluidas
- [x] Estrutura documental (CLAUDE.md, docs/, CHANGELOG.md)
- [x] Scaffold Next.js 16 + TypeScript + Tailwind CSS v4 + Shadcn UI
- [x] Design system SalesOS
- [x] Prisma 7 + PostgreSQL adapter + schema multiempresa
- [x] NextAuth v5 com JWT + Google + Credentials + multiempresa
- [x] Layout base: sidebar com modulos + header
- [x] Tela de login com identidade SalesOS
- [x] Dashboard inicial com KPIs e CTA diagnostico
- [x] Proxy/middleware de protecao de rotas
- [x] Wizard multi-step de Diagnostico Comercial
- [x] API autenticada para salvar diagnostico por organizacao
- [x] Engine de scoring de maturidade comercial
- [x] Pagina de resultado do diagnostico (nota + gargalos + recomendacoes)
- [x] Dashboard executivo com KPIs reais (Pipeline, Leads, Oportunidades, Conversao)
- [x] Empresas: listagem + cadastro (`/empresas`)
- [x] Contatos: listagem + cadastro vinculado a empresa (`/contatos`)
- [x] Pipeline de Oportunidades: board por estagio (`/pipeline`)
- [x] Criar oportunidade a partir do resultado do diagnostico
- [x] Planos de Acao: listagem + cadastro (`/planos`)
- [x] Detalhe do plano: tarefas do plano (criar + mudar status)
- [x] Gerar plano de acao a partir das recomendacoes do diagnostico
- [x] Configuracoes: integracoes de IA (chaves de API por organizacao)
- [x] IA SDR: backend de conversa com classificacao automatica
- [x] IA SDR: widget publico embarcavel (`/sdr/[organizationId]`)
- [x] IA SDR: conversa qualificada (`HOT`) gera Lead/Oportunidade no CRM automaticamente
- [x] IA SDR: notificacao in-app ao consultor (badge na sidebar + console `/sdr`)
- [x] Consultor Digital: backend de chat autenticado contextualizado (diagnostico + KPIs)
- [x] Consultor Digital: pagina de chat (`/consultor`)
- [x] Sessao multi-organizacao: trocar a organizacao ativa entre as que o usuario pertence (`POST /api/session/organization`)
- [x] Consultor cria uma nova organizacao-cliente (`POST /api/organizations`)
- [x] Pagina "Meus Clientes" (`/clientes`): listagem cross-organizacao com metricas por cliente + acessar + novo cliente
- [x] Aviso global quando nao ha cliente ativo
- [x] Publicacao em `https://saleos.tech` (VPS, Docker, nginx, HTTPS)
- [x] Limite de uso da rota publica do IA SDR
- [x] Backup diario local e externo criptografado
- [x] `www.saleos.tech` com certificado e redirecionamento
- [x] Papeis administrador, gestor e vendedor verificados no backend (V2-1.1)
- [x] Vendedor limitado as proprias oportunidades (V2-1.1)
- [x] Sessao revalidada no banco e `AuditLog` (V2-1.1)
- [x] Historico de etapas, datas reais de ganho e perda, motivo de perda e reabertura restrita (V2-1.2)
- [x] Valores em `Decimal` e criacao idempotente de oportunidades (V2-1.2)
- [x] Erros da API padronizados, logs seguros, lint zerado e CI (V2-1.3)
- [x] Meu Dia como pagina inicial, com indicadores reais por papel (V2-2.1)
- [x] Metas mensais da equipe e por vendedor (V2-2.1)
- [x] Cabecalho global com Sair e menu filtrado pelo papel (V2-2.1)
- [x] Busca global no cabecalho, respeitando o papel (V2-2.2)
- [x] Notificacoes derivadas no cabecalho (V2-2.2)
- [x] Tema claro, escolhido pelo usuario (V2-2.2)
- [x] Dashboard Executivo com filtros, funil, metas, time, origem e motivos de perda (V2-3)
- [x] Funis e etapas configuraveis, status separado da etapa (V2-4.1)

## Problemas Encontrados
- `npm.cmd run build` passou.
- `npm run lint` sem erros desde a V2-1.3.
- Banco de desenvolvimento: container `salesos-postgres` (porta 5437). Precisa ser iniciado com `docker start salesos-postgres`; as 6 migrations estao aplicadas.
- Respostas reais da IA (IA SDR e Consultor Digital) nao validadas: a chave recebida em 2026-10-30 tem prefixo `gsk_` (Groq), incompativel com o cliente atual, que so chama `api.anthropic.com`. Desde a V2-1.3, a recusa do provedor aparece no log com o status HTTP.
- O modelo `claude-sonnet-5` do Consultor Digital nao foi confirmado pela API real.
- A validacao automatizada e por HTTP, mais capturas do Meu Dia em Chrome headless com dados de exemplo. A conta real em producao nao foi testada em navegador depois da V2; o formulario de motivo da perda e as telas por papel tambem nao. Login Google nao esta configurado.
- Nao ha tela para convidar usuarios nem atribuir papeis: e feito por SQL (`docs/DEPLOY.md`). O `create-admin` cria todos com o nome "Admin".
- `npm audit --omit=dev`: 1 alerta critico, em dependencia da CLI do `shadcn`, que nao roda no app.
- Backup externo: a conferencia do arquivo no bucket depende do painel do Backblaze, e baixar e restaurar um arquivo do bucket real ainda nao foi testado (a restauracao foi simulada com destino local).
- A chave Backblaze `...0004`, em uso, foi enviada pelo chat (tarefa 10.9) e tem permissao de apagar arquivos do bucket. O Object Lock esta desativado.
- Nao ha alerta de falha do backup nem de indisponibilidade do site.
- A VPS tem 2 nucleos e nenhuma swap, e e compartilhada com o SALE-IA.
- O repositorio no GitHub parece publico: a API respondeu sem autenticacao.


## Ultima Tarefa Concluida
**Tarefa V2-4.1** - Funis e etapas configuraveis, status separado da etapa, migration de conversao, API e dialogo de funis. 163 testes automatizados. Publicada em 2026-11-04 (`salesos-web:10`).

**Tarefa V2-3** - Dashboard Executivo: filtros de periodo e vendedor, faturamento, ritmo do mes, funil, saude do pipeline, metas, time, origem e motivos de perda. 139 testes automatizados. Publicada em 2026-11-02 (`salesos-web:9`).

**Tarefa V2-2.2** - Busca global (`Ctrl+K`), notificacoes e tema claro no cabecalho. 115 testes automatizados. Publicada em 2026-11-02 (`salesos-web:8`).

**Tarefa V2-2.1** - Tela Meu Dia como pagina inicial, cabecalho global com Sair, menu reorganizado por papel e metas mensais. 95 testes automatizados.

**Tarefa V2-1.3** - Lint zerado, erros da API padronizados, logs seguros, CI no GitHub Actions. 69 testes automatizados.

**Tarefa V2-1.2** - Historico de etapas, datas reais de ganho e perda, motivo de perda, reabertura restrita, vinculo contato-empresa, valor em `Decimal` e criacao idempotente. 56 testes automatizados no total.

**Tarefa V2-1.1** - Papeis, dono da oportunidade, sessao revalidada, auditoria e atualizacao de `next` e `next-auth`, com 34 testes automatizados.

**Tarefa 10.6** - `CNAME www` restaurado e certificado expandido para `www.saleos.tech`.

**Tarefa 10.8** - Copia externa criptografada dos backups no Backblaze B2 (bucket `SALEOS`).

**Tarefa 10.7** - Backup diario do banco de producao na VPS, com restauracao testada.

**Tarefa 10.4** - Rota publica do IA SDR com limite por conversa, por organizacao e por IP.

**Tarefa 10.3** - Dominio apontado para a VPS e certificado emitido para `saleos.tech`.

**Tarefa 10.2** - App e banco publicados na VPS em Docker, atras do nginx, com porta do app restrita a localhost.

**Tarefa 10.1** - Preparacao para publicacao: `postinstall` com `prisma generate` e script `create-admin`, validados em clone limpo.

**Tarefa 9.1** - Validacao de ponta a ponta contra o banco real: 47 verificacoes aprovadas cobrindo login, multi-organizacao, isolamento entre organizacoes, CRM, diagnostico, integracoes e tratamento de erro da IA. Dados de teste removidos ao final.

## O Que Falta
- Concluir a tarefa 9.2 com uma chave Anthropic valida (`sk-ant-...`), cadastrada em `/configuracoes`.
- Fazer um teste completo das telas em navegador com a conta real e com cada papel.
- Seguir a V2-4.2 e as FASES V2-5 a V2-10 (`docs/TASKS.md`).
- Trocar a chave do Backblaze (tarefa 10.9).
- Decidir sobre Object Lock no bucket, alertas de falha e visibilidade do repositorio.
- Academia Comercial (Modulo 8): fora do Prompt Mestre V2; o link para `/academia` foi removido do menu ate haver pagina.

## Proxima Tarefa Recomendada
Tarefa V2-4.2: Kanban de Negociacoes (arrastar entre etapas, filtros por dono, ordenacao, visao em lista, pagina de detalhe e edicao de valor, empresa, contato e dono).

Pendencias anteriores: Tarefa 10.9: antes de usar com clientes reais, trocar a chave do Backblaze exposta no chat. Em paralelo, tarefa 9.2: validar as respostas reais da IA com uma chave Anthropic valida, incluindo a geracao de Lead/Oportunidade em conversa `HOT`.
