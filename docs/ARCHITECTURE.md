# ARCHITECTURE.md — SalesOS

## Arquitetura Geral
Monorepo com Next.js (frontend + API) e PostgreSQL.
Multiempresa por tenant_id em todas as tabelas.

```
SalesOS
├── apps/web/          → Next.js 16 App Router
│   ├── app/           → Rotas e páginas
│   │   ├── (auth)/    → Login
│   │   ├── (app)/     → Área autenticada
│   │   ├── sdr/       → Widget público do IA SDR
│   │   └── api/       → API Routes
│   ├── components/    → Componentes UI
│   ├── lib/           → Utilitários, auth, db client
│   ├── hooks/         → React hooks
│   ├── scripts/       → Scripts operacionais (create-admin)
│   ├── tests/         → Testes unitários (*.test.mjs) e de integração (*.integration.mjs)
│   └── prisma/
│       ├── schema.prisma  → Schema do banco
│       └── migrations/    → Migrations
├── .github/workflows/ → CI (lint, tipos, testes, build)
├── deploy/            → Compose, nginx e backup de produção
└── docs/              → Documentação
```

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript |
| Estilização | Tailwind CSS v4 + Shadcn UI (base-ui) |
| Banco | PostgreSQL 15+ |
| ORM | Prisma 7 |
| Vetores | pgvector (planejado; ainda não usado nem instalado em produção) |
| Auth | NextAuth v5 (Auth.js), sessão JWT revalidada no banco |
| Validação | Zod |
| Testes | `node:test` (sem dependência extra) e GitHub Actions |
| IA | Anthropic Claude API |
| Deploy | VPS 200.141.20.162: Docker (app + PostgreSQL) atrás do nginx, em `/opt/salesos` |

## Estrutura de Módulos

```
Meu Dia (página inicial)            → /meu-dia
Módulo 1 — Diagnóstico Comercial    → /diagnostico
Módulo 2 — CRM Inteligente          → /empresas, /contatos, /pipeline (Negociações)
Módulo 3 — IA SDR                   → /sdr (console) e /sdr/[organizationId] (widget público)
Módulo 4 — Consultor Digital        → /consultor
Módulo 5 — Plano de Ação            → /planos
Módulo 6 — Dashboard Executivo      → /dashboard
Módulo 7 — Dashboard Consultoria    → /clientes (Meus Clientes)
Módulo 8 — Academia Comercial       → não construído, fora do menu
```

Próximos módulos do Prompt Mestre V2 (`docs/TASKS.md`): Clientes 360°, Atividades, SALEIA Intelligence e Report Diário. Entram no menu apenas quando tiverem tela.

## Banco de Dados — Modelo Multiempresa

### Tenant Isolation
- Toda tabela possui `organization_id` (FK para `organizations`)
- Queries sempre filtradas por `organization_id` do usuário autenticado
- Row Level Security (RLS) no PostgreSQL (futuro)

### Entidades Principais

```
Organization (tenant)
  └── User (N:N via OrganizationMember)
  └── Lead
  └── Company
  └── Contact
  └── Opportunity
  └── Activity
  └── ActionPlan
  └── Diagnostic
  └── ApiIntegration (chave de API por provedor de IA, criptografada)
  └── SdrConversation (conversa do IA SDR com um lead, N:N via SdrMessage)
  └── AuditLog (operacoes sensiveis, sem segredos)
  └── Pipeline (funil; um padrao por organizacao) └── PipelineStage (etapa, ordem, probabilidade)
  └── OpportunityStageHistory (toda mudanca de etapa ou status, com responsavel)
  └── SalesGoal (meta mensal da equipe ou de um vendedor)
```

## Fluxos Principais

### Autenticação
```
Login → NextAuth → Session com {userId, organizationId, role}
→ Middleware valida session em todas rotas /app/*
```

### Multiempresa
```
Consultor cria Organization em /clientes → vira OrganizationMember (CONSULTANT)
Convite de membros por email: planejado, ainda não implementado
Usuários são criados por script (npm run create-admin): não há cadastro público
Todas queries: WHERE organization_id = session.organizationId
```

