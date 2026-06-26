@AGENTS.md

# GetOrder Staff (app nativo) — CLAUDE.md

> Contexto completo do **app nativo de staff**. Leia antes de qualquer alteração.
> Para o backend/regra de negócio detalhada, o `CLAUDE.md` do repo **web** (`orderapp`)
> é a fonte canônica — este documento foca no que é **próprio do app nativo**.

> ⚠️ **Expo SDK 56 mudou muita coisa.** Antes de escrever código de Expo/React Native,
> confira a doc **versionada**: https://docs.expo.dev/versions/v56.0.0/ (ver `AGENTS.md`).

---

## 🎯 Visão geral

**GetOrder** é um SaaS multi-tenant de comandas digitais via QR Code (bares, cervejarias,
restaurantes, arenas). Este repositório (`getorderapp`) é o **app nativo instalável só para a
equipe** (admin / garçom / cozinha) — sem webview, React Native puro. Resolve o que o PWA não
entrega bem: **áudio confiável em background na cozinha, keep-awake, push** e o caminho para
**impressora térmica**.

- **Cliente piloto:** 637 Cerveja Artesanal · **Founder:** Victor (Optmore)
- O **cliente final** (quem escaneia o QR) **NÃO** usa este app — continua no web (`/mesa`).

---

## 🏛️ Arquitetura de duas bases ("uma base por responsabilidade") — CRÍTICO

Existem **dois fronts** sobre **um único backend Supabase**:

| Front | Repo | Hospedagem | Responsabilidade |
|---|---|---|---|
| **App nativo (staff)** | `getorderapp` (este) | EAS Build → TestFlight/lojas (celular) | admin · garçom · cozinha |
| **Web** | `orderapp` | Vercel | cardápio do cliente (`/mesa`), super-admin, **API privilegiada `/api/admin/*`** |

- **Backend único:** mesmo projeto Supabase (PostgreSQL + Auth + Realtime + Storage), **mesmas
  RLS e RPCs**. Os dois fronts batem no mesmo banco.
- **O app usa SOMENTE a `anon key`.** 🚫 **NUNCA** `service_role` no app (vaza a chave-mestra no
  binário → controle total do sistema). A segurança vem da RLS + validação no servidor.

### A única exceção: gestão de usuários (Equipe) → endpoint web via Bearer
Criar/editar usuário, trocar senha, desativar exige `service_role` (admin do Auth). Isso **não pode**
rodar no app. Então **só a tela de Equipe** chama o **endpoint web** (`/api/admin/usuarios`,
hospedado na Vercel) por HTTPS, mandando `Authorization: Bearer <access_token>` da sessão. O servidor
valida o token (`requireAdmin` aceita Bearer **e** cookie) e faz o trabalho privilegiado.

```
App (celular) ──anon key────────────────► Supabase  (login, comandas, cardápio, mesas, cozinha…)
App (Equipe) ──Bearer <token>──► Vercel /api/admin/usuarios ──service_role──► Supabase
```

> ⚠️ Equipe **depende** de a mudança de Bearer do repo web estar **deployada na Vercel**. Sem isso:
> `401 "Não autenticado"`. Todo o resto do app é independente da Vercel.
> Futuro possível (mais limpo): mover esses endpoints para uma **Supabase Edge Function** → app 100%
> Supabase, sem Vercel.

---

## 🏗️ Stack técnica

| Camada | Tecnologia |
|---|---|
| Runtime | **Expo SDK 56** · React Native 0.85.3 · React 19 |
| Navegação | **expo-router** (file-based, `src/app/`, alias `@/*` → `src/*`) |
| Linguagem | TypeScript strict |
| Estilo | **NativeWind v4** (Tailwind p/ RN) + `vars()` p/ CSS variables do white-label |
| Backend SDK | `@supabase/supabase-js` (**anon only**) + `react-native-url-polyfill` |
| Estado server | TanStack Query (`@tanstack/react-query`) |
| Sessão | `@react-native-async-storage/async-storage` (storage do Supabase Auth) |
| Fontes | `expo-font` + `@expo-google-fonts/{cormorant-garamond,work-sans}` |
| Imagens | `expo-image` (`Image`/`contentFit`) · `expo-image-picker` (upload de foto/logo) |
| Gráficos/SVG | **`react-native-svg`** (charts do dashboard à mão, ícones) · `react-native-qrcode-svg` (QR) |
| Som/Wake | `expo-audio` (chime) · `expo-keep-awake` (cozinha) |
| CSV/Share | `expo-file-system/legacy` + `expo-sharing` (export do dashboard) |
| Datas | `@react-native-community/datetimepicker` (período custom) |
| Build/OTA | **EAS Build** + `expo-updates` (ver `DEPLOY.md`) |

