# CURRENT_STATE.md - SalesOS

**Versao atual:** V.1.15.4  
**Data:** 2026-10-30  
**Fase:** FASE 10 em andamento - `https://saleos.tech` no ar, com admin criado (falta `www`)

## Estado Atual
Tarefa 10.3 concluida: `https://saleos.tech` esta no ar, com app e banco em Docker na VPS `200.141.20.162` (`/opt/salesos`), atras do nginx, ao lado da producao do SALE-IA. Login, criacao e troca de organizacao foram testados pelo dominio real. O admin de producao foi criado pelo usuario (tarefa 10.5). `www.saleos.tech` nao resolve no DNS e o certificado cobre apenas o dominio principal (tarefa 10.6).

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
apps/web/lib/dashboard/kpis.ts                    -> calculo dos KPIs executivos (Lead/Opportunity)
apps/web/lib/ai/anthropic-client.ts               -> cliente fino da Anthropic (chat + classificacao via tool use)
apps/web/lib/validations/sdr-conversation.ts      -> schema Zod compartilhado (conversa/mensagem do IA SDR)
apps/web/app/api/sdr/[organizationId]/conversations/route.ts -> inicia conversa do IA SDR (publico)
apps/web/app/api/sdr/[organizationId]/conversations/[conversationId]/messages/route.ts -> envia mensagem do lead + resposta/classificacao da IA (publico)
apps/web/app/sdr/[organizationId]/page.tsx        -> pagina publica do widget do IA SDR
apps/web/app/sdr/[organizationId]/chat-widget.tsx -> janela de chat client-side do IA SDR
apps/web/lib/sdr/lead-id.ts                       -> ids deterministicos de idempotencia conversa IA SDR -> Lead/Oportunidade
apps/web/lib/sdr/notifications.ts                 -> contagem/marcacao de leads qualificados vistos pelo consultor
apps/web/app/(app)/sdr/page.tsx                   -> console autenticado de conversas do IA SDR (consultor)
apps/web/app/(app)/layout.tsx                     -> layout autenticado (agora assincrono: busca contagem de leads qualificados)
apps/web/components/app-sidebar.tsx               -> sidebar com badge de leads qualificados no item "IA SDR"
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

## Problemas Encontrados
- `npm.cmd run build` passou.
- `npm.cmd run lint` falha em arquivos pre-existentes fora do escopo:
  - `apps/web/app/(auth)/login/page.tsx`
  - `apps/web/hooks/use-mobile.ts`
- Banco de desenvolvimento: container `salesos-postgres` (porta 5437). Precisa ser iniciado com `docker start salesos-postgres`; as 2 migrations estao aplicadas e `prisma migrate diff` nao aponta desvio.
- Respostas reais da IA (IA SDR e Consultor Digital) nao validadas: a integracao Anthropic salva na organizacao demo resulta em 502 (causa exata nao investigada, a rota nao expoe o erro do provedor) e a chave recebida em 2026-10-30 tem prefixo `gsk_` (Groq), incompativel com o cliente atual, que so chama `api.anthropic.com`.
- O modelo `claude-sonnet-5` do Consultor Digital nao foi confirmado pela API real.
- A interface nao foi usada em navegador (cliques, dialogs): a validacao foi por HTTP. Login Google tambem nao foi testado.


## Ultima Tarefa Concluida
**Tarefa 10.7** - Backup diario do banco de producao na VPS, com restauracao testada. Os backups ainda ficam so na VPS (tarefa 10.8).

**Tarefa 10.4** - Rota publica do IA SDR com limite por conversa, por organizacao e por IP.

**Tarefa 10.3** - Dominio apontado para a VPS e certificado emitido para `saleos.tech`.

**Tarefa 10.2** - App e banco publicados na VPS em Docker, atras do nginx, com porta do app restrita a localhost.

**Tarefa 10.1** - Preparacao para publicacao: `postinstall` com `prisma generate` e script `create-admin`, validados em clone limpo.

**Tarefa 9.1** - Validacao de ponta a ponta contra o banco real: 47 verificacoes aprovadas cobrindo login, multi-organizacao, isolamento entre organizacoes, CRM, diagnostico, integracoes e tratamento de erro da IA. Dados de teste removidos ao final.

## O Que Falta
- Corrigir lint pre-existente em tarefa separada, se desejado.
- Concluir a tarefa 9.2 com uma chave Anthropic valida (`sk-ant-...`), cadastrada em `/configuracoes`.
- Fazer um teste manual da interface em navegador.
- Planejar o proximo modulo do produto (Modulo 8 — Academia Comercial, `docs/ARCHITECTURE.md`, item de sidebar "Academia" ja linkado para `/academia` mas sem pagina de destino), quando desejado.

## Proxima Tarefa Recomendada
Tarefa 10.6: restaurar o `CNAME www`. Antes de usar com clientes reais, definir um destino fora da VPS para os backups (tarefa 10.8). Em paralelo, tarefa 9.2: validar as respostas reais da IA com uma chave Anthropic valida, incluindo a geracao de Lead/Oportunidade em conversa `HOT`. Depois disso, planejar o Modulo 8 (Academia Comercial), o unico modulo do `docs/ARCHITECTURE.md` ainda nao construido.
