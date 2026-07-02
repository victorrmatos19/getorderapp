# GetOrder Staff — Dossiê de submissão à App Store

> Documento de referência para preencher o **App Store Connect** (e para o Claude do chat normal te
> ajudar). Contém tudo que se sabe do app + **drafts prontos** + o que **só você preenche** (marcado
> `⟶ VOCÊ`). Gerado em Junho/2026 para a **v1.0.0**.
>
> ⚠️ **O ponto nº 1 que reprova apps com login (Guideline 2.1 / 4.2):** é obrigatório dar uma
> **conta de demonstração** ao revisor + **notas de revisão** explicando o app. Está tudo abaixo.

---

## 1. Identidade do app

| Campo | Valor |
|---|---|
| **Nome (App Name)** | `GetOrder Staff` |
| **Subtítulo (Subtitle, ≤30 chars)** | `Comandas e cozinha do salão` *(draft — ver §5)* |
| **Bundle ID** | `com.optmore.getorder.staff` |
| **SKU** | `getorder-staff-001` *(qualquer string única; sugestão)* |
| **Versão (marketing)** | `1.0.0` |
| **Build** | gerado pelo EAS (`autoIncrement`) — usar o último enviado |
| **Idioma principal** | Português (Brasil) — `pt-BR` |
| **Conta Expo (owner)** | `victorrmatos19` · projectId `9d0004a0-0794-4d72-91a7-153173eef9dc` |
| **Categoria primária (sugestão)** | **Food & Drink** *(ou “Business”)* |
| **Categoria secundária (sugestão)** | **Business** |
| **Classificação etária** | **4+** (sem conteúdo sensível; ferramenta de trabalho) |

---

## 2. O que é o app (contexto p/ descrição e p/ o revisor)

**GetOrder** é um sistema de **comandas digitais via QR Code** para bares/restaurantes/cervejarias.
Tem **duas frentes**:
- **Cliente final** → usa o **site** (`/mesa/<id>`, escaneando o QR da mesa). **NÃO usa este app.**
- **Equipe do restaurante** → usa **este app** (`GetOrder Staff`): **admin**, **garçom** e **cozinha**.

**Este app é uma ferramenta interna de operação (B2B).** Funções: a **cozinha** vê os pedidos em
tempo real (kanban), o **garçom** lança pedidos e fecha a conta, o **admin** gerencia cardápio,
mesas/QR, equipe, marca e vê o painel gerencial. **O app não processa pagamento** — só registra a
forma; **não vende nada para o usuário do app** (a assinatura do restaurante é um contrato B2B com a
Optmore, fora da loja → não usa In-App Purchase).

- **Empresa:** Optmore · **Founder:** Victor · **Domínio:** getorder.com.br
- **Backend:** Supabase (login por e-mail/senha; dados de operação). Requer **internet** + **conta de
  equipe** (não há cadastro público — contas são criadas pelo restaurante).

---

## 3. Disponibilidade & preço

- **Preço do app:** **Grátis** (o app em si). A mensalidade do GetOrder (R$199/mês) é cobrada do
  **restaurante** pela Optmore, **fora da App Store** (serviço B2B) → **sem In-App Purchase**.
- **Territórios:** Brasil (pode liberar mundialmente; o conteúdo é pt-BR).
- **Distribuição:** pública na App Store. *(Alternativa: se preferir, dá pra usar **Apple Business
  Manager / Unlisted** por ser B2B — decisão sua.)*

---

## 4. URLs obrigatórias/opcionais

| Campo | Valor |
|---|---|
| **Política de Privacidade (obrigatória)** | `https://getorder.com.br/privacidade` *(ou `https://getorder.vercel.app/privacidade` se o DNS ainda não estiver no ar)* |
| **Support URL (obrigatória)** | ⟶ VOCÊ — ex.: `https://getorder.com.br` ou uma página de contato. *(Apple exige uma URL de suporte que abra.)* |
| **Marketing URL (opcional)** | `https://getorder.com.br` |

> ⚠️ Confirme que a **URL de privacidade abre** (a página `/privacidade` existe no web). Se
> `getorder.com.br` ainda não resolve, use o domínio `*.vercel.app` temporariamente.

---

## 5. Textos da loja (drafts prontos — ajuste à vontade)

**Subtítulo (≤30):** `Comandas e cozinha do salão`

**Texto promocional (≤170, editável sem revisão):**
`Cozinha, garçom e gestor numa tela só: pedidos em tempo real, fechamento de conta e cardápio — a operação do seu restaurante na palma da mão.`

