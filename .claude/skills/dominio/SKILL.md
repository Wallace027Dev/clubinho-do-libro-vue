---
name: dominio
description: Padrão para trabalhar com regras de negócio e a camada de domínio deste repo (src/domain/). Toda regra de negócio pura (validação, cálculo, gate de permissão como o anti-spoiler) vive em src/domain/ como fonte única, consumida pelo backend real (api/) E pelo mock de homologação — nunca duplicada. Use ao criar/alterar qualquer regra de negócio, validação, cálculo de nota/progresso ou gate de acesso, e para saber onde a regra mora e como testá-la.
---

# Camada de domínio (regras de negócio)

Fonte única das **regras de negócio puras** do clube. Existe para acabar com a
duplicação perigosa: antes, cada regra (faixa da nota, gate anti-spoiler,
horário de conclusão) era escrita **duas vezes** — no backend real
(`api/_routes` + `api/_lib`) e no mock de homologação
(`src/services/mockApi/handlers.ts`). Quando uma cópia mudava e a outra não,
o mock mentia e — pior — o gate anti-spoiler podia divergir e **vazar
spoiler**. Agora a decisão vive num lugar só, testada.

## Onde a regra mora

`src/domain/*.ts` — funções **puras** (sem I/O, sem Prisma, sem `getDb()`, sem
Vue). Recebem dados simples e devolvem uma decisão/valor. Injete o que for
não-determinístico (ex.: `now: Date`) para manter testável.

Módulos atuais:

- `rating.ts` — validação/normalização/formato/média de nota
  (`normalizeRating`, `isValidRating`, `formatRating`, `averageRating`).
- `chapterProgress.ts` — gate anti-spoiler (`isChapterUnlocked`), conclusão
  (`everyChapterFinished`/`everyChapterRated`) e horário de conclusão
  (`resolveFinishedAt`).
- `chapterLabel.ts` — capítulo avulso (Prólogo/Epílogo) e rótulo de mensagem.
- `services/chapterFinish.ts` — **serviço + repositório** de conclusão de
  capítulo (ver abaixo).

## A regra de ouro

**Uma regra de negócio = uma função pura em `src/domain/`, importada dos dois
lados.** Nunca copie a lógica para o handler real e para o mock; ambos importam
do domínio e só cuidam da **persistência** (Prisma de um lado, `getDb()` do
outro).

- Backend real importa com specifier `.js`:
  `import { normalizeRating } from '../../../../src/domain/rating.js'`
  (o `tsconfig.api.json` inclui `src/domain/**`).
- Mock e frontend importam normal:
  `import { normalizeRating } from '../../domain/rating'`.

O que **fica fora** do domínio: acesso a banco, montagem de resposta HTTP,
sessão/autorização de infraestrutura, e a persistência em si. O domínio decide;
a borda executa.

## Fluxos com escrita: serviço + repositório (padrão)

Quando a regra **grava** (progresso, nota, atividade), a lógica ainda é uma só,
mas a persistência muda por lado (Prisma no `api/`, arrays no mock). Padrão em
`src/domain/services/` — referência: `chapterFinish.ts`:

1. **Núcleo puro e síncrono** (`resolveChapterFinish`) aplica gates + validação
   e devolve **um comando** (`{ ok, command }`) ou um erro HTTP (`{ ok, status,
   error }`). É onde a regra vive; recebe os dados já carregados, não faz I/O.
2. **Porta de repositório** (`ChapterFinishRepository<TProgress>`) declara o
   contrato de dados: `getCurrentChapter`, `getActor`, `commitFinish(command)`.
   Retornos são `Awaitable<T>` (valor no mock, `Promise` no Prisma).
3. **Adaptadores** implementam a porta:
   - `api/_lib/repositories/*` — Prisma (transação, assíncrono).
   - no mock, um `commit*` síncrono sobre `getDb()`.
4. **Orquestrador assíncrono** (`finishChapter(repo, input)`) faz ler → decidir
   → gravar para o backend real. **O mock não usa o orquestrador**: chama
   `resolveChapterFinish` direto + o commit síncrono.

Por que essa divisão: o mock é **síncrono de ponta a ponta** — a suíte de
segurança (`handlers.test.ts`) chama os handlers sem `await`. Um serviço só
assíncrono forçaria o mock a virar async e **quebraria esses testes** (que a
política manda preservar). Então o núcleo puro é síncrono e reaproveitado pelos
dois; só o `commit` é assíncrono no lado real.

**Ao criar um novo fluxo de escrita**, siga esse molde: núcleo puro devolvendo
comando, porta de repositório, adaptador Prisma + commit no mock. Assim a regra
não duplica e o mock continua síncrono.

## Fluxo ao criar/alterar uma regra de negócio

1. **Escreva/edite a função pura** em `src/domain/` (ou crie um módulo novo e
   coeso). Injete dependências não-determinísticas.
2. **Ligue os dois lados** à função: o handler real (`api/_routes`/`api/_lib`)
   e o mock (`handlers.ts`). Se achar a mesma lógica copiada, **substitua as
   duas cópias** pela chamada ao domínio.
3. **Teste no domínio** (ver abaixo).
4. Rode `npm run check:api`, `npm test` e — se tocou a fronteira — `npm run
   build`.

## Quais testes usar

- **Teste unitário no próprio domínio** — obrigatório. Arquivo co-locado
  `src/domain/<modulo>.test.ts`; o project `unit` do Vitest já inclui
  `src/**/*.test.ts`, então roda automático. Cubra caminho feliz **e** as
  bordas da regra (faixa inválida, bloqueio, valor-limite, ausência). Delegue à
  habilidade **`teste-unitario`**.
- **Teste de integração** quando a regra muda o comportamento observável de uma
  ação de store / view / rota contra o mock — delegue à habilidade
  **`teste-integracao`** (ex.: "não avaliar o livro sem concluir todos os
  capítulos" continua devolvendo 403).
- Na dúvida sobre a camada, chame a coordenadora **`teste`**.

Exemplo de teste de domínio (regra do anti-spoiler):

```ts
import { describe, expect, it } from 'vitest'
import { isChapterUnlocked } from './chapterProgress'

describe('acesso ao capítulo (anti-spoiler)', () => {
  it('libera só quem concluiu o capítulo no livro atual', () => {
    expect(isChapterUnlocked({ clubBookStatus: 'CURRENT', progressStatus: 'FINISHED' })).toBe(true)
    expect(isChapterUnlocked({ clubBookStatus: 'CURRENT', progressStatus: 'STARTED' })).toBe(false)
  })
})
```

## Manutenção (herda a política do `CLAUDE.md`)

Refatorou o domínio sem mudar a regra → **preserve os testes**. Se um teste do
domínio falhar, explique antes de agir: regra de negócio mudou → **pergunte**
antes de atualizar o teste; a mudança quebrou o código e o teste está certo →
**conserte o código**.
