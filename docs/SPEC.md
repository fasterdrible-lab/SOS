# SPEC.md - SalesOS

## Funcionalidade: Diagnostico Comercial

### Descricao geral
Wizard multi-step para coletar dados basicos da operacao comercial e salvar um diagnostico inicial por organizacao.

### Paginas envolvidas
- `/diagnostico`

### Componentes
- Pagina autenticada de diagnostico
- Wizard client-side com etapas, progresso, validacao visual basica e resumo
- API `POST /api/diagnosticos`

### Comportamento do usuario
- Usuario preenche dados da empresa, operacao comercial e dores principais.
- Usuario navega entre etapas com botoes anterior/proximo.
- Usuario revisa os dados antes de enviar.
- Ao enviar, o sistema exibe loading e confirma o salvamento.

### Regras de negocio
- Diagnostico sempre pertence ao `organizationId` da sessao autenticada.
- Campos numericos devem aceitar apenas valores validos.
- `conversionRate` deve estar entre 0 e 100.

## Funcionalidade: Engine de Scoring de Maturidade Comercial

### Descricao geral
Calculo de `maturityScore` (0 a 100) executado no backend a partir dos dados do diagnostico, no momento da criacao.

### Regras de negocio
- Score calculado inteiramente no backend (`apps/web/lib/scoring/maturity.ts`), nunca no cliente.
- Composto por 4 pilares com peso proprio, escalados ate um benchmark e somados:
  - CRM em uso (`crmUsed` preenchido): 20 pts (tudo ou nada).
  - Processo comercial documentado (tamanho do texto `commercialProcess`, benchmark 300 caracteres): ate 25 pts.
  - Taxa de conversao (`conversionRate`, benchmark 25%): ate 30 pts.
  - Leads por vendedor/mes (`monthlyLeads / sellers`, benchmark 50): ate 25 pts.
- Cada pilar escala linearmente ate o benchmark e satura no peso maximo (sem bonus acima do benchmark).
- Resultado arredondado e limitado entre 0 e 100, gravado em `Diagnostic.maturityScore`.

## Funcionalidade: Resultado do Diagnostico (Gargalos + Recomendacoes)

### Descricao geral
Pagina de resultado por diagnostico, exibindo nota, gargalos identificados e recomendacoes, geradas no backend a partir dos mesmos pilares do scoring.

### Paginas envolvidas
- `/diagnostico/[id]`

### Regras de negocio
- Gargalos e recomendacoes sao calculados no backend (`apps/web/lib/scoring/insights.ts`) no momento da criacao do diagnostico e gravados em `Diagnostic.bottlenecks` e `Diagnostic.recommendations` (Json).
- Um pilar (CRM, processo, conversao, leads por vendedor) abaixo de 50% do benchmark vira um gargalo com recomendacao correspondente.
- Se nenhum pilar estiver abaixo do limiar, uma recomendacao generica de "manter e escalar" e retornada.
- Pagina de resultado e Server Component: busca o diagnostico via `prisma.diagnostic.findFirst` filtrado por `id` e `organizationId` da sessao.
- Diagnostico inexistente ou de outra organizacao retorna 404 (`notFound()`).

### Permissoes
- Apenas usuario autenticado acessa `/diagnostico/[id]`.
- Diagnostico de outra organizacao nao e acessivel (isolamento multiempresa).

### Impacto no backend
- `POST /api/diagnosticos` passa a gravar `bottlenecks` e `recommendations` junto com `maturityScore`.

### Impacto no banco
- Sem alteracao de schema; usa os campos `bottlenecks` e `recommendations` (Json) ja existentes em `Diagnostic`.

### Impacto no frontend
- Nova pagina `/diagnostico/[id]` com nota, gargalos e recomendacoes.
- Tela de sucesso do wizard passa a linkar para `/diagnostico/[id]` ("Ver resultado").

### Permissoes
- Apenas usuario autenticado com `organizationId` pode criar diagnostico.
- Backend valida sessao e tenant antes de gravar.

### Loading
- Botao de envio fica desabilitado durante o POST.
- Mensagem "Salvando diagnostico..." aparece no envio.

### Erros
- Campos obrigatorios bloqueiam avancar no wizard.
- API retorna 401 sem sessao/tenant.
- API retorna 400 para payload invalido.
- API retorna 500 generico em erro inesperado, sem expor detalhes sensiveis.

### Edge cases
- Usuario sem organizacao: API bloqueia.
- Numeros negativos: API rejeita.
- Conversao acima de 100%: API rejeita.
- Textos muito curtos ou vazios: API rejeita.

### Impacto no backend
- Nova rota `POST /api/diagnosticos`.
- Validacao com Zod no backend.
- Persistencia via Prisma em `Diagnostic`.

### Impacto no banco
- Sem alteracao de schema nesta tarefa.
- Usa o model `Diagnostic` ja existente.

### Impacto no frontend
- Nova pagina `/diagnostico`.
- Novo wizard local com estados de progresso, erro, loading e sucesso.

## Funcionalidade: Dashboard Executivo com KPIs Reais

### Descricao geral
Dashboard inicial (`/dashboard`) passa a exibir KPIs calculados a partir do banco (Lead/Opportunity) por organizacao, em vez de valores fixos.

### Paginas envolvidas
- `/dashboard`

### Regras de negocio
- Todos os KPIs sao filtrados por `organizationId` da sessao (`apps/web/lib/dashboard/kpis.ts`).
- **Pipeline Total**: soma de `Opportunity.value` com estagio aberto (`PROSPECTING`, `QUALIFICATION`, `PROPOSAL`, `NEGOTIATION`).
- **Leads Ativos**: contagem de `Lead` com status `NEW`, `CONTACTED` ou `QUALIFIED`.
- **Oportunidades**: contagem de `Opportunity` com estagio aberto.
- **Taxa de Conversao**: `CLOSED_WON / (CLOSED_WON + CLOSED_LOST)` entre todas as oportunidades fechadas.
- Cada KPI exibe uma variacao vs mes anterior: Pipeline/Leads/Oportunidades comparam volume criado no mes atual vs mes anterior (%); Conversao compara a taxa do mes atual vs mes anterior (pp).
- Sem organizacao na sessao: dashboard exibe KPIs zerados em vez de falhar.

