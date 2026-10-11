# SalesOS

**SalesOS** é uma plataforma operacional de crescimento comercial — não é "mais um CRM".

A ideia central: a maioria das empresas não tem um problema de ferramenta, tem um problema de **processo comercial mal estruturado**. O SalesOS conecta diagnóstico, CRM, indicadores e plano de ação em um único fluxo, para que uma operação comercial saia do "achismo" e passe a ser gerenciada com dados.

> **North Star:** um consultor comercial consegue gerenciar 5x mais clientes sem aumentar a carga operacional.

## O que a aplicação faz hoje

O produto é organizado como um **loop fechado**, e não como módulos isolados:

```
Diagnóstico Comercial → Score de Maturidade → Gargalos/Recomendações
        → Oportunidade no CRM → Pipeline de Vendas → Dashboard Executivo
        → Plano de Ação
```

### 1. Diagnóstico Comercial (`/diagnostico`)
Um wizard multi-step coleta os dados essenciais da operação de vendas de uma empresa: faturamento, número de vendedores, leads/mês, ticket médio, taxa de conversão, uso (ou não) de CRM, processo comercial e principais dores.

### 2. Score de Maturidade + Gargalos e Recomendações (`/diagnostico/[id]`)
A partir dos dados coletados, o backend calcula uma **nota de maturidade comercial (0–100)** com base em 4 pilares ponderados — uso de CRM, processo documentado, taxa de conversão e volume de leads por vendedor. O mesmo cálculo gera automaticamente uma lista de **gargalos** identificados e **recomendações** de correção. Nenhuma regra de negócio fica no frontend: tudo é calculado e validado no servidor.

### 3. CRM Inteligente (`/empresas`, `/contatos`, `/pipeline`)
CRM enxuto para operar o que o diagnóstico revelou:
- **Empresas** e **Contatos** — cadastro básico de contas e pessoas.
- **Pipeline** — board de oportunidades organizado por estágio (Prospecção → Qualificação → Proposta → Negociação → Fechado Ganho/Perdido), com criação de oportunidades e mudança de estágio.

Direto na página de resultado do diagnóstico existe um botão **"Criar oportunidade no CRM"**, que gera a empresa (se ainda não existir) e uma oportunidade inicial no pipeline — fechando o loop entre diagnóstico e execução.

### 4. Dashboard Executivo (`/dashboard`)
KPIs calculados em tempo real a partir dos dados reais da organização (não são valores fixos):
- Pipeline Total (soma das oportunidades abertas)
- Leads Ativos
- Oportunidades em aberto
- Taxa de Conversão

Cada indicador mostra a variação em relação ao mês anterior.

### 5. Plano de Ação (`/planos`)
Cadastro de planos de crescimento (título + objetivo) por organização, com tarefas associadas — a peça que transforma o diagnóstico em execução acompanhável. Direto no resultado do diagnóstico também existe um botão **"Gerar plano de ação"**, que cria automaticamente uma tarefa para cada recomendação.

### 6. Configurações (`/configuracoes`)
Cada organização configura suas próprias chaves de API para os provedores de IA (Anthropic e OpenAI). As chaves ficam criptografadas no banco e nunca são exibidas por completo — é a base pronta para os módulos de IA (IA SDR, Consultor Digital) que ainda serão construídos.

## Multiempresa (multi-tenant)

Toda a plataforma é multiempresa: um usuário pertence a uma `Organization`, e **todos os dados são sempre filtrados por `organizationId`** — tanto na leitura quanto na escrita. Autenticação via NextAuth v5 (Google e credenciais).

## Módulos planejados (ainda não implementados)

Segundo `docs/ARCHITECTURE.md`, os próximos módulos do produto são:
- **IA SDR** — qualificação automática de leads via IA.
- **Consultor Digital** — assistente de IA para o consultor acompanhar clientes.
- **Dashboard Consultoria** — visão do consultor sobre a carteira de clientes.
- **Academia Comercial** — conteúdo/treinamento.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript |
| Estilização | Tailwind CSS v4 + Shadcn UI (base-ui) |
| Banco | PostgreSQL |
| ORM | Prisma 7 (`prisma-client` + `@prisma/adapter-pg`) |
| Auth | NextAuth v5 (Auth.js) — Google + Credentials |
| Validação | Zod |

## Estrutura do projeto

```
app/
  (auth)/login/          -> tela de login
  (app)/                 -> área autenticada (sidebar + módulos)
    dashboard/            -> KPIs executivos
    diagnostico/           -> wizard + resultado (nota, gargalos, recomendações)
    empresas/, contatos/, pipeline/  -> CRM
    planos/                -> planos de ação
  api/                    -> route handlers (diagnósticos, empresas, contatos,
                              oportunidades, planos de ação, auth)
lib/
  auth.ts, auth.config.ts, db.ts   -> sessão, tenant e cliente Prisma
  validations/            -> schemas Zod compartilhados por entidade
  scoring/                -> engine de maturidade comercial + insights
  dashboard/              -> cálculo dos KPIs executivos
  diagnostico/            -> integração diagnóstico → CRM
prisma/schema.prisma      -> schema multiempresa (Organization, Lead, Company,
                              Contact, Opportunity, Diagnostic, ActionPlan...)
```

## Como rodar localmente

```bash
npm install

# copie e preencha as variáveis de ambiente
cp .env.example .env

# rode as migrations
npx prisma migrate dev

npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

- `npm run build` — build de produção
- `npm run lint` — lint do projeto

## Documentação do produto

O estado do produto, as regras de negócio e o histórico de decisões vivem em `docs/`, na raiz do repositório (não nesta pasta `apps/web`):

- `docs/CURRENT_STATE.md` — o que já foi entregue e o que falta.
- `docs/TASKS.md` — backlog e detalhamento de cada tarefa concluída.
- `docs/ARCHITECTURE.md` — arquitetura, módulos e decisões técnicas.
- `docs/SPEC.md` — especificação funcional de cada feature.
- `CHANGELOG.md` — histórico de versões.
