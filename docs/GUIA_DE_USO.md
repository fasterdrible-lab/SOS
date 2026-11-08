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
| Atividades | todas | todas | só as próprias |
| Atribuir atividade a outra pessoa | ✓ | ✓ | — |
| Reuniões da SALEIA e decisões sobre as sugestões | todas | todas | só as das próprias negociações |
| Report: ver o dia e os dias fechados | de todos | de todos | só o próprio |
| Fechar o dia | o próprio | o próprio | o próprio |
| IA SDR e Consultor Digital | ✓ | ✓ | — |
| Configurações (chaves de IA e conexão com a SALEIA) | ✓ | — | — |
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
| Propostas aguardando resposta | Negociações em etapas marcadas como proposta, das mais antigas para as mais novas |
| Negociações esfriando | Abertas há mais de 14 dias sem mudar de etapa |
| Fechamento previsto vencido | Abertas com data prevista de fechamento já passada |
| Tarefas atrasadas e de hoje | Tarefas pendentes dos planos de ação |
| Reuniões de hoje | Atividades do tipo reunião marcadas para hoje |
| Follow-ups atrasados e de hoje | Follow-ups, ligações, e-mails e tarefas com data vencida ou para hoje. O círculo à esquerda conclui |
| Leads quentes do IA SDR | Conversas qualificadas ainda não vistas (gestor e administrador) |
| Recomendações da SALEIA | Recomendações e etapas sugeridas ainda sem decisão, das reuniões que você pode ver; clique para abrir a reunião |
| Fechar o dia | Se o seu dia já foi fechado (e a que horas) ou o link **Abrir o Report** |

Nenhum número é inventado: um bloco sem dados mostra que está vazio.

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

## Empresas

Em **Empresas**, clique no nome para abrir a visão completa daquele cliente da sua carteira: quanto já comprou, o que está em negociação, ticket médio, taxa de ganho, histórico das negociações, contatos, leads e o último diagnóstico feito com o mesmo nome de empresa. O vendedor vê só as próprias negociações; leads aparecem para gestor e administrador.

Use **Editar** para corrigir os dados da empresa e o lápis ao lado de um contato para editá-lo. **Novo contato**, nessa tela, já cria o contato na empresa. Um contato com negociações em outra empresa não pode trocar de empresa.

A mesma tela mostra as **Atividades** da empresa (com **Nova atividade** já ligada a ela) e as **reuniões analisadas pela SALEIA**.

## Negociações

- Cada cliente tem o funil padrão **Vendas** (Prospecção, Qualificação, Proposta, Negociação) e pode ter outros. No topo de Negociações, escolha o funil, o que mostrar (em andamento, ganhas, perdidas ou todas), o dono e a ordem, procure por título, empresa ou contato e alterne entre quadro e lista.
- Gestor e administrador gerenciam os funis pelo botão **Funis**: nome, ordem das etapas, probabilidade e quais etapas são de proposta (essas aparecem em "Propostas aguardando resposta" no Meu Dia). Uma etapa só pode ser removida sem negociações em andamento nela; o funil padrão não pode ser removido.
- Ganha e perdida não são mais colunas: use **Ganhar** ou **Perder** na página da negociação. A negociação continua na etapa em que fechou. Encerrada não muda de etapa; **Reabrir** é para gestor e administrador.
- Cada etapa pode exigir valor, empresa, contato ou previsão de fechamento (botão **Funis**, opção **Exige**). Sem esses campos a negociação não entra na etapa, e o sistema diz o que falta. Ganhar sempre exige valor; perder nunca depende desses campos.
- Arraste o cartão entre as colunas para mudar de etapa; no celular, use o seletor do cartão. Para mudar de funil, use o seletor de etapa na página da negociação.
- Clique no título para abrir a página da negociação, com dados, histórico e **Editar**. Trocar o dono ou editar uma negociação encerrada é para gestor e administrador.
- Para marcar como **Perdida**, o sistema pede o motivo antes de salvar. O motivo aparece na negociação e fica no histórico.
- A data do ganho ou da perda é registrada no momento da mudança e é usada pelo Meu Dia e pelo Dashboard.
- Reabrir uma negociação ganha ou perdida é permitido só para gestor e administrador.
- Toda mudança de etapa fica no histórico, com quem mudou e quando.
- Se duas pessoas mudarem a mesma negociação ao mesmo tempo, a segunda recebe o aviso para atualizar a página.
- Ao escolher um contato ligado a uma empresa, a negociação fica nessa empresa. Um contato de outra empresa é recusado.
- A página da negociação também mostra as atividades dela, com **Nova atividade**, e as reuniões analisadas pela SALEIA.

## Atividades

Reuniões, follow-ups, ligações, e-mails, tarefas e notas, no menu **Atividades**.

