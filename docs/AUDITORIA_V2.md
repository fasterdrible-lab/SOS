# AUDITORIA_V2.md - Etapa Zero do Prompt Mestre V2

**Data:** 2026-10-31  
**Referencia:** branch `feat/fases-4-8`, commit `a2f49ef` (`main` em `96005f4`, diferenca apenas de documentacao)  
**Branch de desenvolvimento:** `feat/saleos-v2`  
**SALE-IA:** `main` no GitHub em `1b57f29`; VPS em `9d393e9` (diferenca apenas de documentacao)

> Retrato de antes da Tarefa V2-1.1. Os itens marcados como 1.1 foram tratados nessa tarefa, ainda sem deploy. Apos ela, `npm audit --omit=dev` indica 29 alertas e 1 critico (`proxy-addr`, via CLI `shadcn`, que nao roda no app).

## Linha de base

| Verificacao | Resultado |
|---|---|
| `npm run build` | Passa |
| `npx tsc --noEmit` | Passa |
| `npm run lint` | Falha: 4 erros em `dashboard/page.tsx`, `login/page.tsx` e `hooks/use-mobile.ts` |
| Testes automatizados | Nao existem (sem suite, sem CI) |
| `npm audit --omit=dev` | 36 vulnerabilidades: 5 criticas, 21 altas, 9 moderadas, 1 baixa |

Producao (consultas somente leitura em 2026-10-31): imagem `salesos-web:4`, 1 usuario, 1 organizacao, 1 empresa e nenhuma oportunidade, lead, contato, atividade, diagnostico ou plano. O unico membro tem papel `CONSULTANT`. Login Google nao configurado. Container do app em UTC.

## Estado por modulo

| Modulo | Estado atual | Arquivos envolvidos | Problemas | Acao necessaria |
|---|---|---|---|---|
| Dashboard | Funcional, KPIs reais | `app/(app)/dashboard/page.tsx`, `lib/dashboard/kpis.ts` | Ganho e perda usam `updatedAt` como data; mes calculado em UTC; sem faturamento, ticket, metas, funil ou filtros | Evoluir (FASE 3) |
| Empresas | Lista e cadastro | `app/(app)/empresas/*`, `app/api/companies/route.ts` | Sem editar, excluir, responsavel ou detalhe | Evoluir (FASE 5) |
| Contatos | Lista e cadastro | `app/(app)/contatos/*`, `app/api/contacts/route.ts` | Sem editar, excluir ou detalhe | Evoluir (FASE 5) |
| Pipeline | Board com select de etapa | `app/(app)/pipeline/*`, `app/api/opportunities/**` | Etapas fixas em enum; sem dono, historico, data de ganho, motivo de perda ou arrastar; contato nao e conferido contra a empresa | Corrigir (1.2) e evoluir (FASE 4) |
| Leads | Sem tela | `prisma.lead` apenas no IA SDR e nos KPIs | Sem CRUD nem conversao; KPIs dependem do IA SDR | Evoluir (decidir na FASE 3) |
| Atividades | Model sem uso | `Activity` no schema | Nenhuma rota ou tela usa o model; sem responsavel | Implementar (FASE 6) |
| Diagnostico | Funcional | `app/(app)/diagnostico/**`, `app/api/diagnosticos/**`, `lib/scoring/*` | Idempotencia por texto em `notes`, sujeita a corrida | Manter; corrigir em 1.2 |
| Plano de Acao | Funcional | `app/(app)/planos/**`, `app/api/action-plans/**` | `responsible` e texto livre; sem editar ou excluir | Manter |
| IA SDR | Implementado, sem validacao real | `app/sdr/**`, `app/api/sdr/**`, `lib/sdr/*` | Tarefa 9.2 bloqueada; `qualifyLead` nao e transacional: falha entre lead e oportunidade impede nova tentativa, porque o lead ja existe | Corrigir (1.2) |
| Consultor Digital | Implementado, sem validacao real | `app/(app)/consultor/*`, `app/api/consultor/*` | Tarefa 9.2 bloqueada | Manter |
| Meus Clientes | Funcional | `app/(app)/clientes/*`, `lib/organizations/client-summary.ts` | Cerca de 18 consultas por organizacao | Manter; otimizar quando houver volume |
| Configuracoes | Chaves de IA | `app/(app)/configuracoes/*`, `app/api/settings/**` | Qualquer membro altera ou remove chaves; sem usuarios, papeis, metas ou funis | Corrigir (1.1) e evoluir (FASE 9) |
| Academia | Ausente | Link na sidebar para `/academia` | Link leva a 404 | Decidir: remover o link ou construir |
| Meu Dia | Ausente | - | - | Implementar (FASE 2) |
| Report Diario | Ausente | - | Depende de reunioes e da SALEIA | Implementar (FASE 8) |
| Layout | Parcial | `components/app-sidebar.tsx`, `app/(app)/layout.tsx` | Sem cabecalho global, busca, notificacoes, perfil ou organizacao ativa visivel; cada pagina repete o proprio header | Evoluir (FASE 2) |
| Tema | So escuro | `app/layout.tsx`, `app/globals.css` | `dark` fixo; 86 usos de `text-white` e cores fixas impedem o tema claro; `next-themes` nao instalado | Evoluir (FASE 2) |
| Seguranca | Parcial | `lib/auth.ts`, `proxy.ts`, todas as rotas | Ver secao abaixo | Corrigir |
| SALEIA | Sem integracao | - | Ver secao abaixo | Integrar (FASE 7) |

