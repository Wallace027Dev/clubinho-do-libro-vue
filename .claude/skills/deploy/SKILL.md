---
name: deploy
description: Guarda das mudanças de base que quebram o deploy na Vercel — Prisma/schema, variáveis de ambiente, pipeline de build/install, entrypoint e roteador de /api. Use SEMPRE antes de mergear na master (ou de pedir deploy) quando a mudança tocar um desses pontos, e use também para diagnosticar API caída em produção (500 FUNCTION_INVOCATION_FAILED, "A server error has occurred").
---

# deploy — mudanças de base que a Vercel castiga

Este projeto serve **toda** a API por **uma única serverless function**
(`api/index.ts` → `api/_lib/router.ts`; o porquê está no comentário do
roteador). Isso tem uma consequência que domina tudo neste arquivo:

> **Se algo falhar no carregamento do módulo, a API inteira cai** — todas as
> rotas, inclusive as que não tocam o banco, inclusive o 404 do roteador. A
> Vercel devolve `FUNCTION_INVOCATION_FAILED` e o app fica inutilizável no
> login, porque a primeira chamada é `/api/auth/me`.

Os gates locais **não** pegam isso:

- `npm run check:api` só faz *typecheck* — não executa nada.
- `npm test` e `npm run test:e2e` rodam com `VITE_MOCK_API=true`: o mock atende
  `/api/*` no navegador, então **o código de `api/` nunca é executado**.

Ou seja: dá para ter 240 testes verdes, CI verde, e a API não subir em produção.

## Antes de mergear: checklist por tipo de mudança

### Tocou em Prisma (schema, cliente, consultas)

- [ ] **`prisma generate` está no `build`?** O `postinstall` não basta: se a
      Vercel reaproveitar cache de instalação, o cliente não é gerado e o
      `import { PrismaClient } from '@prisma/client'` falha com
      `SyntaxError: ... does not provide an export named 'PrismaClient'`.
      Isso é erro de **instanciação de módulo** — nenhuma proteção em runtime
      (try/catch, cliente preguiçoso) segura.
- [ ] Mudou `schema.prisma`? Rodar `prisma db push` no banco de produção com a
      URL **direta** (porta 5432), não a do pooler — ver README/`.env.example`.
      O repo não versiona migrations: `db push` é o mecanismo.
- [ ] Campo novo é **nulável** ou tem default? Sem isso, `db push` numa tabela
      com dados falha ou pede reset.

### Tocou em variável de ambiente

- [ ] A variável existe na Vercel em **Production e Preview** antes do merge?
- [ ] Está documentada em `.env.example` **e** no README?
- [ ] É segredo de servidor? Então **sem** prefixo `VITE_` (o que tem esse
      prefixo entra no bundle do front e vaza).
- [ ] O código degrada sem ela, ou explode? Prefira degradar: `api/_lib/push.ts`
      (VAPID) e `api/_lib/bookSearch/google.ts` (chave do Google) são o padrão —
      leitura memoizada, ausência vira no-op/fallback. Use `getRequiredEnv`
      (`api/_lib/http.ts`, que lança) **somente dentro do handler**, nunca no
      topo do módulo.
- [ ] Atenção ao diagnóstico: com Prisma 6, `DATABASE_URL` ausente **não** falha
      na construção do cliente — falha na primeira consulta. Rota sem banco
      continua respondendo, então o sintoma é parcial, não total.

### Tocou em `api/` (rota nova, roteador, entrypoint)

- [ ] **Todo import relativo termina em `.js`** (também em `src/domain/`, também
      em `import type`). O Node em ESM não resolve extensão faltante, e `tsc`,
      Vite, Vitest e `tsx` **toleram** — então esse erro passa por todos os
      gates e só aparece em produção, derrubando a função inteira. É o que
      `npm run check:api` verifica via `scripts/check-esm-imports.mjs`.
- [ ] **Nada executa no topo do módulo.** Só `const`/`let` de configuração e
      imports. Sem `new Cliente()`, sem leitura de env que lance, sem
      `await`/IIFE no escopo do módulo — qualquer um desses derruba a função
      inteira no import.
- [ ] Rota nova = arquivo em `api/_routes/` **+** entrada na tabela de
      `api/_lib/router.ts`. Não cria function nova (o plano Hobby limita a 12).
- [ ] Id/param que entra em URL de terceiro ou em caminho é validado por formato
      (ver `openLibraryWorkId` e `isGoogleVolumeId` em `api/_lib/bookSearch/`).

### Tocou em `package.json` (scripts, deps) ou `vercel.json`

