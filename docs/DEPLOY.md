# DEPLOY.md — Operação de produção do SalesOS

Guia para quem opera o ambiente de produção. Nenhum segredo fica neste repositório.

## Visão geral

| Item | Valor |
|---|---|
| URL | https://saleos.tech |
| Servidor | VPS `200.141.20.162`, Ubuntu, compartilhada com a produção do SALE-IA |
| Acesso | `ssh -i ~/.ssh/saleia_vps root@200.141.20.162` |
| Pasta | `/opt/salesos` |
| App | Container `salesos-web-1`, em `127.0.0.1:3010` |
| Banco | Container `salesos-db-1`, PostgreSQL 16, sem porta publicada (volume `salesos_db_data`) |
| Proxy e HTTPS | nginx (`/etc/nginx/sites-available/saleos`) e certbot, com renovação automática |
| DNS | Hostinger: `A @` → `200.141.20.162` |
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

Na máquina de desenvolvimento, com `<N>` igual à versão atual (`WEB_TAG` em `/opt/salesos/.env`) mais 1:

```bash
cd apps/web
docker build -t salesos-web:<N> .
docker save salesos-web:<N> | gzip -1 | ssh -i ~/.ssh/saleia_vps root@200.141.20.162 'gunzip | docker load'
```

O envio pode levar cerca de 10 minutos. Na VPS:

```bash
cd /opt/salesos
sed -i 's/^WEB_TAG=.*/WEB_TAG=<N>/' .env
# Somente se houver migration nova:
docker compose run --rm --no-deps web npx prisma migrate deploy </dev/null
docker compose up -d web
docker rmi salesos-web:<N-1>
```

Em scripts, use `</dev/null` nos comandos `docker compose run` e `exec`: sem isso, eles consomem a entrada padrão e os comandos seguintes não rodam.

**Reverter:** mantenha a imagem anterior antes do `docker rmi`, volte `WEB_TAG` e rode `docker compose up -d web`. Se a versão tiver aplicado migration, confira a compatibilidade do banco antes.

## Usuários

O app não tem cadastro público. Para criar um usuário ou redefinir a senha, rode no terminal local, escolhendo letras e números, com pelo menos 12 caracteres:

```powershell
ssh -t -i ~/.ssh/saleia_vps root@200.141.20.162 'cd /opt/salesos; read -rp Senha: P; docker compose run --rm --no-deps -e ADMIN_EMAIL=email@exemplo.com -e ADMIN_PASSWORD=$P web node scripts/create-admin.mjs'
```

Um usuário novo começa sem organização. Ele precisa criar um cliente em `/clientes`; até lá, o app mostra um aviso e recusa cadastros.

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

## Diagnóstico

```bash
cd /opt/salesos
docker compose ps
docker compose logs web --tail 50
nginx -t
tail -50 /var/log/nginx/access.log
certbot certificates
```

| Sintoma | Causa provável |
|---|---|
| "Usuario sem permissao" ao cadastrar | Sessão sem cliente ativo: crie ou acesse um em `/clientes` |
| 429 no widget do IA SDR | Limite de 30 mensagens por conversa, 300 por organização em 24h, ou 12 requisições por minuto por IP (rajada de 10) |
| 502 no IA SDR ou no Consultor | A Anthropic recusou a chamada: confira a chave em `/configuracoes` |
| 404 em `/academia` | Módulo 8 ainda não construído |
