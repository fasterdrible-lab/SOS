# CHANGELOG — SalesOS

## [V.1.31.0] — 2026-11-13 (commit `d291f21`, CI aprovado; sem publicacao — producao segue na V.1.29.0)

### Tarefa V2-9.3 — Configuracoes comerciais
- Configuracoes ganha a aba **Comercial** (administrador).
- **Negociacoes esfriando**: o limite de dias sem mudar de etapa, antes fixo em 14, passa a ser escolhido por cliente (1 a 180). Vale no Meu Dia, na saude do pipeline do Dashboard e no sino.
- **Feriados**: dias sem expediente cadastrados por data saem da conta de dias uteis. Mudam o ideal ate hoje, a projecao do mes e o quanto falta por dia para a meta, no Meu Dia e no Dashboard.
- Sem nada salvo, tudo continua como antes (14 dias, nenhum feriado).
- Nova permissao `commercial-settings:manage` (administrador) e nova acao auditada `settings.commercial-updated`, so com os nomes dos campos alterados.
- Testes: `settings-rules.test.mjs` (7) e `settings.integration.mjs` (6). Total: 156 unitarios e 234 de integracao, aprovados localmente.

**Migration:** `20261113120000_commercial_settings` (aditiva: tabela `commercial_settings`). Ainda nao aplicada em producao.

**Arquivos criados:**
- `apps/web/prisma/migrations/20261113120000_commercial_settings/migration.sql`
- `apps/web/lib/settings/rules.ts`, `lib/settings/commercial.ts`, `lib/validations/commercial-settings.ts`
- `apps/web/app/api/settings/commercial/route.ts`
- `apps/web/app/(app)/configuracoes/comercial/page.tsx`, `commercial-form.tsx`
- `apps/web/tests/settings-rules.test.mjs`, `tests/settings.integration.mjs`

**Arquivos alterados:**
- `apps/web/prisma/schema.prisma`, `lib/authz/permissions.ts`, `lib/audit/actions.ts`, `lib/time/business-calendar.ts`
- `apps/web/lib/meu-dia/summary.ts`, `lib/dashboard/executive.ts`, `lib/notifications/summary.ts`
- `apps/web/app/(app)/meu-dia/page.tsx`, `dashboard/page.tsx`, `configuracoes/settings-nav.tsx`
- `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/CURRENT_STATE.md`, `CHANGELOG.md`

## [V.1.30.0] — 2026-11-13 (commit `9eefea0`, CI aprovado; sem publicacao — producao segue na V.1.29.0)

### Tarefa V2-9.2 — Equipes
- Configuracoes > Usuarios ganha o cartao **Equipes**: criar, renomear e remover, com a contagem de pessoas. Cada pessoa fica em no maximo uma equipe, escolhida na lista de pessoas.
- **Gestor com equipe ve so a equipe**: negociacoes e atividades das pessoas da equipe dele e as que estao sem responsavel. Vale no quadro, na lista, no detalhe, na busca, no Meu Dia, no sino, na empresa, nas reunioes e recomendacoes do SALEIA, no Dashboard e no Report. O que e de outra equipe responde como inexistente.
- Gestor sem equipe e administrador continuam vendo tudo; vendedor continua vendo so o que e dele. Sem equipes cadastradas, nada muda.
- O gestor com equipe so atribui negociacoes e atividades a pessoas da propria equipe, e os filtros de pessoa mostram so a equipe.
- Dashboard do gestor com equipe: numeros da equipe, sem leads e sem a meta da organizacao (ficam as metas individuais). Report: dia e dias fechados so de pessoas da equipe.
- Mudar a equipe de alguem vale na hora (a sessao rele a equipe do banco). Remover a equipe deixa as pessoas sem equipe; nada mais e apagado.
- Novas acoes auditadas `team.created`, `team.renamed`, `team.removed` e `member.team-changed`.
- Testes: 2 unitarios em `permissions.test.mjs` e `teams.integration.mjs` (12). Total: 149 unitarios e 228 de integracao, aprovados localmente.

**Migration:** `20261112120000_teams` (aditiva: tabela `teams` e coluna nula `organization_members.teamId`). Ainda nao aplicada em producao.

**Arquivos criados:**
- `apps/web/prisma/migrations/20261112120000_teams/migration.sql`
- `apps/web/lib/teams/service.ts`, `app/api/settings/teams/route.ts`, `app/api/settings/teams/[id]/route.ts`
- `apps/web/app/(app)/configuracoes/usuarios/team-panel.tsx`
- `apps/web/tests/teams.integration.mjs`

**Arquivos alterados:**
- `apps/web/prisma/schema.prisma`, `types/next-auth.d.ts`, `lib/auth.ts`, `lib/authz/permissions.ts`, `lib/audit/actions.ts`, `lib/validations/member.ts`, `lib/members/service.ts`
- `apps/web/lib/activities/service.ts`, `lib/companies/overview.ts`, `lib/dashboard/executive.ts`, `lib/meu-dia/summary.ts`, `lib/notifications/summary.ts`, `lib/opportunities/detail.ts`, `lib/organizations/client-summary.ts`, `lib/search/global-search.ts`
- `apps/web/lib/saleia/service.ts`, `lib/saleia/decisions.ts`, `lib/saleia/diagnosis.ts`, `lib/report/access.ts`, `lib/report/service.ts`
- `apps/web/app/api/activities/route.ts`, `activities/[id]/route.ts`, `companies/[id]/route.ts`, `dashboard/route.ts`, `meu-dia/route.ts`, `notifications/route.ts`, `opportunities/route.ts`, `opportunities/[id]/route.ts`, `reports/daily/route.ts`, `reports/daily/closed/route.ts`, `saleia/insights/[id]/route.ts`, `saleia/meetings/route.ts`, `saleia/meetings/[id]/route.ts`, `saleia/meetings/[id]/diagnosis/route.ts`, `search/route.ts`, `settings/members/[id]/route.ts`
- `apps/web/app/(app)/layout.tsx`, `atividades/page.tsx`, `configuracoes/usuarios/page.tsx`, `configuracoes/usuarios/member-list.tsx`, `dashboard/page.tsx`, `diagnostico/[id]/page.tsx`, `empresas/page.tsx`, `empresas/[id]/page.tsx`, `meu-dia/page.tsx`, `pipeline/page.tsx`, `pipeline/[id]/page.tsx`, `report/page.tsx`, `saleia/page.tsx`, `saleia/[id]/page.tsx`
- `apps/web/tests/permissions.test.mjs`
- `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/CURRENT_STATE.md`, `CHANGELOG.md`

## [V.1.29.0] — 2026-11-11 (publicada em producao, imagem `salesos-web:16`)

