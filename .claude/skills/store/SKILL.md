---
name: store
description: Padrão de store (Pinia) deste repo — criar ou refatorar uma store no estilo setup. Estado tipado em refs, getters em computed, ações async que são as únicas donas do apiRequest e controlam as flags de loading em try/finally. Diz o que expor, como nomear e como refatorar sem quebrar a rede de testes. Use ao criar uma nova store ou ação de store, ou ao refatorar uma existente. Regras da requisição em `requisicoes-http`; visão do módulo em `modulo`.
---

# store — stores Pinia (criar e refatorar)

A store é a **dona da orquestração de dados**: guarda o estado reativo, expõe
getters e concentra as **ações** que falam com a rede. A view chama a ação; a
ação chama `apiRequest`. Serve tanto para **criar** uma store nova quanto para
**refatorar** uma existente (refatorar = trazer o código atual para estas
regras).

## Estilo: setup store

Toda store usa a forma de composição (`defineStore(id, () => { ... })`), como
`platformStore`, `authStore`, `uiStore`, `raffleStore`:

```ts
export const usePlatformStore = defineStore('platform', () => {
  // 1. Estado — refs tipados
  const clubState = ref<ClubState>({ currentBook: null, activities: [] })
  const isLoading = ref(false)
  const isLoadingMoreActivities = ref(false)

  // 2. Getters — computed derivados do estado
  const unreadAlertsCount = computed(() => /* ... */)

  // 3. Ações — async, únicas donas do apiRequest
  async function loadHome() {
    isLoading.value = true
    try {
      clubState.value = await apiRequest<CurrentBookResponse>('/api/books/current')
    } finally {
      isLoading.value = false
    }
  }

  // 4. Expor tudo que a view usa
  return { clubState, isLoading, isLoadingMoreActivities, unreadAlertsCount, loadHome }
})
```

## Regras da store

1. **Estado tipado.** Todo `ref` tem tipo explícito (`ref<ClubState>`,
   `ref<AuthUser[]>`, `ref(false)`). Nada de `any` nem implícito.
2. **A ação é a única que chama `apiRequest`.** View nunca chama a rede; a ação
   tipa a resposta (`apiRequest<T>`) — ver `requisicoes-http`.
3. **Flag de loading por espera, em `try/finally`.** Cada requisição que demora
   tem sua flag no estado (`isLoading`, `isLoadingMoreActivities`, …), ligada
   antes e **sempre** desligada no `finally`. A view lê a flag para decidir
   skeleton/spinner.
4. **Getters em `computed`, sem efeito colateral.** Derivam do estado; não fazem
   I/O.
5. **Regra de negócio não mora aqui.** Cálculo/validação/gate é do domínio
   (`dominio`); a ação só orquestra.
6. **Nomes:** `useXStore` / `defineStore('x', …)`; ações como verbo
   (`loadHome`, `createMember`, `loadMoreActivities`); flags como
   `isLoading…`; getter como substantivo (`unreadAlertsCount`).
7. **Exponha só o que a view precisa** no `return` (estado, getters e ações).

## Refatorar uma store existente

Refatorar aplica as mesmas regras sem mudar o comportamento observável:

- Extraia regra de negócio que vazou para a ação → mande para `src/domain/`
  (`dominio`).
- Requisição sem tipo → adicione o genérico e o tipo em `src/types/*`.
- Espera sem loading → adicione a flag + `try/finally` e o
  skeleton/spinner na view (`requisicoes-http`).
- Store grande demais / responsabilidades misturadas → separe por domínio
  (ex.: dividir `platformStore`), mantendo cada ação com uma responsabilidade.

**Refatoração não muda regra de negócio → os testes (sobretudo unitários) ficam
intactos.** Se um teste ficar vermelho, **pare e explique** antes de agir: regra
mudou → pergunte antes de atualizar o teste; código quebrou → conserte o código,
não o teste (política do `CLAUDE.md`).

## Testar (obrigatório)

Store nova ou ação nova/alterada → **integração** (a ação roda de verdade contra
o mock via `apiClient`): invoque `teste-integracao`. Na dúvida da camada,
invoque a coordenadora `teste`. Não conclua sem `npm test` verde.

## Relacionadas

- **`requisicoes-http`** — como a ação faz a requisição (tipagem, apiClient,
  loading).
- **`dominio`** — regra de negócio que a ação chama.
- **`teste` / `teste-integracao`** — testar a store.
- **`modulo`** — a store dentro do módulo inteiro.
