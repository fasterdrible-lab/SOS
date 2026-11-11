# DEPLOY.md — Operação de produção do SalesOS

Guia para quem opera o ambiente de produção. Nenhum segredo fica neste repositório.

## Visão geral

| Item | Valor |
|---|---|
| URL | https://saleos.tech |
| Servidor | VPS `200.141.20.162`, Ubuntu, compartilhada com a produção do SALE-IA |
| Acesso | `ssh -i ~/.ssh/saleia_vps root@200.141.20.162` |
| Pasta | `/opt/salesos` |
| App | Container `salesos-web-1`, em `127.0.0.1:3010`. Versão em uso: `WEB_TAG` em `/opt/salesos/.env` (ver `docs/CURRENT_STATE.md`) |
| Banco | Container `salesos-db-1`, PostgreSQL 16, sem porta publicada (volume `salesos_db_data`) |
| Proxy e HTTPS | nginx (`/etc/nginx/sites-available/saleos`) e certbot, com renovação automática |
| DNS | Hostinger: `A @` → `200.141.20.162` e `CNAME www` → `saleos.tech` |
| Backups | `/var/backups/salesos` e bucket `SALEOS` no Backblaze B2 |

**Cuidado com o SALE-IA:** ele usa o mesmo nginx e a mesma máquina (`/opt/saleia`, `api.saleia.app.br`). Sempre rode `nginx -t` antes de recarregar, use `reload` em vez de `restart` e não gere o build na VPS.

## Arquivos

| No repositório | Na VPS |
|---|---|
| `apps/web/Dockerfile` | Imagem `salesos-web:<versão>` |
| `deploy/docker-compose.yml` | `/opt/salesos/docker-compose.yml` |
| `deploy/nginx-saleos.conf` | `/etc/nginx/sites-available/saleos` (a cópia da VPS tem também as linhas do certbot; edite-a diretamente) |
| `deploy/backup.sh`, `deploy/setup-offsite.sh` | `/opt/salesos/` |
| `deploy/salesos-backup.service`, `.timer` | `/etc/systemd/system/` |

Existem só na VPS, com permissão 600: `.env` (segredos do app), `offsite.env` (chave do Backblaze) e `offsite.pass` (senha de criptografia dos backups). `AUTH_URL` e `AUTH_TRUST_HOST` ficam no `.env`.

## Publicar uma nova versão

Publicar exige autorização explícita do usuário a cada vez.

### Antes

1. O CI do commit está verde no GitHub (Actions): lint, tipos, testes unitários, build e testes de integração.
2. Veja se há migration nova em `apps/web/prisma/migrations` e se ela altera dados existentes.
3. Faça um backup na VPS e confira o resultado:

```bash
systemctl start salesos-backup.service
journalctl -u salesos-backup.service -n 4 --no-pager    # "Backup concluido" e "Copia externa concluida"
```

4. Confira se o SALE-IA está sem reunião: `curl -s -A Mozilla https://api.saleia.app.br/health` deve trazer `"reunioes_ativas":0`. Carregar a imagem pesa na VPS compartilhada; com reunião ativa, espere terminar.

### Gerar e enviar a imagem

Na máquina de desenvolvimento, com `<N>` igual à versão atual (`WEB_TAG` em `/opt/salesos/.env`) mais 1:

```bash
cd apps/web
docker build -t salesos-web:<N> .
docker save salesos-web:<N> | gzip -1 | ssh -i ~/.ssh/saleia_vps root@200.141.20.162 'gunzip | docker load'
```

Se o build parar com `error reading from server: EOF` (em "Running TypeScript" ou "Collecting page data"), o Docker Desktop ficou sem memória e reiniciou: desligue os containers que não estão em uso e rode o build de novo. Use `set -o pipefail` se filtrar a saída com `tail`, senão a falha passa despercebida.

O envio pode levar cerca de 10 minutos. Na VPS:

```bash
cd /opt/salesos
sed -i 's/^WEB_TAG=.*/WEB_TAG=<N>/' .env
# Somente se houver migration nova:
docker compose run --rm --no-deps web npx prisma migrate deploy </dev/null
docker compose up -d web
# Mantenha <N-1> para reverter; remova a anterior a ela:
docker rmi salesos-web:<N-2>
```

### Depois

- `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3010/login` responde 200 e `docker compose logs web --tail 5` mostra `Ready`.
- `https://saleos.tech/meu-dia` sem sessão redireciona para o login, e `https://www.saleos.tech` para o domínio principal.
- O SALE-IA continua respondendo: `curl -s -A Mozilla https://api.saleia.app.br/health`.
- Registre a versão publicada em `docs/CURRENT_STATE.md`, `docs/TASKS.md` e `CHANGELOG.md`.

Em scripts, use `</dev/null` nos comandos `docker compose run` e `exec`: sem isso, eles consomem a entrada padrão e os comandos seguintes não rodam.

