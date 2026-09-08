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
