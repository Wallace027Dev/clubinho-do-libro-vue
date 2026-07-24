---
name: teste-integracao
description: Escreve testes de integração/componente (camada do meio da pirâmide) para este repo — componentes/views Vue e ações de store rodando de verdade contra o mock via apiClient. Usa o project "integration" do Vitest (jsdom + @vue/test-utils), Pinia real, router de memória e o "banco" em memória. Use quando criar/alterar um componente, uma página/view ou uma ação de store, ou quando a habilidade "teste" delegar a camada de integração.
---

# Teste de integração / componente

Camada do meio: exercita **componentes montados** e **ações de store** de
verdade — Pinia real, router de memória e o `apiClient` roteado para o mock em
memória (`__USE_MOCK_API__` ligado neste project). Não usa navegador de verdade
(isso é E2E).

## Quando usar esta camada

- Novo **componente** de UI (`src/components/**`) — testa render, props,
  eventos emitidos e interação.
- Nova **página/view** (`src/views/**`) — testa o fluxo: monta na rota, dispara
  a ação, verifica o que aparece / o que a store faz.
- Nova **ação de store** (`src/stores/**`) — testa store → apiClient → mock →
  estado resultante.

## Onde o teste mora

Em `test/integration/`, com sufixo `.test.ts`. Espelhe a origem:

- componente → `test/integration/components/<Nome>.test.ts`
- view → `test/integration/components/<Nome>View.test.ts`
- store → `test/integration/stores/<nome>Store.test.ts`

O project `integration` inclui `test/integration/**/*.test.ts`, roda em
**jsdom** com o plugin do Vue e `__USE_MOCK_API__: 'true'`.

## Ferramentas do repo

- `@vue/test-utils` (`mount`) para componentes isolados sem estado global.
- `test/integration/support/mount.ts`:
  - `mountAt(component, path, options)` → monta com **Pinia real + router de
    memória** posicionado em `path`; devolve `{ wrapper, router, pinia }`. Use
    para views que dependem de rota/params ou de store.
  - `freshPinia()` → ativa uma Pinia nova; use em teste de store puro.
- `resetMockDb()` de `src/services/mockApi/db` — **sempre** no `beforeEach`
  para isolar o "banco" em memória entre os testes.
- `vi.waitFor(...)` para o assíncrono do `onMounted`/ações (o componente
  carrega dados depois de montar).

## Padrão — componente isolado

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RatingInput from '../../../src/components/ui/RatingInput.vue'

describe('RatingInput', () => {
  it('emite update:modelValue ao mexer no range', async () => {
    const wrapper = mount(RatingInput, { props: { modelValue: 0 } })
    await wrapper.find('input[type="range"]').setValue('4.5')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([4.5])
  })
})
```

## Padrão — view + store contra o mock

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetMockDb } from '../../../src/services/mockApi/db'
import { useAuthStore } from '../../../src/stores/authStore'
import { mountAt } from '../support/mount'
import MinhaView from '../../../src/views/MinhaView.vue'

beforeEach(() => resetMockDb())

describe('MinhaView', () => {
  it('mostra o dado carregado após montar na rota', async () => {
    await useAuthStore().login('joao', '123456')   // seed de sessão, se preciso
    const { wrapper } = await mountAt(MinhaView, '/rota')
    await vi.waitFor(() => expect(wrapper.text()).toContain('esperado'))
  })
})
```

## Padrão — ação de store

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockDb } from '../../../src/services/mockApi/db'
import { usePlatformStore } from '../../../src/stores/platformStore'
import { freshPinia } from '../support/mount'

beforeEach(() => {
  resetMockDb()
  freshPinia()
})

describe('platformStore.novaAcao', () => {
  it('reflete a regra de negócio no estado', async () => {
    const platform = usePlatformStore()
    await platform.novaAcao(/* ... */)
    expect(platform.clubState /* ... */).toBe(/* ... */)
  })
})
```

Credenciais de seed do mock: admin `123456`; membros `joao`/`maria` com senha
`123456`. Fluxos comuns: `adminLogin` → `selectCurrentBook` → `createChapter`;
membro `login` → `loadHome` → `startChapter`/`finishChapter`.

## Princípios

- **Teste a regra de negócio, não a marcação.** Prefira asserções sobre o
  comportamento visível (texto, evento emitido, estado da store) a detalhes de
  DOM frágeis.
- Isole sempre com `resetMockDb()` (e `freshPinia()`/`mountAt`, que criam Pinia
  nova) — nenhum teste pode depender de outro.
- Envolva o assíncrono em `vi.waitFor` em vez de `await nextTick` "no chute".
- Cubra o caminho feliz e o de erro que a regra prevê (ex.: `ApiError` no gate
  anti-spoiler).

## Rodar

```bash
npm test                               # unit + integration
npx vitest run --project integration   # só a camada de integração
```

Todo teste novo tem que passar antes de concluir a tarefa.
