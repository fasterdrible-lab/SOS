# HOMOLOGACAO_V2.md - Homologacao final do Prompt Mestre V2

**Data:** 2026-11-13
**Tarefa:** V2-10 (`docs/TASKS.md`)
**Codigo homologado:** branch `feat/saleos-v2`, V.1.31.1 (V2-9.3 no commit `d291f21`, mais dois ajustes visuais e o roteiro desta tarefa)
**Onde:** maquina de desenvolvimento, app em `localhost:3100` (build de producao) e banco local `salesos-postgres`. **A producao nao foi tocada** (decisao do usuario em 2026-11-13: homologacao local completa).

## Resultado

Aprovado localmente, com ressalvas. Tudo o que tem verificacao automatica passou; o que ficou de fora esta listado em "O que nao foi verificado" e "Pendencias".

| Verificacao | Resultado |
|---|---|
| Lint (`eslint`) | 0 erros |
| Tipos (`tsc --noEmit`) | 0 erros |
| Testes unitarios | 156 de 156 (48 suites) |
| Migrations | 15 aplicadas em banco local; `prisma migrate diff` sem diferenca para o schema |
| Build de producao (`next build`) | concluido |
| Testes de integracao por HTTP | 234 de 234 (67 suites) |
| Roteiro em navegador real (`npm run homologacao`) | 94 de 94 verificacoes, 52 capturas |
| CI (GitHub Actions) | aprovado no commit `d291f21`; os ajustes desta tarefa ainda nao foram enviados |

## Metricas

- 390 testes automatizados (156 unitarios + 234 de integracao), em 16 arquivos de integracao (cerca de 4.850 linhas) e 13 de unidade. No inicio do Prompt Mestre V2 (2026-10-31) nao havia nenhum: so um roteiro HTTP pontual de 47 verificacoes, fora do repositorio.
- 94 verificacoes em navegador, agora no repositorio (`apps/web/scripts/homologacao.mjs`): ate aqui o roteiro de navegador nao era versionado.
- 27 paginas, 48 arquivos de rota da API, 32 models, 15 migrations (13 em producao).
- Integracao completa roda em cerca de 35 segundos; o roteiro de navegador, em cerca de 1 minuto.

## Roteiro em navegador

`npm run homologacao` (em `apps/web`, com o app em `localhost:3100` e o banco local, como nos testes de integracao). Usa o Chrome instalado e o WebSocket do proprio Node, sem dependencia nova; recusa rodar fora de localhost; nao faz parte do CI. Capturas e `resultado.json` vao para a pasta temporaria do sistema (ou `HOMOLOG_OUT`).

O roteiro cria um cliente de exemplo **pelas APIs reais** (equipes, metas, empresas, contato, negociacoes movidas, ganha e perdida, atividades, plano de acao, dia fechado) mais uma reuniao do SALEIA inserida no banco, e apaga tudo ao final. Depois abre as telas com login pelo formulario:

| Grupo | O que confere |
|---|---|
| Administrador (desktop, escuro) | 22 telas: Meu Dia, Dashboard, Negociacoes, detalhe, Atividades, Report (dia e dias fechados), Empresas, visao 360, Contatos, SALEIA, reuniao, IA SDR, Consultor, Diagnostico, Planos, plano, Meus Clientes e as quatro abas de Configuracoes |
| Interacoes reais | login, busca global, salvar configuracoes comerciais e ver o efeito no Meu Dia, criar equipe, trocar para o tema claro, sair pelo menu |
| Tema claro | 7 telas, incluindo as novas (Usuarios, Comercial, Report, reuniao do SALEIA) |
| Gestora com equipe | ve a equipe, nao ve a negociacao da outra equipe (404 no detalhe), Dashboard "Sua equipe e negociacoes sem responsavel", Configuracoes com "Acesso restrito" |
| Vendedor | ve so o que e dele, 404 na negociacao de outra pessoa, "Acesso restrito" em IA SDR, Consultor e Configuracoes |
| Celular 390 px | 11 telas sem rolagem lateral |
| Publico | login, convite e nova senha com token invalido, widget do IA SDR, tela interna sem sessao leva ao login |

Em cada tela: status HTTP do documento, textos esperados, ausencia de excecao e de `console.error`, respostas 4xx/5xx de recursos e rolagem lateral. Alem disso, 14 capturas foram olhadas uma a uma nesta homologacao (Dashboard do administrador e da gestora, Meu Dia, Atividades, Usuarios, Comercial claro, reuniao do SALEIA, Report do vendedor, quadro claro e as de celular).

## Defeitos encontrados e corrigidos

1. **Data do Report com "De" em maiuscula** ("Sexta-Feira, 13 De Novembro De 2026"), no dia e nos dias fechados: a classe `capitalize` punha maiuscula em toda palavra. Agora so a primeira letra.
2. **Rotulo quebrando na aba Comercial** ("Dias sem mudar de / etapa"): campo alargado.

Nenhum defeito funcional apareceu. As tres falhas da primeira rodada do roteiro eram do proprio roteiro (espera que devolvia um elemento da pagina, rotulo em caixa alta por CSS e a pasta temporaria do Chrome presa no Windows), nao do app.

## Cobertura por fase do Prompt Mestre

