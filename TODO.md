# TODO — Melhorias e pendências

Backlog de manutenibilidade, segurança e produto. Contexto em
[CONTEXT.md](CONTEXT.md); convenções em [AGENT.md](AGENT.md); histórico de
versões em [CHANGELOG.md](CHANGELOG.md).

Legenda: 🔴 alta · 🟡 média · 🟢 baixa · 🔭 evolução maior · ✅ em andamento.

## 🔴 Fundação técnica (protege todo o resto)

- [x] **Testes automatizados — pirâmide completa.** Feito: **unit** (utils +
      regras/segurança do mock), **integração** (stores auth/platform e
      componentes via jsdom + `@vue/test-utils`) e **E2E** (Playwright dirige o
      app real com o mock: login e jornada do membro). 59 testes de
      unit/integração + 3 E2E. **Ampliar aos poucos:** `raffleStore`, mais
      telas e mais fluxos E2E (admin, anti-spoiler entre membros).
- [x] **CI de qualidade.** `ci.yml` roda `build` + `check:api` + `npm test`
      (job "qualidade") e o E2E (job "e2e") em toda PR e nos pushes de
      master/developer. **Falta:** marcar o check "Build, typecheck e testes"
      como obrigatório na branch protection da master (e opcionalmente o E2E).
- [ ] **Tornar os checks obrigatórios na `master`** (passo manual no GitHub —
      sem isso a proteção não bloqueia de fato). Em *Settings → Branches*
      exigir os checks **"Build, typecheck e testes"** e **"Somente developer
      pode mergear na master"**, ou via API:
      ```bash
      gh api -X PUT repos/Wallace027Dev/clubinho-do-libro-vue/branches/master/protection \
        --input - <<'JSON'
      {
        "required_status_checks": {
          "strict": true,
          "contexts": ["Build, typecheck e testes", "Somente developer pode mergear na master"]
        },
        "enforce_admins": true,
        "required_pull_request_reviews": { "required_approving_review_count": 0 },
        "restrictions": null
      }
      JSON
      ```
- [x] **Rate limiting no login.** `/api/auth/login` (por IP) e
      `/api/admin/login` bloqueiam com **429** após 5 tentativas falhas por
      minuto; login correto zera o contador. Espelhado no mock + testes.
      **Caveat:** o contador é em memória do processo — em serverless é
      best-effort (some no cold start). **Upgrade:** mover o contador para
      Postgres/Redis para garantia forte entre instâncias.
- [x] **Extrair camada de domínio (regras puras).** As regras de negócio puras
      agora vivem em `src/domain/` (fonte única): nota (`rating.ts` — faixa,
      normalização, formato, média), progresso/anti-spoiler (`chapterProgress.ts`
      — `isChapterUnlocked`, conclusão, horário) e rótulos (`chapterLabel.ts`).
      O backend real (`api/`) e o mock importam do mesmo lugar — fim da
      duplicação do gate anti-spoiler e da validação de nota. Cobertas por
      testes unitários no próprio domínio (`src/domain/*.test.ts`); padrão na
      habilidade `dominio`.
- [x] **Abstração de repositório (fluxos de escrita).** Padrão implantado em
      `src/domain/services/chapterFinish.ts`: núcleo puro que decide + comando,
      porta `ChapterFinishRepository` e adaptadores (Prisma em
      `api/_lib/repositories/`, commit síncrono no mock). O handler real ficou
      fino (orquestrador `finishChapter`); o mock reusa o mesmo núcleo e
      permanece síncrono (preserva a suíte de segurança). Já aplicado também à
      **nota de capítulo** (`services/chapterRating.ts`) e à **avaliação do
      livro** (`services/bookReview.ts`), com adaptadores Prisma. **Referência**
      para migrar os demais fluxos de escrita (comentário/reação, admin)
      incrementalmente ao mesmo molde.

## 🟡 Produto e escala

- [ ] **Storage de imagens (Supabase Storage).** Avatares/capas são data URLs
      base64 (até 400 KB) no Postgres — incham linhas e payloads. Mover para
      bucket com URL/CDN.
- [ ] **Busca do feed no servidor.** Hoje o filtro/busca roda no cliente só
      sobre o que já carregou; buscar todo o histórico pede endpoint.
- [ ] **Upload de capa de livro** (hoje só por URL) — complementa o storage.
- [ ] **Notificações (web push):** novo livro do mês, novo capítulo, comentário
      no seu capítulo.
- [x] **Padronizar camada de dados nas views.** As 4 telas que chamavam
      `apiRequest` direto agora passam por ações de store: comentários/reação/
      ratings na `platformStore`; perfil/senha na `authStore`. Nenhuma view
      importa `apiRequest`. Coberto por testes de integração das novas ações.
- [ ] **Dividir o `platformStore`** (livro + membros + histórico + feed + admin)
      antes de virar "god store" — ex.: `adminStore`, `feedStore`.

## 🟢 Polimento

- [ ] **Tipar a fronteira da API** — 22 handlers usam `req: any, res: any`.
- [ ] **Tema escuro** (hoje `color-scheme: light`); a base de tokens já ajuda.
- [ ] **Auditoria de acessibilidade** no novo tema (contraste, foco, labels).
- [ ] **Observabilidade** — logs estruturados / Sentry nas funções serverless.
- [ ] **Otimizar queries** de histórico/ratings (`Promise.all` com uma query
      por livro).
- [ ] **ESLint + Prettier** para consistência (hoje não há lint/format).
- [ ] Migrar para tokens os valores de design ainda **inline** no CSS
      (`rgba(...)` de superfícies/bordas, alguns espaçamentos/tamanhos).
- [ ] Verificar o playground `/design` **ao vivo** (admin-gated).

## 🔭 Evolução maior (roadmap social)

- [ ] **Multi-clube** — hoje é um clube único (Fase 5 do roadmap).
- [ ] **Camada social** — perfis públicos, seguir membros, estatísticas do
      clube.

## Deploy (referência)

- Fluxo no [README.md](README.md): Vercel + Supabase; schema aplicado pela URL
  **direta**; `DATABASE_URL` de produção pelo **pooler** (`?pgbouncer=true`);
  **nunca** rodar o seed em produção.
- `master` é protegida (`proteger-master.yml`): só recebe merge da `developer`.
