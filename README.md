# SalesOS

Plataforma operacional de crescimento comercial: diagnóstico, CRM, metas, indicadores, plano de ação e IA em um só fluxo, com várias empresas-cliente por consultor.

Produção: https://saleos.tech

## Onde está cada coisa

| Para | Leia |
|---|---|
| Usar o sistema | [docs/GUIA_DE_USO.md](docs/GUIA_DE_USO.md) |
| Rodar localmente e conhecer o código | [apps/web/README.md](apps/web/README.md) |
| Estado atual e pendências | [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) |
| Próximas tarefas e detalhe das concluídas | [docs/TASKS.md](docs/TASKS.md) |
| Arquitetura e decisões técnicas | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Regras de cada funcionalidade | [docs/SPEC.md](docs/SPEC.md) |
| Publicar, backups e restauração | [docs/DEPLOY.md](docs/DEPLOY.md) |
| Auditoria do Prompt Mestre V2 | [docs/AUDITORIA_V2.md](docs/AUDITORIA_V2.md) |
| Histórico de versões | [CHANGELOG.md](CHANGELOG.md) |
| Regras para o agente de desenvolvimento | [CLAUDE.md](CLAUDE.md) |

## Estrutura

```
apps/web/            Next.js 16 (telas e API), Prisma, testes
deploy/              Docker Compose, nginx e backup da produção
docs/                Documentação
.github/workflows/   CI: lint, tipos, testes e build a cada push
```