### Tarefa V2-9.1 — Usuarios, convites e auditoria
- Configuracoes ganha abas: **Integracoes**, **Usuarios** e **Auditoria**.
- **Convidar pessoa**: o administrador informa e-mail e papel (administrador, gestor ou vendedor) e recebe um link de uso unico, valido por 7 dias, para enviar por WhatsApp ou e-mail. O link aparece uma vez; o banco guarda so o hash. Novo convite para o mesmo e-mail cancela o anterior; convites em aberto podem ser cancelados.
- Pagina publica **/convite/...**: quem nao tem conta cria com nome e senha (12+ caracteres); quem ja tem entra com a senha atual. Depois, abre direto o Meu Dia.
- **Pessoas**: trocar o papel e remover da organizacao (a conta continua; negociacoes e atividades ficam). Ninguem muda o proprio papel nem remove a si mesmo, e a organizacao nunca fica sem administrador. Vale na hora, pela sessao revalidada no banco.
- **Esqueceu a senha**: em Usuarios, o administrador gera um link de nova senha, valido por 24 horas e uma unica vez, e envia para a pessoa; a senha antiga vale ate o link ser usado. Nao vale para conta que participa de outras organizacoes. No login, o link **Esqueci a senha**, ao lado do campo Senha, explica como pedir.
- **Login na ultima organizacao usada**: quem aceita convite de outra organizacao ja entra nela, e quem troca de cliente volta para o escolhido no proximo login (antes, sempre a mais antiga).
- **Auditoria**: as operacoes sensiveis da organizacao, com quem fez e quando, filtro por acao e pessoa e paginas de 50.
- Novas permissoes `members:manage` e `audit:read` (administrador). Novas acoes auditadas `member.invited`, `member.invite-revoked`, `member.joined`, `member.role-changed`, `member.removed`, `member.password-reset-created` e `member.password-reset`, sem e-mail nem token.
- Testes: `member-rules.test.mjs` (11) e `members.integration.mjs` (15).

**Migrations:** `20261111120000_member_invites` (aditiva: tabela `organization_invites`) e `20261111130000_password_resets` (aditiva: tabela `password_resets` e coluna nula `users.lastOrganizationId`). Aplicadas em producao em 2026-11-11, depois do backup `salesos-20261111-192322`.

**Arquivos criados:**
- `apps/web/prisma/migrations/20261111120000_member_invites/migration.sql`, `20261111130000_password_resets/migration.sql`
- `apps/web/app/api/settings/members/[id]/password-reset/route.ts`, `app/api/password-resets/[token]/route.ts`, `app/redefinir-senha/[token]/page.tsx`, `reset-form.tsx`
- `apps/web/lib/members/rules.ts`, `token.ts`, `service.ts`, `session.ts`, `lib/validations/member.ts`
- `apps/web/lib/audit/actions.ts`, `lib/audit/query.ts`
- `apps/web/app/api/settings/members/route.ts`, `members/[id]/route.ts`, `invites/route.ts`, `invites/[id]/route.ts`, `audit/route.ts`, `app/api/invites/[token]/route.ts`
- `apps/web/app/(app)/configuracoes/settings-nav.tsx`, `usuarios/page.tsx`, `usuarios/member-list.tsx`, `usuarios/invite-panel.tsx`, `auditoria/page.tsx`
- `apps/web/app/convite/[token]/page.tsx`, `accept-form.tsx`
- `apps/web/tests/member-rules.test.mjs`, `tests/members.integration.mjs`

**Arquivos alterados:**
- `apps/web/prisma/schema.prisma`, `lib/authz/permissions.ts`, `lib/audit/record.ts`, `lib/auth.config.ts`, `lib/auth.ts`
- `apps/web/app/(app)/configuracoes/page.tsx`, `app/(auth)/login/page.tsx`, `app/api/session/organization/route.ts`
- `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/CURRENT_STATE.md`, `CHANGELOG.md`

## Tarefa V2-8.3 — 2026-11-10 (no SALE-IA, sem nova versao do SOS)
- SALE-IA V.1.4.199 e V.1.4.200 publicados em 2026-11-11 (depois da V.1.29.0 do SOS).
- O SALE-IA (V.1.4.200, repositorio proprio) passa a dizer no relatorio automatico se a oferta foi apresentada e envia `offer: { presented, reason }` no `meeting.analyzed`. Ver o `CHANGELOG.md` do SALE-IA.
- Eventos gerados pelo SALE-IA (sem campo, apresentada, nao apresentada com e sem motivo) conferidos contra o validador do SOS (`lib/validations/saleia-event.ts`).
- Publicar depois da V.1.28.0 do SOS; o SOS em producao (V.1.27.0) ignora `offer`, sem erro.
- No SOS mudou so a documentacao: `docs/TASKS.md`, `docs/CURRENT_STATE.md`, `docs/ARCHITECTURE.md`, `docs/INTEGRACAO_SALEIA.md` e `CHANGELOG.md`.

## [V.1.28.0] — 2026-11-10 (publicada em producao com a V.1.29.0 em 2026-11-11, imagem `salesos-web:16`)

### Tarefa V2-8.2 — "So diagnostico" no Report
- Report: novo numero **So diagnostico** — reunioes analisadas pelo SALEIA em que a oferta nao foi apresentada, com "% das realizadas", "falta confirmar" e "sem analise".
- Secao **So diagnostico**: a IA sugere o motivo; a pessoa **confirma o motivo** (como veio ou reescrito), diz que **nao foi so diagnostico** (sai do numero) ou **desfaz**. O mesmo bloco aparece na tela da reuniao, que tambem mostra se a oferta foi apresentada.
- Fechar o dia grava o numero; dias fechados o mostram.
- Contrato SALEIA (`docs/INTEGRACAO_SALEIA.md`): campo opcional `offer: { presented, reason }`, ainda na versao 1. Depois de uma pessoa decidir, reenviar a reuniao nao muda a oferta nem a decisao.
- Decisoes auditadas (`saleia.diagnosis-confirmed`, `saleia.diagnosis-contested`, `saleia.diagnosis-reopened`).
- O envio de `offer` pelo SALE-IA fica para a V2-8.3.
- Testes: 5 unitarios em `saleia-rules.test.mjs`; 5 em `report.integration.mjs` e 3 em `saleia.integration.mjs`.

**Migration:** `20261110120000_saleia_diagnosis_only` (aditiva: enum `SaleiaDiagnosisStatus`, seis colunas nulas em `saleia_meetings` e `daily_reports.diagnosisOnly` com padrao 0). Aplicada em producao em 2026-11-11.

**Arquivos criados:**
- `apps/web/prisma/migrations/20261110120000_saleia_diagnosis_only/migration.sql`
- `apps/web/lib/saleia/diagnosis.ts`, `lib/validations/saleia-diagnosis.ts`
- `apps/web/app/api/saleia/meetings/[id]/diagnosis/route.ts`, `app/(app)/saleia/diagnosis-actions.tsx`

