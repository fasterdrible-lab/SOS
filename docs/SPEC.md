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