- [ ] O `build` continua contendo `prisma generate`?
- [ ] Dependência usada em `api/` está em `dependencies`, não em
      `devDependencies` (a function não instala dev).
- [ ] Mexeu em `rewrites`? O rewrite `/api/:path*` → `/api?__path=:path*` é o
      que faz o roteador funcionar; sem ele todas as rotas somem.

## Verificação obrigatória: execute o código de `api/`

Como os testes não exercitam `api/`, faça **uma** destas antes de mergear:

```bash
# 1. Guard de resolução ESM (pega import sem .js, que só quebra em produção)
npm run check:api      # tsc + scripts/check-esm-imports.mjs

# 2. Sobe a API real (não o mock) e bate nas rotas
npm run dev            # api em :3001 + web em :5173
curl -i localhost:5173/api/auth/me          # 200 com user:null (sem sessão)
curl -i localhost:5173/api/nao-existe       # 404 do roteador
```

**Cuidado com falso negativo:** `npx tsx -e "import('./api/_lib/router.ts')"`
carrega o grafo, mas o `tsx` **resolve extensão faltante** — ele passa mesmo com
o import que derruba a produção. Serve para pegar erro em tempo de módulo
(algo executando no topo), não para validar especificadores. Quem valida
especificador é o passo 1.

## Depois do deploy: fumaça em produção

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://clubinhodolibro.vercel.app/api/auth/me
curl -s -o /dev/null -w "%{http_code}\n" https://clubinhodolibro.vercel.app/api/nao-existe
```

## Diagnóstico quando a API está caída

O discriminador é a **rota inexistente**:

| Sintoma | Onde está o problema |
| --- | --- |
| `/api/nao-existe` também dá 500 | **Carregamento do módulo.** O 404 nem é alcançado: cliente Prisma ausente, algo executando no topo de um módulo, ou dependência faltando no deploy. |
| `/api/nao-existe` dá 404, mas rotas reais dão 500 | **Handler.** Banco inacessível/pausado, env que falta e é lida no handler, erro de consulta. |
| Só uma rota dá 500 | Bug daquele handler. |
| 401 em tudo | Sessão/cookie, não deploy. |

**Log da Vercel sem acesso ao painel:** as anotações de check run do GitHub são
públicas. O reporter `github` do Playwright (ligado quando `CI=1` em
`playwright.config.ts`) publica falha de E2E como anotação, legível por
`GET /repos/{owner}/{repo}/commits/{sha}/check-runs` e depois
`/check-runs/{id}/annotations`. Isso não cobre log de runtime da Vercel — para
esse, peça ao dono do projeto o texto da exceção em Logs → Functions.

## Histórico: o incidente que originou esta habilidade

Julho/2026: **toda** a API respondeu 500 `FUNCTION_INVOCATION_FAILED`, inclusive
`/api/nao-existe` — o app não passava do login, porque a primeira chamada é
`/api/auth/me`.

A causa real foi **um import relativo sem `.js`** em
`src/domain/services/adminBook.ts` (`from '../chapterStructure'`). O Node em ESM
não resolve extensão faltante e a função morria no carregamento:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/src/domain/chapterStructure'
imported from /var/task/src/domain/services/adminBook.js
```

Como o roteador importa todas as rotas, uma linha derrubou a API inteira. E
passou por `check:api` (tsc tolera), pelos 243 testes (rodam com mock) e pelo CI.

Duas hipóteses foram investigadas e **descartadas com experimento** antes disso —
vale registrar para não custar tempo de novo:

- *Cliente Prisma ausente no deploy* (`prisma generate` só no `postinstall`):
  reproduzida localmente com `mv node_modules/.prisma …`, dá
  `SyntaxError: ... does not provide an export named 'PrismaClient'` — mesmo
  sintoma de fora. Descartada por **redeploy de produção sem cache**, que não
  mudou nada. O `prisma generate` foi para o `build` de todo jeito, porque a
  pegadinha é real; só não era esta.
- *`DATABASE_URL` ausente*: descartada por teste — no Prisma 6 a variável só é
  exigida na primeira consulta, não na construção do cliente.

O caminho que resolveu foi o **runtime log da Vercel** (Deployment → Logs), com
a rota inexistente como discriminador para saber que era carregamento de módulo.

Lições que esta habilidade existe para repetir:

1. **Teste verde não é deploy verde** enquanto o mock atender `/api/*` nos testes.
2. **Sintoma igual não é causa igual** — duas hipóteses reproduziam o mesmo 500.
   Vá ao log antes de aplicar correção baseada em semelhança.