### Impacto no backend
- Nenhuma rota nova; calculo feito diretamente na Server Component via Prisma.

### Impacto no banco
- Sem alteracao de schema; usa os models `Lead` e `Opportunity` ja existentes.

### Impacto no frontend
- `apps/web/app/(app)/dashboard/page.tsx` passa a ser assincrona, busca `auth()` + `getExecutiveKpis` e renderiza os 4 cards com dados reais.

## Funcionalidade: CRM Inteligente — Empresas

### Descricao geral
Primeira tela do modulo de CRM: listagem e cadastro de empresas (`Company`) por organizacao, na rota `/empresas` ja linkada na sidebar.

### Paginas envolvidas
- `/empresas`

### Componentes
- Pagina autenticada com tabela de empresas (Server Component).
- Dialog client-side (`company-form-dialog.tsx`) com formulario de cadastro.
- API `GET/POST /api/companies`.

### Comportamento do usuario
- Usuario acessa `/empresas` e ve as empresas da propria organizacao em uma tabela.
- Usuario clica em "Nova empresa", preenche nome (obrigatorio), segmento, telefone, email e site (opcionais) e salva.
- Apos salvar, a lista e atualizada (`router.refresh()`).

### Regras de negocio
- Empresa sempre pertence ao `organizationId` da sessao autenticada.
- Nome e obrigatorio (2 a 120 caracteres); demais campos sao opcionais.
- Email, quando informado, deve ser valido.

### Permissoes
- Apenas usuario autenticado com `organizationId` pode listar ou criar empresas.
- Backend filtra/valida sessao e tenant antes de ler ou gravar.

### Erros
- API retorna 401 sem sessao/tenant.
- API retorna 400 para payload invalido (ex: nome vazio, email invalido).
- API retorna 500 generico em erro inesperado.

### Edge cases
- Organizacao sem empresas: pagina mostra estado vazio com CTA.
- Usuario sem organizacao: pagina renderiza lista vazia (sem erro).

### Impacto no backend
- Nova rota `GET/POST /api/companies`.
- Validacao com Zod (`lib/validations/company.ts`).
- Persistencia via Prisma em `Company`.

### Impacto no banco
- Sem alteracao de schema; usa o model `Company` ja existente.

### Impacto no frontend
- Nova pagina `/empresas` e novo componente `company-form-dialog.tsx`.

## Funcionalidade: CRM Inteligente — Contatos

### Descricao geral
Segunda tela do modulo de CRM: listagem e cadastro de contatos (`Contact`) por organizacao, opcionalmente vinculados a uma empresa, na rota `/contatos` ja linkada na sidebar.

### Paginas envolvidas
- `/contatos`

### Componentes
- Pagina autenticada com tabela de contatos (Server Component), buscando contatos e empresas em paralelo.
- Dialog client-side (`contact-form-dialog.tsx`) com formulario de cadastro e select de empresa.
- API `GET/POST /api/contacts`.

### Comportamento do usuario
- Usuario acessa `/contatos` e ve os contatos da propria organizacao, com a empresa vinculada quando houver.
- Usuario clica em "Novo contato", preenche nome (obrigatorio), empresa (opcional, via select), cargo, telefone e email (opcionais) e salva.
- Apos salvar, a lista e atualizada (`router.refresh()`).

### Regras de negocio
- Contato sempre pertence ao `organizationId` da sessao autenticada.
- Nome e obrigatorio (2 a 120 caracteres); demais campos sao opcionais.
- Quando `companyId` e informado, a empresa deve existir e pertencer a mesma organizacao; caso contrario a API rejeita.
- Email, quando informado, deve ser valido.

### Permissoes
- Apenas usuario autenticado com `organizationId` pode listar ou criar contatos.
- Backend filtra/valida sessao, tenant e propriedade da empresa vinculada antes de gravar.

### Erros
- API retorna 401 sem sessao/tenant.
- API retorna 400 para payload invalido (nome vazio, email invalido, empresa de outra organizacao ou inexistente).
- API retorna 500 generico em erro inesperado.

### Edge cases
- Organizacao sem contatos: pagina mostra estado vazio com CTA.
- Contato sem empresa vinculada: `companyId` nulo, coluna "Empresa" mostra "-".
- Usuario tenta vincular empresa de outra organizacao: API retorna 400 antes de gravar.

### Impacto no backend
- Nova rota `GET/POST /api/contacts`.
- Validacao com Zod (`lib/validations/contact.ts`).
- Persistencia via Prisma em `Contact`, com checagem de posse da `Company` vinculada.

### Impacto no banco
- Sem alteracao de schema; usa os models `Contact` e `Company` ja existentes.

### Impacto no frontend
- Nova pagina `/contatos` e novo componente `contact-form-dialog.tsx`.

## Funcionalidade: CRM Inteligente — Pipeline de Oportunidades

### Descricao geral
Terceira tela do modulo de CRM: board de oportunidades (`Opportunity`) agrupadas por estagio, na rota `/pipeline` ja linkada na sidebar.

### Paginas envolvidas
- `/pipeline`

### Componentes
- Pagina autenticada com board de 6 colunas (uma por estagio), Server Component, buscando oportunidades, empresas e contatos em paralelo.
- Dialog client-side (`opportunity-form-dialog.tsx`) para criar oportunidade.
- Card client-side (`opportunity-card.tsx`) com select para mover a oportunidade de estagio.
- API `GET/POST /api/opportunities` e `PATCH /api/opportunities/[id]`.

### Comportamento do usuario
- Usuario acessa `/pipeline` e ve as oportunidades da organizacao agrupadas em colunas: Prospeccao, Qualificacao, Proposta, Negociacao, Fechado (Ganho), Fechado (Perdido). Cada coluna mostra quantidade e soma de valor.
- Usuario clica em "Nova oportunidade", preenche titulo e valor (obrigatorios), empresa/contato/previsao de fechamento (opcionais) e salva; a oportunidade nasce em "Prospeccao".
- Usuario muda o estagio de uma oportunidade pelo select no proprio card; a mudanca e persistida via `PATCH` e a pagina e atualizada.