**Reverter:** volte `WEB_TAG` para `<N-1>` e rode `docker compose up -d web`. Isso basta quando as migrations publicadas só acrescentam estruturas. A partir da `20261103000000_pipelines` (V2-4.1), que converte as etapas em funis e remove o enum antigo, uma imagem anterior a ela não roda no banco novo: pare o app, restaure o backup feito antes da publicação (ver "Restaurar na mesma VPS") e então volte `WEB_TAG`. O que foi gravado depois da publicação se perde.

## Usuários

Desde a V.1.29.0 (V2-9.1), o administrador de cada cliente faz pelo app, em **Configurações > Usuários**: convida por link (7 dias), troca o papel, remove e gera link de nova senha (24 h) para quem esqueceu. Cada link aparece uma vez para quem gerou e é enviado por ele (WhatsApp ou e-mail); o app não envia e-mail. As operações ficam em **Configurações > Auditoria**.

O terminal ainda é necessário para: criar o primeiro administrador de um banco novo; redefinir a senha de quem participa de mais de um cliente (a tela recusa, para que o administrador de um não entre na conta usada no outro); e redefinir a senha do único administrador de um cliente.

O app não tem cadastro público. Para criar um usuário ou redefinir a senha pelo terminal, rode no terminal local, escolhendo letras e números, com pelo menos 12 caracteres:

```powershell
ssh -t -i ~/.ssh/saleia_vps root@200.141.20.162 'cd /opt/salesos; read -rp Senha: P; docker compose run --rm --no-deps -e ADMIN_EMAIL=email@exemplo.com -e ADMIN_PASSWORD=$P web node scripts/create-admin.mjs'
```

O script cria o usuário com o nome "Admin" e sem vínculo com nenhum cliente. Sem vínculo, ele pode criar o próprio cliente em `/clientes` e vira administrador dele; até lá, o app mostra um aviso e recusa cadastros.

### Colocar um usuário em um cliente, com papel

Prefira o convite pela tela. O caminho por SQL fica para quando não houver administrador no cliente: depois de criar o usuário com o comando acima, abra o banco:

```powershell
ssh -t -i ~/.ssh/saleia_vps root@200.141.20.162 'cd /opt/salesos; docker compose exec db psql -U salesos -d salesos'
```

```sql
-- Clientes existentes
SELECT name, slug FROM organizations ORDER BY name;

-- Nome exibido no cabecalho
UPDATE users SET name = 'Nome Sobrenome' WHERE email = 'email@exemplo.com';

-- Vincula ou troca o papel: CONSULTANT ou ADMIN (administrador), MANAGER (gestor), MEMBER (vendedor)
INSERT INTO organization_members (id, "organizationId", "userId", role)
SELECT gen_random_uuid()::text, o.id, u.id, 'MEMBER'
FROM organizations o, users u
WHERE o.slug = 'slug-do-cliente' AND u.email = 'email@exemplo.com'
ON CONFLICT ("organizationId", "userId") DO UPDATE SET role = EXCLUDED.role;

-- Remove o acesso a um cliente
DELETE FROM organization_members m USING organizations o, users u
WHERE m."organizationId" = o.id AND m."userId" = u.id
  AND o.slug = 'slug-do-cliente' AND u.email = 'email@exemplo.com';
```

A sessão relê vínculo e papel do banco a cada requisição: as mudanças valem na hora, sem novo login. O que cada papel pode fazer está em `docs/GUIA_DE_USO.md`.

## Backups

Todo dia às 03:30 (Brasília), `salesos-backup.timer` gera o dump do banco, valida o arquivo e guarda 14 dias em `/var/backups/salesos`, com uma cópia do `.env`. Depois, criptografa dump e `.env` com GPG e envia ao bucket `SALEOS`.

```bash
systemctl start salesos-backup.service                   # backup manual
journalctl -u salesos-backup.service -n 20 --no-pager    # resultado
systemctl list-timers salesos-backup.timer               # próxima execução
```

**Não há alerta de falha.** Confira o log e o painel do Backblaze periodicamente.

**Trocar a chave do Backblaze:** crie a nova chave restrita ao bucket e rode o comando abaixo no terminal local. O script valida a chave antes de gravar e mostra a senha de criptografia, que não muda.

```powershell
ssh -t -i ~/.ssh/saleia_vps root@200.141.20.162 /opt/salesos/setup-offsite.sh
```

### Restaurar na mesma VPS

Substitui os dados atuais:

```bash
cd /opt/salesos
docker compose stop web
docker compose exec -T db pg_restore -U salesos -d salesos --clean --if-exists --no-owner < /var/backups/salesos/<arquivo>.dump
docker compose start web
```

### Recuperar em um servidor novo

Requer a senha de criptografia guardada fora da VPS.

