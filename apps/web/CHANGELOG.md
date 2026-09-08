# CHANGELOG — SalesOS

## [V.0.1.0] — 2026-05-29

### Fase 1 — Estrutura Documental + Projeto Base

**Documentação criada:**
- `CLAUDE.md` — visão, stack, regras e deploy
- `CHANGELOG.md`
- `docs/CURRENT_STATE.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`

**Scaffold Next.js 16 (Turbopack):**
- Next.js 16.2.6 com App Router, TypeScript, Tailwind CSS v4
- Shadcn UI (sidebar, card, badge, avatar, input, dialog, sheet, tooltip, table, etc.)
- Design system SalesOS: dark `#1E1B3A` + gold `#D4A64F`

**Backend / Banco:**
- Prisma 7 com `@prisma/adapter-pg` (PostgreSQL)
- Schema multiempresa completo: Organization, User, Lead, Company, Contact, Opportunity, Activity, Diagnostic, ActionPlan
- `prisma.config.ts` configurado com DATABASE_URL

**Autenticação:**
- NextAuth v5 (Auth.js) com JWT session
- Providers: Google OAuth + Credentials (email/senha com bcryptjs)
- Token enriched com `organizationId` e `role`
- `proxy.ts` (Next.js 16 convention) para proteção de rotas

**Layout e UI:**
- `app/(app)/layout.tsx` — área autenticada com sidebar
- `components/app-sidebar.tsx` — sidebar com navegação por módulos
- `app/(auth)/login/page.tsx` — tela de login com branding SalesOS
- `app/(app)/dashboard/page.tsx` — dashboard inicial com KPIs e CTA

**Arquivos criados/alterados:**
- `apps/web/` (projeto completo)
- `apps/web/prisma/schema.prisma`
- `apps/web/lib/auth.ts`, `lib/auth.config.ts`, `lib/db.ts`
- `apps/web/proxy.ts`
- `apps/web/app/globals.css` (tema SalesOS)
- `apps/web/.env.example`
