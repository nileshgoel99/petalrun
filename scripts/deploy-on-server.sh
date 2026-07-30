#!/usr/bin/env bash
# Run on the production server after code is in /var/www/petalrun
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/var/www/petalrun}"
VITE_API_URL="${VITE_API_URL:-/api}"

cd "$DEPLOY_PATH"

if [[ -d .git ]]; then
  echo "==> git pull"
  git pull --ff-only || true
fi

echo "==> Python venv + deps"
python3 -m venv venv
# shellcheck disable=SC1091
source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt

export DJANGO_DEBUG=0
export DJANGO_ALLOWED_HOSTS="petalrun.fabriflow.in,localhost,127.0.0.1"
export DJANGO_CSRF_TRUSTED_ORIGINS="https://petalrun.fabriflow.in"

echo "==> migrate + seed + static"
python manage.py migrate --noinput
python manage.py ensure_hidden_admin
python manage.py seed_data || true
python manage.py collectstatic --noinput

echo "==> frontend build"
cd "$DEPLOY_PATH/frontend"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"
if [[ -f package-lock.json ]]; then
  npm ci || npm install
else
  npm install
fi
VITE_API_URL="$VITE_API_URL" npm run build

echo "==> restart petalrun + reload nginx"
systemctl restart petalrun
systemctl reload nginx

echo "==> OK — petalrun deployed"
