/** Manual do Usuario (V2-12), no padrao do manual da EGIDE: indice por grupo,
 * busca e um artigo por tela com os 9 itens e o espaco do video.
 * Escrito sobre o que o SalesOS faz hoje: cada artigo aponta para uma tela que
 * existe (conferido em tests/manual-content.test.mjs). O que nao existe fica em
 * "Limitacoes", nunca no passo a passo. */

export interface ManualVideo {
  title: string
  /** Endereco para incorporar (YouTube/Vimeo "embed"). Nulo = em preparacao. */
  embedUrl: string | null
}

export interface ManualArticle {
  slug: string
  title: string
  group: ManualGroup
  /** Quem usa a tela. */
  audience: string
  /** Tela principal do assunto (link "Abrir a tela"). */
  path: string
  /** Caminho pelo menu, para quem le no celular. */
  access: string
  objective: string
  whenToUse: string
  steps: string[]
  example: string
  results: string
  faq: { question: string; answer: string }[]
  commonErrors: { problem: string; solution: string }[]
  limitations: string[]
  video: ManualVideo
}

const pendingVideo = (title: string): ManualVideo => ({ title, embedUrl: null })

export const MANUAL_GROUPS = [
  "Primeiros passos",
  "Rotina comercial",
  "CRM",
  "Indicadores",
  "Inteligência",
  "Consultoria",
  "Administração",
] as const

export type ManualGroup = (typeof MANUAL_GROUPS)[number]

const ALL = "Administrador, gestor e vendedor"
const ADMIN = "Administrador"
const MANAGERS = "Administrador e gestor"