**Descrição (Description):**
```
GetOrder Staff é o aplicativo da EQUIPE do restaurante que usa o GetOrder — o sistema de comandas
digitais via QR Code. Enquanto o cliente faz o pedido pelo próprio celular (pelo site, sem instalar
nada), a sua equipe acompanha e opera tudo por aqui.

• COZINHA — painel em tempo real (kanban Novos / Preparando / Prontos), com alerta sonoro de pedido
  novo, adicionais e observações em destaque, e a tela que não apaga durante o serviço.
• GARÇOM — lista de mesas com comanda aberta, lançamento de pedido na mesa/balcão e fechamento da
  conta (taxa de serviço, divisão por pessoa, forma de pagamento).
• ADMIN — painel gerencial (faturamento, ticket médio, mais vendidos), cardápio com fotos e
  adicionais, mesas com QR Code, gestão da equipe e personalização da marca (cores e logo).

Funciona com qualquer maquininha (o GetOrder não processa pagamento, apenas registra a forma).
Sem taxa por pedido. Requer uma conta da equipe (criada pelo restaurante) e conexão à internet.

GetOrder é um produto da Optmore. Saiba mais em getorder.com.br.
```

**Palavras-chave (Keywords, ≤100 chars, separadas por vírgula):**
`comanda,restaurante,bar,cozinha,garçom,pedido,KDS,QR,cardápio,PDV,gestão,mesa`

**Novidades desta versão (What’s New) — v1.0.0:**
`Primeira versão do GetOrder Staff: cozinha em tempo real, garçom (pedidos e fechamento) e painel do administrador.`

---

## 6. Privacidade do app (App Privacy “nutrition label”)

O app **não usa rastreamento** (sem IDFA/ads/analytics de terceiros). Coleta o mínimo para funcionar:

| Tipo de dado | Coleta? | Uso | Vinculado à identidade? | Rastreamento? |
|---|---|---|---|---|
| **E-mail (Contact Info)** | Sim | **App Functionality** (login/autenticação da equipe) | Sim | Não |
| **Conteúdo do usuário — Fotos (User Content)** | Sim | **App Functionality** (admin envia foto de produto e logo) | Sim | Não |
| Localização, Contatos, Saúde, Navegação, etc. | **Não** | — | — | — |
| Identificadores de dispositivo / publicidade | **Não** | — | — | — |

- **Tracking:** **Não** (responder “No” na pergunta de tracking → não precisa do prompt ATT).
- **Base legal/LGPD:** o GetOrder é **operador** dos dados (responsabilidade compartilhada com o
  restaurante). Política em `/privacidade`. O **cliente final não se identifica** (a comanda abre na
  mesa sem nome/CPF); este app coleta apenas o **e-mail de login da equipe** e **fotos** de cardápio/marca.

> Para o formulário “Permissão de acesso a fotos”: o app usa a galeria **apenas** quando o admin
> escolhe enviar uma foto de produto/logo (string já no app: *“O GetOrder usa a galeria para enviar
> fotos de produtos e o logo do restaurante.”*).

---

## 7. App Review Information (CRÍTICO)

**Sign-In required:** **Sim** (o app é todo atrás de login da equipe).

**Conta de demonstração (Demo Account):**
| Campo | Valor |
|---|---|
| **User name** | `637@admin.com` *(papel admin — vê tudo; também há `637@garcom.com` e `637@cozinha.com`)* |
| **Password** | ⟶ VOCÊ (a senha de **produção** dessa conta — não está neste doc por segurança) |

> ⚠️ A conta precisa existir e funcionar no **Supabase de PRODUÇÃO** (o build de review usa o env de
> produção do `eas.json`). A conta `637@admin.com` **existe em produção** (confirmado); só informe a
> senha ao revisor no campo de demo. Se preferir, crie uma conta dedicada “Apple Review” pela própria
> tela de Equipe.

**Notas de revisão (Review Notes) — cole isto (em inglês p/ o revisor):**
```
GetOrder Staff is a B2B internal tool for RESTAURANT STAFF (admin, waiter, kitchen). It is NOT a
consumer ordering app: end customers place orders on the web (by scanning a table QR code), not in
this app. This app lets the restaurant team operate the floor.

Sign-in is required (accounts are created by the restaurant; there is no public sign-up). Use the
demo account provided in the App Review form.

What to test after logging in as admin (637@admin.com):
- Bottom tabs: Painel (dashboard), Cardápio (menu), Mesas (tables + QR), Equipe (team), Configs.
- Log out and log in as kitchen (637@cozinha.com) to see the real-time kitchen board (kanban), or as
  waiter (637@garcom.com) to see open tables and order/checkout.

The app does NOT process payments and sells nothing to the app user. The restaurant's subscription is
a B2B contract billed outside the App Store (no in-app purchases). The app requires an internet
connection and the backend (Supabase).
```

**Contact info (App Review):** ⟶ VOCÊ — nome, e-mail e telefone para o revisor (ex.: Victor /
seu e-mail / (11) 91732-0202).

---

## 8. Export Compliance (criptografia)

- O app usa **apenas HTTPS padrão** (exempt). Já está configurado no `app.json`:
  `ios.infoPlist.ITSAppUsesNonExemptEncryption = false` → na pergunta de criptografia, responder
  **“No / uses only exempt encryption”** (não precisa de documentação ERN/CCATS).

---

## 9. Permissões (Info.plist) — já configuradas