**Arquivos alterados:**
- `apps/web/prisma/schema.prisma`, `lib/validations/saleia-event.ts`, `lib/saleia/rules.ts`, `lib/saleia/service.ts`, `lib/report/service.ts`, `lib/audit/record.ts`
- `apps/web/app/(app)/report/page.tsx`, `app/(app)/saleia/[id]/page.tsx`
- `apps/web/tests/saleia-rules.test.mjs`, `tests/report.integration.mjs`, `tests/saleia.integration.mjs`
- `docs/INTEGRACAO_SALEIA.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/CURRENT_STATE.md`, `CHANGELOG.md`

## [Documentacao] — 2026-11-08 (sem mudanca no app; producao segue na V.1.27.0)
- `docs/GUIA_DE_USO.md`: tela **Report** (numeros, fechar o dia, dias fechados), decisoes sobre as sugestoes da SALEIA (criar atividade, mover etapa, descartar), blocos novos do Meu Dia e papeis atualizados.
- `docs/DEPLOY.md`: o que fazer quando o build local cai por falta de memoria do Docker Desktop.
- `docs/TASKS.md` e `docs/CURRENT_STATE.md`: pendencias de documentacao resolvidas removidas.

## [V.1.27.0] — 2026-11-08 (publicada em producao, imagem `salesos-web:15`)

### Tarefa V2-8.1 — Report Diario
- Tela **Report** (`/report`, no menu): o dia de cada pessoa com reunioes realizadas, FUPs (follow-ups, ligacoes e e-mails), negociacoes avancadas, vendas e atividades pendentes, com as listas de cada um e as reunioes analisadas pelo SALEIA. Navegacao entre dias.
- **Fechar o dia**: cada pessoa fecha o proprio dia (hoje ou um dia passado), com observacao. Os numeros do momento ficam registrados e nao mudam depois.
- Aba **Dias fechados**: o vendedor ve os proprios; gestor e administrador veem a equipe e escolhem a pessoa, tambem no dia.
- Meu Dia: o cartao "Fechar o dia" mostra se o dia ja foi fechado ou leva ao Report.
- Fechamento auditado (`daily-report.closed`). Novas permissoes `reports:read` e `reports:team`.
- Testes: `report-rules.test.mjs` (6) e `report.integration.mjs` (11).

**Migration:** `20261108141235_daily_report` (aditiva: tabela `daily_reports`). Aplicada em producao em 2026-11-08, depois do backup `salesos-20261108-233654`.

**Arquivos criados:**
- `apps/web/prisma/migrations/20261108141235_daily_report/migration.sql`
- `apps/web/lib/report/rules.ts`, `lib/report/service.ts`, `lib/report/access.ts`, `lib/validations/daily-report.ts`
- `apps/web/app/api/reports/daily/route.ts`, `app/api/reports/daily/closed/route.ts`
- `apps/web/app/(app)/report/page.tsx`, `report-filters.tsx`, `close-day-form.tsx`
- `apps/web/tests/report-rules.test.mjs`, `apps/web/tests/report.integration.mjs`

**Arquivos alterados:**
- `apps/web/prisma/schema.prisma`, `lib/authz/permissions.ts`, `lib/audit/record.ts`, `lib/navigation.ts`, `lib/meu-dia/summary.ts`
- `apps/web/app/(app)/meu-dia/page.tsx`
- `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/CURRENT_STATE.md`, `CHANGELOG.md`

## [V.1.26.0] — 2026-11-08 (publicada em producao com a V.1.27.0, imagem `salesos-web:15`)

### Tarefa V2-7.3 — SALEIA: decidir recomendacoes e etapa sugerida
- Na reuniao do SALEIA, cada recomendacao tem **Criar atividade** e **Descartar**: aceitar cria uma tarefa com o prazo sugerido, ligada a negociacao (ou a empresa) da reuniao, para o dono da negociacao, com a reuniao e o trecho na descricao.
- A etapa sugerida tem **Mover para <etapa>**: aplica pelas regras do funil (campos exigidos, encerrada), com historico em nome de quem aceitou. Acentos e maiusculas nao importam ("Negociacao" acha "Negociação"); etapa que nao existe no funil, reuniao sem negociacao ou negociacao encerrada sao recusadas com o motivo na tela.
- Descartar pode ser desfeito; aceitar e definitivo. Duas pessoas aceitando ao mesmo tempo nao duplicam a atividade.
- Meu Dia: o cartao "Recomendacoes da SALEIA" mostra as pendentes no escopo do papel, com os mesmos botoes, no lugar do aviso de integracao nao conectada.
- Decisoes auditadas (`saleia.insight-accepted`, `saleia.insight-dismissed`, `saleia.insight-reopened`).
- Interno: a gravacao da mudanca de etapa do `PATCH /api/opportunities/[id]` passou para `lib/opportunities/change.ts`, compartilhada.
- Testes: 7 unitarios em `saleia-rules.test.mjs` e `saleia-actions.integration.mjs` (13).

Sem migration.

**Arquivos criados:**
- `apps/web/lib/saleia/decisions.ts`, `lib/opportunities/change.ts`, `lib/validations/saleia-insight.ts`
- `apps/web/app/api/saleia/insights/[id]/route.ts`, `app/(app)/saleia/insight-actions.tsx`
- `apps/web/tests/saleia-actions.integration.mjs`

**Arquivos alterados:**
- `apps/web/lib/saleia/rules.ts`, `lib/saleia/service.ts`, `lib/audit/record.ts`, `lib/meu-dia/summary.ts`
- `apps/web/app/api/opportunities/[id]/route.ts`, `app/(app)/saleia/[id]/page.tsx`, `app/(app)/meu-dia/page.tsx`
- `apps/web/tests/saleia-rules.test.mjs`
- `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/CURRENT_STATE.md`, `CHANGELOG.md`

## Tarefa V2-7.2 — 2026-11-06 (no SALE-IA, sem nova versao do SOS)
- SALE-IA V.1.4.196 publicado e configurado em 2026-11-06 para a organizacao NEX-ALS. Nenhum envio ainda: o relatorio automatico do SALE-IA nao grava desde a VPS nova (21/10). Duas causas: datas sem fuso com o `sqlmodel` 0.0.48 (V.1.4.198, publicada em 2026-11-07) e a coluna `relatorio.dados_json` em `VARCHAR(255)` (V.1.4.199, pronta e nao publicada).
- O SALE-IA (V.1.4.196, repositorio proprio) passa a enviar ao SOS cada reuniao com relatorio pos-reuniao automatico, seguindo `docs/INTEGRACAO_SALEIA.md`, com fila e reenvio. Ver o `CHANGELOG.md` do SALE-IA.
- No SOS mudou so a documentacao: `docs/TASKS.md`, `docs/CURRENT_STATE.md` e `CHANGELOG.md`.

## [V.1.25.0] — 2026-11-06 (publicada em producao, imagem `salesos-web:14`)