🚫 **Não** usar libs de componentes (shadcn/MUI/etc.) — componentes próprios. **Não** usar emoji como
ícone (vira "tofu"/`?` neste app) — usar **SVG** (`react-native-svg`).

---

## 📂 Estrutura de pastas

```
src/
├── app/                              ← rotas (expo-router)
│   ├── _layout.tsx                   ← fontes, QueryProvider, RestauranteProvider, ThemeProvider, AppState autorefresh
│   ├── index.tsx                     ← redirect por role
│   ├── (auth)/login.tsx              ← signInWithPassword → home do role (super_admin barrado: "use a web")
│   └── (staff)/
│       ├── _layout.tsx               ← GUARD: session + perfil.ativo + role (admin/garcom/cozinha)
│       ├── cozinha.tsx               ← kanban 3 colunas + alerta sonoro + keep-awake + realtime
│       ├── garcom/{index,nova-comanda,pedido}.tsx + comanda/[id].tsx
│       └── admin/
│           ├── _layout.tsx           ← <Tabs> (Painel·Cardápio·Mesas·Equipe·Configs) com TabBarIcon (SVG)
│           ├── index.tsx             ← Dashboard v2 (Painel)
│           ├── cardapio.tsx · mesas.tsx · equipe.tsx · config.tsx (Geral·Horário·Marca)
├── components/
│   ├── ui/{Button,Screen,Header,Spinner,EmptyState,StatusBadge,Toast}.tsx   ← design system
│   ├── Logo.tsx · TabBarIcon.tsx     ← marca (SVG) + ícones da tab (SVG, outline único)
│   ├── ProductCard · ProdutoDetalhe · ProdutoForm · CheckoutModal · QRModal · MarcaTab
│   └── dashboard/{AoVivoHoje,PeriodoSelector,ResumoCards,TendenciaChart,ProdutosRanking,MixPagamento,HeatmapPico,QualidadeGiro}.tsx
├── lib/
│   ├── supabase/client.ts            ← createClient(anon, { storage: AsyncStorage, autoRefresh })
│   ├── theme.ts                      ← deriveTheme() (PORTE VERBATIM do web; fonte única white-label)
│   ├── calcComanda.ts · formatters.ts · periodo.ts · adicionaisRegra.ts  ← puros, portados do web
│   ├── garcom.ts                     ← wrappers das RPCs do garçom (lancar_pedido_garcom, fechar_comanda…)
│   ├── api.ts                        ← apiFetch (Bearer → web API; SÓ a Equipe usa)
│   ├── exportCsv.ts                  ← baixarCsv (expo-file-system/legacy + expo-sharing)
│   └── hooks/{useResumo,useItensCozinha,useCozinhaAlerta,useComanda,useCardapio,useCategoriasAdmin,useDashboard,useUsuarios}.ts
├── providers/{QueryProvider,RestauranteProvider,ThemeProvider}.tsx
└── types/index.ts                    ← tipos (Restaurante, Comanda, ItemPedido, UsuarioEquipe, Role…)
assets/brand/*.svg                    ← masters editáveis do ícone/splash (rasterizados p/ assets/images/*)
eas.json · app.json · DEPLOY.md       ← build/loja (ver seção Deploy)
```

---

## 🎨 Identidade visual + white-label

Paleta/tipografia **idênticas ao web** (não alterar sem autorização): oliva `#4A5240` (primary),
terracota `#9B4A3C` (accent), fundo `#FAF9F5`, etc. Títulos **Cormorant Garamond**, corpo **Work Sans**.

**White-label (cores por restaurante):**
- `src/lib/theme.ts` → **`deriveTheme(primaria, accent, corPreco, {dark})`** é **porte verbatim** do
  web (módulo puro, WCAG-aware; clampa contraste). Retorna tokens `--primary`, `--accent`, `--price`, etc.
- `ThemeProvider` injeta os tokens via **`vars(deriveTheme(...))`** numa `View` raiz (NativeWind v4).
  Descendentes usam `className="bg-primary text-on-accent text-price"`. `dark` = tema escuro da cozinha.
- **`tailwind.config.js`:** cores de **marca** mapeadas a `var(--token)` (repintam com o tema);
  **neutros são hex constante** (`bg #FAF9F5`, `surface #F2F0E8`, `line #DDD9CC`, `ink #2A2A26`,
  `text-mid #6B6A62`, `muted #B8B5AB`, `status-new/-prep/-ready`). Fontes: `font-serif`,
  `font-sans`, `font-sans-bold`.