| Permissão | String / origem | Quando aparece |
|---|---|---|
| **Fotos (NSPhotoLibraryUsageDescription)** | “O GetOrder usa a galeria para enviar fotos de produtos e o logo do restaurante.” (plugin `expo-image-picker`) | Admin envia foto de produto/logo |
| **Microfone/áudio** | usado p/ o **alerta sonoro** da cozinha (`expo-audio`) | Tela da cozinha |

> Se a Apple questionar o microfone: o áudio é só para **reproduzir** o alerta de pedido novo (não
> grava nada). Se quiser, dá pra remover permissões de gravação não usadas do `app.json` (há
> `RECORD_AUDIO` duplicado no Android) — não bloqueia o iOS, mas é um polimento.

---

## 10. Screenshots (preparar antes de submeter)

**Tamanhos obrigatórios (iOS):** iPhone **6.9"/6.7"** (ex.: 15/16 Pro Max) e **6.5"** (ou 5.5"
legado, se quiser). 3–10 imagens. *(iPad só se marcar “supports iPad” — o app tem `supportsTablet`,
então **ou** envie screenshots de iPad **ou** desmarque o suporte a iPad p/ não exigir.)*

**Telas sugeridas (todas já existem no app):**
1. **Login** (marca GetOrder).
2. **Cozinha** — kanban Novos/Preparando/Prontos.
3. **Garçom** — lista de mesas (card verde quando há item pronto).
4. **Comanda / Encerrar e cobrar** (fechamento).
5. **Painel (admin)** — “Ao vivo de hoje” + blocos do dashboard.
6. **Cardápio** — produtos + categorias + adicionais.
7. **Mesas** — QR Code de uma mesa.
8. **Configurações → Marca** — personalização (cores/logo).

> Dá pra capturar no Simulator (já usamos o iPhone 16e) ou num device. Posso te ajudar a gerar/limpar
> as imagens depois, se quiser.

---

## 11. Build que vai para revisão (técnico)

- O app é **Expo (managed) + EAS**. O build de loja é o **profile `production`** (env de produção já
  cravado no `eas.json` → Supabase prod + web prod).
- Comandos (ver também `DEPLOY.md`):
  ```bash
  cd ~/Developer/getorderapp
  eas build -p ios --profile production --auto-submit   # builda E envia ao App Store Connect
  # depois, no App Store Connect: selecionar o build na versão 1.0.0
  ```
- **TestFlight** já foi exercitado (build chegou e instalou). A submissão à **revisão** usa o mesmo
  tipo de build (production/store) + os metadados deste doc.
- **Dependência da tela Equipe:** ela chama o web (`/api/admin/usuarios`) por **Bearer**; a mudança
  já está **deployada na Vercel** (commit `3b8c111`), então funciona no build de produção.

---

## 12. Riscos de revisão & como responder (resumo)

| Risco (Guideline) | Como mitigar (já coberto acima) |
|---|---|
| **2.1 / 4.2 — app com login sem demo** | Conta de demo + notas de revisão (§7). **Imprescindível.** |
| **3.1.1 — In-App Purchase** | App não vende nada ao usuário; assinatura é B2B fora da loja (explicado nas notas). |
| **5.1.1 — privacidade/coleta** | Política em `/privacidade` + App Privacy preenchido (§6); coleta mínima. |
| **4.2 — “minimum functionality”** | App é uma ferramenta completa de operação (cozinha/garçom/admin); notas explicam o B2B. |
| **2.3 — metadados precisos** | Descrição deixa claro que o **cliente pede no site**, não neste app. |
| Precisa de internet/backend | Notas avisam que exige internet + conta; o backend de prod está no ar. |

---

## 13. ⟶ Itens que SÓ você preenche (checklist)

- [ ] **Senha de produção** da conta de demo (`637@admin.com` ou uma conta “Apple Review”).
- [ ] **Support URL** (Apple exige uma URL de suporte que abra).
- [ ] **Contato de revisão** (nome/e-mail/telefone).
- [ ] Confirmar que **`getorder.com.br/privacidade`** abre (senão usar o domínio Vercel).
- [ ] **Screenshots** nos tamanhos exigidos (§10).
- [ ] Decidir **iPad**: enviar screenshots de iPad **ou** desmarcar `supportsTablet`.
- [ ] Escolher **categoria** (sugestão: Food & Drink + Business).
- [ ] Conferir os **textos** (§5) e ajustar o tom se quiser.

---

## 14. Fatos rápidos (cola)

- Nome: **GetOrder Staff** · Bundle: **com.optmore.getorder.staff** · Versão: **1.0.0**
- Empresa: **Optmore** · Domínio: **getorder.com.br** · WhatsApp comercial: **(11) 91732-0202**
- Tipo: **B2B / ferramenta interna de restaurante** (staff) · **Grátis** · **sem IAP** · **sem tracking**
- Idioma: **pt-BR** · Idade: **4+** · Criptografia: **exempt (HTTPS)**
- Demo: **637@admin.com** (+ `637@garcom.com`, `637@cozinha.com`) — senha de prod com você
- Privacidade: `/privacidade` · Coleta: **e-mail de login** + **fotos** (cardápio/marca)
- Cliente final pede no **site** (QR da mesa), **não** neste app
