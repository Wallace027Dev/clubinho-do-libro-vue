---
name: requisicoes-http
description: Padrão de requisições HTTP deste repo — como cada camada (view → ação de store → apiClient → mock/backend real → domínio → Prisma) usa a rede e o que mora em cada uma. Regra dura de tipagem (toda requisição, todo retorno e todo objeto tipados; nenhum any, nenhum tipo implícito) e regra de loading (toda requisição que demora mostra skeleton ou spinner). Use SEMPRE ao criar/alterar qualquer chamada de rede, ação de store, endpoint (real ou mock) ou tela que carrega dados.
---

# requisicoes-http — padrão de requisições

Fonte da verdade de **como dados entram e saem do app** neste repo. Toda chamada
de rede segue o mesmo caminho, é **100% tipada** e **nunca deixa a tela
pipocando** — quando há espera, há loading. Invoque esta habilidade antes de
escrever ou mudar qualquer requisição.

## O caminho de uma requisição (quem faz o quê)

```
View (.vue)                 ← NUNCA chama a rede direto. Só chama ação de store.
  ▲ estado reativo + loading
Ação de store (Pinia)       ← única dona do apiRequest<T>(). Tipa entrada e saída.
  ▲ apiRequest<TResposta>(path, options)
apiClient (src/services)    ← ÚNICO ponto de fetch. Decide mock vs. backend real.
  ├── mock (homologação)    → src/services/mockApi/handlers.ts (banco em memória)
  └── backend real          → api/_routes/*  →  regra pura em src/domain/  →  Prisma
```

Cada camada tem uma responsabilidade e **só** ela:

| Camada | Onde | Responsabilidade | Não faz |
| --- | --- | --- | --- |
| **View** | `src/views`, `src/components` | Renderizar, disparar ação de store, mostrar loading/erro | `apiRequest`, `fetch`, regra de negócio |
| **Ação de store** | `src/stores/*.ts` | Orquestrar a chamada, tipar `apiRequest<T>`, guardar estado e flags de loading | Montar HTML, decidir regra pura |
| **apiClient** | `src/services/apiClient.ts` | Único `fetch`; alterna mock/real pela flag de build; normaliza erro em `ApiError` | Conhecer telas ou regra de negócio |
| **Endpoint real** | `api/_routes/*.ts` | Sessão, ler `req`, chamar o domínio, `sendJson` | Duplicar regra pura (ela mora no domínio) |
| **Mock** | `src/services/mockApi/handlers.ts` | Espelhar o contrato do backend usando o mesmo domínio | Ter regra própria diferente do real |
| **Domínio** | `src/domain/*` | Regra de negócio pura (ver habilidade `dominio`) | I/O, Prisma, Vue |

**Regra de ouro:** a camada de dados nas views passa **por ações de store**,
nunca `apiRequest` direto. Se uma view importar `apiClient`, está errado.

## Tipagem: dura, sem exceção

Este é o ponto inegociável desta habilidade.

1. **Toda requisição é tipada.** `apiRequest<TResposta>(path, options)` sempre
   recebe o tipo do retorno esperado. Nunca `apiRequest(path)` sem genérico
   quando há corpo de resposta útil.
2. **Todo retorno é tipado.** O tipo da resposta mora em `src/types/*` (ex.:
   `CurrentBookResponse`, `ActivitiesResponse`, `UserResponse`) e é reusado pelo
   contrato do mock. Um endpoint = um tipo de resposta nomeado.
3. **Todo objeto tem tipo.** Payloads de entrada, itens de lista, parâmetros de
   função de store, `metadata` — tudo tem `interface`/`type` explícito.
4. **Nenhum `any`. Nenhum tipo implícito.** `strict: true` está ligado em
   `tsconfig.json` e `tsconfig.api.json`. Não introduza `any` (nem `as any`, nem
   parâmetro sem anotação que caia em `any` implícito). Se um tipo é
   genuinamente desconhecido, use `unknown` e estreite com checagem — nunca
   `any`.
   - Dívida conhecida: as assinaturas antigas `handler(req: any, res: any)` em
     `api/_routes` são legado. **Não** copie esse padrão em código novo; ao
     tocar num handler, prefira tipar `req`/`res` corretamente.

```ts
// ✅ ação de store: entrada e saída tipadas, sem any
async function createMember(
  login: string,
  password: string,
  displayName: string
): Promise<AuthUser> {
  const response = await apiRequest<UserResponse>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify({ login, password, displayName })
  })
  members.value.push(response.user)
  return response.user
}
```

## Loading: toda espera tem feedback

Nenhuma requisição que demora pode deixar a tela "pipocando" o conteúdo quando a
resposta chega. **Sempre** mostre um estado de carregamento. A escolha depende do
contexto:

