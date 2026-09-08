# CHANGELOG — SalesOS

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