### Regras de negocio
- Oportunidade sempre pertence ao `organizationId` da sessao autenticada.
- Titulo obrigatorio (2 a 160 caracteres); valor obrigatorio, >= 0.
- `companyId`/`contactId`, quando informados, devem pertencer a mesma organizacao.
- Estagio inicial e sempre `PROSPECTING` (default do schema); so pode ser alterado via `PATCH /api/opportunities/[id]`.
- KPIs do dashboard (Pipeline Total, Oportunidades, Taxa de Conversao) passam a refletir os dados reais criados aqui.

### Permissoes
- Apenas usuario autenticado com `organizationId` pode listar, criar ou mover oportunidades.
- `PATCH` verifica que a oportunidade pertence a organizacao da sessao antes de atualizar (404 caso contrario).

### Erros
- API retorna 401 sem sessao/tenant.
- API retorna 400 para payload invalido (titulo vazio, valor negativo, empresa/contato de outra organizacao, estagio invalido, data invalida).
- API retorna 404 ao tentar mover oportunidade inexistente ou de outra organizacao.
- API retorna 500 generico em erro inesperado.

### Edge cases
- Organizacao sem oportunidades: todas as colunas ficam vazias com mensagem "Nenhuma oportunidade".
- Oportunidade sem empresa/contato vinculado: card nao exibe essas linhas.
- Falha ao mover estagio: card mostra mensagem de erro local, sem perder a selecao anterior apos `router.refresh()`.

### Impacto no backend
- Novas rotas `GET/POST /api/opportunities` e `PATCH /api/opportunities/[id]`.
- Validacao com Zod (`lib/validations/opportunity.ts`).
- Persistencia via Prisma em `Opportunity`, com checagem de posse de `Company`/`Contact` vinculados.

### Impacto no banco
- Sem alteracao de schema; usa o model `Opportunity` ja existente.

### Impacto no frontend
- Nova pagina `/pipeline` e novos componentes `opportunity-form-dialog.tsx` e `opportunity-card.tsx`.

## Funcionalidade: Criar Oportunidade a partir do Diagnostico

### Descricao geral
Fecha o loop entre Diagnostico e CRM: a pagina de resultado do diagnostico (`/diagnostico/[id]`) ganha uma acao para gerar uma `Company` (se nao existir) e uma `Opportunity` inicial no pipeline.

### Paginas envolvidas
- `/diagnostico/[id]` (novo botao "Criar oportunidade no CRM").

### Comportamento do usuario
- Na pagina de resultado, o usuario clica em "Criar oportunidade no CRM".
- O sistema cria (ou reaproveita) a empresa com o nome do diagnostico e cria uma oportunidade em "Prospeccao" vinculada a ela, com valor inicial igual ao ticket medio informado.
- Apos criar, o botao vira um link "Ver oportunidade no pipeline".
- Se o usuario ja converteu esse diagnostico antes (mesmo apos reload da pagina), o link para o pipeline aparece direto, sem duplicar a oportunidade.

### Regras de negocio
- Conversao e feita via `POST /api/diagnosticos/[id]/oportunidade`, autenticado e isolado por `organizationId`.
- Empresa: busca por nome (case-insensitive) na organizacao; se nao existir, cria com `name`/`segment` do diagnostico.
- Oportunidade: `title` = `Oportunidade - <companyName>`, `value` = `averageTicket` do diagnostico, `stage` inicial `PROSPECTING` (default do schema), `companyId` da empresa encontrada/criada.
- Idempotencia sem alterar o schema: a oportunidade guarda um marcador `[diagnostico:<id>]` no campo `notes`; uma nova chamada para o mesmo diagnostico reaproveita a oportunidade existente em vez de duplicar.

### Permissoes
- Apenas usuario autenticado com `organizationId` pode converter um diagnostico da propria organizacao.
- Diagnostico de outra organizacao ou inexistente retorna 404.

### Erros
- API retorna 401 sem sessao/tenant.
- API retorna 404 se o diagnostico nao existir ou for de outra organizacao.
- API retorna 500 generico em erro inesperado.

### Edge cases
- Diagnostico com nome de empresa igual a uma ja cadastrada: reaproveita a empresa existente em vez de duplicar.
- Diagnostico convertido duas vezes: retorna a mesma oportunidade, sem criar duplicata.

### Impacto no backend
- Nova rota `POST /api/diagnosticos/[id]/oportunidade`.
- Novo helper `lib/diagnostico/opportunity-marker.ts` para o marcador de idempotencia.

### Impacto no banco
- Sem alteracao de schema; usa os models `Company` e `Opportunity` ja existentes, com marcador textual em `notes`.

### Impacto no frontend
- Novo componente `create-opportunity-button.tsx` na pagina de resultado do diagnostico.

## Funcionalidade: Plano de Acao — Listagem e Cadastro

### Descricao geral
Primeira tela do modulo Plano de Acao: listagem e cadastro de planos (`ActionPlan`) por organizacao, na rota `/planos` ja linkada na sidebar.

### Paginas envolvidas
- `/planos`

### Componentes
- Pagina autenticada com tabela de planos (Server Component), incluindo contagem de tarefas por plano.
- Dialog client-side (`action-plan-form-dialog.tsx`) com formulario de cadastro.
- API `GET/POST /api/action-plans`.

### Comportamento do usuario
- Usuario acessa `/planos` e ve os planos de acao da propria organizacao em uma tabela (titulo, objetivo, status, quantidade de tarefas, data de criacao).
- Usuario clica em "Novo plano", preenche titulo e objetivo (ambos obrigatorios) e salva. O plano nasce com status `ACTIVE` (default do schema).
- Apos salvar, a lista e atualizada (`router.refresh()`).

### Regras de negocio
- Plano sempre pertence ao `organizationId` da sessao autenticada.
- Titulo (2 a 160 caracteres) e objetivo (2 a 500 caracteres) sao obrigatorios.
- Status inicial e sempre `ACTIVE`; mudanca de status fica para tarefa futura (detalhe do plano).

### Permissoes
- Apenas usuario autenticado com `organizationId` pode listar ou criar planos de acao.
- Backend filtra/valida sessao e tenant antes de ler ou gravar.

### Erros
- API retorna 401 sem sessao/tenant.
- API retorna 400 para payload invalido (titulo ou objetivo vazio/curto).
- API retorna 500 generico em erro inesperado.