- O admin edita as cores + logo em **`MarcaTab`** (dentro de Configurações) → grava
  `restaurantes.cor_primaria/cor_accent/cor_preco/logo_url` e chama `refreshRestaurante()` (provider)
  para o app repintar. Logo → bucket Storage **`logos`** (path `<restaurante_id>/…`).

**Ícones:** ⚠️ **emoji renderiza como tofu/`?` neste app** — todos os ícones são **SVG**
(`TabBarIcon`, `Logo`), estilo **outline único**. UX mobile-first: toque ≥ 44–48px, mín. 16px de fonte.

---

## 🗄️ Backend compartilhado (Supabase)

Modelo de dados, RLS, enums e migrations vivem no **repo web** (fonte canônica). O app **consome**:

- **Leitura:** cardápio/mesas/restaurantes são **público** (`using(true)`); vendas
  (`comandas`/`itens_pedido`/…) são **escopadas por tenant** na RLS. O app autenticado (staff) só vê o
  próprio restaurante.
- **RPCs reusadas (mesmo backend do web):** `criar_item_pedido`, **`lancar_pedido_garcom`**,
  **`fechar_comanda`** (recomputa o total no servidor), `cancelar_comanda_vazia`. Wrappers tipados em
  `lib/garcom.ts` — **o app só manda IDs**, nunca preço.
- **Escrita admin** (cardápio/mesas/categorias/config/marca) = `supabase.from(...).update/insert/upsert`
  direto; o trigger `force_tenant_on_write` carimba o `restaurante_id` no servidor.
- **Sessão:** `supabase-js` com `storage: AsyncStorage`, `autoRefreshToken`. O `_layout.tsx` raiz liga
  `supabase.auth.startAutoRefresh()` em foreground (via `AppState`) e para em background.

### ⚡ Realtime — regra crítica
Canais Supabase **devem ter nome ÚNICO por instância** para não colidir quando a tela remonta
(empilhamento de navegação já causou `"cannot add postgres_changes after subscribe"`):

```ts
const cid = useId()
const ch = supabase.channel(`cozinha-orders-${cid}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'itens_pedido' }, () => refetch())
  .subscribe()