- **Nova atividade:** escolha o tipo, a data e a hora, o título e, se quiser, a negociação, a empresa e o contato. Reunião e follow-up exigem data. Nota é o registro de algo que já aconteceu e nasce concluída.
- Ao escolher uma negociação, a empresa e o contato dela vêm junto. Empresa, contato e negociação de empresas diferentes são recusados.
- **Lista:** separa em atrasadas, hoje, próximas, sem data e concluídas. **Agenda:** mostra a semana de segunda a domingo, com as setas para ir e voltar.
- O círculo à esquerda conclui ou reabre; o lápis edita ou remove.
- Quem cria é o responsável. Gestor e administrador podem atribuir a outra pessoa e filtrar por responsável; o vendedor vê e altera só as próprias.
- Atividades atrasadas aparecem no sino de notificações.

## SALEIA

Depois de cada reunião, a SALEIA analisa a conversa e envia ao SalesOS o resumo, as recomendações, as objeções, as dores, os sinais de compra, os pontos de atenção e, quando for o caso, a etapa sugerida para a negociação.

- **Conectar** (administrador): em **Configurações**, seção **Integrações de sistemas**, cartão **SALEIA**, clique em **Conectar**. A tela mostra o endereço e o segredo uma única vez; eles vão para a configuração da SALEIA. **Gerar novo segredo** invalida o anterior na hora. **Desconectar** faz a SALEIA parar de enviar; as reuniões já recebidas continuam.
- O SalesOS liga cada reunião à negociação, ao contato (pelo e-mail) ou à empresa (pelo nome dito na reunião). Uma negociação só é escolhida quando a empresa tem exatamente uma em andamento.
- **Menu SALEIA:** lista as reuniões recebidas. Gestor e administrador têm o filtro **Sem empresa**, para as reuniões que não encontraram empresa. Clique no título para ver o resumo completo, os pontos agrupados, as frases do cliente que sustentam cada ponto e os participantes.
- Nada muda nas negociações sozinho: toda sugestão espera a decisão de uma pessoa, na página da reunião.
  - **Criar atividade** (recomendação): cria uma tarefa com o prazo sugerido, ligada à negociação da reunião (ou à empresa, se não houver negociação), para o dono da negociação. A descrição traz a reunião e a frase do cliente. A recomendação passa a mostrar **Virou atividade**.
  - **Mover para <etapa>** (etapa sugerida): leva a negociação para a etapa sugerida, com as mesmas regras de quando você muda a etapa à mão (campos exigidos, negociação encerrada não muda). A tela avisa quando a etapa sugerida é a atual, fica para trás, não existe no funil ou a reunião não tem negociação.
  - **Descartar** esconde a sugestão das pendentes; **Desfazer descarte** a traz de volta. Uma sugestão aceita não volta atrás: a atividade criada pode ser editada ou removida em Atividades, e a etapa pode ser mudada na negociação.
  - Se duas pessoas decidirem ao mesmo tempo, só a primeira vale; a segunda recebe o aviso para atualizar a página.
- As sugestões sem decisão aparecem no Meu Dia, em **Recomendações da SALEIA**.

## Report

O dia de cada pessoa em números, no menu **Report**. As datas seguem o horário de Brasília.

| Número | O que conta |
|---|---|
| Reuniões realizadas | Atividades do tipo reunião concluídas no dia |
| FUPs | Follow-ups, ligações e e-mails concluídos no dia |
| Negociações avançadas | Negociações em andamento que a pessoa moveu para uma etapa à frente no mesmo funil (cada uma conta uma vez) |
| Vendas | Negociações da pessoa ganhas no dia, com o valor |
| Pendentes | Atividades com data no dia ainda não concluídas |

- Abaixo dos números ficam as listas de cada um e as **reuniões analisadas pela SALEIA** no dia, que aparecem à parte e não somam nas reuniões realizadas.
- As setas e o campo de data navegam entre os dias, até hoje. Gestor e administrador escolhem a pessoa; o vendedor vê só o próprio dia.
- **Fechar o dia:** escreva as observações (opcional) e clique em **Fechar o dia**. Os números daquele momento ficam gravados e não mudam mais, mesmo que uma atividade seja concluída depois; as listas continuam mostrando como estão agora. Dá para fechar um dia passado que ficou esquecido. Cada pessoa fecha só o próprio dia, uma vez: um dia fechado não reabre e a observação não é editada.
- **Dias fechados** (aba): os dias já fechados, com os números gravados e as observações. O vendedor vê os próprios; gestor e administrador veem a equipe e podem filtrar por pessoa.

## Busca, notificações e tema

- **Busca:** clique em **Buscar...** no topo ou tecle `Ctrl+K` (`Cmd+K` no Mac) ou `/`. Procura negociações, empresas, contatos e planos de ação do cliente ativo, a partir de 2 letras. Use as setas e `Enter` para abrir. O vendedor encontra só as próprias negociações. Os acentos precisam coincidir.
- **Notificações:** o sino mostra quantas pendências existem: leads qualificados ainda não vistos (gestor e administrador), atividades atrasadas, tarefas de plano atrasadas, fechamentos vencidos e negociações esfriando. Elas somem sozinhas quando a pendência é resolvida.
- **Tema:** o botão do sol (ou da lua) alterna entre escuro e claro. A escolha fica salva no navegador.

## O que ainda não existe

"Só diagnóstico" no Report (V2-8.2); lembrete para quem não fechou o dia; tela de usuários e convites. A ordem está em `TASKS.md`.
