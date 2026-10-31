# CLAUDE.md — SalesOS (Sales Operating System)

## Visão do Produto
Plataforma operacional de crescimento comercial (não é um CRM).
Conecta CRM + IA + Consultoria + Processos + Indicadores + Automação em uma única plataforma.
**Missão:** Transformar conhecimento de consultoria em software escalável.
**North Star:** Um consultor gerencia 5x mais clientes sem aumentar carga operacional.

## Stack Oficial
- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Shadcn UI
- **Backend:** Next.js API Routes (Route Handlers)
- **Banco:** PostgreSQL + Prisma ORM + pgvector
- **Auth:** NextAuth v5 (Auth.js)
- **IA:** Anthropic Claude + OpenAI
- **Infra:** Docker + nginx em VPS própria (ver [docs/DEPLOY.md](./docs/DEPLOY.md))

## Estrutura do Projeto
```
/apps/web/          → Next.js app (frontend + API routes)
/apps/web/prisma/   → Schema e migrations
/deploy/            → Arquivos de produção (compose, nginx, backup)
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
- Variáveis de ambiente: `apps/web/.env` (nunca commitar)
- Produção: `https://saleos.tech`; publicação, backups e restauração em [docs/DEPLOY.md](./docs/DEPLOY.md)
- A VPS é compartilhada com o SALE-IA: nunca interromper o serviço dele nem gerar o build lá

## Versão Atual
**V.1.15.6** — FASE 10: publicado em produção (detalhes em [docs/CURRENT_STATE.md](./docs/CURRENT_STATE.md))

## Admin do Sistema
- Email: fasterdrible@gmail.com

## Referência
- Ver [CHANGELOG.md](./CHANGELOG.md) para histórico completo
- Ver [docs/CURRENT_STATE.md](./docs/CURRENT_STATE.md) para estado atual
- Ver [docs/TASKS.md](./docs/TASKS.md) para próximas tarefas