### Edge cases
- Organizacao sem planos: pagina mostra estado vazio com CTA.
- Usuario sem organizacao: pagina renderiza lista vazia (sem erro).

### Impacto no backend
- Nova rota `GET/POST /api/action-plans`.
- Validacao com Zod (`lib/validations/action-plan.ts`).
- Persistencia via Prisma em `ActionPlan`.

### Impacto no banco
- Sem alteracao de schema; usa o model `ActionPlan` ja existente.

### Impacto no frontend
- Nova pagina `/planos` e novo componente `action-plan-form-dialog.tsx`.

## Funcionalidade: Plano de Acao — Detalhe (Tarefas)

### Descricao geral
Pagina de detalhe de um plano de acao (`/planos/[id]`): mostra o plano e lista suas tarefas (`ActionTask`), permitindo criar novas tarefas e mudar o status pelo select em cada linha.

### Paginas envolvidas
- `/planos/[id]`

### Componentes
- Pagina autenticada (Server Component) com o cabecalho do plano e tabela de tarefas.
- Dialog client-side (`task-form-dialog.tsx`) para criar tarefa.
- Select client-side (`task-status-select.tsx`) por tarefa, para mudar o status.
- API `GET/POST /api/action-plans/[id]/tasks` e `PATCH /api/action-plans/[id]/tasks/[taskId]`.
- Linha da listagem em `/planos` agora linka para o detalhe.

### Comportamento do usuario
- Usuario acessa `/planos/[id]` (a partir do titulo na listagem) e ve objetivo, status do plano e a tabela de tarefas (titulo, responsavel, prioridade, prazo, status).
- Usuario clica em "Nova tarefa", preenche titulo (obrigatorio), descricao/responsavel/prazo/prioridade (opcionais, prioridade default "Media") e salva.
- Usuario muda o status de uma tarefa pelo select na propria linha; a mudanca e persistida via `PATCH` e a pagina e atualizada.

### Regras de negocio
- Tarefa sempre pertence a um `ActionPlan` da `organizationId` da sessao autenticada.
- Titulo obrigatorio (2 a 160 caracteres); demais campos opcionais.
- Plano de outra organizacao ou inexistente: pagina e APIs retornam 404.
- Status inicial da tarefa e sempre `PENDING` (default do schema); so pode ser alterado via `PATCH`.

### Permissoes
- Apenas usuario autenticado com `organizationId` pode ver/criar tarefas de um plano da propria organizacao.
- `PATCH` verifica que a tarefa pertence a um plano da organizacao da sessao antes de atualizar (404 caso contrario).

### Erros
- API retorna 401 sem sessao/tenant.
- API retorna 404 se o plano (ou a tarefa, no `PATCH`) nao existir ou for de outra organizacao.
- API retorna 400 para payload invalido (titulo vazio, prioridade/status invalidos, data invalida).
- API retorna 500 generico em erro inesperado.

### Edge cases
- Plano sem tarefas: tabela mostra mensagem de estado vazio.
- Tarefa sem responsavel/prazo: colunas mostram "-".
- Atualizar status de tarefa de outro plano/organizacao: `PATCH` retorna 404.

### Impacto no backend
- Novas rotas `GET/POST /api/action-plans/[id]/tasks` e `PATCH /api/action-plans/[id]/tasks/[taskId]`.
- Validacao com Zod (`lib/validations/action-task.ts`).
- Persistencia via Prisma em `ActionTask`, sempre validando a posse do `ActionPlan` pai.

### Impacto no banco
- Sem alteracao de schema; usa o model `ActionTask` ja existente.

### Impacto no frontend
- Nova pagina `/planos/[id]` e novos componentes `task-form-dialog.tsx` e `task-status-select.tsx`.
- `/planos` passa a linkar cada plano para seu detalhe.

## Funcionalidade: Gerar Plano de Acao a partir do Diagnostico

### Descricao geral
Fecha mais um loop do produto: a pagina de resultado do diagnostico (`/diagnostico/[id]`) ganha uma acao para gerar um `ActionPlan` com uma `ActionTask` para cada recomendacao calculada no diagnostico.

### Paginas envolvidas
- `/diagnostico/[id]` (novo botao "Gerar plano de acao").

### Comportamento do usuario
- Na pagina de resultado, o usuario clica em "Gerar plano de acao".
- O sistema cria um plano de acao com uma tarefa para cada recomendacao do diagnostico (titulo = titulo da recomendacao, descricao = detalhe da recomendacao).
- Apos gerar, o botao vira um link "Ver plano de acao", que leva para `/planos/[id]` do plano criado.
- Se o usuario ja gerou o plano desse diagnostico antes (mesmo apos reload da pagina), o link aparece direto, sem duplicar o plano.

### Regras de negocio
- Geracao feita via `POST /api/diagnosticos/[id]/plano`, autenticado e isolado por `organizationId`.
- `title` = `Plano de Acao - <companyName>`; `objective` descreve a nota do diagnostico e a empresa; `status` inicial `ACTIVE` (default do schema).
- Uma `ActionTask` e criada por item de `Diagnostic.recommendations`, com status inicial `PENDING` e prioridade `MEDIUM` (defaults do schema).
- Idempotencia sem alterar o schema: o `id` do `ActionPlan` e deterministico (`actionplan-diagnostico-<diagnosticId>`), gerado por `lib/diagnostico/action-plan-id.ts`. Uma nova chamada para o mesmo diagnostico encontra o plano existente por esse id em vez de duplicar.

### Permissoes
- Apenas usuario autenticado com `organizationId` pode gerar um plano a partir de um diagnostico da propria organizacao.
- Diagnostico de outra organizacao ou inexistente retorna 404.

### Erros
- API retorna 401 sem sessao/tenant.
- API retorna 404 se o diagnostico nao existir ou for de outra organizacao.
- API retorna 500 generico em erro inesperado.

### Edge cases
- Diagnostico sem gargalos (apenas a recomendacao generica de escala): plano e criado com uma unica tarefa.
- Diagnostico convertido em plano duas vezes: retorna o mesmo plano, sem duplicar tarefas.

### Impacto no backend
- Nova rota `POST /api/diagnosticos/[id]/plano`.
- Novo helper `lib/diagnostico/action-plan-id.ts` para o id deterministico de idempotencia.