### Tarefa V2-7.1 — SALEIA no SOS
- Contrato da integracao em `docs/INTEGRACAO_SALEIA.md`: o SALE-IA envia cada reuniao analisada (resumo, participantes, recomendacoes, objecoes, sinais de compra, dores, evidencias e etapa sugerida) por webhook assinado com HMAC-SHA256.
- Recebimento em `POST /api/integrations/saleia/{organizationId}/events`: confere a assinatura e a janela de 5 minutos, limita o corpo a 256 KB e grava de forma idempotente. Reenviar a reuniao atualiza o registro.
- Vinculo automatico com o CRM: negociacao informada, contato pelo e-mail de um participante ou empresa pelo nome.
- Configuracoes: cartao **SALEIA** para conectar, gerar novo segredo e desconectar (administrador). O segredo aparece uma vez e fica criptografado; as operacoes entram no `AuditLog`.
- Tela **SALEIA** (`/saleia`, no menu) com as reunioes recebidas e o filtro "Sem empresa", e detalhe da reuniao com resumo, insights agrupados, trechos e participantes. Reunioes tambem na visao 360 da empresa (no lugar do "em breve") e no detalhe da negociacao.
- Vendedor ve so as reunioes das proprias negociacoes. Nova permissao `saleia:read`.
- Testes: `saleia-rules.test.mjs` (13) e `saleia.integration.mjs` (16).

**Migration:** `20261106122753_saleia_integration` (aditiva: tres tabelas e dois enums). Aplicada em desenvolvimento e em producao.

**Arquivos criados:**
- `apps/web/prisma/migrations/20261106122753_saleia_integration/migration.sql`
- `apps/web/lib/saleia/signature.ts`, `lib/saleia/rules.ts`, `lib/saleia/service.ts`, `lib/validations/saleia-event.ts`
- `apps/web/app/api/integrations/saleia/[organizationId]/events/route.ts`, `app/api/settings/saleia/route.ts`, `app/api/saleia/meetings/route.ts`, `app/api/saleia/meetings/[id]/route.ts`
- `apps/web/app/(app)/saleia/page.tsx`, `[id]/page.tsx`, `meeting-list.tsx`, `app/(app)/configuracoes/saleia-card.tsx`
- `apps/web/tests/saleia-rules.test.mjs`, `apps/web/tests/saleia.integration.mjs`
- `docs/INTEGRACAO_SALEIA.md`

**Arquivos alterados:**
- `apps/web/prisma/schema.prisma`, `lib/auth.config.ts`, `lib/authz/permissions.ts`, `lib/audit/record.ts`, `lib/navigation.ts`, `lib/companies/overview.ts`
- `apps/web/app/(app)/configuracoes/page.tsx`, `app/(app)/empresas/[id]/page.tsx`, `app/(app)/pipeline/[id]/page.tsx`
- `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/CURRENT_STATE.md`, `CHANGELOG.md`

## [V.1.24.0] — 2026-11-05 (publicada em producao em 2026-11-06, imagem `salesos-web:13`)

### Tarefa V2-6 — Atividades e follow-ups
- Atividades (reuniao, follow-up, ligacao, e-mail, tarefa e nota) com responsavel, data, descricao e vinculo a negociacao, empresa e contato. Reuniao e follow-up exigem data; nota ja nasce concluida.
- Tela **Atividades** (`/atividades`, no menu): lista agrupada em atrasadas, hoje, proximas, sem data e concluidas, e agenda semanal; filtros de status, tipo e responsavel; criar, editar, concluir, reabrir e remover.
- Vendedor ve e altera so as proprias atividades; gestor e administrador veem a equipe e atribuem a qualquer membro. Nova permissao `activities:assign` (alem de `activities:read` e `activities:write`).
- Empresa e contato sao herdados da negociacao ou do contato; vinculos de empresas diferentes sao recusados.
- Detalhe da negociacao e visao 360 da empresa mostram e criam atividades.
- Meu Dia: "Reunioes de hoje" e "Follow-ups atrasados e de hoje", com botao de concluir, no lugar dos avisos de "em breve".
- Notificacoes: novo aviso de atividades atrasadas; o aviso de tarefas dos planos passou a dizer "tarefas de plano atrasadas".
- Testes: `activity-rules.test.mjs` (14) e `activities.integration.mjs` (24).

**Migration:** `20261105000000_activity_owner` (aditiva: `ownerId`, `companyId` e indice). Aplicada em desenvolvimento e em producao.

**Arquivos criados:**
- `apps/web/prisma/migrations/20261105000000_activity_owner/migration.sql`
- `apps/web/lib/activities/rules.ts`, `lib/activities/service.ts`, `lib/validations/activity.ts`
- `apps/web/app/api/activities/route.ts`, `app/api/activities/[id]/route.ts`
- `apps/web/app/(app)/atividades/page.tsx`, `activity-filters.tsx`, `activity-form-dialog.tsx`, `activity-list.tsx`, `activity-toggle.tsx`
- `apps/web/tests/activity-rules.test.mjs`, `apps/web/tests/activities.integration.mjs`

**Arquivos alterados:**
- `apps/web/prisma/schema.prisma`, `lib/authz/permissions.ts`, `lib/navigation.ts`, `lib/dashboard/period.ts` (`weekDays`)
- `apps/web/lib/meu-dia/summary.ts`, `lib/notifications/build.ts`, `lib/notifications/summary.ts`, `lib/companies/overview.ts`
- `apps/web/app/(app)/meu-dia/page.tsx`, `app/(app)/pipeline/[id]/page.tsx`, `app/(app)/empresas/[id]/page.tsx`, `components/notifications-menu.tsx`
- `apps/web/tests/header-rules.test.mjs`
- `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/CURRENT_STATE.md`, `CHANGELOG.md`

## [V.1.23.0] — 2026-11-05 (publicada em producao, imagem `salesos-web:12`)

### Tarefa V2-5 — Clientes 360
- Visao 360 da empresa em `/empresas/[id]`: faturado, pipeline aberto, ticket medio, taxa de ganho, ultima movimentacao, negociacoes, linha do tempo, contatos, leads, ultimo diagnostico e secao SALEIA "em breve". Vendedor ve so as proprias negociacoes.
- Edicao de empresa e de contato, com auditoria. Contato nao troca de empresa se tiver negociacao em outra.
- `/empresas` mostra o que esta em negociacao e liga ao detalhe; `/contatos` liga a empresa e permite editar.
- Busca global, detalhe da negociacao e "Novo contato" passam a usar a empresa.
- Testes: `company-rules.test.mjs` (4) e `company.integration.mjs` (15).

Sem migration.

**Arquivos criados:**
- `apps/web/app/(app)/empresas/[id]/page.tsx`, `[id]/company-edit-dialog.tsx`, `app/(app)/contatos/contact-edit-dialog.tsx`
- `apps/web/app/api/companies/[id]/route.ts`, `app/api/contacts/[id]/route.ts`
- `apps/web/lib/companies/overview.ts`, `lib/companies/summary.ts`
- `apps/web/tests/company-rules.test.mjs`, `apps/web/tests/company.integration.mjs`

