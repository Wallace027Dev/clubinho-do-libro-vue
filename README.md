# Clubinho do Libro

Plataforma privada de clube de leitura, mobile first (PWA). Nasceu como um
sorteador do livro do mes e evoluiu para um clube com livro atual
compartilhado, progresso por capitulo, feed de atividades e comentarios
anti-spoiler.

## Funcionalidades

- **Login de membros** pre-cadastrados e **login admin** por senha.
- **Livro atual** unico do clube, definido e finalizado pelo admin.
- **Capitulos e progresso individual**: cada membro inicia e conclui capitulos.
- **Feed de atividades** (pagina principal): inicio/conclusao de capitulos,
  comentarios, entrada de membros e troca do livro.
- **Comentarios anti-spoiler**: o comentario de um capitulo so aparece para
  quem ja concluiu aquele capitulo.
- **Reacoes** aos comentarios (5 tipos), uma por membro, com troca.
- **Nota e resenha final**: apos concluir todos os capitulos, o membro avalia
  o livro (1-5) com resenha opcional; o clube ve a media e as notas de todos.
- **Historico do clube** ("Livros lidos"): livros finalizados com media,
  resenhas e comentarios por capitulo arquivados.

No feed, apenas as atividades de **comentario** abrem um modal (mostrando o
comentario e permitindo reagir, se voce ja concluiu o capitulo). A pagina de
**Capitulos** mostra somente o seu progresso e o seu comentario; os
comentarios dos outros aparecem no feed.

## Stack

- Vue 3 + TypeScript + Vite (PWA via `vite-plugin-pwa`)
- Pinia (estado) e Vue Router
- Funcoes serverless no formato Vercel (`/api`)
- Autenticacao por sessao JWT (`jose`) em cookie HttpOnly, senhas com `bcryptjs`
- Prisma + Postgres (Supabase em producao; Postgres via Docker em dev)

## Rodando localmente

Pre-requisitos: **Docker Desktop** e **Node 20+**.

```bash
npm install
cp .env.example .env.local   # preencha os valores (ver secao abaixo)
npm run setup                # sobe o Postgres, aplica o schema e roda o seed
npm run dev                  # sobe API (porta 3001) + web (porta 5173) juntos
```

Abra **http://localhost:5173**.

### Contas criadas pelo seed

- Membros: `ana` / `123456` e `bruno` / `123456`
- Admin: acesse `/login/admin` e use o valor de `ADMIN_PASSWORD` do `.env.local`

Para testar o anti-spoiler: entre como `ana`, conclua um capitulo e comente.
Depois entre como `bruno` (ou aba anonima) e clique na atividade de comentario
no feed — o comentario fica bloqueado ate o Bruno concluir o mesmo capitulo.

## Scripts

```bash
npm run dev          # API + web em paralelo (dev completo)
npm run dev:web      # apenas o Vite (front)
npm run dev:api      # apenas o dev-server das funcoes /api
npm run setup        # docker up + db:push + db:seed
npm run db:up        # sobe apenas o Postgres
npm run db:down      # derruba o Postgres
npm run db:push      # aplica o schema Prisma no banco
npm run db:seed      # popula dados de teste
npm run db:studio    # abre o Prisma Studio
npm run build        # typecheck + build de producao
npm run check:api    # typecheck das funcoes /api
```

## Variaveis de ambiente

`.env.example` e o registro de tudo que o projeto precisa. Copie para
`.env.local` (usado no dev) e preencha. Nunca versione `.env`/`.env.local`.

| Variavel | Descricao |
|----------|-----------|
| `DATABASE_URL` | Conexao Postgres (Prisma e dev-server). Em dev aponta para o Docker. |
| `ADMIN_PASSWORD` | Senha do login administrativo (`/login/admin`). |
| `SESSION_SECRET` | Segredo para assinar o JWT de sessao (string longa e aleatoria). |
| `API_PORT` | Porta do dev-server das `/api` (padrao 3001; o Vite faz proxy). |

## Arquitetura

Em **desenvolvimento**, dois processos sobem juntos e o Vite faz proxy de
`/api` para o dev-server, que reaproveita as mesmas funcoes de `api/`:

```text
Navegador
  -> Vite (:5173, front Vue)  --proxy /api-->  dev-server Express (:3001)
                                                   -> Prisma -> Postgres (Docker)
```

Em **producao** (Vercel), nao ha Vite nem Express: o front vira arquivos
estaticos e cada arquivo em `api/` vira uma serverless function:

```text
Navegador -> Front estatico + Serverless Functions (/api) -> Prisma -> Supabase
```

O codigo de negocio em `api/` e identico nos dois ambientes; muda apenas quem
o executa. O dev-server (`scripts/dev-api.ts`) existe so para o desenvolvimento
local.

### Estrutura

```text
api/                Funcoes serverless (auth, admin, livro, capitulos, comentarios, reacoes)
  _lib/             Auth, anti-spoiler, prisma, senhas, helpers HTTP
prisma/             schema.prisma e seed.ts
scripts/dev-api.ts  Dev-server local que serve as funcoes /api
src/
  views/            Feed (home), Capitulos, Login, Perfil, Admin
  components/        Modal de atividade, comentarios do capitulo, sorteador legado
  stores/           Pinia (auth, plataforma, sorteador)
  services/         Cliente HTTP e persistencia
  types/            Tipos de dominio
```

## Deploy

1. Crie um projeto no Supabase e pegue a `DATABASE_URL`.
2. Configure `DATABASE_URL`, `ADMIN_PASSWORD` e `SESSION_SECRET` na Vercel.
3. Rode `npm run db:push` apontando para o banco de producao.
4. Faca deploy na Vercel (o front e as funcoes `/api` sao publicados juntos).
5. Cadastre o primeiro membro pelo painel admin.

## Status das fases

| Fase | Status |
|------|--------|
| 1 - Clube, login, perfil, livro atual | Implementada |
| 2 - Capitulos e progresso individual | Implementada |
| 3 - Feed de atividades | Implementada |
| 4 - Comentarios anti-spoiler | Implementada |
| 5 - Reacoes aos comentarios | Implementada |
| 6 - Nota e resenha final do livro | Implementada |
| 7 - Historico do clube | Implementada |

Detalhes em [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) e [SPRINTS.md](SPRINTS.md).