### Impacto no banco
- Sem alteracao de schema; usa os models `ActionPlan` e `ActionTask` ja existentes, com `id` deterministico no `ActionPlan`.

### Impacto no frontend
- Novo componente `create-plan-button.tsx` na pagina de resultado do diagnostico.

## Funcionalidade: Configuracoes — Integracoes de IA

### Descricao geral
Tela de Configuracoes (`/configuracoes`, ja linkada no rodape da sidebar) onde cada organizacao configura suas proprias chaves de API para os provedores de IA (Anthropic e OpenAI). Prepara a infraestrutura de credenciais que os futuros modulos de IA (IA SDR, Consultor Digital) irao consumir — nenhuma chamada de IA e feita nesta tarefa.

### Paginas envolvidas
- `/configuracoes`

### Componentes
- Pagina autenticada (Server Component) com um card por provedor (Anthropic, OpenAI).
- Card client-side (`integration-card.tsx`) com dialog para salvar/atualizar a chave e acao para remover.
- API `GET/POST /api/settings/integrations` e `DELETE /api/settings/integrations/[provider]`.

### Comportamento do usuario
- Usuario acessa `/configuracoes` e ve o status de cada provedor: "Configurado" (com a chave mascarada e data da ultima atualizacao) ou "Nao configurado".
- Usuario clica em "Configurar"/"Atualizar chave", cola a chave de API (campo `password`) e salva.
- Usuario pode clicar em "Remover" para apagar a chave configurada de um provedor.

### Regras de negocio
- Integracao sempre pertence ao `organizationId` da sessao autenticada; uma chave por par (organizacao, provedor) — `@@unique([organizationId, provider])`.
- A chave nunca e armazenada em texto puro: e criptografada (AES-256-GCM) com `lib/security/crypto.ts` antes de gravar em `ApiIntegration.apiKeyEncrypted`, usando a chave derivada de `INTEGRATION_ENCRYPTION_KEY` (env, nunca commitado).
- A API e a UI nunca retornam a chave em texto puro: apenas uma versao mascarada (`sk-a••••bcd1`) calculada no servidor a partir do valor decriptado.
- Provedores suportados nesta tarefa: `ANTHROPIC` e `OPENAI` (mesmos ja previstos em `CLAUDE.md`/`.env.example`).

### Permissoes
- Apenas usuario autenticado com `organizationId` pode ver, configurar ou remover integracoes da propria organizacao.

### Erros
- API retorna 401 sem sessao/tenant.
- API retorna 400 para payload invalido (chave muito curta, provedor invalido).
- API retorna 404 ao tentar remover uma integracao inexistente.
- API retorna 500 generico em erro inesperado (inclusive se `INTEGRATION_ENCRYPTION_KEY` nao estiver configurada no ambiente).

### Edge cases
- Organizacao sem nenhuma integracao configurada: os dois cards aparecem como "Nao configurado".
- Atualizar uma chave existente: sobrescreve o valor anterior (upsert por `organizationId` + `provider`).
- Remover uma integracao ja removida: API retorna 404.

### Impacto no backend
- Novo model `ApiIntegration` (e enum `ApiProvider`) no schema Prisma — **alteracao de schema aprovada pelo usuario nesta tarefa**.
- Novas rotas `GET/POST /api/settings/integrations` e `DELETE /api/settings/integrations/[provider]`.
- Validacao com Zod (`lib/validations/api-integration.ts`).
- Novo helper de criptografia `lib/security/crypto.ts` (AES-256-GCM, chave derivada via SHA-256 de `INTEGRATION_ENCRYPTION_KEY`).

### Impacto no banco
- Nova tabela `api_integrations` (`ApiIntegration`), relacionada a `Organization`. Sem migration aplicada nesta tarefa (sem banco local disponivel neste ambiente); `npx prisma generate` foi executado para atualizar o client. **A migration precisa ser criada/aplicada (`npx prisma migrate dev`) na primeira vez que houver um banco de desenvolvimento ou deploy disponivel.**

### Impacto no frontend
- Nova pagina `/configuracoes` e novo componente `integration-card.tsx`.

### Preparacao para IA (fora do escopo desta tarefa)
- Os modulos futuros de IA (IA SDR, Consultor Digital) deverao ler a chave configurada via `prisma.apiIntegration.findUnique` + `decryptSecret`, com fallback para as variaveis de ambiente `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` quando a organizacao nao tiver configurado uma chave propria. Essa logica de fallback/uso ainda nao foi implementada.

## Funcionalidade: IA SDR — Conversa com Classificacao Automatica (backend)

### Descricao geral
Primeira fatia do modulo IA SDR (Modulo 3): backend que permite a um lead conversar com a IA (Anthropic) configurada pela organizacao em `/configuracoes`, com cada troca de mensagem classificando automaticamente o nivel de interesse do lead. Sem widget/UI publica ainda (fica para a tarefa 6.2) — validado nesta etapa via chamada direta as rotas (REST client).

### Rotas envolvidas
- `POST /api/sdr/[organizationId]/conversations` — inicia uma conversa.
- `POST /api/sdr/[organizationId]/conversations/[conversationId]/messages` — envia uma mensagem do lead e recebe a resposta + classificacao da IA.

### Comportamento
- Ao iniciar, o backend confere se a organizacao existe e se tem uma integracao `ApiIntegration` do provedor `ANTHROPIC` configurada; sem isso, retorna 404/422 antes de criar qualquer registro.
- Cada mensagem do lead e persistida (`SdrMessage`, `role = LEAD`), enviada junto com o historico da conversa para a Anthropic (`lib/ai/anthropic-client.ts`), que responde com `reply` (texto) e `classification` (`COLD`/`WARM`/`HOT`) via tool use forcado (`tool_choice`), garantindo formato estruturado.
- A resposta da IA e persistida (`SdrMessage`, `role = ASSISTANT`) e a classificacao mais recente e gravada em `SdrConversation.classification`.
- A chave de API da organizacao e descriptografada em memoria apenas no momento da chamada a Anthropic; nunca e retornada em nenhuma resposta HTTP.

