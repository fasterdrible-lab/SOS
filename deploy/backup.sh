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

# Copia externa: criptografada aqui, pois leva os dados e todos os segredos do .env.
if [ -f offsite.env ]; then
  set -a
  . ./offsite.env
  set +a

  ARCHIVE="$BACKUP_DIR/.salesos-$STAMP.tar.gz.gpg"
  trap 'rm -f "$TMP" "$ARCHIVE"' EXIT
  GPG=(gpg --batch --yes --pinentry-mode loopback --passphrase-file offsite.pass)

  tar -C "$BACKUP_DIR" -czf - "salesos-$STAMP.dump" env.backup |
    "${GPG[@]}" --symmetric --cipher-algo AES256 -o "$ARCHIVE"
  "${GPG[@]}" --decrypt "$ARCHIVE" 2>/dev/null | tar -tz >/dev/null

  rclone copyto --no-check-dest --no-traverse "$ARCHIVE" "b2:SALEOS/salesos-$STAMP.tar.gz.gpg"
  echo "Copia externa concluida: salesos-$STAMP.tar.gz.gpg"
fi