**Arquivos alterados:**
- `apps/web/app/(app)/empresas/page.tsx`, `app/(app)/contatos/page.tsx`, `contact-form-dialog.tsx`, `app/(app)/pipeline/[id]/page.tsx`
- `apps/web/lib/opportunities/rules.ts`, `lib/search/global-search.ts`, `lib/validations/company.ts`, `lib/validations/contact.ts`, `lib/audit/record.ts`
- `apps/web/tests/header.integration.mjs`
- `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/CURRENT_STATE.md`, `docs/GUIA_DE_USO.md`, `CHANGELOG.md`

## [V.1.22.0] — 2026-11-05 (publicada em producao, imagem `salesos-web:11`)

### Tarefa V2-4.3 — Campos obrigatorios por etapa
- Cada etapa pode exigir valor, empresa, contato e previsao de fechamento, configurados no dialogo Funis. Por padrao, nenhuma exige nada.
- Entrar na etapa sem os campos e recusado com a lista do que falta, ao mover, reabrir ou criar; no quadro, o cartao volta para a coluna.
- Ganhar exige valor maior que zero, e negociacao ganha nao pode ser editada para zero. Perder nunca depende dos campos.
- Em andamento, nao se apaga campo exigido pela etapa atual; o que ja faltava nao impede editar o resto.
- Testes: casos novos em `opportunity-rules.test.mjs`, `board-rules.test.mjs` e `kanban.integration.mjs`.

**Migration:** `20261104000000_stage_required_fields` (aditiva). Aplicada em desenvolvimento e em producao.

**Arquivos criados:**
- `apps/web/prisma/migrations/20261104000000_stage_required_fields/migration.sql`

**Arquivos removidos:**
- `apps/web/lib/opportunities/edit.ts` (conteudo em `rules.ts`)

**Arquivos alterados:**
- `apps/web/prisma/schema.prisma`, `lib/opportunities/rules.ts`, `lib/pipelines/service.ts`, `lib/pipelines/edit.ts`, `lib/validations/pipeline.ts`
- `apps/web/app/api/opportunities/route.ts`, `app/api/opportunities/[id]/route.ts`, `app/api/pipelines/route.ts`, `app/api/pipelines/[id]/route.ts`
- `apps/web/app/(app)/pipeline/pipeline-editor-dialog.tsx`
- `apps/web/tests/opportunity-rules.test.mjs`, `board-rules.test.mjs`, `kanban.integration.mjs`
- `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/CURRENT_STATE.md`, `docs/GUIA_DE_USO.md`, `CHANGELOG.md`

## [V.1.21.0] — 2026-11-04 (publicada em producao com a V.1.22.0, imagem `salesos-web:11`)

### Tarefa V2-4.2 — Kanban, detalhe e edicao
- Quadro com arrastar entre etapas e seletor de etapa em tela de toque; cartao com dono, valor, empresa e dias na etapa.
- Filtros na URL: funil, status, dono, ordenacao e texto, com visao em quadro ou lista.
- Pagina de detalhe da negociacao (`/pipeline/[id]`) com dados, historico e acoes; Ganhar, Perder e Reabrir sairam do cartao. O seletor de etapa do detalhe tambem muda de funil.
- `GET` e `PUT /api/opportunities/[id]`: leitura do detalhe e edicao de titulo, valor, empresa, contato, dono, previsao e observacoes, com auditoria. Nova permissao `opportunities:assign`.
- Busca global e Meu Dia levam ao detalhe da negociacao.
- Testes: `board-rules.test.mjs` (8) e `kanban.integration.mjs` (15).

**Validacao:** lint, tipos, build e testes unitarios; integracao no CI e localmente; arrastar e telas em navegador real.

Sem migration.

**Arquivos criados:**
- `apps/web/app/(app)/pipeline/board.tsx`, `board-filters.tsx`, `[id]/page.tsx`, `[id]/opportunity-actions.tsx`, `[id]/opportunity-edit-dialog.tsx`
- `apps/web/lib/opportunities/board.ts`, `detail.ts`
- `apps/web/tests/board-rules.test.mjs`, `apps/web/tests/kanban.integration.mjs`

**Arquivos removidos:**
- `apps/web/app/(app)/pipeline/opportunity-card.tsx`

**Arquivos alterados:**
- `apps/web/app/(app)/pipeline/page.tsx`, `app/(app)/meu-dia/page.tsx`, `app/api/opportunities/[id]/route.ts`
- `apps/web/lib/search/global-search.ts`, `lib/validations/opportunity.ts`, `lib/authz/permissions.ts`, `lib/audit/record.ts`
- `apps/web/tests/header.integration.mjs`, `apps/web/tests/pipelines.integration.mjs`
- `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/CURRENT_STATE.md`, `docs/GUIA_DE_USO.md`, `CHANGELOG.md`

## [V.1.20.0] — 2026-11-03 (publicada em producao em 2026-11-04, imagem `salesos-web:10`)

### Tarefa V2-4.1 — Funis e etapas configuraveis
- **Funis**: cada cliente pode ter varios funis, cada um com etapas proprias (nome, ordem, probabilidade e marca de "etapa de proposta"). Gestor e administrador criam, editam e removem funis pelo botao "Funis" em Negociacoes ou por `/api/pipelines`, com auditoria. Etapa removida fica arquivada e so sai sem negociacoes em andamento; o funil padrao nao pode ser removido.
- **Status separado da etapa**: a negociacao esta em andamento, ganha ou perdida, e continua na etapa em que fechou. Ganhar e perder viraram botoes no card; reabrir continua restrito a gestor e administrador.
- Negociacoes: escolha do funil e filtro de status (em andamento, ganhas, perdidas, todas).
- Meu Dia: as propostas aguardando resposta vem das etapas marcadas como proposta. Dashboard: filtro de funil, e o funil do periodo usa as etapas do funil escolhido.
- Historico grava etapa e status de origem e destino.
- Cliente novo ja nasce com o funil padrao "Vendas" (Prospeccao, Qualificacao, Proposta, Negociacao).
- Corrigido antes de publicar: reabrir uma negociacao ganha numa etapa removida era aceito.
- Testes: `pipelines.integration.mjs` (16) e regras novas em `opportunity-rules.test.mjs`; as demais suites foram adaptadas ao modelo novo.

**Migration:** `20261103000000_pipelines`. Cria o funil padrao em cada organizacao, converte negociacoes e historico e remove o enum `OpportunityStage`. Nao e aditiva: reverter exige restaurar o backup (ver `docs/DEPLOY.md`). Aplicada em desenvolvimento e em producao, com o app parado.

**Arquivos criados:**
- `apps/web/prisma/migrations/20261103000000_pipelines/migration.sql`
- `apps/web/lib/pipelines/defaults.ts`, `lib/pipelines/edit.ts`, `lib/pipelines/service.ts`, `lib/validations/pipeline.ts`
- `apps/web/app/api/pipelines/route.ts`, `app/api/pipelines/[id]/route.ts`
- `apps/web/app/(app)/pipeline/pipeline-editor-dialog.tsx`
- `apps/web/tests/pipelines.integration.mjs`