### Regras de negocio
- Rotas publicas (sem `auth()`/sessao de usuario): o lead nao e um usuario autenticado do SalesOS. O isolamento por tenant e feito pelo `organizationId` na URL, validado contra o banco em toda chamada.
- Conversa (`SdrConversation`) e mensagens (`SdrMessage`) sempre amarradas a uma `organizationId` valida.
- Mensagem do lead vazia e rejeitada (400) antes de qualquer chamada a IA.
- Organizacao sem integracao Anthropic configurada: 422, sem chamar a IA.

### Permissoes
- Nenhuma sessao de usuario e exigida (endpoint publico para o widget do lead).
- Toda leitura/escrita e restrita ao `organizationId` informado na URL; conversas de uma organizacao nunca sao acessiveis via `organizationId` de outra.

### Erros
- `organizationId` inexistente: 404.
- Organizacao sem integracao Anthropic: 422.
- Conversa inexistente (ou de outra organizacao): 404.
- Payload invalido/mensagem vazia: 400.
- Erro da API da Anthropic (chave invalida, rate limit, etc.): 502, sem expor detalhes do provedor.
- Falha ao descriptografar a chave (`INTEGRATION_ENCRYPTION_KEY` ausente/invalida): 500 generico.

### Edge cases
- Conversa longa: todo o historico (`SdrMessage` ordenado por `createdAt`) e reenviado a cada chamada como contexto.
- Classificacao retornada fora do enum esperado: normalizada para `COLD` em vez de falhar.
- Duas mensagens em paralelo na mesma conversa: cada chamada persiste seu proprio par lead/assistente; nao ha lock otimista nesta tarefa (fora de escopo do MVP).

### Impacto no backend
- Novo cliente `lib/ai/anthropic-client.ts` (fetch direto a `https://api.anthropic.com/v1/messages`, sem SDK adicional), usando tool use para forcar `{ reply, classification }` estruturado.
- Novas rotas `POST /api/sdr/[organizationId]/conversations` e `POST /api/sdr/[organizationId]/conversations/[conversationId]/messages`.
- Validacao com Zod (`lib/validations/sdr-conversation.ts`).
- Reaproveita `decryptSecret` de `lib/security/crypto.ts` para obter a chave Anthropic da organizacao.

### Impacto no banco
- Novos models `SdrConversation` e `SdrMessage` (+ enums `SdrLeadTemperature` e `SdrMessageRole`) no schema Prisma, relacionados a `Organization` — **alteracao de schema solicitada pelo usuario ao iniciar a tarefa 6.1**. Sem migration aplicada nesta tarefa (sem banco local disponivel neste ambiente); `npx prisma generate` executado para atualizar o client. Migration (`npx prisma migrate dev`) pendente para quando houver banco de dev/deploy disponivel.

### Impacto no frontend
- Nenhum nesta tarefa (widget publico e a tarefa 6.2).

## Funcionalidade: IA SDR — Widget Publico

### Descricao geral
Pagina publica (`/sdr/[organizationId]`) onde o lead efetivamente conversa com a IA da organizacao, consumindo os endpoints da tarefa 6.1. Pensada para ser embutida no site da organizacao (ex: `iframe`).

### Paginas envolvidas
- `/sdr/[organizationId]`

### Componentes
- Pagina publica (Server Component): valida que a organizacao existe (404 caso contrario) e renderiza o widget.
- `chat-widget.tsx` (Client Component): janela de chat com historico, input, badge de classificacao e estados de erro/indisponibilidade.

### Comportamento do usuario
- Lead acessa `/sdr/[organizationId]` (sem login) e ve uma janela de chat com o nome da organizacao.
- Ao enviar a primeira mensagem, o widget cria a conversa automaticamente (`POST /api/sdr/[organizationId]/conversations`) e em seguida envia a mensagem (`POST .../messages`).
- Resposta da IA aparece no historico e um badge mostra a classificacao atual da conversa (Frio/Morno/Quente).
- Se a organizacao nao tiver integracao Anthropic configurada, o widget exibe uma mensagem de indisponibilidade em vez de quebrar.

### Regras de negocio
- Pagina e rotas de API do IA SDR sao publicas: nao exigem sessao de usuario.
- **Correcao de bug encontrada ao construir esta tarefa:** o middleware global (`lib/auth.config.ts`, `callbacks.authorized`) bloqueava qualquer rota fora de `/login`, `/register` e `/api/auth/*` para quem nao tinha sessao — os endpoints "publicos" `/api/sdr/**` da tarefa 6.1 na pratica exigiam login. Adicionado um allowlist explicito para `/sdr` e `/api/sdr` no `authorized()`.
- Sem persistencia de `conversationId` no client entre reloads nesta tarefa: recarregar a pagina inicia uma nova conversa (fora do escopo do MVP).

### Permissoes
- Nenhuma sessao exigida. Isolamento por tenant feito pelo `organizationId` na URL (ja validado nas rotas de API da tarefa 6.1).

### Erros
- `organizationId` inexistente: pagina retorna 404 (`notFound()`).
- Organizacao sem integracao Anthropic (422 da API): widget mostra tela de "Atendimento indisponivel".
- Falha de rede/IA ao enviar mensagem: mensagem de erro local, sem perder o texto ja digitado nem duplicar o envio.

### Edge cases
- Mensagem vazia: botao de enviar fica desabilitado.
- Envio enquanto uma resposta anterior ainda esta pendente: novo envio bloqueado ate a resposta anterior concluir.

### Impacto no backend
- Nenhuma rota nova; consome as rotas da tarefa 6.1.
- Ajuste no `callbacks.authorized` de `lib/auth.config.ts` (allowlist `/sdr` e `/api/sdr`).

### Impacto no banco
- Nenhum.

### Impacto no frontend
- Nova pagina `/sdr/[organizationId]` e novo componente `chat-widget.tsx`.

## Funcionalidade: IA SDR — Qualificacao gera Lead/Oportunidade no CRM

### Descricao geral
Quando uma conversa do IA SDR e classificada como `HOT` (pronto para falar com um consultor/comprar), o backend gera automaticamente um `Lead` e uma `Opportunity` no CRM da organizacao, fechando o trecho "classificacao automatica -> Oportunidade criada no CRM" do funil descrito em `docs/ARCHITECTURE.md`.

