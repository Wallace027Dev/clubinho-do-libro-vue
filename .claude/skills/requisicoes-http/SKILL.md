---
name: requisicoes-http
description: Regras da requisição HTTP em si neste repo — tipagem dura (toda requisição, todo retorno e todo objeto tipados; nenhum any, nenhum tipo implícito), o único ponto de rede (apiClient/apiRequest<T>), tratamento de erro (ApiError) e loading em toda espera (skeleton para carga parcial, spinner para tela cheia / carregar mais). Use ao criar/alterar qualquer chamada de rede. Para montar um módulo inteiro, veja `modulo`; para a store, veja `store`.
---

# requisicoes-http — a requisição em si

Escopo **estreito**: as regras da chamada de rede propriamente dita. Quem
orquestra a chamada é a **ação de store** (habilidade `store`); a arquitetura de
todas as camadas é a `modulo`. Aqui ficam só três obrigações: **tipagem**,
**ponto único de rede** e **loading**.

## 1. Ponto único de rede

Todo `fetch` do app passa por `apiRequest<T>` em `src/services/apiClient.ts` — e
**só** por ele. Ele alterna mock (homologação) × backend real pela flag de build
e normaliza erro em `ApiError`. Uma view **nunca** importa `apiClient`/`fetch`;
quem chama `apiRequest` é a ação de store.

## 2. Tipagem: dura, sem exceção

1. **Toda requisição é tipada:** `apiRequest<TResposta>(path, options)` sempre com
   o genérico da resposta.
2. **Todo retorno é tipado:** o tipo mora em `src/types/*` (ex.:
   `CurrentBookResponse`, `ActivitiesResponse`, `UserResponse`) e é reusado pelo
   contrato do mock. Um endpoint = um tipo de resposta nomeado.
3. **Todo objeto tem tipo:** payloads de entrada, itens de lista, parâmetros e
   `metadata` — `interface`/`type` explícito.
4. **Nenhum `any`, nenhum tipo implícito.** `strict` está ligado. Desconhecido →
   `unknown` + estreitamento, nunca `any`/`as any`. (As assinaturas antigas
   `handler(req: any, res: any)` em `api/_routes` são legado — não replique.)

```ts
const response = await apiRequest<UserResponse>('/api/admin/users', {
  method: 'POST',
  body: JSON.stringify({ login, password, displayName })
})
```

## 3. Loading: toda espera tem feedback

Requisição que demora **nunca** deixa a tela pipocar. A escolha depende do
contexto:

| Situação | Componente |
| --- | --- |
| Carga **específica/parcial** (uma seção/lista/card com forma conhecida) | **`SkeletonLoader`** |
| **Tela inteira** ou **"carregar mais"** no fim da lista | **`AppSpinner`** |

Regra prática: dá para desenhar o esqueleto do que vem → **skeleton**; é a tela
toda ou um "aguarde" pontual → **spinner**.

- **`SkeletonLoader`** (`src/components/ui/SkeletonLoader.vue`) é **um** componente
  configurável por props: `rows`, `columns`, `height`, `width`, `radius`, `gap`,
  `label`. Não crie um skeleton por tela — passe props.
- **`AppSpinner`** (`src/components/ui/AppSpinner.vue`): props `size`, `label`.

A **flag** de loading é estado da store (ver `store`), setada em `try/finally` na
ação. A view só lê a flag.

```vue
<SkeletonLoader v-if="showSkeleton" :rows="3" height="4.5rem" radius="16px" label="Carregando o feed" />
<!-- carregar mais -->
<AppSpinner v-if="store.isLoadingMoreActivities" size="1.1rem" />
```

## Relacionadas

- **`store`** — a ação que chama `apiRequest` e guarda a flag de loading.
- **`modulo`** — o mapa das camadas (view → store → apiClient → mock/real →
  domínio → Prisma).
- **`dominio`** — a regra de negócio que o endpoint chama.
