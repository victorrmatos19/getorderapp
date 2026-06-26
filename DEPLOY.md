# GetOrder Staff — Build & Publicação (Fase 5)

App nativo de staff (admin/garçom/cozinha). Backend = mesmo Supabase da web; endpoints
de equipe vivem no repo web (`orderapp`) e exigem o suporte a **Bearer** deployado.

> O que já está pronto neste repo (feito pelo Claude): `eas.json` (perfis de build),
> `app.json` (nome **GetOrder Staff**, bundle id `com.optmore.getorder.staff`, ícone de
> marca, splash, permissão de galeria do iOS, `runtimeVersion` p/ OTA), `expo-updates`
> instalado e ícones de marca gerados a partir do símbolo GetOrder.
>
> O que SÓ você pode fazer (precisa de contas/login interativo): `eas login`, `eas build`,
> `eas submit`, e o cadastro nas lojas.

---

## 0. Pré-requisitos (contas)

- **Conta Expo** (grátis) — https://expo.dev
- **Apple Developer Program** — US$ 99/ano (para TestFlight + App Store): https://developer.apple.com/programs/
- **Google Play Console** — US$ 25 (taxa única): https://play.google.com/console
- `eas-cli`: `npm i -g eas-cli` (ou use `npx eas-cli@latest <cmd>`)

---

## 1. Setup único do projeto EAS

```bash
cd ~/Developer/getorderapp
eas login                 # entra na sua conta Expo
eas init                  # cria o projeto na Expo e grava extra.eas.projectId no app.json
eas update:configure      # configura OTA (grava updates.url no app.json) — usa expo-updates
```

## 2. ⚠️ Variáveis de ambiente de PRODUÇÃO (crítico)

O `.env` atual aponta para o **Supabase LOCAL** (dev). Um build de loja com ele sai
**quebrado**. Defina as vars de produção como variáveis de ambiente do EAS (não commitar):

```bash
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL      --value "https://<seu-projeto>.supabase.co"
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon key de produção>"
eas env:create --environment production --name EXPO_PUBLIC_WEB_API_URL       --value "https://getorder.vercel.app"
eas env:create --environment production --name EXPO_PUBLIC_CLIENT_URL        --value "https://getorder.vercel.app"
```
(Repita com `--environment preview` se o preview também usar produção.)

> A tela **Equipe** depende de a mudança de **Bearer** do repo web (`orderapp`:
> `requireAdmin`, `usuarios/route.ts`, `[id]/route.ts`) estar **deployada na Vercel**.
> Sem isso, criar/editar usuários retorna 401.

## 3. Builds

⚠️ **TestFlight ≠ preview.** O perfil `preview` é `distribution: "internal"` = build
**ad-hoc** (instala direto por link/QR só em devices cujo UDID está registrado) e **NÃO
aparece no TestFlight**. Para **TestFlight / App Store** use o perfil **`production`**
(distribuição `store`) + `eas submit`.

```bash
# Dev client (rodar no simulador iOS com Fast Refresh + libs nativas):
eas build -p ios --profile development

# Ad-hoc para testar num device específico (NÃO é TestFlight):
eas build -p ios     --profile preview
eas build -p android --profile preview      # gera APK instalável

# TestFlight / Loja (build store) — ESTE é o que vai pro TestFlight:
eas build -p ios --profile production --auto-submit   # builda E envia ao App Store Connect
eas build -p android --profile production
```
Na primeira build de iOS o EAS cria/gerencia os certificados e o App ID
(`com.optmore.getorder.staff`) na sua conta Apple (modo gerenciado, interativo).

Depois do envio, a Apple **processa** o build (minutos a ~1h: aparece "Processando" no
TestFlight). Só então ele fica disponível em **Compilações** para os testers internos.
Acompanhe com `eas build:list`.

## 4. Submissão às lojas

```bash
eas submit -p ios     --latest    # envia para o App Store Connect / TestFlight
eas submit -p android --latest    # envia para o Google Play (precisa de uma service account JSON)
```
Depois: configurar ficha da loja, screenshots e testers (TestFlight / Teste interno do Play).

## 5. OTA (atualização sem passar pela loja)

Para correções de **JS/TS** (sem mudar código nativo), publique direto no canal:

```bash
eas update --branch production --message "fix: ..."
```
Vale para o build de produção já instalado. Mudou dependência nativa / `app.json`
(plugin, permissão, ícone)? Aí precisa de **novo build** + submit.

---

## Notas

- **Bundle id / package:** `com.optmore.getorder.staff` (iOS + Android). Difícil mudar depois
  de publicado — confirme antes do 1º submit.
- **Plugins nativos** (image-picker, datetimepicker, file-system, sharing, audio, secure-store):
  exigem build/`prebuild` — **não** entram via OTA. Já estão no `app.json`.
- **Ícone iOS:** o PNG tem canal alpha mas é 100% opaco (fundo oliva); o EAS achata o alpha
  para o iOS automaticamente. Masters editáveis em `assets/brand/*.svg`.
- **Super-admin** continua só na web (o login do app barra `super_admin`).
- Regerar ícones a partir dos SVGs de marca:
  `qlmanage -t -s 1024 -o /tmp/out assets/brand/icon-master.svg` → copiar para `assets/images/`.