### Regras de negocio
- "Qualificada" = classificacao `HOT` (a mais alta das 3 definidas em `lib/ai/anthropic-client.ts`: `COLD`/`WARM`/`HOT`). `COLD`/`WARM` nao geram registros no CRM.
- Idempotencia sem alterar o schema: `Lead.id` e `Opportunity.id` sao deterministicos a partir do `conversationId` (`lib/sdr/lead-id.ts`), mesmo padrao usado em `lib/diagnostico/action-plan-id.ts` (4.3). Uma conversa que atinge `HOT` mais de uma vez (ou permanece `HOT` em mensagens seguintes) nao duplica o Lead nem a Oportunidade.
- `Lead`: `status = QUALIFIED`, `source = "IA SDR"`, `score = 80`, `name`/`email`/`phone` vindos dos dados opcionais coletados na conversa (`SdrConversation.leadName/leadEmail/leadPhone`), com fallback para "Lead do IA SDR" quando o nome nao foi informado.
- `Opportunity`: vinculada ao `Lead` criado (`leadId`), `stage` inicial `PROSPECTING` (default do schema), `notes` registrando que foi gerada pelo IA SDR.
- A sincronizacao com o CRM e um efeito colateral nao-critico: uma falha ao criar o Lead/Oportunidade nao impede a resposta da IA ao lead nem derruba a requisicao; a proxima mensagem que resultar em `HOT` tenta novamente (o Lead deterministico ainda nao existiria).

### Impacto no backend
- `POST /api/sdr/[organizationId]/conversations/[conversationId]/messages` (tarefa 6.1) ganha a chamada a `qualifyLead()` apos persistir a classificacao da conversa.
- Novo helper `lib/sdr/lead-id.ts` (ids deterministicos de `Lead`/`Opportunity` a partir do `conversationId`).

### Impacto no banco
- Sem alteracao de schema; usa os models `Lead` e `Opportunity` ja existentes, com `id` deterministico neles (mesma tecnica do `ActionPlan` em 4.3).

### Impacto no frontend
- Nenhum nesta tarefa; Lead/Oportunidade gerados aparecem nas telas de CRM ja existentes (`/pipeline`). Notificacao ativa ao consultor fica para a tarefa 6.4.

## Funcionalidade: IA SDR — Notificar o Consultor (console de conversas)

### Descricao geral
Fecha o funil do IA SDR com uma notificacao in-app: a sidebar mostra um contador de leads qualificados (`HOT`) ainda nao vistos no item "IA SDR" (`components/app-sidebar.tsx`), que ja existia linkado para `/sdr` mas sem pagina de destino. A nova pagina autenticada `/sdr` lista as conversas da organizacao e marca as qualificadas como vistas ao ser aberta. Sem infraestrutura de email/push no projeto ainda — a notificacao e in-app.

### Paginas envolvidas
- `/sdr` (nova, autenticada — console de conversas do IA SDR para o consultor).
- `/sdr/[organizationId]` (widget publico, tarefa 6.2 — sem alteracao de comportamento).

### Componentes
- `app/(app)/layout.tsx` (Server Component, agora assincrono): busca a sessao e a contagem de leads qualificados nao vistos, repassando para `AppSidebar`.
- `AppSidebar`: badge com a contagem no item "IA SDR" quando maior que zero.
- Pagina `/sdr` (Server Component): tabela com lead, classificacao, ultima mensagem, contagem de mensagens e data de atualizacao; ao carregar, marca as conversas `HOT` nao vistas como vistas.

### Regras de negocio
- "Nao visto" = `SdrConversation.classification = HOT` e `consultantSeenAt = null`.
- Abrir `/sdr` marca todas as conversas `HOT` nao vistas da organizacao como vistas (`consultantSeenAt = now()`), fazendo o badge sumir na navegacao seguinte.
- **Ajuste no middleware:** o allowlist publico adicionado na 6.2 cobria todo o prefixo `/sdr`; para nao expor a nova pagina autenticada `/sdr` (exata) sem sessao, o allowlist foi restrito para `/sdr/` (com barra) — apenas as subrotas com `organizationId` (o widget) permanecem publicas.

### Permissoes
- `/sdr` segue o mesmo padrao das demais paginas de `(app)`: sem sessao/organizacao, renderiza lista vazia (sem 401/404), sem vazar dados de outra organizacao.
- `/sdr/[organizationId]` continua publico, sem sessao.

### Erros
- Nenhuma rota de API nova nesta tarefa; sem novos casos de erro HTTP.

### Edge cases
- Organizacao sem nenhuma conversa: `/sdr` mostra estado vazio, sem badge na sidebar.
- Conversa nunca classificada como `HOT`: nao conta para o badge, mas aparece na listagem.
- Duas abas abertas simultaneamente: a segunda a visitar `/sdr` nao encontra mais conversas `HOT` nao vistas para marcar (idempotente via `updateMany` condicional).

### Impacto no backend
- Novo helper `lib/sdr/notifications.ts` (`getUnseenQualifiedLeadsCount`, `markQualifiedLeadsSeen`).
- `app/(app)/layout.tsx` passa a ser assincrono e consultar o banco a cada navegacao autenticada.
- Ajuste no `callbacks.authorized` de `lib/auth.config.ts` (allowlist `/sdr/` em vez de `/sdr`).

### Impacto no banco
- Novo campo `consultantSeenAt DateTime?` em `SdrConversation` — **alteracao de schema aprovada pelo usuario nesta tarefa**. Sem migration aplicada nesta tarefa (sem banco local disponivel); `npx prisma generate` executado.

### Impacto no frontend
- Nova pagina `/sdr` (console de conversas) e badge de contagem em `components/app-sidebar.tsx`.

## Funcionalidade: Consultor Digital — Backend (contexto + chat autenticado)

### Descricao geral
Primeira fatia do modulo Consultor Digital (Modulo 4): backend que permite ao consultor logado conversar com a IA (Anthropic) configurada em `/configuracoes`, com cada resposta contextualizada automaticamente pelo ultimo diagnostico e pelos KPIs atuais do CRM da organizacao. Ao contrario do IA SDR (rota publica, uma conversa por lead), esta rota e autenticada e mantem **uma unica conversa continua por organizacao**. Sem UI ainda (fica para a tarefa 7.2) — validado nesta etapa via chamada direta as rotas.

