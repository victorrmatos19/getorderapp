#!/usr/bin/env bash
# Harness de regressão Maestro — app nativo de staff contra o Supabase LOCAL.
# Uso: bash maestro/run.sh [ios|android] [--no-reset]
#      ios       (default)  → simulador iPhone 16e
#      android              → emulador Pixel_7
#      --no-reset           → sem db:reset; mais rápido
# O .env DEVE apontar para um Supabase LOCAL acessível pelo simulador/emulador.
# CONFIG UNIFICADA: use o IP da LAN (ex.: http://192.168.100.238:54321) → vale p/ iOS, Android
# e device físico. (127.0.0.1 só funciona no iOS; o emulador Android não o alcança.)
set -uo pipefail

APP="$HOME/Developer/getorderapp"
WEB="$HOME/Developer/orderapp"
SIM_UDID="218281A1-2F13-4EF9-9955-CFEC526D3937"   # iPhone 16e
AVD="Pixel_7"
ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB="$ANDROID_HOME/platform-tools/adb"
EMU="$ANDROID_HOME/emulator/emulator"
APPID="com.optmore.getorder.staff"
MAESTRO="${MAESTRO:-$HOME/.maestro/bin/maestro}"

PLATFORM=ios; RESET=1
for a in "$@"; do
  case "$a" in
    android) PLATFORM=android ;;
    ios)     PLATFORM=ios ;;
    --no-reset) RESET=0 ;;
    *) echo "arg desconhecido: $a (use: ios|android|--no-reset)"; exit 2 ;;
  esac
done
echo "▸ plataforma: $PLATFORM"

echo "▸ 1/6 .env aponta para um Supabase LOCAL acessível?"
URL=$(grep -E '^EXPO_PUBLIC_SUPABASE_URL=' "$APP/.env" | cut -d= -f2- | tr -d '\r')
# Android emulador alcança 127.0.0.1 do app via `adb reverse` (setado no passo 4). LAN IP no .env
# também serve (emulador alcança a LAN por TCP), mas 127.0.0.1 é estável e o iOS usa o mesmo valor.
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 4 "$URL/auth/v1/health" 2>/dev/null)
[ "$code" = "200" ] || { echo "  ✗ Supabase local não respondeu em $URL (HTTP $code). Suba o Docker (npm run db:start no repo web)."; exit 1; }
echo "  ✓ $URL (HTTP 200)"

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

# Fixture determinístico p/ o badge "Conta pedida" (03-garcom): o seed não tem comanda aberta,
# então criamos uma comanda 'aberta' (1 item) com conta_solicitada_em setado na 1ª mesa ativa do 637.
echo "▸ 3b/6 fixture 'Conta pedida' (badge do garçom)"
docker exec -i supabase_db_getorder psql -U postgres -d postgres -q >/dev/null 2>&1 <<'SQL'
do $$
declare rid uuid; mid uuid; pid uuid; cid uuid;
begin
  select id into rid from restaurantes where slug='637-cerveja';
  select id into mid from mesas where restaurante_id=rid and ativo order by nome limit 1;
  select id into pid from produtos where restaurante_id=rid and disponivel limit 1;
  delete from comandas where mesa_id=mid and status='aberta';
  insert into comandas(restaurante_id,mesa_id,status,conta_solicitada_em)
    values(rid,mid,'aberta',now()) returning id into cid;
  insert into itens_pedido(restaurante_id,comanda_id,produto_id,quantidade,status,preco_base_snapshot)
    values(rid,cid,pid,1,'novo',(select preco from produtos where id=pid));
end$$;
SQL
echo "  ✓ comanda aberta com 'Conta pedida' semeada"

echo "▸ 4/6 dispositivo ($PLATFORM) + app instalado"
if [ "$PLATFORM" = android ]; then
  if ! "$ADB" shell true >/dev/null 2>&1; then
    echo "  subindo emulador $AVD..."
    nohup "$EMU" -avd "$AVD" -no-snapshot-load >/dev/null 2>&1 &
    for i in $(seq 1 48); do
      [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ] && break; sleep 5
    done
  fi
  DEVICE=$("$ADB" devices | awk '/\tdevice$/{print $1; exit}')
  echo "  ✓ android: $DEVICE"
  # O app aponta p/ 127.0.0.1; no emulador isso é o loopback do device → faz `adb reverse`
  # p/ encaminhar 127.0.0.1:54321 (Supabase) e :3000 (web API) para o host.
  "$ADB" -s "$DEVICE" reverse tcp:54321 tcp:54321 >/dev/null 2>&1 && echo "  ✓ adb reverse 54321"
  "$ADB" -s "$DEVICE" reverse tcp:3000 tcp:3000 >/dev/null 2>&1 && echo "  ✓ adb reverse 3000"
  if "$ADB" shell pm list packages 2>/dev/null | grep -q "$APPID"; then
    echo "  ✓ app instalado"
  else
    echo "  ⚠️ app NÃO instalado. Builde RELEASE: cd $APP && npx expo run:android --variant release"
  fi
else
  xcrun simctl boot "$SIM_UDID" >/dev/null 2>&1 || true   # no-op se já booted
  open -a Simulator >/dev/null 2>&1 || true
  DEVICE="$SIM_UDID"
  if xcrun simctl listapps "$SIM_UDID" 2>/dev/null | grep -q "$APPID"; then
    echo "  ✓ app instalado"
  else
    echo "  ⚠️ checagem de install inconclusiva — seguindo (o maestro acusa se faltar)."
    echo "     Se falhar, builde: cd $APP && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios --configuration Release --device $SIM_UDID"
  fi
fi

echo "▸ 5/6 (build RELEASE → JS embutido; não precisa de Metro)"

echo "▸ 6/6 Maestro ($PLATFORM → $DEVICE)"
WEB_UP=no; curl -s -o /dev/null --max-time 2 "$(grep -E '^EXPO_PUBLIC_WEB_API_URL=' "$APP/.env" | cut -d= -f2- | tr -d '\r')" 2>/dev/null && WEB_UP=yes || true
cd "$APP"
if [ "$WEB_UP" = yes ]; then
  echo "  web local no ar → inclui o flow de Equipe"
  "$MAESTRO" --device "$DEVICE" test maestro/flows
else
  echo "  ⚠️ web local fora do ar → pulando 10-admin-equipe (needs-web)"
  "$MAESTRO" --device "$DEVICE" test maestro/flows --exclude-tags=needs-web
fi
