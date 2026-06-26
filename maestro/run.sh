#!/usr/bin/env bash
# Harness de regressão Maestro — app nativo de staff contra o Supabase LOCAL.
# Uso: bash maestro/run.sh            (reset do banco + bateria completa)
#      bash maestro/run.sh --no-reset (sem db:reset; mais rápido)
set -uo pipefail

APP="$HOME/Developer/getorderapp"
WEB="$HOME/Developer/orderapp"
SIM_UDID="218281A1-2F13-4EF9-9955-CFEC526D3937"   # iPhone 16e
APPID="com.optmore.getorder.staff"
RESET=1; [ "${1:-}" = "--no-reset" ] && RESET=0

echo "▸ 1/6 .env aponta para o Supabase LOCAL?"
grep -q 'EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321' "$APP/.env" \
  || { echo "  ✗ .env NÃO está em local (127.0.0.1:54321). Ajuste antes de testar."; exit 1; }
echo "  ✓ local"

echo "▸ 2/6 Supabase local no ar?"
docker ps --format '{{.Names}}' | grep -q supabase_db_getorder \
  || { echo "  subindo..."; (cd "$WEB" && npm run db:start); }
echo "  ✓"

if [ "$RESET" = 1 ]; then
  echo "▸ 3/6 db:reset + senhas de teste (determinístico)"
  ( cd "$WEB" && npm run db:reset )
  docker exec supabase_db_getorder psql -U postgres -d postgres -c \
    "update auth.users set encrypted_password = crypt('teste1234', gen_salt('bf')) where email in ('637@admin.com','637@cozinha.com','637@garcom.com');"
else
  echo "▸ 3/6 (--no-reset) garantindo só as senhas de teste"
  docker exec supabase_db_getorder psql -U postgres -d postgres -c \
    "update auth.users set encrypted_password = crypt('teste1234', gen_salt('bf')) where email in ('637@admin.com','637@cozinha.com','637@garcom.com');"
fi

echo "▸ 4/6 simulador + app instalado"
xcrun simctl boot "$SIM_UDID" >/dev/null 2>&1 || true   # no-op se já booted
open -a Simulator >/dev/null 2>&1 || true
if xcrun simctl listapps "$SIM_UDID" 2>/dev/null | grep -q "$APPID"; then
  echo "  ✓ instalado"
else
  echo "  ⚠️ checagem de install inconclusiva — seguindo (o maestro acusa claramente se faltar)."
  echo "     Se falhar, builde: cd $APP && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios --configuration Release --device $SIM_UDID"
fi

echo "▸ 5/6 (build RELEASE → JS embutido; não precisa de Metro)"

echo "▸ 6/6 Maestro"
WEB_UP=no; curl -s -o /dev/null --max-time 2 http://localhost:3000 2>/dev/null && WEB_UP=yes || true
cd "$APP"
if [ "$WEB_UP" = yes ]; then
  echo "  web local :3000 no ar → inclui o flow de Equipe"
  maestro test maestro/flows
else
  echo "  ⚠️ web local :3000 fora do ar → pulando 10-admin-equipe (needs-web)"
  maestro test maestro/flows --exclude-tags=needs-web
fi