### Permissoes
```
OWNER, ADMIN, CONSULTANT -> administrador | MANAGER -> gestor | MEMBER -> vendedor
A sessao le vinculo e papel do banco a cada auth(); o JWT nao e fonte de autorizacao
Rotas: denyUnless(role, permissao) -> 403. Matriz em lib/authz/permissions.ts
Vendedor: oportunidades filtradas por ownerId (opportunityScope)
Operacoes sensiveis: AuditLog, na mesma transacao quando possivel
```

### Navegacao e Meu Dia
```
Menu e titulo do cabecalho: lib/navigation.ts (item some sem a permissao)
Entrada apos login: /meu-dia
Meu Dia: getMyDaySummary (lib/meu-dia/summary.ts), usado pela pagina e por GET /api/meu-dia
  vendedor: proprias oportunidades e meta individual | gestor/admin: organizacao e meta da equipe
Datas de negocio: lib/time/business-calendar.ts, fuso America/Sao_Paulo, dias uteis seg-sex
Metas: SalesGoal (organizationId, month AAAA-MM, scopeKey ORG ou userId), PUT /api/goals
```

### Dashboard Executivo
```
/dashboard e GET /api/dashboard?periodo=&vendedor= -> getExecutiveDashboard (lib/dashboard/executive.ts)
Periodo: lib/dashboard/period.ts, datas de calendario em Brasilia -> instantes em executive.ts
  comparacao com o periodo anterior equivalente (este mes: mesmos dias do mes anterior)
Escopo: vendedor = proprias | gestor/admin = organizacao ou um vendedor (resolveSellerFilter)
Funil: OpportunityStageHistory do periodo nas etapas do funil filtrado (ou do padrao),
  etapa mais alta alcancada por negociacao; ganhar e o degrau final
Ritmo e metas: sempre o mes corrente (computeGoalProgress, o mesmo do Meu Dia)
Agregacoes puras (funil, time, origens, motivos, ciclo): lib/dashboard/metrics.ts
```

### Cabecalho: busca, notificacoes e tema
```
Busca: GET /api/search?q= -> globalSearch (lib/search) por permissao do papel
  negociacoes (opportunityScope), empresas, contatos, planos | 5 por grupo, contains sem maiusculas
Notificacoes: GET /api/notifications -> getHeaderNotifications (lib/notifications)
  contagens com os criterios do Meu Dia; sem tabela, somem quando a pendencia e resolvida
  o layout entrega a primeira contagem; o sino atualiza ao trocar de pagina e no foco da janela
Tema: cookie salesos-theme lido no layout raiz -> classe .dark no <html> (padrao: escuro)
  :root = claro, .dark = escuro (globals.css); paginas usam tokens, nunca cores fixas de um tema
```

### Erros da API
```
Handler exportado = withApiErrors("METODO /caminho", handler)
Erro previsto -> apiError(codigo, mensagem) | validationError(zodError)
Corpo: { error, code, fields? }  (os componentes leem `error`)
Erro inesperado -> 500 { code: INTERNAL } + logServerError (JSON, sem segredos)
```

