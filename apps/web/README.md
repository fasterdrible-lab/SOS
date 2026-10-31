# SalesOS — aplicação web

**SalesOS** é uma plataforma operacional de crescimento comercial — não é "mais um CRM".

A ideia central: a maioria das empresas não tem um problema de ferramenta, tem um problema de **processo comercial mal estruturado**. O SalesOS conecta diagnóstico, CRM, metas, indicadores e plano de ação em um único fluxo, para que uma operação comercial saia do "achismo" e passe a ser gerenciada com dados.

> **North Star:** um consultor comercial consegue gerenciar 5x mais clientes sem aumentar a carga operacional.

O uso de cada tela, para quem opera o sistema, está em [`docs/GUIA_DE_USO.md`](../../docs/GUIA_DE_USO.md).

## O que a aplicação faz hoje

```
Diagnóstico → Score de Maturidade → Gargalos e Recomendações
   → Oportunidade no CRM → Negociações → Meu Dia e Dashboard → Plano de Ação
```

| Tela | Rota | Resumo |
|---|---|---|
| Meu Dia | `/meu-dia` | Página inicial: meta do mês, ideal de hoje, projeção, conversão, ticket, vendas de hoje e pendências (propostas, negociações esfriando, fechamentos vencidos, tarefas, leads quentes). Metas mensais da equipe e por vendedor |
| Dashboard | `/dashboard` | Pipeline total, leads ativos, oportunidades abertas e conversão, com variação mensal |
| Negociações | `/pipeline` | Board por etapa. Perda exige motivo; reabrir exige gestor; toda mudança vai para o histórico |
| Empresas e Contatos | `/empresas`, `/contatos` | Cadastro básico do CRM |
| Diagnóstico | `/diagnostico` | Wizard, nota de maturidade (0–100), gargalos e recomendações; gera oportunidade e plano de ação |
| Plano de Ação | `/planos` | Planos e tarefas com status |
| IA SDR | `/sdr`, widget público `/sdr/[organizationId]` | Conversa com o lead, classifica e, se quente, cria lead e oportunidade |
| Consultor Digital | `/consultor` | Chat com o diagnóstico e os KPIs como contexto |
| Meus Clientes | `/clientes` | Carteira do consultor: métricas por cliente, troca de cliente ativo e criação de clientes |
| Configurações | `/configuracoes` | Chaves de IA por cliente, criptografadas |

As respostas reais da IA ainda não foram validadas com uma chave Anthropic válida.

## Segurança e regras

- **Multiempresa:** todo dado pertence a uma `Organization`; toda consulta filtra pela organização ativa da sessão.
- **Papéis:** administrador (`OWNER`, `ADMIN`, `CONSULTANT`), gestor (`MANAGER`) e vendedor (`MEMBER`). A matriz está em `lib/authz/permissions.ts` e é verificada no backend (403). O vendedor vê apenas as próprias oportunidades.
- **Sessão:** vínculo e papel são relidos do banco a cada requisição; remover um membro corta o acesso na hora.
- **Auditoria:** chaves de IA, criação de cliente, troca de cliente e metas ficam em `AuditLog`; mudanças de etapa em `OpportunityStageHistory`.
- **Erros da API:** sempre `{ error, code, fields? }`; erro inesperado vira 500 em JSON e uma linha de log sem segredos.
- **Datas:** "hoje" e "este mês" no fuso de Brasília, embora o servidor rode em UTC.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript |
| Estilização | Tailwind CSS v4 + Shadcn UI (base-ui) |
| Banco | PostgreSQL 16 |
| ORM | Prisma 7 (`prisma-client` + `@prisma/adapter-pg`) |
| Auth | NextAuth v5 (Auth.js) — Credentials (Google preparado, não configurado) |
| Validação | Zod |
| Testes | `node:test` + GitHub Actions |

## Estrutura do projeto

```
app/
  (auth)/login/            tela de login
  (app)/                   área autenticada: layout com sidebar e cabeçalho global
    meu-dia/               Meu Dia e diálogo de metas
    dashboard/, pipeline/, empresas/, contatos/, diagnostico/, planos/
    sdr/, consultor/, clientes/, configuracoes/
  sdr/[organizationId]/    widget público do IA SDR
  api/                     route handlers, todos envolvidos por withApiErrors
components/
  app-header.tsx           cabeçalho: título, cliente ativo, menu do usuário (Sair)
  app-sidebar.tsx          menu lateral filtrado pelo papel
  ui/                      componentes Shadcn
lib/
  auth.ts, auth.config.ts  sessão (JWT revalidado no banco) e proteção de rotas
  authz/                   papéis, permissões e guarda das rotas
  api/                     respostas de erro padronizadas e log seguro
  audit/                   AuditLog
  opportunities/           regras de etapa, criação com histórico
  meu-dia/                 indicadores do Meu Dia e cálculo da meta
  time/                    calendário no fuso de Brasília e dias úteis
  navigation.ts            itens do menu e títulos do cabeçalho
  dashboard/, scoring/, diagnostico/, sdr/, organizations/, ai/, security/
  validations/             schemas Zod por entidade
prisma/                    schema e migrations
scripts/create-admin.mjs   cria usuário ou redefine senha
tests/                     *.test.mjs (unitários) e *.integration.mjs (HTTP)
```

## Como rodar localmente

```bash
npm install
cp .env.example .env        # preencha DATABASE_URL, AUTH_SECRET e INTEGRATION_ENCRYPTION_KEY
npx prisma migrate deploy
npm run create-admin        # com ADMIN_EMAIL e ADMIN_PASSWORD (12+ caracteres) no ambiente
npm run dev
```

Abra http://localhost:3000. Neste computador, o banco de desenvolvimento é o container `salesos-postgres` (porta 5437): `docker start salesos-postgres`.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run check` | Lint + tipos + testes unitários |
| `npm test` | Só os testes unitários |
| `npm run test:integration` | Testes HTTP contra o app em `localhost:3100` |
| `npm run create-admin` | Cria usuário ou redefine a senha |

### Testes de integração

Precisam do app compilado rodando em `localhost:3100` e do banco local com as migrations:

```bash
npm run build
AUTH_URL=http://localhost:3100 AUTH_TRUST_HOST=true npx next start -p 3100
npm run test:integration    # em outro terminal
```

Recusam rodar se o banco ou o app não forem locais. Cada suíte cria registros com prefixo próprio e os apaga ao final. O CI no GitHub roda tudo isso a cada push, em um PostgreSQL temporário.

## Produção

Publicado em https://saleos.tech, em Docker na VPS. Publicação, usuários, backups e restauração: [`docs/DEPLOY.md`](../../docs/DEPLOY.md).
