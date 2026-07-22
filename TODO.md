# TODO — Melhorias e pendências

Backlog de manutenibilidade, segurança e produto. Contexto em
[CONTEXT.md](CONTEXT.md); convenções em [AGENT.md](AGENT.md); histórico de
versões em [CHANGELOG.md](CHANGELOG.md).

Legenda: 🔴 alta · 🟡 média · 🟢 baixa · 🔭 evolução maior · ✅ em andamento.

## 🔴 Fundação técnica (protege todo o resto)

- [x] **Testes automatizados (Vitest) — base + integração.** Feito: project
      `unit` (utils + regras/segurança do mock) e project `integration`
      (stores auth/platform e componentes via jsdom + `@vue/test-utils`).
      59 testes. **Falta:** camada de topo E2E (Playwright, formalizando os
      scripts de screenshot), cobrir `raffleStore` e mais componentes/telas.
- [ ] **CI de qualidade.** Workflow que roda `build` + `check:api` + testes
      (+ lint) em toda PR, complementando `proteger-master.yml`. Hoje nada
      barra uma PR que quebra o build.
- [ ] **Rate limiting no login.** `/api/auth/login` e `/api/admin/login` não
      têm limite de tentativas — admin entra só com `ADMIN_PASSWORD`, exposto a
      força bruta. Adicionar limitador simples (por IP/janela).
- [ ] **Extrair camada de domínio.** Regras de negócio vivem dentro dos
      handlers HTTP (`api/_routes/*`) e estão **duplicadas** no mock de
      homologação (`src/services/mockApi/handlers.ts`, ~1100 linhas). Extrair
      serviços de domínio testáveis que o backend real **e** o mock consumam
      elimina a duplicação e destrava testes unitários da lógica real.

## 🟡 Produto e escala

- [ ] **Storage de imagens (Supabase Storage).** Avatares/capas são data URLs
      base64 (até 400 KB) no Postgres — incham linhas e payloads. Mover para
      bucket com URL/CDN.
- [ ] **Busca do feed no servidor.** Hoje o filtro/busca roda no cliente só
      sobre o que já carregou; buscar todo o histórico pede endpoint.
- [ ] **Upload de capa de livro** (hoje só por URL) — complementa o storage.
- [ ] **Notificações (web push):** novo livro do mês, novo capítulo, comentário
      no seu capítulo.
- [ ] **Padronizar camada de dados nas views.** 4 telas furam a store e chamam
      `apiRequest` direto (`ChapterDetailView`, `ProfileView`, `BookRatingsView`,
      `ActivityDetailView`). Passar tudo pela store.
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