| Fase | Entrega | Em producao | Testes de integracao | Navegador nesta homologacao |
|---|---|---|---|---|
| 1 Seguranca e integridade | Papeis, escopo do vendedor, sessao revalidada, auditoria, historico, erros padronizados | sim | `authz`, `commercial`, `errors` | acesso por papel, 404 fora do escopo |
| 2 Meu Dia e cabecalho | Meu Dia, metas, busca, notificacoes, tema claro | sim | `meu-dia`, `header` | sim, com busca e troca de tema |
| 3 Dashboard | Filtros, funil, saude, metas, time, origem, motivos | sim | `dashboard` | sim, tres papeis |
| 4 Kanban | Funis configuraveis, quadro, filtros, detalhe, campos por etapa | sim | `pipelines`, `kanban` | quadro e detalhe; **arrastar nao refeito** |
| 5 Clientes 360 | Visao 360, edicao de empresa e contato | sim | `company` | sim |
| 6 Atividades | Lista, agenda, responsavel, Meu Dia, sino | sim | `activities` | lista; agenda nao aberta |
| 7 SALEIA | Webhook assinado, telas, decisoes | sim | `saleia`, `saleia-actions` | lista e reuniao; botoes nao clicados |
| 8 Report | Dia, fechamento, dias fechados, "so diagnostico" | sim | `report` | sim; fechar o dia pela tela nao clicado |
| 9 Administracao | Usuarios, convites, nova senha, auditoria (9.1); equipes (9.2); configuracoes comerciais (9.3) | **so a 9.1** | `members`, `teams`, `settings` | sim, criando equipe e salvando configuracao |
| 10 Homologacao | Esta tarefa | - | - | - |

## O que nao foi verificado

- **Producao.** Nada foi conferido em `saleos.tech` nesta tarefa. A V2-9.2 e a V2-9.3 nao estao publicadas; as telas da V2-6 a V2-9.1 continuam sem conferencia em navegador na producao, com a conta real.
- **Respostas reais da IA** (IA SDR e Consultor Digital): sem chave Anthropic valida (tarefa 9.2). As telas abrem; a conversa nao foi testada.
- **Reuniao real do SALE-IA.** Nenhuma chegou ainda ao SOS; recebimento e telas so com eventos simulados.
- **Arrastar no quadro**: verificado em navegador na V2-4.2 e na V2-4.3; nao refeito agora e continua sem teste automatico.
- **Formularios e dialogos** alem dos citados: criar e editar negociacao, atividade, empresa e contato, dialogo de funis e de metas, motivo da perda, aceite de convite, nova senha, fechar o dia e decisoes do SALEIA sao cobertos pela API nos testes de integracao, nao por clique.
- **Login Google**: nao configurado.
- **Carga e desempenho**: nenhuma medicao; o volume de producao e minimo (1 usuario, 1 empresa).
- **Outros navegadores**: so Chrome. Leitor de tela e contraste nao foram avaliados.

## Pendencias

### Antes de usar com clientes reais
1. **Publicar a V2-9.2 e a V2-9.3** (V.1.30.0 e V.1.31.x): backup antes, `reunioes_ativas = 0` no SALE-IA, duas migrations aditivas, imagem `salesos-web:17`. Precisa de autorizacao.
2. **Trocar a chave do Backblaze** exposta no chat (tarefa 10.9) e o token do Grafana Cloud do SALE-IA.
3. **Chave Anthropic valida** e teste das respostas reais (tarefa 9.2).
4. **Dependencias com alerta.** `npm audit --omit=dev` em 2026-11-13: 29 alertas (1 critico, 18 altos, 9 moderados, 1 baixo). A documentacao registrava so o critico. O critico (`proxy-addr`) e a maioria dos altos vem da CLI do `shadcn` e da CLI do `prisma`, que nao atendem requisicoes do app. Dois merecem atencao por estarem no caminho das requisicoes: `zod` abaixo de 4.6.6 (consumo de memoria ao validar colecoes muito grandes; o app valida entradas publicas com ele, limitadas a 256 KB no webhook do SALEIA) e `axios` (dependencia direta, mas nenhum arquivo de `app`, `lib` ou `components` o importa). Nada foi atualizado nesta tarefa: atualizar dependencias pede tarefa propria, com a suite inteira depois.
5. **Limite de tentativas de login e cabecalhos de seguranca** no nginx e no app (pendencia da auditoria, ainda aberta), e limite por IP nas rotas publicas de convite, nova senha e webhook do SALEIA.

### Operacao
6. Sem alerta de falha do backup nem de indisponibilidade do site; baixar e restaurar um arquivo do bucket real nunca foi testado.
7. Decidir Object Lock no bucket e a visibilidade do repositorio no GitHub (parece publico).
8. Reprocessar ou nao as 18 sessoes do SALE-IA com relatorio em erro; conferir a primeira reuniao real em `/saleia`.

### Produto (limitacoes conhecidas, detalhadas em cada tarefa do `docs/TASKS.md`)
9. Nao ha meta por equipe; empresas, contatos, leads e planos nao tem dono.
10. Feriados so entram nos dias uteis das metas; nao ha calendario nacional pronto.
11. Sem transferencia em lote ao remover uma pessoa; gravar senha nova nao encerra sessoes abertas.
12. `docs/GUIA_DE_USO.md` ainda nao descreve Usuarios, Equipes, Auditoria nem a aba Comercial.
13. Academia Comercial (Modulo 8) fora do Prompt Mestre V2.

## Conclusao

O Prompt Mestre V2 esta implementado de ponta a ponta na branch `feat/saleos-v2`: as dez fases tem codigo, testes e documentacao, e a suite completa passa. As fases 1 a 8 e a 9.1 estao em producao; a 9.2 e a 9.3 esperam autorizacao para publicar. A homologacao em producao, com a conta real e cada papel, continua por fazer e depende dessa publicacao.