return () => { supabase.removeChannel(ch) }   // SEMPRE limpar
```

---

## 🛣️ Rotas e papéis (expo-router)

| Rota | Quem | Notas |
|---|---|---|
| `(auth)/login` | público | `signInWithPassword` → redirect por role. **super_admin é barrado** (só web). |
| `(staff)/_layout` | guard | exige `session` + `perfil.ativo` + role ∈ {admin,garcom,cozinha}; senão `Redirect /login`. |
| `(staff)/cozinha` | admin, cozinha | kanban + som + keep-awake + realtime |
| `(staff)/garcom/*` | admin, garcom | lista, nova-comanda, pedido, comanda + checkout |
| `(staff)/admin/*` | admin | Tabs: Painel, Cardápio, Mesas, Equipe, Configs |

`RestauranteProvider` resolve `role`/`restaurante`/`ativo` no `onAuthStateChange` e expõe
`restauranteId`, `restaurante`, `signOut`, **`refreshRestaurante()`**. Sempre pegar `restaurante_id`
de `useRestaurante().restauranteId` (nunca do request).

---

## 📱 Telas implementadas

- **Cozinha** (`cozinha.tsx` + `useCozinhaAlerta`): kanban 3 colunas; **alerta sonoro** (`expo-audio`,
  só em INSERT, com mudo persistido em AsyncStorage); **keep-awake**; indicador de conexão realtime.
- **Garçom**: lista (card verde quando há item pronto), nova-comanda, **pedido** (carrinho local →
  `lancar_pedido_garcom`), **comanda + checkout** (`fechar_comanda`) e cancelar comanda vazia.
- **Admin**:
  - **Dashboard v2** (`admin/index.tsx` + `components/dashboard/*` + `hooks/useDashboard.ts`): "Ao vivo
    de hoje" (realtime), seletor de período + Δ%, **gráficos em `react-native-svg`** (tendência) e
    barras/heatmap em `View` (sem recharts), ranking de produtos, mix de pagamento, qualidade/giro,
    **export CSV** (`exportCsv.ts`).
  - **Cardápio** (`cardapio.tsx` + `ProdutoForm`): CRUD produtos+categorias, toggles esgotado/disponível,
    **upload de foto** (`expo-image-picker` → Storage bucket `produtos`).
  - **Mesas** (`mesas.tsx` + `QRModal`): CRUD + **QR** (`react-native-qrcode-svg`, URL =
    `EXPO_PUBLIC_CLIENT_URL/mesa/<id>`) + Share.
  - **Equipe** (`equipe.tsx` + `lib/api.ts` + `hooks/useUsuarios.ts`): gestão de garçom/cozinha via
    **endpoint web (Bearer)** — ver "arquitetura de duas bases".
  - **Configurações** (`config.tsx`): Geral (taxa/pausa) · Horário · **Marca** (`MarcaTab`, white-label).

---

## 📐 Padrões de código

- **Design system** (`components/ui/*`): `Screen {className,dark}` · `Header {title,subtitle,onSair,onBack,right,dark}`
  · `Button {label,onPress,variant:accent|ink|outline,loading,disabled}` · `Spinner {color}` ·
  `EmptyState {icon,title,description,action}` · `Toast {visible,message,onClose}` · `StatusBadge {status}`.
- **3 estados em toda lista:** loading (`<Spinner/>`), erro (`EmptyState` com "Tentar novamente" → `refetch`),
  vazio (`EmptyState`).
- **Forms/modais:** bottom-sheet — `Modal transparent animationType="slide"` + overlay `rgba(0,0,0,0.45)`
  `justify-end`, folha `bg-bg` `borderTopRadius:20`; use `KeyboardAvoidingView` quando houver input.
- **Mutations:** `useMutation` (TanStack) + supabase direto + `qc.invalidateQueries` + `Toast`.
- **Puros (portados do web, idênticos):** `calcComanda` (`subtotalItem`/`totalComanda` — fonte única do
  total), `formatters` (`fmt.*`), `periodo` (`construirPeriodo`/`variacaoPct`), `adicionaisRegra`.
- **Cores hardcoded** em props que não aceitam className (ex.: `Switch trackColor={{true:'#4A5240',false:'#DDD9CC'}}`).

---

## 🧪 Ambiente de desenvolvimento

`.env` (gitignored) com `EXPO_PUBLIC_*`. Por padrão aponta para o **Supabase LOCAL** (Docker do repo
web, `npm run db:start` lá). **iOS simulator alcança `127.0.0.1`**; Android emulator usa `10.0.2.2`;
device físico precisa do **IP da LAN**.

```bash
npx expo start                    # Metro (dev)
# Verificação (sem runtime aqui): tipos + lint + bundle headless
npx tsc --noEmit
npx expo lint
npx expo export --platform ios --output-dir /tmp/x
```

Vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_WEB_API_URL`
(base do `/api/admin/*`), `EXPO_PUBLIC_CLIENT_URL` (QR das mesas).

> ⚠️ **`.env` é gitignored → NÃO sobe para o build da EAS.** Para builds (preview/produção), as
> `EXPO_PUBLIC_*` vão no **`eas.json`** (bloco `env` por profile) ou em `eas env`. Mudar de ambiente
> (local↔prod) = editar `.env` e **reiniciar o Metro com `-c`** (env é inlined no bundle, não entra por reload).

---

## 🚀 Build & loja (EAS) — ver `DEPLOY.md`

- **`eas.json`** profiles: `development` (dev client, simulador), `preview` (ad-hoc, instala por link —
  **NÃO é TestFlight**), `production` (store → **TestFlight/loja**). Os profiles `preview`/`production`
  têm as `EXPO_PUBLIC_*` de **produção** cravadas no bloco `env` (a `anon key` é pública — já vai no
  bundle; o `service_role` **nunca** entra aqui).
- **`EXPO_PUBLIC_*` são "assadas" no BUILD.** Mudou env → **rebuild** (ou OTA com o env correto).
  Mudou código nativo / `app.json` (plugin, permissão, ícone) → **rebuild** obrigatório.
- **OTA** (`expo-updates`): `eas update --branch production -m "..."` empurra **só JS/TS** sem passar
  pela loja. `runtimeVersion.policy = "appVersion"`.
- **bundle id / package:** `com.optmore.getorder.staff`. **Nome:** "GetOrder Staff". **owner:** `victorrmatos19`.
- **TestFlight = `--profile production` + `eas submit`** (ou `--auto-submit`). `preview` (internal) é
  ad-hoc, não chega ao TestFlight.
- **Ícones/splash de marca:** gerados dos masters `assets/brand/*.svg` (símbolo "comanda" sobre o oliva)
  via `qlmanage -t -s 1024 -o /tmp/out assets/brand/icon-master.svg` → `assets/images/`.
- Permissões nativas já no `app.json`: galeria (`expo-image-picker` `photosPermission` →
  `NSPhotoLibraryUsageDescription`), áudio (cozinha). `ITSAppUsesNonExemptEncryption=false`.

---

## 🧪 Testes de regressão (Maestro) — escreva o teste JUNTO da feature/bug

Regressão de UI automatizada em **`maestro/`** (Maestro), no **simulador iOS** sobre um **dev build**
(`com.optmore.getorder.staff`) contra o **Supabase local**. Cobre os fluxos de **staff** (cliente `/mesa`
e super-admin são web → ROTEIRO de navegador no repo web).
- **Rodar:** `bash maestro/run.sh` (db:reset + senhas `teste1234` + Metro + `maestro test`). Ver `maestro/README.md`.
- **Buildar p/ teste:** `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios --no-bundler --device <udid>`
  (o `LANG=UTF-8` evita o crash do `pod install`). Rebuild só p/ mudança **nativa**; JS vem do Metro.
- **Seletores:** preferir **texto visível** (PT); `testID` só onde não basta — tabs `tab-*`, login `login-*`,
  horário `horario-<dia>-abre|fecha`, `time-picker-pronto`, `toast`. `ui/Button` repassa `testID`.
- **REGRA (requisito do Victor):** toda **nova feature** ou **correção de bug** entra com seu **flow** em
  `maestro/flows` (e atualiza o `ROTEIRO.md` do web). **Não entregar sem o teste automatizado.**
- Maestro **não** cobre: áudio, realtime/push, share-sheet do CSV, conteúdo do QR (verificar manual).

---

## 🚫 O que NÃO fazer

- ❌ **Entregar feature/bug sem o teste automatizado** (flow Maestro no nativo; suite no `ROTEIRO.md` web).

- ❌ **`service_role` no app, jamais.** Operação privilegiada (Equipe) → endpoint web via Bearer.
- ❌ Inserir direto em `itens_pedido` / somar total na mão → usar as RPCs e `calcComanda`.
- ❌ Mandar preço de produto/adicional do client → só IDs (snapshot no servidor).
- ❌ **Emoji como ícone** (vira `?`/tofu) → SVG (`react-native-svg`).
- ❌ Canal de realtime com nome fixo / sem `removeChannel` → usar `useId()` + cleanup.
- ❌ Escopar por tenant a leitura do **cardápio** (é público) — só **vendas** são escopadas.
- ❌ Assumir que `.env` chega no build EAS (é gitignored) — usar `eas.json` `env` / `eas env`.
- ❌ Esperar que mudança de `EXPO_PUBLIC_*` apareça sem rebuild — é inlined no build.
- ❌ Achar que `preview` vai pro TestFlight — é ad-hoc; TestFlight = `production` + submit.
- ❌ Alterar paleta/tipografia, ou os neutros do `tailwind.config.js`, sem autorização.
- ❌ Criar autenticação/identificação para o **cliente** aqui — cliente fica no web (`/mesa`).
- ❌ Testar a Equipe contra um web sem o `requireAdmin` Bearer **deployado** → dá 401.
- ❌ Escrever código de Expo sem checar a doc **v56** (mudou bastante) — ver `AGENTS.md`.

---

## 🧭 Convenções de prompt

1. **Multi-tenant:** a feature precisa de `restaurante_id`? A RLS isola? (vem de `useRestaurante().restauranteId`).
2. **Privilégio:** precisa de `service_role`? Então é endpoint web (Bearer), **não** no app.
3. **Padrão visual:** paleta/tipografia/UX deste doc; ícone = SVG; toque ≥ 44px.
4. **3 estados** (loading/vazio/erro) em toda lista.
5. **Realtime** com `useId()` + `removeChannel` quando relevante (`itens_pedido`/`comandas`).
6. **Mobile-first** (390px), e validar com `tsc` + `expo lint` + `expo export` (sem runtime aqui).
7. **Teste automatizado junto:** toda feature/bug entra com um **flow Maestro** (`maestro/flows`) + atualiza
   o `ROTEIRO.md` do web. Rodar `bash maestro/run.sh`. **Requisito de regressão — não entregar sem.**

---

**Última atualização:** Junho de 2026 — app nativo de staff completo ponta-a-ponta (Fases 0→5): fundação
(white-label, auth, providers), cozinha (kanban+som+keep-awake), garçom (lista/pedido/checkout), admin
(dashboard v2, cardápio, mesas/QR, equipe via Bearer, config+marca), ícones de marca, e configuração de
build EAS (TestFlight). Backend Supabase compartilhado com o web; Equipe usa o endpoint web (Bearer).
**Versão:** 1.0.0 (em TestFlight).
