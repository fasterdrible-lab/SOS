# CLAUDE.md — SalesOS (Sales Operating System)

## Visão do Produto
Plataforma operacional de crescimento comercial (não é um CRM).
Conecta CRM + IA + Consultoria + Processos + Indicadores + Automação em uma única plataforma.
**Missão:** Transformar conhecimento de consultoria em software escalável.
**North Star:** Um consultor gerencia 5x mais clientes sem aumentar carga operacional.

## Stack Oficial
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI
- **Backend:** Next.js API Routes (Route Handlers)
- **Banco:** PostgreSQL + Prisma ORM + pgvector
- **Auth:** NextAuth v5 (Auth.js)
- **IA:** Anthropic Claude + OpenAI
- **Infra:** Docker + Vercel/Railway

## Estrutura do Projeto
```
/apps/web/          → Next.js app (frontend + API routes)
/prisma/            → Schema e migrations
/docs/              → Documentação do projeto
CLAUDE.md           → Este arquivo
CHANGELOG.md        → Histórico de versões
```

## Regras do Projeto
1. Executar apenas a próxima tarefa listada em TASKS.md
2. Não modificar arquivos fora do escopo da tarefa
3. Sempre atualizar CURRENT_STATE.md, TASKS.md e CHANGELOG.md ao concluir
4. Design: dark theme #1E1B3A + gold #D4A64F (referências: Linear, Stripe, Vercel)
5. Toda feature deve: aumentar receita OU reduzir trabalho manual OU melhorar previsibilidade

## Regras de Deploy
- Ambiente de dev: `npm run dev` na pasta `apps/web`
- Build: `npm run build`
- DB migrations: `npx prisma migrate dev`
- Variáveis de ambiente: `.env.local` (nunca commitar)

## Versão Atual
**V.0.1.0** — FASE 1: Estrutura documental e scaffold do projeto

## Admin do Sistema
- Email: fasterdrible@gmail.com

## Referência
- Ver [CHANGELOG.md](./CHANGELOG.md) para histórico completo
- Ver [docs/CURRENT_STATE.md](./docs/CURRENT_STATE.md) para estado atual
- Ver [docs/TASKS.md](./docs/TASKS.md) para próximas tarefas
