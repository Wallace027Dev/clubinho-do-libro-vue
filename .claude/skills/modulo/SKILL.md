---
name: modulo
description: Arquitetura de um módulo/feature deste repo — o mapa das camadas (view → ação de store → apiClient → mock/backend real → domínio → Prisma), o que mora em cada uma e qual habilidade governa cada parte. É a coordenadora: delega tipagem/rede para `requisicoes-http`, a store para `store`, a regra pura para `dominio` e os testes para `teste`. Use ao criar uma feature nova de ponta a ponta ou para entender onde cada coisa vai.
---

# modulo — arquitetura de uma feature

Coordenadora da **arquitetura**. Quando você monta uma feature nova (uma tela que
carrega/salva dados de ponta a ponta), esta habilidade diz **quais camadas
existem, o que mora em cada uma e qual habilidade governa cada parte**. Ela não
repete as regras detalhadas — **delega**.

## As camadas

```
View (.vue)            → renderiza, dispara ação de store, mostra loading/erro
  ▲
Ação de store (Pinia)  → orquestra, tipa apiRequest<T>, guarda estado + flag de loading
  ▲
apiClient              → único fetch; alterna mock × backend real; normaliza ApiError
  ├── mock             → src/services/mockApi/handlers.ts (banco em memória)
  └── backend real     → api/_routes/* → src/domain/* (regra pura) → Prisma
```

| Camada | Onde | Responsabilidade | Governada por |
| --- | --- | --- | --- |
| View | `src/views`, `src/components` | Renderizar, disparar ação, mostrar loading | `requisicoes-http` (loading) |
| Ação de store | `src/stores/*.ts` | Orquestrar, tipar, flags de loading | **`store`** |
| Requisição | `src/services/apiClient.ts` | `fetch` único, tipagem, `ApiError` | **`requisicoes-http`** |
| Endpoint real | `api/_routes/*.ts` | Sessão, ler `req`, chamar domínio, `sendJson` | **`dominio`** |
| Mock | `src/services/mockApi/handlers.ts` | Espelhar o contrato usando o mesmo domínio | **`dominio`** |
| Regra pura | `src/domain/*` | Validação/cálculo/gate, sem I/O | **`dominio`** |

**Regra de ouro:** a view fala com **ação de store**, nunca `apiRequest`/`fetch`
direto. A regra de negócio pura mora em `src/domain/` e é consumida pelo real
**e** pelo mock — nunca duplicada.

## Ordem para montar uma feature nova

1. **Contrato + tipos** — defina o tipo da resposta em `src/types/*` e o path.
   → `requisicoes-http`.
2. **Regra pura** (se houver validação/cálculo/gate) em `src/domain/`.
   → `dominio`.
3. **Backend real** (`api/_routes`) **e mock** (`handlers.ts`), ambos chamando o
   mesmo domínio; contratos idênticos. → `dominio`.
4. **Ação de store** que chama `apiRequest<T>` e controla a flag de loading.
   → `store`.
5. **View** que dispara a ação e mostra skeleton/spinner + estado/erro.
   → `requisicoes-http` (loading).
6. **Testes** de cada peça criada. → `teste` (delega unitário/integração).

## Ao criar código novo — sempre testar

Nova view/componente, nova ação de store, nova função util ou nova regra de mock
→ **invoque `teste`**: ela escolhe a camada (unitário/integração) pela regra de
negócio e delega. Não conclua sem `npm test` verde (e `npm run build` /
`npm run check:api` quando fizer sentido).

## Habilidades que esta coordena

- **`store`** — a ação de store (criar/refatorar).
- **`requisicoes-http`** — a requisição em si (tipagem, apiClient, loading).
- **`dominio`** — regra de negócio pura, real + mock sem duplicar.
- **`teste`** / `teste-unitario` / `teste-integracao` — cobertura por camada.
- **`git-flow`** — branch de tarefa, commit, merge na developer, PR para master.
