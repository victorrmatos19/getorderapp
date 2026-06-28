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
