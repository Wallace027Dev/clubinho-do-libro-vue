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

## Requisições HTTP: padrão único

Toda entrada/saída de dados segue o caminho **view → ação de store → apiClient →
mock/backend real → domínio → Prisma**, cada camada com sua responsabilidade. Ao
criar/alterar qualquer **chamada de rede, ação de store, endpoint (real ou mock)
ou tela que carrega dados**, **invoque a habilidade `requisicoes-http`**. Ela é a
fonte da verdade e exige, sem exceção:

- **Tipagem dura:** toda requisição (`apiRequest<T>`), todo retorno (tipo em
  `src/types/*`) e **todo objeto** têm tipo explícito. **Nenhum `any`, nenhum
  tipo implícito** (`strict` ligado). Desconhecido → `unknown` + estreitamento.
- **Loading em toda espera:** requisição que demora nunca deixa a tela pipocar.
  Carregamento **específico/parcial** → **skeleton** (`SkeletonLoader`, um só
  componente configurável por props); **tela cheia / carregar mais** → **spinner**
  (`AppSpinner`). A flag de loading é estado da store, controlado em `try/finally`.
- View chama **ação de store**, nunca `apiRequest`/`fetch` direto.

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
- Antes de concluir qualquer tarefa de código: `npm test` verde (e, quando fizer
  sentido, `npm run build` / `npm run check:api`).
