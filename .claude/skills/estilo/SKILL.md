---
name: estilo
description: Style-guide / identidade visual do projeto "clubin. do libro" (ES'26) — paleta de cores oficial e onde cada cor mora nos tokens, tipografia (títulos Courier New; corpo Parabólica, oficial), wordmark e uso do nome, e os assets oficiais (logo, ícone do PWA/favicon, ícones de UI). Regra de ouro: usar os SVGs/arquivos oficiais SEM ALTERAÇÃO — nunca recriar arte à mão. Use ao aplicar/alterar qualquer coisa visual (cor, fonte, logo, ícone, espaçamento de marca), ao trocar um asset ou ao criar uma tela nova que precise seguir a identidade.
---

# estilo — identidade visual de "clubin. do libro"

Fonte de verdade da **cara** do produto. A identidade é a coleção ES'26:
estética de **carimbo/grunge**, **azul dominante**, lettering creme, marrom como
tinta/container e acentos terracota e sálvia. Tipografia **typewriter** (Courier)
nos títulos.

> **Regra de ouro — assets oficiais sem alteração.** Logo, ícone e demais artes
> chegam como **arquivos oficiais** (SVG/fonte). Use-os **exatamente como estão**
> (cópia byte a byte). **Nunca** recrie a arte à mão, não "simplifique" o vetor,
> não redesenhe. Se um asset ainda não chegou, peça o arquivo (push na branch ou
> conteúdo colado) — não invente um substituto para produção.

## Onde o "design" mora

- **`src/styles/tokens.css`** — fonte única de cor, espaço, raio, fonte, sombra e
  motion. Mude um valor e ele se propaga por todo o app. **Nunca hardcode hex de
  marca em componente**; use `var(--color-*)`.
- Os **nomes de slot são históricos** (`--color-olive-*`, `--color-caramel-*`…);
  o que carrega a marca é o **valor**. Ao mexer, mantenha o nome e troque o valor.
- **`src/views/DesignView.vue`** (`/design`, admin) espelha os defaults dos
  tokens de cor/raio/tipografia — ao mudar um default em `tokens.css`, atualize o
  `def`/`value` correspondente aqui para o playground não mentir.

## Paleta oficial

| Cor | Hex | Papel | Token (slot / semântico) |
| --- | --- | --- | --- |
| Azul | `#004ba9` | **Primária** — CTAs, links, foco, cor dominante | `--color-olive-800` → `--color-primary` |
| Marrom | `#4b261d` | **Tinta** — texto, títulos, container do ícone | `--color-ink`, `--color-olive-950` → `--color-heading` |
| Creme | `#ebe7c2` | Superfície funda / lettering sobre azul | `--color-paper-deep` |
| Creme claro | `#f7f3df` | Texto **sobre** primária (on-primary) | `--color-cream-50` → `--color-on-primary` |
| Terracota | `#933012` | **Acento** e perigo/erro | `--color-caramel-300` → `--color-accent`; `--color-terra` → `--color-danger` |
| Sálvia | `#b4c995` | Apoio / sucesso suave | `--color-sage-300` |
| Papel | `#f3efd6` | Fundo geral (papel claro) | `--color-paper` |

Tint de destaque em focos/sombras/bordas usa o azul `rgba(0, 75, 169, α)`.
Sombras quentes usam marrom `rgba(75, 38, 29, α)`.

## Tipografia

- **Títulos e wordmark:** **Courier New** (typewriter) — fonte de **sistema**, sem
  download. Slot: `--font-serif`.
- **Corpo:** **Parabólica** — fonte **oficial** do design system (arquivo `.woff2`
  entregue à parte). Registrada como primária no corpo; enquanto o arquivo não é
  embutido via `@font-face`, o stack cai para **Open Sans** (Google Fonts) e depois
  para as de sistema. Slot: `--font-body`.
  - Ao receber o `.woff2`: adicione um `@font-face` (family `"Parabolica"`,
    `font-display: swap`) e coloque o arquivo em `public/fonts/`. O stack em
    `--font-body` já lista `"Parabolica"` primeiro, então basta o `@font-face`.

Hierarquia vem da **fonte** (Courier nos títulos), não do peso.

## Nome e wordmark

- **Wordmark de exibição** (na UI, em Courier, minúsculo): `clubin. do libro`. O
  **ponto** faz parte da marca. Forma curta: `clubin.`
- **Metadados de sistema** (`<title>`, `manifest.name`, descrição): **Clubin do
  Libro**. `short_name` / `apple-mobile-web-app-title`: **Clubin**.
- **Tagline / selo:** "clássicos e tal" · selo de temporada "ES'26".
- Nunca mais "Clubinho" (nome antigo).

## Assets oficiais

- **Ícone do PWA + favicon:** `public/pwa-icon.svg` — SVG oficial de carimbo/grunge
  (quadrado marrom, textura azul, lettering creme "clu/bin."), `viewBox
  "0 0 271.14 270.81"`. Referenciado pelo manifest (`vite.config.ts`) e pelo
  `<link rel="icon">` (`index.html`). **Trocar só substituindo o arquivo pelo
  oficial atualizado, sem editar o vetor.**
- **Estampa de carimbo** (textura azul + marrom): `public/brand-stamp.webp` —
  arquivo oficial, usado sem alteração como fundo (ex.: card hero do perfil,
  `background: url("/brand-stamp.webp") center/cover`, com scrim escuro sutil por
  cima para o texto creme). Não editar a textura; não recriar à mão.
- **Variações de logo** (horizontal, "clubin. do libro" na tarja azul, versões
  coloridas): guardar em `public/` (ou `src/assets/brand/`) e referenciar como
  `<img>`/`background`. Não editar o vetor. Ligar cada uma onde fizer sentido
  (cabeçalho, tela de login) conforme o pedido.
- **Ícones de UI oficiais** substituem os `lucide-vue-next` correspondentes onde
  indicado. Ex. em migração: **"lidos"** (feed/lidos) e **"perfil"**. Ao receber:
  guarde o SVG (idealmente como componente Vue ou em `src/assets/icons/`) e troque
  **no ponto de uso**, mantendo `:size`/acessibilidade. Não recriar o traço.

## Ao aplicar identidade — checklist

1. Cor/fonte nova? Vem de **token** (`var(--color-*)`, `var(--font-*)`), nunca
   hex/família solta no componente.
2. Mudou um default de token? Atualize `tokens.css` **e** o espelho em
   `DesignView.vue`.
3. Precisa de logo/ícone/arte? Use o **arquivo oficial sem alteração**; se não
   tiver, **peça** — não improvise para produção.
4. Nome sempre "clubin. do libro" / "Clubin do Libro" conforme o contexto acima.
5. Fechou uma tela/estilo novo? `npm test` verde e, quando fizer sentido,
   `npm run build`. Mudança **puramente** de design **não** altera testes (ver
   política de testes no `CLAUDE.md`).

## Habilidades vizinhas

- **`modulo` / `store` / `requisicoes-http`** — quando a mudança visual faz parte
  de uma feature de dados (loading = skeleton/spinner faz parte da identidade).
- **`git-flow`** — branch de tarefa, commit, merge na `developer`, PR para master.
