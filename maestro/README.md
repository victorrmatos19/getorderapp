# Testes de tela (Maestro) — app nativo de staff

Regressão automatizada de UI do **GetOrder Staff** (Expo/React Native), rodando no **simulador iOS**
contra o **Supabase LOCAL** (determinístico). Cobre os fluxos de **staff** das suites do
`orderapp/test/ROTEIRO.md` (o cliente `/mesa` e o super-admin são web-only → seguem no ROTEIRO de navegador).

## Pré-requisitos (uma vez)
1. **Supabase local** no ar (Docker), no repo web: `cd ~/Developer/orderapp && npm run db:start`.
2. **`.env`** do app apontando para local (`EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`).
3. **Build RELEASE instalado** no simulador (gera `ios/`, instala `com.optmore.getorder.staff` com o
   **JS embutido** — sem dev-launcher e sem Metro, o que torna a automação estável):
   ```bash
   cd ~/Developer/getorderapp
   LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios --configuration Release --device <UDID-do-simulador>
   ```
   > ⚠️ O `LANG/LC_ALL=UTF-8` é necessário: sem ele o `pod install` quebra com
   > `Unicode Normalization ... ASCII-8BIT` (CocoaPods + Ruby novo).
   > ⚠️ É **Release** de propósito: o build **debug** usa o `expo-dev-launcher` (tela de launcher +
   > menu de dev), que é **instável** para Maestro. O Release embute o bundle (env do `.env` no momento
   > do build → manter **local**) e abre direto no app.
   **Rebuilde a cada regressão** (o JS fica embutido): rode o build acima após terminar a feature/bug,
   depois `maestro/run.sh`.

## Rodar a bateria
```bash
cd ~/Developer/getorderapp
bash maestro/run.sh            # db:reset + senhas + Metro + maestro test (recomendado p/ regressão)
bash maestro/run.sh --no-reset # sem resetar o banco (mais rápido, menos determinístico)
```
O harness: valida o `.env` local → garante Supabase no ar → `db:reset` + senhas de teste (`teste1234`) →
boota o simulador → confere o app instalado → (re)inicia o Metro → roda `maestro test maestro/flows`.
Se o **web local (:3000)** estiver no ar, inclui o flow de **Equipe**; senão pula (`--exclude-tags needs-web`).

Rodar um flow isolado:
```bash
maestro test maestro/flows/07-admin-config-horario.yaml
```

## Contas de teste (Supabase local, senha `teste1234`)
admin `637@admin.com` · cozinha `637@cozinha.com` · garçom `637@garcom.com`.

## Mapa flow → suite do ROTEIRO
| Flow | Suite | Cobre |
|---|---|---|
| `01-login-roles` | S1 | login admin/cozinha/garçom → home certa + logout |
| `02-cozinha` | S7 | kanban: 3 colunas (Novos/Preparando/Prontos) |
| `03-garcom` | S8/S17 | lista + header "Nova comanda" + badge **"Conta pedida"** (fixture do `run.sh` 3b) |
| `04-admin-dashboard` | S9 | ao vivo + troca de período + blocos + **período vazio** ("Sem vendas no período" em "7 dias") |
| `05-admin-cardapio` | S10 | produtos + categorias + **adicionais** (grupos de modificadores) |
| `06-admin-mesas` | S12 | lista + abrir QR |
| `07-admin-config-horario` | S13 + bug | ⭐ time picker (bottom-sheet) abre/fecha — regressão do bug da máscara |
| `08-admin-config-geral` | S13 | salvar taxa/pausa (toast) |
| `09-admin-marca` | S19 | aba Marca renderiza + salvar (toast) |
| `10-admin-equipe` | S20 | (gated, precisa web) criar/gerenciar equipe |

## O que o Maestro NÃO cobre (verificar manual / ROTEIRO)
- **Conteúdo de RN `<Modal>`** (sheet do time-picker, QRModal, checkout, formulários): o driver iOS do
  Maestro **não lê janelas de Modal** (nem texto nem testID). Os flows assertam até **abrir** o modal;
  o interior é verificado manualmente (ex.: o time-picker abrindo em bottom-sheet — screenshots na sessão).
- **Áudio** do alerta de pedido novo na cozinha (Web Audio / expo-audio).
- **Realtime / push** (precisa de um 2º cliente gerando eventos).
- **Share-sheet** do export CSV (diálogo do SO).
- **Conteúdo renderizado do QR** (a imagem; o flow só confere o modal + a URL).
- Valores em **R$** exatos (dependem do seed) — asserções por presença/estrutura, não por valor fixo.
  - ⚠️ O flow do dashboard assume o seed com fechamentos **só >7 dias** (a última é 17/06; como "hoje"
    só avança, "7 dias" fica sempre vazio → "Sem vendas no período"). Se reseedar com vendas **recentes**
    (<7 dias), ajustar a asserção do `04-admin-dashboard`.

## Troubleshooting (gotchas reais já vividos)
- **Todos os flows falham em `"Entrar" is visible`** → o simulador está com um **build Development
  (dev-client)**, que abre no **Expo Dev Launcher** (lista de "DEVELOPMENT SERVERS"), não no app.
  O Maestro exige o **Release**. Builde: `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios
  --configuration Release --device <UDID>`. Confirme: o `.app` instalado tem `main.jsbundle`
  (`xcrun simctl get_app_container booted com.optmore.getorder.staff` → `ls .../main.jsbundle`).
  ⚠️ Instalar um build dev/TestFlight por cima volta a quebrar — **rebuilde Release**.
- **Login falha mesmo com Release** (tela de login some mas não vai pra home; ou auth retorna
  500 `Database error querying schema` / `column users.banned_until does not exist`) → o **schema
  `auth` do baseline é mais antigo** que o GoTrue do CLI (v2.190+). Um **`npm run db:reset` limpo**
  resolve (o GoTrue re-migra o `auth` no restart gerenciado pelo CLI). ⚠️ **NÃO** faça
  `docker restart supabase_auth_*` na mão — pode cascatear e **zerar o banco**; use só
  `npm run db:start/stop/reset`. Teste rápido: `curl -s -X POST
  "$URL/auth/v1/token?grant_type=password" -H "apikey: $ANON" -d '{"email":"637@admin.com","password":"teste1234"}'`.
- **1–2 flows flaky com a app "crashando" no login ou não vendo a tela** → diálogo de sistema do iOS
  **"Salvar Senha?"** aparecendo com atraso. O `helpers/login.yaml` já dispensa ("Agora Não") de forma
  robusta; se voltar a incomodar, desligue AutoFill de Senhas nos Ajustes do simulador.

## Padrão (regra do projeto)
Toda **nova feature** ou **correção de bug** no app nativo entra com seu **flow Maestro** aqui
(e o `ROTEIRO.md` é atualizado no web). Ver `CLAUDE.md`.