**Arquivos alterados:**
- `apps/web/prisma/schema.prisma`, `lib/opportunities/rules.ts`, `lib/opportunities/create.ts`, `lib/validations/opportunity.ts`
- `apps/web/app/api/opportunities/route.ts`, `app/api/opportunities/[id]/route.ts`, `app/api/organizations/route.ts`, `app/api/dashboard/route.ts`
- `apps/web/app/(app)/pipeline/page.tsx`, `opportunity-card.tsx`, `opportunity-form-dialog.tsx`
- `apps/web/app/(app)/dashboard/page.tsx`, `dashboard-filters.tsx`, `app/(app)/meu-dia/page.tsx`
- `apps/web/lib/dashboard/executive.ts`, `lib/dashboard/metrics.ts`, `lib/dashboard/kpis.ts`, `lib/meu-dia/summary.ts`, `lib/notifications/summary.ts`, `lib/search/global-search.ts`, `lib/authz/permissions.ts`, `lib/audit/record.ts`
- `apps/web/tests/support.mjs` e as suites de integracao e unitarias afetadas
- `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/DEPLOY.md`, `docs/TASKS.md`, `docs/CURRENT_STATE.md`, `docs/GUIA_DE_USO.md`, `CHANGELOG.md`

## [V.1.19.0] — 2026-11-02 (publicada em producao, imagem `salesos-web:9`)

### Tarefa V2-3 — Dashboard Executivo
- `/dashboard` reescrito: faturamento com grafico diario, "no ritmo, o mes fecha" (contra a media dos 3 meses anteriores), vendas ganhas, ticket medio e taxa de ganho, cada um com a variacao sobre o periodo anterior equivalente.
- Filtros de periodo (este mes, mes anterior, ultimos 90 dias, este ano) e de vendedor (gestor e administrador). O vendedor ve so os proprios numeros.
- Funil do periodo pelo historico de etapas, saude do pipeline (ciclo de venda, pipeline aberto, esfriando, fechamento vencido), metas do mes com o ideal de hoje, tabela do time, origem da venda e motivos de perda.
- `GET /api/dashboard?periodo=&vendedor=` devolve os mesmos dados da tela.
- Corrigido: os KPIs usados pelo Consultor Digital e por Meus Clientes calculavam o mes em UTC; agora usam o fuso de Brasilia.
- O convite para o Diagnostico Comercial so aparece enquanto o cliente nao tem diagnostico.
- Nova permissao `dashboard:read`, concedida a todos os papeis.
- Testes: `dashboard-rules.test.mjs` (13) e `dashboard.integration.mjs` (11).

Sem migration.

**Arquivos criados:**
- `apps/web/lib/dashboard/period.ts`, `lib/dashboard/metrics.ts`, `lib/dashboard/executive.ts`
- `apps/web/app/(app)/dashboard/dashboard-filters.tsx`, `apps/web/app/api/dashboard/route.ts`
- `apps/web/tests/dashboard-rules.test.mjs`, `apps/web/tests/dashboard.integration.mjs`

**Arquivos alterados:**
- `apps/web/app/(app)/dashboard/page.tsx`, `lib/dashboard/kpis.ts`, `lib/authz/permissions.ts`
- `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/CURRENT_STATE.md`, `docs/GUIA_DE_USO.md`, `CHANGELOG.md`

## [V.1.18.0] — 2026-11-02 (publicada em producao, imagem `salesos-web:8`)

### Tarefa V2-2.2 — Busca global, notificacoes e tema claro
- **Busca global** no cabecalho, aberta tambem por `Ctrl+K`, `Cmd+K` ou `/`: negociacoes, empresas, contatos e planos de acao da organizacao ativa, navegavel pelo teclado. `GET /api/search?q=` exige 2 caracteres. Vendedor so encontra as proprias negociacoes.
- **Notificacoes** no cabecalho: leads qualificados nao vistos (gestor e administrador), tarefas atrasadas, fechamentos vencidos e negociacoes esfriando, com os criterios do Meu Dia. Derivadas do estado atual, sem tabela nova. `GET /api/notifications`.
- **Tema claro**: botao no cabecalho, preferencia guardada no cookie `salesos-theme` e aplicada pelo servidor, sem piscar. O escuro continua o padrao. Sem dependencia nova.
- Cores fixas do tema escuro trocadas por tokens em 33 arquivos (`text-white` -> `text-foreground`, `border-white/N` -> `border-foreground/N`, dourado de texto -> `text-gold-fg`). Textos verdes, vermelhos e ambar ficam mais escuros no tema claro. No tema escuro, a aparencia nao muda.
- Testes: `header-rules.test.mjs` (8) e `header.integration.mjs` (12).

Sem migration.

**Arquivos criados:**
- `apps/web/lib/theme.ts`, `lib/notifications/build.ts`, `lib/notifications/summary.ts`, `lib/search/query.ts`, `lib/search/global-search.ts`
- `apps/web/components/theme-toggle.tsx`, `components/notifications-menu.tsx`, `components/global-search.tsx`
- `apps/web/app/api/notifications/route.ts`, `app/api/search/route.ts`
- `apps/web/tests/header-rules.test.mjs`, `apps/web/tests/header.integration.mjs`

**Arquivos alterados:**
- `apps/web/app/globals.css`, `app/layout.tsx`, `app/(app)/layout.tsx`, `components/app-header.tsx`, `lib/meu-dia/summary.ts` (exporta `OPEN_STAGES`)
- Cores das paginas e componentes em `apps/web/app` e `apps/web/components` (apenas classes)
- `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/CURRENT_STATE.md`, `docs/GUIA_DE_USO.md`, `CHANGELOG.md`

## [V.1.17.1] — 2026-10-31

### Documentacao
- Criado `docs/GUIA_DE_USO.md`: papeis e permissoes, Meu Dia (com a formula de cada indicador), metas e regras das negociacoes, para quem usa o sistema.
- Criado `README.md` na raiz: indice da documentacao.
- `apps/web/README.md` reescrito: telas atuais, seguranca, estrutura, comandos e testes.
- `docs/DEPLOY.md`: checklist antes e depois de publicar, imagem anterior mantida para reverter, SQL testado para vincular usuario a um cliente com papel, erros no log.
- `docs/ARCHITECTURE.md`: rotas reais dos modulos, testes e CI, novas decisoes tecnicas.
- `docs/SPEC.md`: regras de papeis, integridade comercial, erros da API, Meu Dia e metas.
- `docs/CURRENT_STATE.md`: retrato atual da producao e do codigo, estrutura e pendencias revisadas.
- `main` alinhada com `feat/saleos-v2`, o codigo em producao.
- Nenhum codigo foi alterado.

**Arquivos criados:**
- `README.md`
- `docs/GUIA_DE_USO.md`

