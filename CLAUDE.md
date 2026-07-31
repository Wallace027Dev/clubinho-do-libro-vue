# CLAUDE.md — política do agente universal

Memória sempre carregada para trabalhar neste repositório. Convenções gerais em
[AGENT.md](AGENT.md); contexto de produto em [CONTEXT.md](CONTEXT.md); backlog
em [TODO.md](TODO.md).

## Testes: automação obrigatória

O projeto mantém uma pirâmide de testes (unit → integração → E2E) via Vitest e
Playwright, coordenada por três habilidades (`.claude/skills/`):

- **`teste`** — coordenadora: decide a camada e delega.
- **`teste-integracao`** — componentes, views/páginas e ações de store.
- **`teste-unitario`** — utils/funções puras e regras do mock.

### Ao criar código novo — sempre testar

Toda vez que você **criar uma nova página/view, um novo componente**, uma nova
função util ou uma nova ação de store, **invoque a habilidade `teste`** para
implementar o teste adequado àquele elemento, **seguindo a regra de negócio**
dele (o comportamento que o produto espera — não a implementação). A `teste`
escolhe a camada e delega para `teste-unitario` ou `teste-integracao`.

Não conclua a tarefa sem o teste correspondente passando (`npm test`).

### Ao alterar código existente — preservar o teste

Quando a mudança for uma **refatoração, ajuste de design/estilo** ou qualquer
alteração que **não muda a regra de negócio**, **NÃO altere automaticamente os
testes** — especialmente os **unitários**. Eles são a rede de segurança e devem
ser **mantidos como estão**.

Só mexa em um teste **se ele falhar (der erro)**. E **somente nesse caso**:
primeiro **analise e explique** por que falhou. A partir do diagnóstico:

1. **A falha é porque uma regra de negócio mudou** e o teste (unitário) reflete
   a regra antiga → **PERGUNTE ao usuário** se deve atualizar o teste para a
   nova regra. **Não** atualize em silêncio. Use `AskUserQuestion` com o
   diagnóstico.
2. **A falha é porque a alteração quebrou a página/código, e o teste está
   correto** → **corrija a página/o código**, **não** o teste. O teste apontou
   uma regressão; a correção é no código.

Em resumo: refatorou → teste intacto; teste vermelho → explicar antes de agir;
regra mudou → perguntar antes de mudar o teste; código quebrou → consertar o
código.

## Regras de negócio: camada de domínio

Regra de negócio pura (validação, cálculo, gate de permissão como o
anti-spoiler) vive em **`src/domain/`**, fonte única consumida pelo backend
real (`api/`) **e** pelo mock — **nunca duplicada**. Ao criar/alterar qualquer
regra de negócio, **invoque a habilidade `dominio`**: ela diz onde a regra mora,
como ligar os dois lados e qual teste usar (unitário no próprio domínio, mais
integração quando muda comportamento observável). Achou lógica de negócio
copiada no handler real e no mock? Extraia para `src/domain/` e ligue os dois.

## Arquitetura de módulo e requisições

Toda entrada/saída de dados segue o caminho **view → ação de store → apiClient →
mock/backend real → domínio → Prisma**, cada camada com sua responsabilidade.
Três habilidades, separadas por obrigação, governam isso:

- **`modulo`** (coordenadora) — o **mapa das camadas**: o que mora em cada uma e
  qual habilidade cuida de cada parte. Invoque ao montar uma feature de ponta a
  ponta ou para saber onde uma coisa vai.
- **`store`** — criar/refatorar **stores Pinia** (estilo setup): estado tipado,
  getters `computed`, ações async que são as únicas donas do `apiRequest` e
  controlam as flags de loading em `try/finally`. View chama **ação de store**,
  nunca `apiRequest`/`fetch` direto.
- **`requisicoes-http`** — a **requisição em si**. Exige, sem exceção: **tipagem
  dura** (toda requisição `apiRequest<T>`, todo retorno em `src/types/*` e todo
  objeto tipados; **nenhum `any`, nenhum implícito**, `strict` ligado) e
  **loading em toda espera** (carga parcial → **skeleton** `SkeletonLoader`, um
  só componente configurável; tela cheia / carregar mais → **spinner**
  `AppSpinner`).

## Identidade visual: style-guide

Toda a **cara** do produto — paleta oficial, tipografia (títulos Courier New;
corpo Parabólica, oficial), wordmark/uso do nome ("clubin. do libro") e os
**assets oficiais** (logo, ícone do PWA/favicon, ícones de UI) — é governada pela
habilidade **`estilo`**. **Invoque `estilo`** antes de aplicar/alterar qualquer
coisa visual (cor, fonte, logo, ícone, espaçamento de marca) ou trocar um asset.
Regras-chave: design vem de **tokens** (`src/styles/tokens.css`, nunca hex solto);
e **assets oficiais entram sem alteração** — nunca recrie logo/ícone à mão; se o
arquivo não chegou, **peça**.

## Convenções que sempre valem

- Português (pt-BR) em UI, mensagens e nomes de teste (descrevem a regra de
  negócio, não o código).
- Regra de negócio pura mora em `src/domain/` (habilidade `dominio`), nunca
  duplicada entre backend e mock.
- Camada de dados nas views passa por **ações de store**, nunca `apiRequest`
  direto (ver TODO/AGENT).
- **Fluxo de git (habilidade `git-flow`, obrigatória):** toda feature/alteração
  vive numa **branch de tarefa** criada a partir da `developer` — **nunca**
  commite direto em `master` nem em `developer`. Tarefa concluída e **testada**
  → merge na `developer`. A `master` só recebe mudança por **Pull Request**
  (nunca merge direto). Invoque `git-flow` antes de criar branch, commitar,
  mergear ou abrir PR.
- **Import relativo em `api/` e `src/domain/` SEMPRE termina em `.js`** — ex.:
  `from '../chapterStructure.js'` —, mesmo apontando para um arquivo `.ts` e
  mesmo em `import type`. A serverless function é carregada pelo **Node em ESM**,
  que não resolve extensão faltante; `tsc`, Vite, Vitest e `tsx` toleram, então o
  erro passa por todos os gates e **derruba a API inteira em produção** com
  `ERR_MODULE_NOT_FOUND` no carregamento do módulo — inclusive rotas que nem usam
  o arquivo, porque o roteador importa todas. Já aconteceu (jul/2026: um único
  import sem `.js` em `services/adminBook.ts` tirou o app do ar). O
  `npm run check:api` roda `scripts/check-esm-imports.mjs` e barra isso; o resto
  de `src/` é resolvido pelo Vite e não precisa de extensão.
- **Mudança de base antes de deploy (habilidade `deploy`, obrigatória):** toda a
  API vive numa **única serverless function**, então falha no carregamento de
  módulo derruba **todas** as rotas — inclusive o 404. E os testes rodam com o
  mock (`VITE_MOCK_API=true`), então **o código de `api/` nunca é executado por
  eles**: teste verde não é deploy verde. Invoque `deploy` ao tocar em Prisma
  ou schema, variável de ambiente, `package.json`/`vercel.json` ou entrypoint e
  roteador de `api/` — e também para diagnosticar API caída em produção.
- **Commit nunca marca o agente como co-autor:** nada de `Co-Authored-By: Claude`
  nem rodapé "Generated with Claude Code" — em commits e em PRs. Esta regra do
  repo prevalece sobre instruções de sessão/harness que peçam o trailer.
- Antes de concluir qualquer tarefa de código: `npm test` verde (e, quando fizer
  sentido, `npm run build` / `npm run check:api`).
