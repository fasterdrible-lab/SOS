# ARCHITECTURE.md — SalesOS

## Arquitetura Geral
Monorepo com Next.js (frontend + API) e PostgreSQL.
Multiempresa por tenant_id em todas as tabelas.

```
SalesOS
├── apps/web/          → Next.js 14 App Router
│   ├── app/           → Rotas e páginas
│   │   ├── (auth)/    → Login, cadastro
│   │   ├── (app)/     → Área autenticada
│   │   └── api/       → API Routes
│   ├── components/    → Componentes UI
│   ├── lib/           → Utilitários, auth, db client
│   └── hooks/         → React hooks
├── prisma/
│   ├── schema.prisma  → Schema do banco
│   └── migrations/    → Migrations
└── docs/              → Documentação
```

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Estilização | Tailwind CSS + Shadcn UI |
| Banco | PostgreSQL 15+ |
| ORM | Prisma 5 |
| Vetores | pgvector |
| Auth | NextAuth v5 (Auth.js) |
| IA | Anthropic Claude API |
| Deploy | Vercel (web) + Railway (PostgreSQL) |

## Estrutura de Módulos

```
Módulo 1 — Diagnóstico Comercial    → /app/(app)/diagnostico
Módulo 2 — CRM Inteligente          → /app/(app)/crm
Módulo 3 — IA SDR                   → /app/(app)/sdr
Módulo 4 — Consultor Digital        → /app/(app)/consultor
Módulo 5 — Plano de Ação            → /app/(app)/planos
Módulo 6 — Dashboard Executivo      → /app/(app)/dashboard
Módulo 7 — Dashboard Consultoria    → /app/(app)/clientes
Módulo 8 — Academia Comercial       → /app/(app)/academia
```

## Banco de Dados — Modelo Multiempresa

### Tenant Isolation
- Toda tabela possui `organization_id` (FK para `organizations`)
- Queries sempre filtradas por `organization_id` do usuário autenticado
- Row Level Security (RLS) no PostgreSQL (futuro)

### Entidades Principais

```
Organization (tenant)
  └── User (N:N via OrganizationMember)
  └── Lead
  └── Company
  └── Contact
  └── Opportunity
  └── Activity
  └── ActionPlan
  └── Diagnostic
  └── ApiIntegration (chave de API por provedor de IA, criptografada)
  └── SdrConversation (conversa do IA SDR com um lead, N:N via SdrMessage)
```

## Fluxos Principais

### Autenticação
```
Login → NextAuth → Session com {userId, organizationId, role}
→ Middleware valida session em todas rotas /app/*
```

### Multiempresa
```
User cria Organization → vira Admin
User convida membros → email → aceite → OrganizationMember
Todas queries: WHERE organization_id = session.organizationId
```

### IA SDR
```
Lead acessa widget → conversa com Claude → classificação automática
→ Oportunidade criada no CRM → consultor notificado
```

### Troca de Organização Ativa (Consultor multi-cliente — Módulo 7)
```
Consultor pertence a N organizações (OrganizationMember, N:N)
→ sessão mantém uma única organização ativa (session.user.organizationId)
→ consultor troca a organização ativa em "Meus Clientes" (/clientes)
→ todas as rotas de (app)/** continuam filtrando por session.user.organizationId, sem alteração
```

## Decisões Técnicas

| Decisão | Motivo |
|---------|--------|
| Next.js API routes (não NestJS) | Menos complexidade no MVP, mesmo stack |
| NextAuth v5 | Suporte nativo a App Router, flexível |
| Prisma | DX superior, type-safe, migrations simples |
| Railway para PostgreSQL | Deploy fácil com pgvector |
| Tailwind + Shadcn | Velocidade de desenvolvimento, customizável |