| Situação | O que usar | Componente |
| --- | --- | --- |
| **Carregamento específico / parcial** — uma seção, uma lista, um card cuja forma já conhecemos | **Skeleton** (placeholder com o formato do conteúdo) | `SkeletonLoader` |
| **Carregamento de tela inteira / bloco grande** — a página toda está sendo montada, ou um "carregar mais" no fim da lista | **Spinner** | `AppSpinner` |

Regra prática: **se dá para desenhar o esqueleto do que vem, use skeleton**
(melhor percepção de performance); **se é a tela toda ou um ponto pequeno de
"aguarde", use spinner**.

### `SkeletonLoader` — um componente, muitas formas

Skeleton é **um único componente configurável** (`src/components/ui/SkeletonLoader.vue`).
Não crie um skeleton por tela; passe props:

| Prop | Padrão | Controla |
| --- | --- | --- |
| `rows` | `1` | quantas linhas |
| `columns` | `1` | quantos quadrados por linha |
| `height` | `1rem` | altura de cada bloco |
| `width` | `100%` | largura de cada bloco |
| `radius` | `10px` | arredondamento |
| `gap` | `12px` | espaçamento |
| `label` | `Carregando` | rótulo acessível (`role="status"`) |

```vue
<!-- só a primeira carga mostra skeleton; ao voltar com dado em memória, aparece na hora -->
<SkeletonLoader
  v-if="showSkeleton"
  :rows="3"
  :columns="1"
  height="4.5rem"
  radius="16px"
  label="Carregando o feed do clube"
/>
```

Padrão de "só a primeira carga": `const hasLoaded = ref(false)` +
`const showSkeleton = computed(() => !dado.value.length && !hasLoaded.value)` e
`onMounted` que faz `try { await acaoDeStore() } finally { hasLoaded.value = true }`.

### `AppSpinner` — espera pontual / tela cheia

`src/components/ui/AppSpinner.vue`, props `size` e `label`. Use no sentinela do
scroll infinito (carregar mais) e em telas/ações onde não há forma a esqueletar.

```vue
<div v-if="store.activitiesHasMore" ref="sentinel" class="list-sentinel">
  <AppSpinner v-if="store.isLoadingMoreActivities" size="1.1rem" />
</div>
```

A flag de loading é **estado da store** (`isLoading`, `isLoadingMoreActivities`,
…), setada em `try/finally` na ação. A view só lê essa flag — nunca controla
loading com timers próprios.

## Erros

`apiClient` normaliza qualquer falha em `ApiError` (com `status` e `message`).
A ação de store deixa o erro subir (ou o trata quando faz sentido, como parar o
scroll infinito). A view mostra mensagem em pt-BR. Não engula erro em silêncio
nem exponha stack para o usuário.

## Checklist antes de concluir

- [ ] A view chama **ação de store**, não `apiRequest`/`fetch`.
- [ ] `apiRequest<T>` tem o **tipo de resposta**; o tipo mora em `src/types/*`.
- [ ] Entradas, itens e `metadata` têm **tipo explícito**. Zero `any`, zero
      implícito. `strict` continua verde.
- [ ] Requisição que demora tem **loading**: skeleton (parcial) ou spinner
      (tela cheia / carregar mais), controlado por flag da store.
- [ ] Se mexeu em regra de negócio → habilidade **`dominio`** (não duplicar
      entre real e mock).
- [ ] Endpoint novo? O **mock** espelha o contrato e usa o **mesmo domínio**.
- [ ] Teste correspondente verde (`npm test`) — via habilidade **`teste`**.

## Habilidades relacionadas

- **`dominio`** — regra de negócio pura que o endpoint chama (validação,
  cálculo, gate anti-spoiler). Requisição orquestra; regra decide.
- **`teste-integracao`** — testar ação de store e view rodando contra o mock via
  `apiClient` (é onde a maioria das requisições é coberta).
- **`teste-unitario`** — testar a regra pura do domínio e as regras do mock.
- **`teste`** — coordena qual camada testar.
- **`git-flow`** — branch de tarefa, commit, merge na developer, PR para master.

### Padrões conhecidos por camada

- **Requisição no Vue:** só via ação de store Pinia; estado reativo (`ref`) +
  flag de loading; `onMounted`/evento dispara a ação. Nunca `fetch` na view.
- **Requisição no Vitest (integração):** monta a view/ação com `mountAt`, Pinia
  real e router de memória; a chamada bate no **mock** (banco em memória) pelo
  `apiClient`. Ver `teste-integracao`.
- **Padrão com Prisma ORM (backend real):** o handler em `api/_routes` só faz
  sessão + leitura de `req` + `sendJson`; a **decisão** é do domínio
  (`src/domain/`), e o acesso ao banco usa o cliente de `api/_lib/prisma.ts`.
  A regra de negócio **nunca** vive no handler nem é duplicada no mock — é
  importada do domínio pelos dois lados. Ao criar padrão novo de Prisma, mantenha
  a regra pura fora da query (ver `dominio`).