**Arquivos alterados:**
- `apps/web/README.md`
- `docs/DEPLOY.md`, `docs/ARCHITECTURE.md`, `docs/SPEC.md`, `docs/CURRENT_STATE.md`
- `CLAUDE.md`, `CHANGELOG.md`

## [V.1.17.0] — 2026-10-31 (publicada em producao, imagem `salesos-web:7`)

### Tarefa V2-2.1 — Meu Dia, cabecalho global e metas
- Nova tela **Meu Dia** (`/meu-dia`), agora a pagina inicial apos o login: meta do mes com barra de progresso, ideal de hoje, projecao e ritmo por dia util; conversao, ticket medio e vendas de hoje; propostas aguardando resposta, negociacoes esfriando (mais de 14 dias na etapa), fechamento previsto vencido, tarefas atrasadas e de hoje dos planos de acao e leads quentes do IA SDR.
- Vendedor ve apenas os proprios numeros e a propria meta; gestor e administrador veem a organizacao e a meta da equipe.
- Reunioes, follow-ups, fechamento do dia e recomendacoes da SALEIA aparecem como blocos "em breve", sem dados ficticios.
- **Metas mensais** (`SalesGoal`): meta da equipe e por vendedor, definidas por gestor ou administrador no proprio Meu Dia (`PUT /api/goals`, auditado).
- `GET /api/meu-dia` devolve os mesmos indicadores da tela.
- Datas no fuso de Brasilia (`lib/time/business-calendar.ts`): uma venda as 22h do dia 31 conta no proprio mes, embora o servidor rode em UTC. Dias uteis de segunda a sexta.
- **Cabecalho global** em todas as telas: titulo da pagina, cliente ativo e menu do usuario com "Trocar de cliente" e **Sair**, que nao existia.
- **Menu lateral reorganizado** (Operacao, CRM, Inteligencia, Consultoria) a partir de `lib/navigation.ts`: itens restritos somem para quem nao pode abri-los, e o link para `/academia` (404) foi removido.
- Corrigido: o quadro do pipeline alargava a pagina e escondia o botao "Nova oportunidade" e a parte direita do cabecalho.
- Testes: `meu-dia-rules.test.mjs` (11) e `meu-dia.integration.mjs` (15).

**Migration:** `20261101000000_sales_goals` (tabela nova). Aplicada apenas no banco de desenvolvimento.

**Arquivos criados:**
- `apps/web/app/(app)/meu-dia/page.tsx`, `goal-dialog.tsx`
- `apps/web/app/api/meu-dia/route.ts`, `apps/web/app/api/goals/route.ts`
- `apps/web/components/app-header.tsx`
- `apps/web/lib/navigation.ts`, `lib/time/business-calendar.ts`, `lib/meu-dia/goal-progress.ts`, `lib/meu-dia/summary.ts`, `lib/validations/goal.ts`
- `apps/web/tests/meu-dia-rules.test.mjs`, `apps/web/tests/meu-dia.integration.mjs`

**Arquivos alterados:**
- `apps/web/components/app-sidebar.tsx`, `components/access-denied.tsx`, `app/(app)/layout.tsx`
- As 12 paginas autenticadas (cabecalho proprio removido)
- `apps/web/app/page.tsx`, `app/(auth)/login/page.tsx`, `lib/auth.config.ts`, `app/(app)/clientes/*` (entrada no Meu Dia)
- `apps/web/lib/authz/permissions.ts`, `lib/audit/record.ts`, `prisma/schema.prisma`
- `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/CURRENT_STATE.md`, `CHANGELOG.md`

## [V.1.16.2] — 2026-10-31 (publicada em producao com a V.1.16.1, imagem `salesos-web:6`)

### Tarefa V2-1.3 — Qualidade tecnica
- Lint zerado: os 4 erros antigos corrigidos (`<a>` interno no dashboard, aspas na tela de login e `useIsMobile` reescrito com `useSyncExternalStore`).
- Erros da API padronizados em `lib/api/errors.ts`: corpo unico `{ error, code, fields? }`, com codigo estavel (`UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`, `CONFLICT`, `UNPROCESSABLE`, `RATE_LIMITED`, `INTERNAL`, `UPSTREAM_FAILED`). Mensagens e status anteriores mantidos.
- `withApiErrors` (`lib/api/handler.ts`) envolve todos os 23 handlers: erro inesperado vira 500 em JSON, em vez da pagina de erro do Next.
- Logs de erro no servidor, em uma linha JSON com escopo. Antes, as falhas eram descartadas sem registro, inclusive as da Anthropic e a criacao de lead do IA SDR. O log oculta chaves, tokens, e-mails e URLs com credencial e nao inclui a mensagem de erros do Prisma.
- CI no GitHub Actions (`.github/workflows/ci.yml`): lint, tipos, testes unitarios, migrations, build e testes de integracao em PostgreSQL temporario.
- Scripts `npm run check` e `npm run test:integration`. Novos testes: `api-errors.test.mjs` (7) e `errors.integration.mjs` (6).

**Arquivos criados:**
- `apps/web/lib/api/errors.ts`
- `apps/web/lib/api/handler.ts`
- `apps/web/tests/api-errors.test.mjs`
- `apps/web/tests/errors.integration.mjs`
- `.github/workflows/ci.yml`

**Arquivos alterados:**
- Todas as rotas em `apps/web/app/api` (exceto a do NextAuth)
- `apps/web/lib/authz/guard.ts`, `apps/web/hooks/use-mobile.ts`
- `apps/web/app/(app)/dashboard/page.tsx`, `apps/web/app/(auth)/login/page.tsx`
- `apps/web/tests/support.mjs`, `apps/web/package.json`
- `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/CURRENT_STATE.md`, `CHANGELOG.md`

## [V.1.16.1] — 2026-10-31 (publicada em producao, imagem `salesos-web:6`)

### Tarefa V2-1.2 — Integridade comercial
- Regras de etapa em `lib/opportunities/rules.ts`: perda exige motivo (422); so gestor ou administrador reabre negociacao encerrada (403); probabilidade definida pela etapa (10, 25, 50, 75, 100 e 0).
- Criado `OpportunityStageHistory`: toda criacao e mudanca de etapa registra origem, destino, responsavel, data e motivo da perda. Substitui o registro de mudanca de etapa no `AuditLog`.
- `Opportunity` ganha `wonAt`, `lostAt` e `stageChangedAt`. O dashboard passa a medir ganhos e perdas do mes pela data real, e nao por `updatedAt`.
- Mudancas simultaneas na mesma oportunidade: a segunda recebe 409, e o historico fica sempre encadeado.
- Contato de outra empresa e rejeitado; sem empresa informada, a oportunidade herda a do contato.
- `Opportunity.value` passa a `Decimal(14,2)`; a API continua devolvendo numero.
- Diagnostico para oportunidade: id deterministico e criacao em transacao, sem duplicar em pedidos simultaneos.
- IA SDR: lead e oportunidade criados na mesma transacao; uma falha nao impede mais a nova tentativa.
- Pipeline: perda pede o motivo antes de enviar, exibe o motivo no card e mostra o erro devolvido pela API.
- Criados `tests/opportunity-rules.test.mjs` (12), `tests/commercial.integration.mjs` (10) e `tests/support.mjs`, compartilhado com a suite de permissoes.