### Rotas envolvidas
- `GET /api/consultor/messages` — retorna o historico da conversa da organizacao (vazio se ainda nao existir).
- `POST /api/consultor/messages` — envia uma mensagem do consultor e recebe a resposta contextualizada da IA.

### Comportamento
- `POST` confere se a organizacao tem uma integracao `ApiIntegration` do provedor `ANTHROPIC` configurada; sem isso, retorna 422 antes de tocar na conversa.
- Faz upsert de `ConsultantConversation` por `organizationId` (`@@unique([organizationId])`): a mesma conversa e reaproveitada em toda mensagem seguinte, sem duplicar.
- Monta o contexto (`buildContext`, em `app/api/consultor/messages/route.ts`) a partir do `Diagnostic` mais recente da organizacao (nota de maturidade, gargalos, recomendacoes) e de `getExecutiveKpis` (pipeline total, leads ativos, oportunidades abertas, taxa de conversao) — reaproveitando os mesmos dados ja exibidos em `/diagnostico/[id]` e `/dashboard`.
- Envia o contexto como parte do `system` prompt e o historico completo da conversa para `generateConsultantReply` (`lib/ai/anthropic-client.ts`), que usa o modelo `claude-sonnet-5` e resposta em texto livre (sem `tool_choice` forcado, ao contrario do IA SDR).
- Persiste a mensagem do usuario (`role = USER`) e a resposta da IA (`role = ASSISTANT`) em `ConsultantMessage`.
- A chave de API da organizacao e descriptografada em memoria apenas no momento da chamada a Anthropic; nunca e retornada em nenhuma resposta HTTP.

### Regras de negocio
- Rota autenticada: exige `auth()` com `organizationId` na sessao (diferente do IA SDR, que e publico).
- Uma unica `ConsultantConversation` por organizacao (nao uma por usuario/lead) — reflete um historico estrategico compartilhado da conta.
- Organizacao sem `Diagnostic` ainda: o contexto omite esse trecho, sem erro (o Consultor Digital funciona desde o primeiro uso, mesmo sem diagnostico).
- Mensagem vazia e rejeitada (400) antes de qualquer chamada a IA.

### Permissoes
- Apenas usuario autenticado com `organizationId` acessa `GET`/`POST /api/consultor/messages` — sempre a conversa da propria organizacao.

### Erros
- Sem sessao/organizacao: 401.
- Organizacao sem integracao Anthropic: 422.
- Payload invalido/mensagem vazia: 400.
- Erro da API da Anthropic: 502, sem expor detalhes do provedor.
- Falha ao descriptografar a chave (`INTEGRATION_ENCRYPTION_KEY` ausente/invalida): 500 generico.

### Edge cases
- Conversa longa: todo o historico (`ConsultantMessage` ordenado por `createdAt`) e reenviado a cada chamada como contexto de conversa (alem do contexto de diagnostico/KPIs).
- Organizacao sem nenhum diagnostico: resposta da IA ainda e util, apenas sem citar dados de diagnostico.

### Impacto no backend
- `generateConsultantReply` adicionada a `lib/ai/anthropic-client.ts` (modelo `claude-sonnet-5`, texto livre).
- Nova rota `GET/POST /api/consultor/messages`.
- Validacao com Zod (`lib/validations/consultant-message.ts`).
- Reaproveita `decryptSecret` (`lib/security/crypto.ts`) e `getExecutiveKpis` (`lib/dashboard/kpis.ts`).

### Impacto no banco
- Novos models `ConsultantConversation` e `ConsultantMessage` (+ enum `ConsultantMessageRole`) no schema Prisma, relacionados a `Organization` — **alteracao de schema aprovada pelo usuario nesta tarefa**. Sem migration aplicada nesta tarefa (sem banco local disponivel); `npx prisma generate` executado.

### Impacto no frontend
- Nenhum nesta tarefa (pagina `/consultor` e a tarefa 7.2).

## Funcionalidade: Consultor Digital — Pagina de Chat

### Descricao geral
Pagina autenticada `/consultor` (ja linkada na sidebar, ate entao sem destino): interface de chat que consome o backend da tarefa 7.1, permitindo ao consultor conversar com a IA contextualizada pelo diagnostico e KPIs da organizacao.

### Paginas envolvidas
- `/consultor`

### Componentes
- Pagina autenticada (Server Component): busca `auth()`, o historico existente (`prisma.consultantConversation.findUnique`) e o status da integracao Anthropic (`prisma.apiIntegration.findUnique`), repassando para o componente de chat.
- `consultant-chat.tsx` (Client Component): historico de mensagens, input, e uma tela dedicada de "configure a IA" quando a organizacao nao tem integracao Anthropic.

### Comportamento do usuario
- Usuario acessa `/consultor` e ve o historico existente da conversa da organizacao (ou estado vazio, se ainda nao houver).
- Usuario envia uma mensagem; ela aparece imediatamente no chat (otimista) e, ao responder, a IA aparece logo em seguida.
- Se a organizacao nao tem integracao Anthropic configurada, a pagina mostra um CTA para `/configuracoes` em vez do chat (o proprio consultor pode resolver, ao contrario do lead no widget publico do IA SDR).

### Regras de negocio
- Reaproveita a mesma conversa por organizacao (`ConsultantConversation`, tarefa 7.1); nao ha selecao de conversa nem historico paralelo nesta tarefa.
- Consulta o status da integracao diretamente via Prisma na Server Component, evitando uma chamada `GET` extra do client no primeiro load.

### Permissoes
- Apenas usuario autenticado com `organizationId` acessa `/consultor` e sua propria conversa.

### Erros
- Erro ao enviar mensagem (502/500 do backend da 7.1): mensagem de erro local no chat, sem perder o texto digitado.

### Edge cases
- Organizacao sem diagnostico/KPIs relevantes ainda: chat funciona normalmente (contexto mais enxuto, tratado no backend).
- Mensagem vazia: botao de enviar desabilitado.

### Impacto no backend
- Nenhuma rota nova; consome `GET/POST /api/consultor/messages` (tarefa 7.1).

### Impacto no banco
- Nenhum.

### Impacto no frontend
- Nova pagina `/consultor` e novo componente `consultant-chat.tsx`.