export const MANUAL_ARTICLES: ManualArticle[] = [
  {
    slug: "primeiro-acesso",
    title: "Primeiro acesso e clientes",
    group: "Primeiros passos",
    audience: ALL,
    path: "/clientes",
    access: "Menu › Consultoria › Meus Clientes",
    objective: "Entrar no SalesOS, escolher o cliente em que vai trabalhar e, para o consultor, criar novos clientes.",
    whenToUse: "No primeiro login, ao começar a atender um cliente novo e sempre que precisar trocar de cliente.",
    steps: [
      "Acesse https://saleos.tech e entre com o e-mail e a senha. Não há cadastro público: a conta nasce de um convite do administrador.",
      "Depois do login, a primeira tela é o Meu Dia do último cliente que você usou.",
      "Para trabalhar em outro cliente, clique no seu nome no canto superior direito e escolha Trocar de cliente, ou abra Meus Clientes e clique em Acessar na linha do cliente.",
      "Para criar um cliente, abra Meus Clientes, clique em Novo cliente, informe o nome da organização e confirme. Você vira administrador dele e ele já fica ativo.",
      "Para sair, clique no seu nome e escolha Sair.",
    ],
    example:
      "Uma consultora atende três empresas. Ela cria cada uma em Meus Clientes e, pela manhã, troca de cliente para ver o Meu Dia de cada uma.",
    results:
      "O cliente ativo aparece no botão do cabeçalho, e todas as telas passam a mostrar só os dados dele: empresas, negociações, metas e atividades.",
    faq: [
      {
        question: "Esqueci a senha. O que faço?",
        answer:
          "Peça ao administrador do cliente: em Configurações › Usuários ele gera um link de nova senha, válido por 24 horas. O link Esqueci a senha, na tela de login, explica isso.",
      },
      {
        question: "Por que o login abriu outro cliente?",
        answer: "O login abre o último cliente usado. Se você saiu dele, abre o mais antigo em que você está.",
      },
    ],
    commonErrors: [
      {
        problem: "Aparece o aviso “Nenhum cliente ativo”.",
        solution: "Crie um cliente em Meus Clientes ou peça um convite ao administrador de um cliente.",
      },
    ],
    limitations: [
      "Um cliente não pode ser apagado pela tela.",
      "O login com Google ainda não está configurado.",
    ],
    video: pendingVideo("Primeiro acesso"),
  },
  {
    slug: "usuarios-e-convites",
    title: "Usuários, convites e papéis",
    group: "Primeiros passos",
    audience: ADMIN,
    path: "/configuracoes/usuarios",
    access: "Menu › Configurações › aba Usuários",
    objective: "Convidar pessoas para o cliente, definir o papel de cada uma, gerar link de nova senha e remover quem saiu.",
    whenToUse: "Quando alguém entra ou sai do time comercial, muda de função ou esqueceu a senha.",
    steps: [
      "Abra Configurações e a aba Usuários.",
      "Em Convidar pessoa, informe o e-mail, escolha o papel (Administrador, Gestor ou Vendedor) e clique em Gerar link.",
      "Copie o link e envie à pessoa por WhatsApp ou e-mail. Ele aparece uma única vez, vale 7 dias e só pode ser usado uma vez.",
      "A pessoa abre o link, cria a conta com nome e senha de 12 caracteres ou mais (ou entra com a senha atual, se já tiver conta) e cai no Meu Dia.",
      "Na lista de Pessoas, troque o papel no seletor ao lado do nome. Use a chave para gerar um link de nova senha e o ícone vermelho para remover a pessoa do cliente.",
    ],
    example:
      "O administrador convida a nova vendedora como Vendedor e envia o link pelo WhatsApp. Ela cria a senha e, no mesmo minuto, já vê as negociações dela.",
    results:
      "A pessoa aparece em Pessoas com o papel escolhido. Convites ainda não usados ficam em Convites em aberto, com a opção Cancelar.",
    faq: [
      {
        question: "O que cada papel pode fazer?",
        answer:
          "Administrador configura tudo. Gestor vê o time inteiro (ou só a equipe dele, se estiver numa equipe), define metas e funis. Vendedor vê só as próprias negociações e atividades.",
      },
      {
        question: "A mudança de papel vale quando?",
        answer: "Na hora, sem a pessoa precisar sair e entrar de novo.",
      },
      {
        question: "O SalesOS envia o convite por e-mail?",
        answer: "Não. Quem convida envia o link pelo canal que preferir.",
      },
    ],
    commonErrors: [
      {
        problem: "A pessoa vê “Convite não encontrado”.",
        solution: "O link foi copiado pela metade, já foi usado, cancelado ou passou de 7 dias. Gere um novo.",
      },
      {
        problem: "Não consigo mudar o meu próprio papel nem me remover.",
        solution: "É proposital: outro administrador faz isso. O cliente nunca fica sem administrador.",
      },
    ],
    limitations: [
      "Remover a pessoa não transfere as negociações e atividades dela; elas continuam com ela como dona.",
      "O link de nova senha só vale para quem participa apenas deste cliente.",
      "Gravar a senha nova não encerra sessões já abertas com a senha antiga.",
    ],
    video: pendingVideo("Convidando o time"),
  },
  {
    slug: "equipes",
    title: "Equipes",
    group: "Primeiros passos",
    audience: ADMIN,
    path: "/configuracoes/usuarios",
    access: "Menu › Configurações › aba Usuários › cartão Equipes",
    objective: "Separar o time comercial em equipes para que cada gestor veja só a própria equipe.",
    whenToUse: "Quando o cliente tem mais de um gestor, cada um com o seu grupo de vendedores.",
    steps: [
      "Abra Configurações › Usuários.",
      "No cartão Equipes, digite o nome em Nova equipe e clique em Criar equipe.",
      "Em Pessoas, escolha a equipe no seletor ao lado do papel, para o gestor e para cada vendedor dele.",
      "Use o lápis para renomear e a lixeira para remover a equipe. Remover deixa as pessoas sem equipe; nada mais é apagado.",
    ],
    example:
      "Um cliente tem Inside Sales e Field Sales. O administrador cria as duas equipes e coloca cada gestor com os seus vendedores. Cada gestor passa a ver só o funil da própria equipe.",
    results:
      "O gestor que está numa equipe vê, em todas as telas, só o que é das pessoas da equipe e o que está sem responsável. Ao atribuir dono ou responsável, só aparecem pessoas da equipe.",
    faq: [
      {
        question: "E o gestor sem equipe?",
        answer: "Continua vendo tudo, como o administrador. O vendedor continua vendo só o que é dele.",
      },
      {
        question: "Uma pessoa pode estar em duas equipes?",
        answer: "Não. Cada pessoa fica em no máximo uma equipe por cliente.",
      },
    ],
    commonErrors: [
      {
        problem: "O gestor continua vendo tudo.",
        solution: "Confira se o próprio gestor está na equipe: só o gestor que está numa equipe tem a visão restrita.",
      },
    ],
    limitations: [
      "Não há meta por equipe: no Dashboard, o gestor com equipe vê as metas individuais.",
      "Empresas, contatos, leads, planos de ação e diagnósticos não têm dono e continuam visíveis para todo o cliente.",
    ],
    video: pendingVideo("Montando equipes"),
  },
  {
    slug: "meu-dia",
    title: "Meu Dia",
    group: "Rotina comercial",
    audience: ALL,
    path: "/meu-dia",
    access: "Menu › Operação › Meu Dia",
    objective: "Ver, numa tela só, a meta do mês, o ritmo para batê-la e tudo o que pede ação hoje.",
    whenToUse: "No começo do dia e sempre que quiser saber o que fazer agora.",
    steps: [
      "Abra Meu Dia (é a página inicial depois do login).",
      "No cartão da meta, compare o faturado com a meta, o ideal de hoje e a projeção do mês.",
      "Confira as listas: propostas aguardando resposta, negociações esfriando, fechamentos vencidos, reuniões de hoje e follow-ups atrasados e de hoje.",
      "Conclua um follow-up pelo círculo à esquerda e abra uma negociação clicando no título.",
      "Gestor ou administrador: clique em Definir metas para lançar a meta da equipe e a de cada pessoa.",
    ],
    example:
      "A vendedora abre o Meu Dia, vê que está R$ 3 mil abaixo do ideal, liga para as duas propostas mais antigas e conclui os follow-ups da manhã.",
    results: "Cada ação concluída sai da lista e os números são recalculados na hora.",
    faq: [
      {
        question: "Como é calculado o ideal de hoje?",
        answer:
          "Meta proporcional aos dias úteis já passados no mês (segunda a sexta, sem os feriados cadastrados em Configurações › Comercial).",
      },
      {
        question: "Quando uma negociação está esfriando?",
        answer:
          "Quando fica sem mudar de etapa por mais dias que o limite do cliente (14, se o administrador não mudou em Configurações › Comercial).",
      },
    ],
    commonErrors: [
      {
        problem: "A meta aparece vazia.",
        solution: "Ninguém lançou a meta do mês. Um gestor ou administrador usa Definir metas.",
      },
    ],
    limitations: ["Os números são do mês corrente, no horário de Brasília."],
    video: pendingVideo("Usando o Meu Dia"),
  },
  {
    slug: "negociacoes",
    title: "Negociações e funis",
    group: "Rotina comercial",
    audience: ALL,
    path: "/pipeline",
    access: "Menu › Operação › Negociações",
    objective: "Acompanhar cada negociação pelas etapas do funil até ganhar ou perder.",
    whenToUse: "Ao abrir uma oportunidade nova, ao avançar uma conversa e ao encerrar uma venda.",
    steps: [
      "Abra Negociações. No topo, escolha o funil, o status, o dono, a ordem e alterne entre quadro e lista.",
      "Clique em Nova oportunidade, informe título, valor, empresa e contato e salve.",
      "Arraste o cartão para outra coluna para mudar de etapa (no celular, use o seletor do cartão).",
      "Clique no título para abrir a negociação. Use Editar para mudar dados e o Dono, e Ganhar ou Perder para encerrar.",
      "Gestor ou administrador: o botão Funis cria funis, ordena etapas, define probabilidades e o que cada etapa exige.",
    ],
    example:
      "Depois de enviar a proposta, o vendedor arrasta o cartão para Proposta. Na semana seguinte, o cliente aceita e ele clica em Ganhar.",
    results:
      "Toda mudança de etapa e de status entra no histórico da negociação, com quem mudou e quando, e alimenta o Meu Dia, o Dashboard e o Report.",
    faq: [
      {
        question: "Por que não consigo mover para a etapa?",
        answer: "A etapa exige campos (valor, empresa, contato ou previsão). A mensagem diz o que falta; preencha em Editar.",
      },
      {
        question: "Quem reabre uma negociação ganha ou perdida?",
        answer: "Só gestor e administrador.",
      },
    ],
    commonErrors: [
      {
        problem: "Ganhar é recusado.",
        solution: "Ganhar sempre exige valor maior que zero. Edite a negociação e informe o valor.",
      },
      {
        problem: "Aparece o aviso para atualizar a página.",
        solution: "Outra pessoa mudou a mesma negociação ao mesmo tempo. Atualize e repita.",
      },
    ],
    limitations: [
      "O quadro mostra até 500 negociações por consulta.",
      "Trocar o dono não aparece no histórico da negociação, só na Auditoria.",
    ],
    video: pendingVideo("Trabalhando o funil"),
  },
  {
    slug: "atividades",
    title: "Atividades e follow-ups",
    group: "Rotina comercial",
    audience: ALL,
    path: "/atividades",
    access: "Menu › Operação › Atividades",
    objective: "Registrar e agendar reuniões, follow-ups, ligações, e-mails, tarefas e notas.",
    whenToUse: "Sempre que combinar um próximo passo com o cliente ou registrar um contato feito.",
    steps: [
      "Abra Atividades e clique em Nova atividade.",
      "Escolha o tipo, a data e a hora, o título e, se quiser, a negociação, a empresa e o contato. Reunião e follow-up exigem data.",
      "Use a Lista (atrasadas, hoje, próximas, sem data e concluídas) ou a Agenda da semana.",
      "Conclua ou reabra pelo círculo à esquerda; edite ou remova pelo lápis.",
    ],
    example: "Depois de uma ligação, o vendedor cria um follow-up para sexta, ligado à negociação, e ele aparece no Meu Dia daquele dia.",
    results: "A atividade aparece no Meu Dia, na negociação, na empresa e, quando concluída, conta no Report do dia.",
    faq: [
      {
        question: "Posso criar uma atividade para outra pessoa?",
        answer: "Gestor e administrador podem atribuir a outra pessoa. O vendedor cria só para si.",
      },
      {
        question: "Para que serve a nota?",
        answer: "Registrar algo que já aconteceu. Ela nasce concluída.",
      },
    ],
    commonErrors: [
      {
        problem: "A atividade é recusada ao salvar.",
        solution: "Negociação, empresa e contato precisam ser da mesma empresa.",
      },
    ],
    limitations: ["Não há lembrete por e-mail, recorrência nem integração com Google Agenda ou Outlook."],
    video: pendingVideo("Organizando atividades"),
  },
  {
    slug: "report",
    title: "Report diário",
    group: "Rotina comercial",
    audience: ALL,
    path: "/report",
    access: "Menu › Operação › Report",
    objective: "Ver os números do dia de cada pessoa e fechar o dia com uma observação.",
    whenToUse: "No fim do expediente e, para o gestor, ao acompanhar o time.",
    steps: [
      "Abra Report, aba Meu dia. Use as setas ou a data para navegar entre os dias.",
      "Confira reuniões realizadas, só diagnóstico, FUPs, negociações avançadas, vendas e pendentes, com as listas abaixo.",
      "Em Só diagnóstico, confirme ou reescreva o motivo sugerido pela IA, ou clique em Não foi só diagnóstico.",
      "Escreva a observação (opcional) e clique em Fechar o dia.",
      "Gestor ou administrador: escolha a pessoa no topo e veja os Dias fechados do time.",
    ],
    example: "Às 18h, a vendedora confere que fez 3 reuniões e 5 follow-ups, anota que um cliente pediu desconto e fecha o dia.",
    results: "Os números do momento ficam gravados e aparecem em Dias fechados; não mudam mais.",
    faq: [
      {
        question: "Posso fechar um dia passado?",
        answer: "Sim, se ele ficou esquecido. Cada pessoa fecha só o próprio dia, uma vez.",
      },
      {
        question: "O que é Só diagnóstico?",
        answer: "Reunião analisada pela SALEIA em que a oferta não foi apresentada. Você confirma ou contesta.",
      },
    ],
    commonErrors: [
      {
        problem: "Não aparece a opção de fechar.",
        solution: "O dia já foi fechado ou é de outra pessoa. Dia futuro também não fecha.",
      },
    ],
    limitations: ["Dia fechado não reabre e a observação não é editada.", "Não há lembrete para quem não fechou o dia."],
    video: pendingVideo("Fechando o dia"),
  },
  {
    slug: "empresas",
    title: "Empresas e visão 360",
    group: "CRM",
    audience: ALL,
    path: "/empresas",
    access: "Menu › CRM › Empresas",
    objective: "Cadastrar as empresas da carteira e ver tudo sobre cada uma numa tela só.",
    whenToUse: "Antes de uma reunião, para conhecer o histórico, e ao cadastrar um novo cliente da carteira.",
    steps: [
      "Abra Empresas e clique em Nova empresa para cadastrar.",
      "Clique no nome da empresa para abrir a visão 360.",
      "Veja faturado, pipeline aberto, ticket médio, taxa de ganho, negociações, linha do tempo, contatos, atividades e reuniões da SALEIA.",
      "Use Editar para corrigir os dados e Novo contato para criar um contato já ligado à empresa.",
    ],
    example: "Antes da renovação, o gestor abre a empresa e vê as compras anteriores, a última reunião analisada e os contatos.",
    results: "As informações da empresa ficam reunidas e atualizadas a cada negociação e atividade.",
    faq: [
      {
        question: "O vendedor vê todas as negociações da empresa?",
        answer: "Não, só as dele. Contatos ficam visíveis para todos.",
      },
    ],
    commonErrors: [
      {
        problem: "O último diagnóstico não aparece.",
        solution: "O diagnóstico é ligado pelo nome da empresa. Confira se o nome é igual nos dois.",
      },
    ],
    limitations: ["Não há exclusão de empresa nem responsável pela empresa."],
    video: pendingVideo("A visão 360"),
  },
  {
    slug: "contatos",
    title: "Contatos",
    group: "CRM",
    audience: ALL,
    path: "/contatos",
    access: "Menu › CRM › Contatos",
    objective: "Cadastrar as pessoas com quem o time conversa, ligadas às empresas.",
    whenToUse: "Ao conhecer um novo decisor ou influenciador.",
    steps: [
      "Abra Contatos e clique em Novo contato.",
      "Informe nome, cargo, e-mail, telefone e a empresa.",
      "Use o lápis para editar um contato e o nome da empresa para abrir a visão 360.",
    ],
    example: "Depois da primeira reunião, o vendedor cadastra a diretora financeira na empresa e a liga à negociação.",
    results: "O contato fica disponível nas negociações e atividades da empresa.",
    faq: [
      {
        question: "Por que o contato não troca de empresa?",
        answer: "Ele tem negociações em outra empresa. Isso mantém as negociações coerentes.",
      },
    ],
    commonErrors: [
      {
        problem: "A negociação recusa o contato.",
        solution: "O contato é de outra empresa. Escolha um contato da mesma empresa da negociação.",
      },
    ],
    limitations: ["Contato não tem página própria nem exclusão."],
    video: pendingVideo("Cadastrando contatos"),
  },
  {
    slug: "dashboard",
    title: "Dashboard Executivo",
    group: "Indicadores",
    audience: ALL,
    path: "/dashboard",
    access: "Menu › Operação › Dashboard",
    objective: "Acompanhar faturamento, ritmo, funil, saúde do pipeline, metas e o desempenho do time.",
    whenToUse: "Em reuniões de resultado e para decidir onde agir no mês.",
    steps: [
      "Abra Dashboard e escolha o período: este mês, mês anterior, últimos 90 dias ou este ano.",
      "Gestor ou administrador: escolha uma pessoa no seletor do canto direito, ou deixe a equipe inteira.",
      "Leia os indicadores comparados ao período anterior, o funil do período, a saúde do pipeline, as metas, o time, a origem das vendas e os motivos de perda.",
    ],
    example: "Na reunião de segunda, o gestor mostra que a taxa de ganho caiu e que o principal motivo de perda é preço.",
    results: "Os números são calculados na hora, sobre as datas reais de ganho e perda.",
    faq: [
      {
        question: "O vendedor vê o Dashboard?",
        answer: "Sim, só com as próprias negociações.",
      },
      {
        question: "O que é “No ritmo, o mês fecha”?",
        answer: "A projeção do mês corrente, pelos dias úteis; não segue o filtro de período.",
      },
    ],
    commonErrors: [
      {
        problem: "Aparece “sem base de comparação”.",
        solution: "Não houve vendas no período anterior. Não é erro.",
      },
    ],
    limitations: ["Não há exportação dos números."],
    video: pendingVideo("Lendo o Dashboard"),
  },
  {
    slug: "saleia",
    title: "SALEIA: reuniões analisadas",
    group: "Inteligência",
    audience: ALL,
    path: "/saleia",
    access: "Menu › Inteligência › SALEIA",
    objective: "Receber as reuniões analisadas pela SALEIA e decidir o que fazer com as recomendações.",
    whenToUse: "Depois de cada reunião gravada pela SALEIA.",
    steps: [
      "Abra SALEIA e clique no título da reunião.",
      "Leia o resumo, as recomendações, objeções, dores, sinais de compra e pontos de atenção, com as frases do cliente.",
      "Em cada recomendação, clique em Criar atividade; na etapa sugerida, em Mover para a etapa; ou em Descartar.",
      "As sugestões sem decisão também aparecem no Meu Dia, em Recomendações da SALEIA.",
    ],
    example: "A SALEIA sugere enviar a proposta até quinta. O vendedor clica em Criar atividade e a tarefa entra no Meu Dia dele.",
    results: "Nada muda sozinho: cada sugestão aceita vira uma atividade ou move a negociação, sempre por decisão de uma pessoa.",
    faq: [
      {
        question: "Como a reunião é ligada à negociação?",
        answer: "Pela negociação informada, pelo e-mail do contato ou pelo nome da empresa dito na reunião.",
      },
    ],
    commonErrors: [
      {
        problem: "A reunião aparece “Sem empresa”.",
        solution: "A empresa citada não foi encontrada pelo nome. Confira o cadastro da empresa.",
      },
    ],
    limitations: [
      "Não há como ligar manualmente uma reunião “sem empresa” a uma negociação.",
      "A conexão é feita pelo administrador em Configurações › Integrações.",
    ],
    video: pendingVideo("Decidindo as recomendações da SALEIA"),
  },
  {
    slug: "ia-sdr",
    title: "IA SDR",
    group: "Inteligência",
    audience: MANAGERS,
    path: "/sdr",
    access: "Menu › Inteligência › IA SDR",
    objective: "Atender leads por um chat público e qualificá-los automaticamente.",
    whenToUse: "Para captar e qualificar leads do site sem depender de alguém online.",
    steps: [
      "Compartilhe o link do widget público do cliente com os leads (por exemplo, no site).",
      "Abra IA SDR para ver as conversas, a classificação (Frio, Morno ou Quente) e a última mensagem.",
      "Conversa classificada como Quente vira lead e oportunidade no CRM; o número aparece no menu.",
    ],
    example: "Um visitante conta que precisa de 20 licenças para o mês que vem; a conversa fica Quente e a oportunidade aparece em Negociações.",
    results: "Leads qualificados entram no funil sem digitação.",
    faq: [
      {
        question: "Precisa de configuração?",
        answer: "Sim: uma chave Anthropic cadastrada em Configurações › Integrações.",
      },
    ],
    commonErrors: [
      {
        problem: "A IA não responde.",
        solution: "Não há chave Anthropic válida cadastrada ou ela está sem crédito.",
      },
    ],
    limitations: ["Cada conversa aceita até 30 mensagens do lead e o cliente, até 300 por dia."],
    video: pendingVideo("O IA SDR"),
  },
  {
    slug: "consultor-digital",
    title: "Consultor Digital",
    group: "Inteligência",
    audience: MANAGERS,
    path: "/consultor",
    access: "Menu › Inteligência › Consultor Digital",
    objective: "Conversar com uma IA que conhece o último diagnóstico e os números do cliente.",
    whenToUse: "Para tirar dúvidas de estratégia comercial ou preparar uma reunião de consultoria.",
    steps: [
      "Abra Consultor Digital.",
      "Escreva a pergunta sobre a operação comercial e envie.",
      "A resposta considera o último diagnóstico e os indicadores do CRM.",
    ],
    example: "A consultora pergunta como reduzir o ciclo de venda e recebe sugestões baseadas no diagnóstico do cliente.",
    results: "O histórico da conversa fica salvo no cliente.",
    faq: [
      {
        question: "Precisa de configuração?",
        answer: "Sim: uma chave Anthropic em Configurações › Integrações. Sem ela, a tela leva para Configurações.",
      },
    ],
    commonErrors: [
      {
        problem: "Aparece “Configure uma chave de IA para começar”.",
        solution: "O administrador precisa cadastrar a chave Anthropic.",
      },
    ],
    limitations: ["As respostas dependem do diagnóstico e dos dados cadastrados."],
    video: pendingVideo("O Consultor Digital"),
  },
  {
    slug: "diagnostico",
    title: "Diagnóstico Comercial",
    group: "Consultoria",
    audience: ALL,
    path: "/diagnostico",
    access: "Menu › Consultoria › Diagnóstico",
    objective: "Medir a maturidade comercial do cliente e apontar gargalos e recomendações.",
    whenToUse: "No início da consultoria e para medir a evolução depois de alguns meses.",
    steps: [
      "Abra Diagnóstico e preencha as etapas: Empresa, Números comerciais, Processo e Revisão, usando Próximo e Anterior.",
      "Conclua e clique em Ver resultado.",
      "No resultado, veja a nota, os gargalos e as recomendações.",
      "Use os botões do resultado para criar a oportunidade no pipeline e o plano de ação a partir das recomendações.",
    ],
    example: "Na primeira reunião, o consultor preenche o diagnóstico com o dono da empresa e gera o plano de ação na hora.",
    results: "O diagnóstico fica salvo, alimenta o Consultor Digital e aparece na visão 360 da empresa.",
    faq: [
      {
        question: "Criar a oportunidade duas vezes duplica?",
        answer: "Não: o botão leva à oportunidade já criada.",
      },
    ],
    commonErrors: [
      {
        problem: "Não avança para a próxima etapa.",
        solution: "Há campos obrigatórios vazios na etapa atual.",
      },
    ],
    limitations: ["O diagnóstico é ligado à empresa pelo nome."],
    video: pendingVideo("Aplicando o diagnóstico"),
  },
  {
    slug: "plano-de-acao",
    title: "Plano de Ação",
    group: "Consultoria",
    audience: ALL,
    path: "/planos",
    access: "Menu › Consultoria › Plano de Ação",
    objective: "Organizar as ações de crescimento do cliente em planos com tarefas e prazos.",
    whenToUse: "Depois do diagnóstico e nas reuniões de acompanhamento da consultoria.",
    steps: [
      "Abra Plano de Ação e clique em Novo plano (ou gere o plano pelo resultado do diagnóstico).",
      "Abra o plano e clique em Nova tarefa para incluir título e prazo.",
      "Atualize o status de cada tarefa: Pendente, Em andamento, Concluída ou Cancelada.",
    ],
    example: "O consultor cria o plano “Estruturar pré-venda” com quatro tarefas e acompanha o status a cada semana.",
    results: "Tarefas atrasadas aparecem no Meu Dia e no sino de notificações.",
    faq: [
      {
        question: "O vendedor pode criar planos?",
        answer: "Não. Ele atualiza o status das tarefas; criar é para gestor e administrador.",
      },
    ],
    commonErrors: [
      {
        problem: "O botão Novo plano não aparece.",
        solution: "Seu papel é vendedor. Peça a um gestor.",
      },
    ],
    limitations: ["Planos não são ligados a uma empresa e não aparecem na visão 360."],
    video: pendingVideo("Plano de ação"),
  },
  {
    slug: "configuracoes-comerciais",
    title: "Configurações comerciais",
    group: "Administração",
    audience: ADMIN,
    path: "/configuracoes/comercial",
    access: "Menu › Configurações › aba Comercial",
    objective: "Definir quando uma negociação está esfriando e cadastrar os feriados do cliente.",
    whenToUse: "Na implantação do cliente e no início do ano, para os feriados.",
    steps: [
      "Abra Configurações e a aba Comercial.",
      "Em Dias sem mudar de etapa, informe o limite (de 1 a 180; o padrão é 14).",
      "Em Novo feriado, escolha a data e clique em Adicionar. Repita para cada feriado.",
      "Clique em Salvar.",
    ],
    example: "Um cliente com ciclo curto usa 7 dias para esfriar e cadastra os feriados municipais da cidade.",
    results:
      "O limite vale no Meu Dia, no Dashboard e no sino. Os feriados saem da conta de dias úteis: mudam o ideal de hoje, a projeção e o quanto falta por dia para a meta.",
    faq: [
      {
        question: "Muda algo para trás?",
        answer: "Os números são sempre calculados na hora, então refletem a regra nova imediatamente.",
      },
    ],
    commonErrors: [
      {
        problem: "O feriado não muda a meta.",
        solution: "Feriado em sábado ou domingo não muda nada: esses dias já não contam.",
      },
    ],
    limitations: [
      "Feriados são cadastrados um a um, sem calendário nacional pronto nem repetição anual.",
      "Prazos de atividades e dias na etapa continuam em dias corridos.",
    ],
    video: pendingVideo("Configurações comerciais"),
  },
  {
    slug: "integracoes",
    title: "Integrações (IA e SALEIA)",
    group: "Administração",
    audience: ADMIN,
    path: "/configuracoes",
    access: "Menu › Configurações › aba Integrações",
    objective: "Cadastrar as chaves de IA e conectar a SALEIA ao cliente.",
    whenToUse: "Na implantação do cliente ou ao trocar uma chave.",
    steps: [
      "Abra Configurações, aba Integrações.",
      "No cartão do provedor (Anthropic ou OpenAI), informe a Chave de API e salve. Ela é guardada criptografada e aparece mascarada.",
      "Para a SALEIA, no cartão SALEIA, clique em Conectar e copie o endereço e o segredo, que aparecem uma única vez, para a configuração da SALEIA.",
      "Use Gerar novo segredo para trocar o segredo e Desconectar para parar de receber reuniões.",
    ],
    example: "O administrador cadastra a chave Anthropic do cliente e o IA SDR passa a responder.",
    results: "IA SDR e Consultor Digital passam a funcionar; a SALEIA passa a enviar as reuniões analisadas.",
    faq: [
      {
        question: "Qual chave usar?",
        answer: "IA SDR e Consultor Digital usam a chave Anthropic (começa com sk-ant-).",
      },
    ],
    commonErrors: [
      {
        problem: "A SALEIA parou de enviar depois de um novo segredo.",
        solution: "O segredo antigo deixa de valer na hora. Atualize a configuração da SALEIA com o novo.",
      },
    ],
    limitations: ["Chaves de outros provedores (por exemplo, Groq) não são aceitas pelo IA SDR."],
    video: pendingVideo("Integrações"),
  },
  {
    slug: "auditoria",
    title: "Auditoria",
    group: "Administração",
    audience: ADMIN,
    path: "/configuracoes/auditoria",
    access: "Menu › Configurações › aba Auditoria",
    objective: "Consultar quem fez cada operação sensível no cliente e quando.",
    whenToUse: "Para entender uma mudança inesperada ou conferir alterações de acesso.",
    steps: [
      "Abra Configurações, aba Auditoria.",
      "Filtre por ação e por pessoa, se quiser.",
      "Role a lista (mais recente primeiro) e use Ver mais antigas para continuar.",
    ],
    example: "O administrador descobre quem trocou o dono de uma negociação na semana passada.",
    results: "Cada registro mostra a ação, quem fez e quando, sem senhas, links ou chaves.",
    faq: [
      {
        question: "O que é registrado?",
        answer:
          "Convites, papéis, equipes, remoções, metas, funis, edições de negociação, empresa e contato, decisões da SALEIA, fechamento do dia e configurações.",
      },
    ],
    commonErrors: [
      {
        problem: "Não encontro uma atividade criada.",
        solution: "Criar, editar e remover atividades não entram na auditoria.",
      },
    ],
    limitations: ["Não há exportação nem filtro por período.", "Tentativas negadas não são registradas."],
    video: pendingVideo("Consultando a auditoria"),
  },
  {
    slug: "busca-notificacoes-tema",
    title: "Busca, notificações e tema",
    group: "Rotina comercial",
    audience: ALL,
    path: "/meu-dia",
    access: "Cabeçalho, no topo de todas as telas",
    objective: "Encontrar qualquer registro rápido, ver pendências e escolher entre tema escuro e claro.",
    whenToUse: "A qualquer momento, em qualquer tela.",
    steps: [
      "Clique em Buscar... no topo ou tecle Ctrl+K (Cmd+K no Mac) ou /. Digite 2 letras ou mais e use as setas e Enter.",
      "Clique no sino para ver as pendências: atividades atrasadas, tarefas de plano atrasadas, fechamentos vencidos, negociações esfriando e leads qualificados.",
      "Clique no sol (ou na lua) para alternar entre o tema claro e o escuro.",
    ],
    example: "No meio de uma ligação, o vendedor tecla Ctrl+K, digita o nome da empresa e abre a negociação.",
    results: "As notificações somem sozinhas quando a pendência é resolvida; o tema fica salvo no navegador.",
    faq: [
      {
        question: "A busca acha tudo?",
        answer: "Negociações, empresas, contatos e planos do cliente ativo. O vendedor encontra só as próprias negociações.",
      },
    ],
    commonErrors: [
      {
        problem: "A busca não encontra uma palavra com acento.",
        solution: "Os acentos precisam coincidir: digite como foi cadastrado.",
      },
    ],
    limitations: ["Notificações não têm “marcar como lida”."],
    video: pendingVideo("Atalhos do cabeçalho"),
  },
]

export function findArticle(slug: string | undefined): ManualArticle | undefined {
  return MANUAL_ARTICLES.find((article) => article.slug === slug)
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

/** Busca sem acento nem maiusculas: todas as palavras precisam aparecer. */
export function searchArticles(query: string, articles: ManualArticle[] = MANUAL_ARTICLES): ManualArticle[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return articles
  return articles.filter((article) => {
    const haystack = normalize(
      [
        article.title,
        article.group,
        article.objective,
        article.whenToUse,
        ...article.steps,
        ...article.faq.map((item) => item.question),
      ].join(" ")
    )
    return words.every((word) => haystack.includes(word))
  })
}
