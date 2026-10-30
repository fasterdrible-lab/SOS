#!/usr/bin/env bash
# Backup diario do banco de producao, instalado em /opt/salesos/backup.sh.
set -euo pipefail

BACKUP_DIR=/var/backups/salesos
RETENTION_DAYS=14

umask 077
mkdir -p "$BACKUP_DIR"
cd /opt/salesos

STAMP=$(date -u +%Y%m%d-%H%M%S)
TMP="$BACKUP_DIR/.salesos-$STAMP.tmp"
trap 'rm -f "$TMP"' EXIT

docker compose exec -T db pg_dump -U salesos -d salesos -Fc </dev/null >"$TMP"

# Um dump truncado ou invalido nao pode substituir os backups bons.
docker compose exec -T db pg_restore --list <"$TMP" >/dev/null

mv "$TMP" "$BACKUP_DIR/salesos-$STAMP.dump"

# As chaves de API no banco so podem ser lidas com a INTEGRATION_ENCRYPTION_KEY deste arquivo.
cp .env "$BACKUP_DIR/env.backup"

find "$BACKUP_DIR" -name 'salesos-*.dump' -mtime +"$RETENTION_DAYS" -delete

echo "Backup concluido: salesos-$STAMP.dump ($(du -h "$BACKUP_DIR/salesos-$STAMP.dump" | cut -f1))"