## Seguranca

O isolamento entre organizacoes esta correto: todas as consultas revisadas filtram por `organizationId` da sessao, e a validacao de 2026-10-30 confirmou isso por HTTP.

| Severidade | Achado | Tratamento |
|---|---|---|
| Critica | `next@16.2.6` e `next-auth@5.0.0-beta.31`, em producao, tem falhas publicadas, inclusive desvio do Proxy e falha de verificacao de autenticacao | Atualizar em 1.1; a correcao so chega a producao com deploy autorizado |
| Alta | Papel nunca e verificado: qualquer membro faz tudo | 1.1 |
| Alta | Remover um membro nao tem efeito ate o JWT expirar (30 dias), pois a sessao nunca revalida o vinculo | 1.1 |
| Alta | Oportunidade nao tem dono, logo vendedor nao pode ser limitado as proprias | 1.1 |
| Media | Sem registro auditavel de operacoes sensiveis | 1.1 |
| Media | Sem limite de tentativas de login | Apos 1.1, junto com o proximo ajuste de nginx |
| Media | Sem cabecalhos de seguranca no app e no nginx | Apos 1.1 |
| Media | Login Google, se ativado, criaria contas sem aprovacao | Decidir antes de configurar |
| Media | Valores monetarios em `Float` | 1.2 |
| Baixa | Senha aceita minimo de 6 caracteres no login, 12 na criacao | 1.1 nao altera; tratar em 9.1 |

Tambem seguem abertas as pendencias anteriores: chave do Backblaze (10.9), sem alerta de falha do backup, e repositorio aparentemente publico. Por isso esta auditoria nao deve ser publicada antes de a producao receber as correcoes.

## SALEIA

Fatos verificados no codigo:

- FastAPI, Python e MySQL, na mesma VPS. Tem testes automatizados e 151 rotas.
- **Nao ha multiempresa.** A decisao e documentada: "uso interno de uma unica empresa".
- Isolamento por `usuario_id`, com perfil `admin`. Reunioes e clientes sem dono ficam acessiveis a qualquer autenticado.
- Ja possui `Opportunity`, historico de etapas, `MeetingMemory`, `ClaudeMeetingAnalysis`, `SalesEvidence`, `RecommendationEvent` e `AuditTrailEntry`.
- Autenticacao apenas de usuario. Nao ha credencial entre servicos.
- Entrada existente: webhook do Tactiq, com assinatura HMAC opcional. Nao existe evento de saida nem fila.
- Nenhuma referencia ao SOS.