### Ciclo da Oportunidade
```
Funil: Pipeline + PipelineStage (lib/pipelines); ensureDefaultPipeline cria o padrao "Vendas"
  com ids deterministicos (pipe_<org>, stg_<org>_<n>); etapa removida = archivedAt
Negociacao: pipelineId + stageId + status (OPEN | WON | LOST), independentes
Criacao (createOpportunity) -> etapa informada ou 1a do funil padrao, OPEN + 1a entrada do historico
Mudanca -> planOpportunityChange (lib/opportunities/rules.ts):
  LOST exige motivo | encerrada nao troca de etapa | reabrir ou trocar o resultado exige gestor/admin
  probabilidade: WON 100, LOST 0, OPEN a da etapa | wonAt/lostAt com a data real | stageChangedAt
-> updateMany condicionado a etapa e status lidos (409 se mudou) + historico, na mesma transacao
Faturamento e conversao usam status + wonAt/lostAt, nunca updatedAt
Funis: /api/pipelines (gestor/admin); editar = lista completa de etapas na ordem (planStageEdits)
Campos exigidos: PipelineStage.requiredFields (valor, empresa, contato, previsao), checados ao entrar na etapa
  (mover, reabrir, criar) e ao apagar o campo; WON exige valor; LOST nunca e bloqueado
Edicao: PUT /api/opportunities/[id] -> planOpportunityEdit (lib/opportunities/rules.ts), so o que mudou, auditado
  dono: opportunities:assign | encerrada: gestor/admin | etapa e status seguem no PATCH
Quadro: /pipeline, filtros na URL (lib/opportunities/board.ts); arrastar faz PATCH de stageId
Detalhe: /pipeline/[id] e GET /api/opportunities/[id] (getOpportunityDetail); fora do escopo = 404
```

### IA SDR
```
Lead acessa widget → conversa com Claude → classificação automática
→ Oportunidade criada no CRM → consultor notificado
```

### Limites do IA SDR (rota pública)
```
nginx: 12 requisições por minuto por IP em /api/sdr/ (rajada de 10)
App: 30 mensagens do lead por conversa e 300 por organização em 24h
Acima disso: 429, sem chamar a IA
```

### Testes e CI
```
npm run check             -> lint + tsc + testes unitarios (regras puras: permissoes, etapas, calendario, metas, erros)
npm run test:integration  -> HTTP contra o app em localhost:3100 e o banco local; recusa rodar fora de localhost
Cada suite cria registros com prefixo proprio e os apaga ao final
GitHub Actions: os dois, mais migrations e build, em PostgreSQL temporario, a cada push
```

### Backup
```
Timer diário → pg_dump validado → 14 dias em /var/backups/salesos
→ dump + .env criptografados com GPG → Backblaze B2
```

### Troca de Organização Ativa (Consultor multi-cliente — Módulo 7)
```
Consultor pertence a N organizações (OrganizationMember, N:N)
→ sessão mantém uma única organização ativa (session.user.organizationId)
→ consultor troca a organização ativa em "Meus Clientes" (/clientes)
→ todas as rotas de (app)/** continuam filtrando por session.user.organizationId, sem alteração
```

## Decisões Técnicas

| Decisão | Motivo |
|---------|--------|
| Next.js API routes (não NestJS) | Menos complexidade no MVP, mesmo stack |
| NextAuth v5 | Suporte nativo a App Router, flexível |
| Prisma | DX superior, type-safe, migrations simples |
| VPS própria para app e PostgreSQL | Definido pelo usuário em 2026-10-30; compartilhada com o SALE-IA |
| Tailwind + Shadcn | Velocidade de desenvolvimento, customizável |
| Papéis no banco, não no JWT | Remover membro ou trocar papel vale na hora (V2-1.1) |
| `Decimal(14,2)` em valores de oportunidade e meta | Somas de faturamento sem erro de arredondamento (V2-1.2) |
| Fuso `America/Sao_Paulo` nas datas de negócio | O servidor roda em UTC; "hoje" e "este mês" são do cliente (V2-2.1) |
| `node:test` em vez de Jest/Vitest | Nenhuma dependência nova; tipos removidos pelo próprio Node 24 (V2-1.3) |
| Tema por cookie lido no servidor, sem `next-themes` | Página chega no tema certo, sem piscar e sem dependência nova (V2-2.2) |
| Status separado da etapa, etapas em tabela | Funis configuráveis por cliente; ganha/perdida não ocupam coluna (V2-4.1) |
| Etapa removida é arquivada, não apagada | O histórico e as encerradas continuam apontando para ela (V2-4.1) |
| Notificações derivadas, sem tabela | Nunca ficam desatualizadas em relação ao dado; "marcar como lida" fica para quando houver eventos (V2-2.2) |
