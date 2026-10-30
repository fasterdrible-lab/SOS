#!/usr/bin/env bash
# Configura a copia externa dos backups no Backblaze B2, instalado em /opt/salesos.
# Pede a chave no terminal para ela nao passar por chat, historico ou repositorio.
set -euo pipefail

umask 077
cd /opt/salesos

read -rp 'keyID: ' KEY_ID
read -rsp 'applicationKey (nao aparece ao digitar): ' APPLICATION_KEY
echo

# Valida antes de gravar: uma chave errada nao pode sobrescrever a que esta funcionando.
if ! KEY_ID="$KEY_ID" APPLICATION_KEY="$APPLICATION_KEY" python3 - <<'PY'
import base64, os, urllib.error, urllib.request

credentials = f"{os.environ['KEY_ID']}:{os.environ['APPLICATION_KEY']}"
request = urllib.request.Request(
    "https://api.backblazeb2.com/b2api/v3/b2_authorize_account",
    headers={"Authorization": "Basic " + base64.b64encode(credentials.encode()).decode()},
)
try:
    urllib.request.urlopen(request, timeout=20)
except urllib.error.HTTPError as error:
    raise SystemExit(f"Backblaze recusou a chave (HTTP {error.code}).")
PY
then
  echo "Nada foi alterado. applicationKey recebida com ${#APPLICATION_KEY} caracteres."
  echo 'Use o keyID e a applicationKey da mesma chave e cole uma vez so.'
  exit 1
fi

cat >offsite.env <<ENV
RCLONE_CONFIG_B2_TYPE=b2
RCLONE_CONFIG_B2_ACCOUNT=$KEY_ID
RCLONE_CONFIG_B2_KEY=$APPLICATION_KEY
ENV

[ -f offsite.pass ] || openssl rand -hex 32 >offsite.pass

echo 'Enviando o primeiro backup...'
if ! systemctl start salesos-backup.service; then
  journalctl -u salesos-backup.service -n 8 --no-pager -o cat
  echo 'Falhou. Confira o keyID e a applicationKey e rode de novo.'
  exit 1
fi

journalctl -u salesos-backup.service -n 4 --no-pager -o cat | grep 'Copia externa'
echo
echo '=== GUARDE ESTA SENHA EM UM GERENCIADOR DE SENHAS, FORA DA VPS ==='
echo 'Sem ela, os backups do Backblaze nao podem ser abertos.'
cat offsite.pass
echo '================================================================='
