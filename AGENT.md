# AGENT.md

Guia rápido para agentes de IA e contribuidores que forem mexer neste repositório.
Para o panorama do produto veja [CONTEXT.md](CONTEXT.md); para pendências veja [TODO.md](TODO.md).

## O que é

Clubinho do Libro — PWA privado de clube de leitura (mobile-first). Vue 3 + TypeScript +
Vite no front; funções serverless (formato Vercel) com Prisma + Postgres no back.

## Comandos

Pré-requisitos: **Docker Desktop** e **Node 20+**. Variáveis em `.env.local`
(`DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `API_PORT`).

```bash
npm run dev        # API (:3001) + web (:5173) juntos
npm run dev:web    # só o Vite (front)
npm run dev:api    # só o dev-server das /api
npm run build      # vue-tsc --noEmit && vite build  ← rode SEMPRE antes de commitar
npm run check:api  # typecheck das funções /api
npm run setup      # docker up + db:push + db:seed
npm run db:studio  # Prisma Studio
```

## Arquitetura

- **Front** (`src/`): `views/`, `components/`, `components/ui/` (reutilizáveis),
  `stores/` (Pinia), `services/` (HTTP), `composables/`, `utils/`, `styles/`.
- **Back** (`api/`): `index.ts` é a **única** serverless function (limite de 12 no plano
  Hobby da Vercel); ela delega ao roteador em `_lib/router.ts`, que chama os handlers em
  `_routes/*`. Helpers em `_lib/*`. Em dev, `scripts/dev-api.ts` serve as mesmas funções.
- **Auth**: sessão JWT (`jose`) em cookie HttpOnly; senhas com `bcryptjs`. Admin entra por
  `ADMIN_PASSWORD` (não tem usuário no banco).
- **DB**: Prisma + Postgres (Supabase em produção, Docker em dev). Schema em
  `prisma/schema.prisma`.

## Convenções (importantes)

- **Design tokens**: todo valor de design (cor, espaço, raio, fonte, sombra) mora em
  `src/styles/tokens.css`. Não hardcode cor/raio/fonte novos — use um token existente ou
  crie um.
- **CSS modular**: `src/styles/{base,layout}.css` + `src/styles/components/*.css`, agregados
  por `main.css` via `@import` (a **ordem importa** — tokens → base → layout → components →
  overrides responsivos). Coloque cada regra no arquivo da área certa.
- **Componentes reutilizáveis**: nada de UI repetida. Reuse `src/components/ui/*`
  (`SectionCard`, `DetailHeader`, `UserAvatar`, `EmptyState`, `BookCover`, `ReviewList`,
  `RatingInput`, `ClickableCard`, `BaseButton`, `StarRating`). Lógica repetida vira
  `composables/` ou `utils/` (ex.: `useGoBack`, `format`, `reactions`, `chapters`).
- **Playground `/design`** (admin): ao criar ou alterar um componente de `ui/`, atualize a
  galeria em `src/views/DesignView.vue`. Tokens editáveis ao vivo saem de lá.
- **Áreas admin-only**: rotas com `meta: { requiresAdmin: true }` em `src/router.ts`
  (sorteador em `/admin/sorteio`, design system em `/design`). O guard está em `beforeEach`.
- **Anti-spoiler** é a regra de negócio central (ver [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)):
  comentário/nota de um capítulo só aparece para quem já o concluiu; resenha do livro só
  para quem terminou. Em livro `FINISHED` a restrição cai. Respeite isso nos endpoints.

## Antes de commitar

- `npm run build` precisa passar (typecheck de templates + bundle).
- Commite em uma **branch** (não direto na branch padrão). Mensagens em pt-BR.
- Feche o rodapé de commits com o `Co-Authored-By` do agente.