**Migration:** `20261031220000_opportunity_integrity`. Preserva os registros: preenche as datas de fechamento e `stageChangedAt` com `updatedAt` e reconstitui o historico sem responsavel. Aplicada apenas no banco de desenvolvimento.

**Arquivos criados:**
- `apps/web/lib/opportunities/rules.ts`
- `apps/web/lib/opportunities/create.ts`
- `apps/web/tests/opportunity-rules.test.mjs`
- `apps/web/tests/commercial.integration.mjs`
- `apps/web/tests/support.mjs`

**Arquivos alterados:**
- `apps/web/app/api/opportunities/route.ts` e `[id]/route.ts`
- `apps/web/app/api/diagnosticos/[id]/oportunidade/route.ts`
- `apps/web/app/api/sdr/[organizationId]/conversations/[conversationId]/messages/route.ts`
- `apps/web/app/(app)/pipeline/page.tsx` e `opportunity-card.tsx`
- `apps/web/lib/dashboard/kpis.ts`, `lib/authz/permissions.ts`, `lib/audit/record.ts`
- `apps/web/lib/validations/opportunity.ts`, `lib/diagnostico/opportunity-marker.ts`
- `apps/web/prisma/schema.prisma`, `apps/web/package.json`, `apps/web/tests/authz.integration.mjs`
- `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/CURRENT_STATE.md`, `CHANGELOG.md`

## [V.1.16.0] — 2026-10-31 (publicada em producao, imagem `salesos-web:5`)

### Etapa Zero do Prompt Mestre V2
- Criado `docs/AUDITORIA_V2.md`: linha de base, estado por modulo, seguranca, SALEIA, conflitos, rollback e diferenca para o Prompt Mestre.

### Tarefa V2-1.1 — Autenticacao e permissoes
- Papeis passam a valer no backend: administrador (`OWNER`, `ADMIN`, `CONSULTANT`), gestor (`MANAGER`, novo) e vendedor (`MEMBER`). Matriz em `lib/authz/permissions.ts`; acoes negadas respondem 403.
- `Opportunity.ownerId`: vendedor ve e altera apenas as proprias oportunidades, em API, pipeline, dashboard e "Meus Clientes".
- A sessao revalida vinculo e papel no banco a cada leitura: remover um membro ou mudar o papel vale na hora, e usuario excluido perde a sessao.
- Criado `AuditLog`: registra integracao salva e removida, organizacao criada, troca de organizacao ativa e mudanca de etapa, sem segredos.
- Atualizados `next` 16.4.3, `next-auth` 5.0.0-beta.32 e `@auth/prisma-adapter` 2.11.3, por falhas criticas publicadas nas versoes anteriores. Alertas criticos de 5 para 1.
- Criados testes com `node:test`, sem dependencia nova: `npm test` (11) e `npm run test:authz` (23).

**Migration:** `20261031190000_add_rbac_owner_audit` (aditiva). Aplicada apenas no banco de desenvolvimento.

**Arquivos criados:**
- `apps/web/lib/authz/permissions.ts`
- `apps/web/lib/authz/guard.ts`
- `apps/web/lib/audit/record.ts`
- `apps/web/components/access-denied.tsx`
- `apps/web/tests/permissions.test.mjs`
- `apps/web/tests/authz.integration.mjs`
- `docs/AUDITORIA_V2.md`

**Arquivos alterados:**
- `apps/web/lib/auth.ts`, `lib/dashboard/kpis.ts`, `lib/organizations/client-summary.ts`
- Todas as rotas autenticadas em `apps/web/app/api`
- Paginas `clientes`, `configuracoes`, `consultor`, `dashboard`, `diagnostico/[id]`, `pipeline`, `planos`, `sdr` e o layout autenticado
- `apps/web/prisma/schema.prisma`, `apps/web/package.json`, `apps/web/package-lock.json`
- `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/CURRENT_STATE.md`, `CHANGELOG.md`

## [V.1.15.7] — 2026-10-31

### Fase 10.6 — Dominio `www`
- `CNAME www` restaurado pelo usuario na Hostinger.
- Certificado `saleos.tech` expandido para `www.saleos.tech`; o `www` redireciona para `https://saleos.tech`.
- Nenhum codigo foi alterado. A configuracao do nginx foi atualizada na VPS pelo certbot.

**Arquivos alterados:**
- `CLAUDE.md`
- `docs/DEPLOY.md`
- `docs/TASKS.md`
- `docs/CURRENT_STATE.md`
- `CHANGELOG.md`

## [V.1.15.6] — 2026-10-30

### Documentacao
- Criado `docs/DEPLOY.md`: operacao de producao, publicacao, usuarios, backups, restauracao e diagnostico.
- `CLAUDE.md`, `docs/ARCHITECTURE.md` e `apps/web/README.md` alinhados ao estado real: stack, estrutura, producao na VPS e modulos ja construidos.
- `docs/CURRENT_STATE.md` atualizado com o estado de producao e os riscos conhecidos.
- Nenhum codigo foi alterado.

**Arquivos criados:**
- `docs/DEPLOY.md`

**Arquivos alterados:**
- `CLAUDE.md`
- `apps/web/README.md`
- `docs/ARCHITECTURE.md`
- `docs/CURRENT_STATE.md`
- `CHANGELOG.md`

## [V.1.15.5] — 2026-10-30

### Correcao — primeiro acesso sem organizacao ativa
- **Bug: usuario sem organizacao recebia "Usuario sem permissao para criar empresa."** ao salvar dados, sem nenhuma orientacao. A causa nao era permissao: toda escrita exige uma organizacao ativa, e um banco novo comeca sem nenhuma.
- O layout autenticado passa a exibir um aviso com link para `/clientes` enquanto nao houver organizacao ativa.

**Arquivos alterados:**
- `apps/web/app/(app)/layout.tsx`
- `docs/CURRENT_STATE.md`
- `CHANGELOG.md`

## [V.1.15.4] — 2026-10-30

### Fase 10.7 — Backup do banco de producao
- Backup diario as 03:30 (Brasilia) na VPS, com validacao do dump, retencao de 14 dias e copia do `.env`.
- Restauracao testada em banco temporario, com resultado igual ao da producao.
- Copia externa ativa: backup criptografado com GPG e enviado ao Backblaze B2 via rclone. A restauracao foi simulada com destino local.
- Pendente (tarefa 10.9): trocar a chave do Backblaze, exposta no chat.

**Arquivos criados:**
- `.gitattributes`
- `deploy/backup.sh`
- `deploy/setup-offsite.sh`
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
