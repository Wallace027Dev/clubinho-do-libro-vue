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
      master/developer. Checks obrigatórios na branch protection da master já
      ativados (ver item abaixo).
- [x] **Checks obrigatórios na `master`.** Branch protection cadastrada no
      GitHub exigindo os checks **"Build, typecheck e testes"** e **"Somente
      developer pode mergear na master"** — a `master` só recebe merge por PR
      com CI verde.
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
      permanece síncrono (preserva a suíte de segurança). Já aplicado à **nota
      de capítulo** (`services/chapterRating.ts`), à **avaliação do livro**
      (`services/bookReview.ts`) e a **comentário/reação**
      (`services/chapterComment.ts` + `services/commentReaction.ts`, com a lista
      canônica de reações em `domain/reactions.ts`), todos com adaptadores
      Prisma. Também migradas as ações de **admin**: capítulos
      (`services/adminChapters.ts`), membros (`services/adminMembers.ts`) e
      ciclo do livro (`services/adminBook.ts`). Todos os fluxos de escrita da
      API agora passam por um serviço de domínio + repositório. De quebra, o
      backend real passou a responder **409** (como o mock) em número de
      capítulo e login duplicados, em vez do 500 por violação de unique.
- [ ] **Garantir "um só livro CURRENT por clube" no banco.** Hoje o 409 é só
      lógico: `hasCurrentBook()` e a escrita são duas idas ao banco, e não há
      constraint. Dois admins aceitando o vencedor ao mesmo tempo criam **dois**
      `ClubBook` `CURRENT`, e todo o app lê com `findFirst` — estado ambíguo
      silencioso. Correção real: índice parcial
      `CREATE UNIQUE INDEX ... ON "ClubBook"("clubId") WHERE status = 'CURRENT'`,
      que exige SQL bruto — e o repo usa `db:push`, sem migrations versionadas.
      Mitigação barata no meio-tempo: re-checar dentro da `$transaction` de
      `selectBook`.
- [ ] **Sem teste automatizado para o que vive em `api/`.** O vitest só cobre
      `src/**` e `test/integration/**`, então a cadeia de fallback da busca de
      livro (Google falha/estoura cota → Open Library) foi verificada só à mão,
      com `tsx`. A lógica testável foi empurrada para `src/domain/`
      (`bookSearchMapping.ts`), mas o I/O em `api/_lib/bookSearch/` está
      descoberto. Opção: um project de teste em Node para `api/**` com `fetch`
      stubado.

## 🟡 Produto e escala

- [ ] **Storage de imagens (Supabase Storage).** Avatares/capas são data URLs
      base64 (até 400 KB) no Postgres — incham linhas e payloads. Mover para
      bucket com URL/CDN.
- [ ] **Busca do feed no servidor.** Hoje o filtro/busca roda no cliente só
      sobre o que já carregou; buscar todo o histórico pede endpoint.
- [ ] **Upload de capa de livro** (hoje só por URL) — complementa o storage.
- [ ] **Configurar `GOOGLE_BOOKS_API_KEY` em produção (ops).** Sem a chave, a
      busca do sorteio cai 100% no Open Library, onde livro brasileiro aparece
      com frequência sem capa e sem número de páginas. A chave é o que faz a
      feature entregar o que promete.
- [ ] **Capa hotlinkada de terceiro.** A URL gravada aponta para
      `books.google.com`/`covers.openlibrary.org`: pode quebrar com o tempo e
      vaza referer. O `BookCover` também não tem `onerror` para cair no
      placeholder listrado quando a imagem morre.
- [ ] **Escolha de edição no Open Library é grosseira.** A regra (português →
      mais completa → menor chave) é determinística, mas não distingue editora
      boa de print-on-demand: para "Dom Casmurro" escolheu uma edição
      "Independently Published" de 150 páginas. Só importa quando o Google não
      está configurado.
- [ ] **Persistir editora, páginas e ISBN do livro.** Hoje a busca mostra esses
      dados só para o admin escolher e eles são descartados no aceite — `Book`
      não tem coluna para eles. Só vale adicionar junto com a tela que os exiba,
      para não criar campo órfão (foi o que aconteceu com `coverUrl`).
- [ ] **Cache de servidor na busca de livro.** Hoje só `Cache-Control:
      private, max-age=60` no navegador. Um `Map` com TTL em `api/_lib/bookSearch/`
      acertaria pouco (instância efêmera na Vercel, e numa rajada de digitação as
      chaves são todas diferentes) — só vale se a cota apertar.
- [x] **Notificações (web push).** Infra + eventos ligados. Base: modelo
      `PushSubscription`, chaves VAPID, `web-push` no backend, rotas
      `/api/push/(un)subscribe`, service worker (`public/push-sw.js` via
      `workbox.importScripts`), serviço no front (`pushService`) e toggle no
      perfil. Conteúdo/alvo no domínio (`src/domain/notifications.ts`, testado).
      **Eventos:** capítulo concluído e livro finalizado (todos os membros
      ativos, menos o autor); novo comentário (anti-spoiler: só quem já concluiu
      aquele capítulo); **reação no seu comentário** (só o autor, e não quando
      reage ao próprio). O push de "novo livro do mês" foi removido a pedido.
      Tocar na notificação abre a **página da interação** (`/activity/:id`, que
      mostra o que a pessoa fez no capítulo e o comentário dela se houver), e o
      service worker navega a janela já aberta em vez de só focá-la. Simulados
      localmente na homologação.
      **Config em produção:** gerar VAPID e rodar `prisma db push` (ver README).
- [x] **Ativar push em produção (ops).** Chaves VAPID (`VAPID_PUBLIC_KEY`,
      `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `VITE_VAPID_PUBLIC_KEY`) cadastradas
      em produção e tabela `PushSubscription` criada via `prisma db push` (URL
      direta). Feature de push funcional em produção. **Verificação final
      (manual):** testar em aparelho real com o PWA instalado (iOS exige tela
      inicial + 16.4+).
- [ ] **(opcional) Mute administrativo de push por membro.** Hoje o membro
      desativa o próprio push no perfil; desativar a conta também corta (efeito
      colateral). Falta um controle durável: campo `pushEnabled` no `User` que o
      notificador respeita + toggle no admin (e, se fizer sentido, preferência
      por tipo de evento).
- [x] **Padronizar camada de dados nas views.** As 4 telas que chamavam
      `apiRequest` direto agora passam por ações de store: comentários/reação/
      ratings na `platformStore`; perfil/senha na `authStore`. Nenhuma view
      importa `apiRequest`. Coberto por testes de integração das novas ações.
- [x] **Feed = comentários / sininho = alertas.** O **feed** (`/feed`) mostra
      **comentários de outras pessoas**, só de capítulos que o membro já
      concluiu (anti-spoiler), cada um com link para a página do comentário. Os
      **alertas** de progresso/marcos (começo/fim de capítulo, livro, avaliação,
      novo membro — de outros usuários) vão para um **modal** aberto pelo
      **sininho no cabeçalho**, com badge de não lidos e scroll infinito.
      `PROFILE_UPDATED` fica oculto. Canais no domínio
      (`src/domain/activities.ts`); filtros por usuário na borda
      (`api/_lib/feedActivities.ts`) e espelhados no mock. `GET /api/activities`
      (feed) e `GET /api/alerts` (sininho).
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
