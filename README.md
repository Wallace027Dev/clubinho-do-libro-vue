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
- **Nota por capitulo**: apos concluir um capitulo, o membro da uma nota
  fracionada (1,0 a 5,0); a pagina de avaliacao do livro
  (`/books/:id/ratings`) mostra um heatmap com a media e a satisfacao (%)
  de cada capitulo, com faixas de cor.
- **Nota e resenha final**: apos concluir e dar nota a todos os capitulos,
  o membro avalia o livro (nota fracionada 1,0-5,0) com resenha opcional;
  o clube ve a media e as notas de todos (estrelas com preenchimento
  proporcional).
- **Prologo/Epilogo**: capitulos avulsos cadastrados com numero so para
  ordenacao (0 = prologo) e exibidos sem numeracao.
- **Historico do clube** ("Livros lidos"): livros finalizados com media,
  resenhas e comentarios por capitulo arquivados.
- **Gestao pelo admin**: membros (criar, desativar/reativar preservando o
  historico, redefinir senha), livro atual (com descricao) e capitulos
  (editar sempre; excluir so sem uso).
- **Conta do membro**: troca de senha (exige a atual), apelido e foto de
  perfil por upload da galeria (comprimida no cliente).

Navegacao mobile com tab bar inferior (Feed, Capitulos, Inicio, Lidos,
Perfil). No feed (com busca e filtro por tipo), as atividades de
**comentario** abrem uma pagina de detalhe para ler e reagir — respeitando
o anti-spoiler. A pagina de **Capitulos** mostra o seu progresso; cada
capitulo abre um detalhe com acoes, nota e o seu comentario.

## Stack

- Vue 3 + TypeScript + Vite (PWA via `vite-plugin-pwa`)
- Pinia (estado), Vue Router e icones `lucide-vue-next`
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
api/
  index.ts          Unica serverless function: recebe todo /api/* (rewrite no
                    vercel.json) e delega ao roteador. Uma so funcao por causa
                    do limite de 12 do plano Hobby da Vercel.
  _lib/             Auth, anti-spoiler, prisma, senhas, helpers HTTP e o
                    roteador de rotas (router.ts)
  _routes/          Handlers de cada rota (auth, admin, livro, capitulos,
                    comentarios, reacoes) — nao viram funcoes na Vercel
prisma/             schema.prisma e seed.ts
scripts/dev-api.ts  Dev-server local que serve as funcoes /api
src/
  views/            Home (livro atual), Feed, Capitulos + detalhe, Avaliacao
                    do livro (/review), Heatmap (/books/:id/ratings), Detalhe
                    de atividade, Livros lidos + detalhe, Perfil, Admin, Logins
  components/       BookReview e sorteador legado
    ui/             BaseButton, AppToast, AppTabBar, StarRating
  stores/           Pinia (auth, plataforma, ui/toasts, sorteador)
  services/         Cliente HTTP e persistencia
  types/            Tipos de dominio
  utils/            Rotulos de capitulo (prologo/epilogo sem numeracao)
```

## Deploy

1. Crie um projeto no Supabase e copie as **duas** connection strings:
   a do **transaction pooler** (porta 6543) e a **direta** (porta 5432).
   Os formatos estao comentados no `.env.example`.
2. Na Vercel, importe o repositorio e configure as variaveis:
   - `DATABASE_URL`: a URL do **pooler**, com `?pgbouncer=true` (serverless
     abre muitas conexoes; a URL direta esgota o banco).
   - `ADMIN_PASSWORD` e `SESSION_SECRET`.
3. Aplique o schema no banco de producao usando a URL **direta**, da sua
   maquina:

   ```bash
   DATABASE_URL="postgresql://postgres:<senha>@db.<ref>.supabase.co:5432/postgres" npx prisma db push
   ```

   **Nao rode o seed em producao** — ele cria contas de teste com senha
   fraca (`ana`/`bruno`, senha `123456`).
4. Faca o deploy (o front e as funcoes `/api` sao publicados juntos).
   O `vercel.json` ja redireciona as rotas do Vue Router para o
   `index.html`, e o `postinstall` gera o Prisma Client no build.
5. Acesse `/login/admin` com a `ADMIN_PASSWORD` (o admin nao precisa de
   usuario no banco) e cadastre os membros, o livro atual e os capitulos.

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
| 8 - Redesign UX/UI (tab bar, detalhes, botoes, toasts, upload de foto, gestao admin) | Implementada |
| 9 - Avaliacao por capitulo (nota fracionada + heatmap de satisfacao) | Implementada |

Detalhes em [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) e [SPRINTS.md](SPRINTS.md).
