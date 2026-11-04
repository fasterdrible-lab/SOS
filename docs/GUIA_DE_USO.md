# Guia de uso do SalesOS

Para quem usa o sistema no dia a dia: consultores, gestores e vendedores. A operação do servidor está em `DEPLOY.md`.

Endereço: https://saleos.tech

## Primeiro acesso

1. O administrador cria o seu usuário (não há cadastro público).
2. Depois de entrar, você cai no **Meu Dia**.
3. Se aparecer o aviso "Nenhum cliente ativo", crie um cliente em **Meus Clientes**. Todo dado (empresas, negociações, metas) pertence a um cliente.

Para sair, clique no seu nome no canto superior direito e escolha **Sair**. No mesmo menu, **Trocar de cliente** leva a Meus Clientes.

## Papéis

Cada pessoa tem um papel em cada cliente. Uma mudança de papel vale na hora, sem precisar entrar de novo.

| O que | Administrador | Gestor | Vendedor |
|---|:-:|:-:|:-:|
| Meu Dia, Dashboard, Empresas, Contatos, Diagnóstico | ✓ | ✓ | ✓ |
| Negociações | todas | todas | só as próprias |
| Criar e mover negociações | ✓ | ✓ | só as próprias |
| Reabrir negociação ganha ou perdida | ✓ | ✓ | — |
| Definir metas | ✓ | ✓ | — |
| Criar planos de ação e tarefas | ✓ | ✓ | — |
| Atualizar status de tarefas | ✓ | ✓ | ✓ |
| IA SDR e Consultor Digital | ✓ | ✓ | — |
| Configurações (chaves de IA) | ✓ | — | — |
| Criar novos clientes | ✓ | — | — |

Quem cria um cliente vira administrador dele. Itens que o seu papel não pode abrir não aparecem no menu.

Por enquanto, colocar outra pessoa em um cliente ou mudar o papel dela é feito pelo responsável técnico (`DEPLOY.md`, "Colocar um usuário em um cliente"). A tela de convites vem na fase de Configurações.

## Meu Dia

Mostra o mês corrente no horário de Brasília. O vendedor vê os próprios números e a própria meta; gestor e administrador veem o cliente inteiro e a meta da equipe.

| Bloco | O que mostra |
|---|---|
| Meta do mês | Faturado no mês (negociações ganhas) comparado com a meta, com a barra de progresso e a marca do ideal de hoje |
| Ideal hoje | Meta proporcional aos dias úteis já passados (segunda a sexta, sem feriados) |
| Projeção | Faturado ÷ dias úteis passados × dias úteis do mês |
| Por dia útil para bater | O que falta ÷ dias úteis restantes, contando hoje |
| Conversão no mês | Ganhas ÷ (ganhas + perdidas) no mês |
| Ticket médio | Faturado no mês ÷ número de vendas |
| Vendas de hoje | Negociações ganhas hoje |
| Propostas aguardando resposta | Negociações na etapa Proposta, das mais antigas para as mais novas |
| Negociações esfriando | Abertas há mais de 14 dias sem mudar de etapa |
| Fechamento previsto vencido | Abertas com data prevista de fechamento já passada |
| Tarefas atrasadas e de hoje | Tarefas pendentes dos planos de ação |
| Leads quentes do IA SDR | Conversas qualificadas ainda não vistas (gestor e administrador) |

Reuniões, follow-ups, fechamento do dia e recomendações da SALEIA aparecem como "em breve" até os módulos correspondentes ficarem prontos. Nenhum número é inventado.

### Definir metas

Gestor ou administrador: no Meu Dia, clique em **Definir metas** (ou **Editar metas**) no cartão da meta. Informe a meta da equipe e, se quiser, a de cada pessoa. Deixar um campo em branco remove a meta. Toda alteração fica registrada.

## Dashboard

No topo, escolha o período (este mês, mês anterior, últimos 90 dias ou este ano). Gestor e administrador também escolhem um vendedor; o vendedor vê só os próprios números. Cada indicador é comparado ao período anterior do mesmo tamanho: em "este mês", com os mesmos dias do mês passado.

| Bloco | O que mostra |
|---|---|
| Faturamento | Soma das negociações ganhas no período, com o gráfico por dia |
| No ritmo, o mês fecha | Projeção do mês corrente, comparada à média dos 3 meses anteriores (não segue o filtro) |
| Vendas ganhas, ticket médio, taxa de ganho | Ganhas; faturado ÷ vendas; ganhas ÷ (ganhas + perdidas) |
| Funil do período | Negociações que chegaram a cada etapa, ou além, no período, e o % da etapa de cima |
| Saúde do pipeline | Dias médios da criação ao ganho; e, agora, pipeline aberto, negociações esfriando e fechamentos vencidos |
| Metas | Metas do mês corrente, com o traço do ideal de hoje |
| Time | Vendas, conversão, ticket, faturamento e % da meta por dono da negociação |
| Origem da venda e motivos de perda | Agrupados pelo texto, sem diferenciar maiúsculas |

## Negociações

- Cada cliente tem o funil padrão **Vendas** (Prospecção, Qualificação, Proposta, Negociação) e pode ter outros. No topo de Negociações, escolha o funil e o que mostrar: em andamento, ganhas, perdidas ou todas.
- Gestor e administrador gerenciam os funis pelo botão **Funis**: nome, ordem das etapas, probabilidade e quais etapas são de proposta (essas aparecem em "Propostas aguardando resposta" no Meu Dia). Uma etapa só pode ser removida sem negociações em andamento nela; o funil padrão não pode ser removido.
- Ganha e perdida não são mais colunas: use **Ganhar** ou **Perder** no cartão. A negociação continua na etapa em que fechou. Encerrada não muda de etapa; **Reabrir** é para gestor e administrador.

- Mude a etapa pelo seletor do cartão.
- Para marcar como **Perdida**, o sistema pede o motivo antes de salvar. O motivo aparece no cartão e fica no histórico.
- A data do ganho ou da perda é registrada no momento da mudança e é usada pelo Meu Dia e pelo Dashboard.
- Reabrir uma negociação ganha ou perdida é permitido só para gestor e administrador.
- Toda mudança de etapa fica no histórico, com quem mudou e quando.
- Se duas pessoas mudarem a mesma negociação ao mesmo tempo, a segunda recebe o aviso para atualizar a página.
- Ao escolher um contato ligado a uma empresa, a negociação fica nessa empresa. Um contato de outra empresa é recusado.

## Busca, notificações e tema

- **Busca:** clique em **Buscar...** no topo ou tecle `Ctrl+K` (`Cmd+K` no Mac) ou `/`. Procura negociações, empresas, contatos e planos de ação do cliente ativo, a partir de 2 letras. Use as setas e `Enter` para abrir. O vendedor encontra só as próprias negociações. Os acentos precisam coincidir.
- **Notificações:** o sino mostra quantas pendências existem: leads qualificados ainda não vistos (gestor e administrador), tarefas atrasadas, fechamentos vencidos e negociações esfriando. Elas somem sozinhas quando a pendência é resolvida.
- **Tema:** o botão do sol (ou da lua) alterna entre escuro e claro. A escolha fica salva no navegador.

## O que ainda não existe

Clientes 360°; Atividades e agenda; integração com a SALEIA; Report Diário; tela de usuários e convites. A ordem está em `TASKS.md`.