1. Baixe do bucket o arquivo `salesos-*.tar.gz.gpg` mais recente.
2. Abra com `gpg -d <arquivo>.tar.gz.gpg | tar -xz`. Saem o `.dump` e o `env.backup`.
3. Instale Docker e nginx, copie os arquivos de `deploy/` e use `env.backup` como `/opt/salesos/.env`. Ele mantém a `INTEGRATION_ENCRYPTION_KEY`, sem a qual as chaves de API salvas no banco não podem ser lidas.
4. Publique a imagem, suba o banco com `docker compose up -d db`, restaure o dump e suba o app.
5. Aponte o DNS para o novo IP e emita o certificado com certbot.

Esse caminho completo ainda não foi executado. A restauração de um arquivo criptografado foi testada, mas com destino local.

## Integração SALEIA

O SALE-IA (mesma VPS, `/opt/saleia`) envia cada reunião analisada para `POST /api/integrations/saleia/{organizationId}/events`. Contrato em `docs/INTEGRACAO_SALEIA.md`.

| Lado | Onde fica |
|---|---|
| SalesOS | Tabela `saleia_integrations` (uma por organização; segredo criptografado com `INTEGRATION_ENCRYPTION_KEY`). Hoje: organização NEX-ALS |
| SALE-IA | `SALESOS_EVENTS_URL` e `SALESOS_EVENTS_SECRET` em `/opt/saleia/.env`; fila em `sessoes.salesos_status`, `salesos_tentativas`, `salesos_em`, `salesos_detalhe` |

**Trocar o segredo.** Em Configurações → SALEIA → **Gerar novo segredo** o anterior deixa de valer na hora, então atualize o `.env` do SALE-IA logo em seguida e reinicie o SALE-IA (só com `reunioes_ativas = 0`; regras de deploy no `CLAUDE.md` do SALE-IA). Para não copiar o segredo pelo chat, decifre-o na própria VPS: leia `"secretEncrypted"` de `saleia_integrations`, decifre dentro do container `web` (AES-256-GCM, chave SHA-256 de `INTEGRATION_ENCRYPTION_KEY`, formato `iv.tag.dados` em base64), confira que termina com `"secretHint"` e grave no `.env` do SALE-IA. Nunca carregue o `.env` do SALE-IA com `source` ou `.`: há linhas que não são shell, e o erro exibe valores.

**Conferir o envio**, no SALE-IA:

```bash
journalctl -u saleia --since today | grep '\[SalesOS\]'
```

Cada envio registra `ok`, `erro` (rede, 5xx ou 429; reenvia em 5 min, 30 min, 2 h e 6 h) ou `recusado` (400 ou 401; não reenvia). Sessões existentes antes da V.1.4.196 ficaram `anterior` e não são enviadas. O envio sai do relatório automático do SALE-IA: sessão sem relatório `ok` nunca é enviada.

**Testar a assinatura sem gravar dados:** enviar um corpo assinado com `"version": 2`. Resposta 400 = assinatura aceita; 401 = segredo ou relógio errado.

## Diagnóstico

```bash
cd /opt/salesos
docker compose ps
docker compose logs web --tail 50
docker compose logs web --since 24h | grep '"level":"error"'   # erros registrados pela API
nginx -t
tail -50 /var/log/nginx/access.log
certbot certificates
```

| Sintoma | Causa provável |
|---|---|
| "Usuario sem permissao" ao cadastrar | Sessão sem cliente ativo: crie ou acesse um em `/clientes` |
| 429 no widget do IA SDR | Limite de 30 mensagens por conversa, 300 por organização em 24h, ou 12 requisições por minuto por IP (rajada de 10) |
| 502 no IA SDR ou no Consultor | A Anthropic recusou a chamada: o log mostra o status (`Anthropic API respondeu 401`); confira a chave em `/configuracoes` |
| "Acesso restrito" ou 403 | O papel do usuário não tem a permissão (ver `docs/GUIA_DE_USO.md`) |
| Erro 500 com `code: INTERNAL` | Procure a linha com `"level":"error"` no log: ela traz a rota (`scope`) e o tipo do erro |
| Nenhuma reunião chega da SALEIA | Integração desconectada ou segredo trocado (o SALE-IA registra `recusado` com `HTTP 401`); `SALESOS_EVENTS_*` ausentes no `.env` do SALE-IA; ou o relatório automático do SALE-IA não ficou `ok` (na VPS nova, desde 21/10/2026: erro de fuso do `sqlmodel` 0.0.48, corrigido na V.1.4.198, e `relatorio.dados_json` em `VARCHAR(255)`, corrigido na V.1.4.199). No SALE-IA: `select relatorio_status, count(*) from sessoes group by 1` e `select count(*) from relatorio` |
| Reunião da SALEIA "sem empresa" | O nome da empresa dito na reunião não coincide com nenhuma empresa cadastrada; o SALE-IA não envia e-mails dos participantes |