Consequencias para a FASE 7:

- A integracao exige mudancas tambem no SALE-IA: autenticacao entre servicos e eventos de saida ou leitura incremental.
- Sem `organization_id`, uma instalacao do SALE-IA so pode ser mapeada para uma organizacao do SOS, salvo se o SALE-IA ganhar multiempresa.
- As regras do SALE-IA valem para essas mudancas: cada deploy exige confirmacao e o servico nunca reinicia com reuniao ativa.

## Referencias visuais

As 6 capturas `telas*.jpeg` foram analisadas: Meu Dia, Dashboard, Negociacoes (3 telas) e Report. Contem nomes reais de pessoas e valores de outra empresa, portanto seguem fora do git. O prototipo HTML citado no Prompt Mestre nao foi encontrado no repositorio nem em Downloads.

## Conflitos entre o Prompt Mestre e o sistema

1. **"Clientes".** Hoje `/clientes` lista organizacoes do consultor. "Clientes 360" trata de empresas do CRM. Proposta: manter `/clientes` e criar `/empresas/[id]` como visao 360, com o rotulo de menu decidido na FASE 5.
2. **Papeis.** O enum atual e `OWNER/ADMIN/CONSULTANT/MEMBER`, e o Prompt pede administrador, gestor e vendedor. Decisao em 1.1 abaixo.
3. **Equipes.** Nao ha model `Team`. Gestor ve toda a organizacao ate a FASE 9.
4. **Duas fontes de oportunidade.** SOS e SALE-IA tem `Opportunity` proprias. O contrato da FASE 7 deve definir o SOS como fonte de verdade comercial.

## Decisoes da Tarefa 1.1

| Papel no banco | Nivel | Observacao |
|---|---|---|
| `OWNER`, `ADMIN`, `CONSULTANT` | Administrador | O consultor administra a organizacao-cliente que criou, entao producao nao muda de comportamento |
| `MANAGER` (novo) | Gestor | Valor adicionado ao enum; nenhum registro e alterado |
| `MEMBER` | Vendedor | Ve apenas oportunidades proprias |

Oportunidades sem dono ficam visiveis apenas para gestor e administrador. Nao ha como atribuir papeis pela interface ate a Tarefa 9.1.

## Plano de rollback

- **Codigo:** todo o trabalho fica em `feat/saleos-v2`, sem merge nem push sem autorizacao.
- **Banco:** as migrations da Tarefa 1.1 sao aditivas (valor novo de enum, coluna opcional e tabela nova). O valor do enum nao pode ser removido com `ALTER TYPE`, mas sem uso nao afeta o sistema.
- **Producao:** antes de qualquer deploy, rodar `systemctl start salesos-backup.service`, manter a imagem `salesos-web:4` e seguir `docs/DEPLOY.md`. Para reverter, voltar `WEB_TAG` e, se preciso, restaurar o dump.

## Diferenca para o Prompt Mestre

| Fase | Existe | Falta |
|---|---|---|
| 1 Seguranca e integridade | Isolamento por organizacao | Papeis, historico, data de ganho, lint, testes |
| 2 Meu Dia | Nada | Tela, cabecalho global, tema claro, `Goal` |
| 3 Dashboard | 4 KPIs | Faturamento, metas, funil, vendedores, filtros |
| 4 Kanban | Board simples | `Pipeline`, `PipelineStage`, migracao do enum, arrastar, filtros |
| 5 Clientes 360 | Empresas e contatos | Visao unificada, secao SALEIA |
| 6 Atividades | Model `Activity` | Rotas, telas, agenda, responsavel |
| 7 SALEIA | Nada | Contrato, autenticacao, eventos, ingestao, tela |
| 8 Report | Nada | Reunioes, fechamento do dia, validacao humana |
| 9 Administracao | Chaves de IA | Usuarios, convites, equipes, configuracoes comerciais |
| 10 Homologacao | Roteiro HTTP pontual | Suite completa e metricas |
