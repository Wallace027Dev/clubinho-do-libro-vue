---
name: teste-unitario
description: Escreve testes unitários (camada base da pirâmide) para lógica pura deste repo — utils/funções puras em src/utils e regras de negócio/segurança do mock em src/services/mockApi/handlers.ts. Usa o project "unit" do Vitest (Node, sem UI). Use quando criar/alterar uma função util, um cálculo (nota, progresso, formatação) ou uma regra do mock, ou quando a habilidade "teste" delegar a camada unitária.
---

# Teste unitário

Camada base da pirâmide: rápida, isolada, sem DOM e sem rede. Cobre **lógica
pura** e **regras de negócio** — não monta componentes Vue (isso é
`teste-integracao`).

## Quando usar esta camada

- Nova função pura em `src/utils/*` (formatação, cálculo de nota/progresso,
  etiquetas de capítulo, reações...).
- Nova regra de negócio ou de segurança no mock de homologação
  (`src/services/mockApi/handlers.ts`) — ex.: anti-spoiler, gate de permissão,
  limites, validações.
- Qualquer helper testável sem montar UI nem tocar em store.

Se o que mudou é um **componente/página/store**, essa é a camada de
`teste-integracao`, não esta.

## Onde o teste mora

Co-locado ao lado do código, com sufixo `.test.ts`:

- `src/utils/format.ts` → `src/utils/format.test.ts`
- `src/services/mockApi/handlers.ts` → `src/services/mockApi/handlers.test.ts`

O project `unit` do Vitest inclui `src/**/*.test.ts` e roda em ambiente
**node** (sem `__USE_MOCK_API__`; sem jsdom). O `tsconfig.json` exclui
`src/**/*.test.ts` do build, então o teste não vaza para o bundle.

## Como escrever (padrão do repo)

Import direto do módulo, `describe`/`it`/`expect` do Vitest, nomes em pt-BR
descrevendo a **regra de negócio** — não o código:

```ts
import { describe, expect, it } from 'vitest'
import { chapterTag } from './chapters'

describe('etiquetas de capítulo', () => {
  it('numera capítulos comuns e nomeia prólogo/epílogo', () => {
    expect(chapterTag({ number: 3, title: 'Rumo a Tarbean' })).toBe('Capítulo 3')
    expect(chapterTag({ number: 0, title: 'Prólogo' })).toBe('Prólogo')
  })
})
```

Para regras do mock que leem/escrevem o "banco" em memória, isole cada teste
resetando o estado antes:

```ts
import { beforeEach } from 'vitest'
import { resetMockDb } from './db'

beforeEach(() => resetMockDb())
```

## Princípios

- **Um teste = uma regra de negócio.** O `it` deve descrever o comportamento
  esperado pela regra, não a implementação.
- Cubra o caminho feliz **e** as bordas que a regra define (bloqueio,
  validação, valor-limite). Ex.: se a regra é "anti-spoiler bloqueia comentário
  de quem não concluiu", teste o bloqueio **e** a liberação após concluir.
- Sem mocks de rede: a lógica é pura ou opera sobre o "banco" em memória.
- Determinístico: nada de `Date.now()`/random sem controlar a entrada.

## Rodar

```bash
npm test                        # roda unit + integration (a suíte inteira)
npx vitest run --project unit   # só a camada unitária
```

Todo teste novo tem que passar antes de concluir a tarefa.
