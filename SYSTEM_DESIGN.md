# System Design

## Produto

O Clubinho do Libro comeca como um PWA mobile first para sorteio do livro do mes. A rede social fica fora do MVP atual.

## Objetivos do MVP

- Permitir cadastrar uma lista de livros candidatos.
- Confirmar a lista antes do sorteio.
- Sortear um livro usando uma roleta animada.
- Permitir aceitar o resultado ou sortear novamente.
- Salvar o livro aceito como livro do mes atual.
- Bloquear novos sorteios ate o proximo mes apos aceitar o livro.
- Associar uma cor RGB aleatoria a cada livro e usar a mesma cor na lista e na roleta.
- Remover os identificadores de cor depois que o livro for aceito como livro do mes.
- Fechar a area de cadastro/roleta durante o bloqueio mensal.
- Funcionar bem em celular e poder ser instalado como PWA.

## Fora do escopo atual

- Login e contas de usuario.
- Clubes multiplos.
- Backend.
- Feed social.
- Progresso de leitura.
- Reacoes, resenhas e comentarios.

## Arquitetura

```text
Vue PWA
  |
  |-- App.vue
  |-- components
  |   |-- BookEntryStep.vue
  |   |-- ConfirmBooksStep.vue
  |   |-- CurrentMonthBook.vue
  |   |-- RouletteStep.vue
  |   |-- RouletteWheel.vue
  |   |-- WinnerModal.vue
  |
  |-- stores
  |   |-- raffleStore.ts
  |
  |-- services
  |   |-- raffleService.ts
  |   |-- storageService.ts
  |
  |-- types
      |-- book.ts
```

Na Fase 1, a plataforma passa a usar backend serverless e Supabase Postgres:

```text
Vue/Vite PWA
  |
  |-- Vercel Serverless Functions (/api)
      |
      |-- Prisma Client
          |
          |-- Supabase Postgres
```

## Fase 1 - Plataforma privada

Objetivos:

- Login de membros pre-cadastrados.
- Login admin via senha armazenada em `ADMIN_PASSWORD`.
- Cadastro manual de membros pelo admin.
- Perfil editavel pelo usuario: apelido e URL de foto.
- Clube unico: Clubinho do Libro.
- Livro atual compartilhado no banco.
- Admin finaliza o livro atual.
- Novo livro so pode ser escolhido quando nao ha livro atual em andamento.
- Membros nao veem lista completa de membros; conhecem outros usuarios pelo feed.

Entidades principais:

- `User`
- `Club`
- `Book`
- `ClubBook`
- `Activity`

## Fase 2 - Capitulos e progresso individual

Objetivos:

- Admin cadastra capitulos do livro atual.
- Membro visualiza os capitulos na pagina do livro atual.
- Membro inicia um capitulo.
- Membro conclui um capitulo.
- Cada inicio/conclusao gera uma atividade no feed do livro.
- O progresso e individual por usuario.
- A base de dados ja fica preparada para comentarios anti-spoiler por capitulo.

Entidades adicionadas:

- `Chapter`
- `ChapterProgress`

Regras:

- Capitulos pertencem ao `ClubBook` atual, nao ao `Book` generico.
- Um usuario tem no maximo um progresso por capitulo.
- Status possiveis: `STARTED` e `FINISHED`.
- Ausencia de progresso equivale a `NOT_STARTED` na interface.
- So e possivel iniciar/concluir capitulos de livro com status `CURRENT`.

## Fase 3 - Comentarios anti-spoiler e reacoes

Objetivos:

- Membro pode comentar um capitulo somente depois de conclui-lo.
- Membro so pode listar comentarios de capitulos que ja concluiu.
- Membro so pode reagir a comentarios que pode ler.
- Cada membro pode manter um comentario por capitulo.
- Cada membro pode manter uma reacao por comentario.

Entidades adicionadas:

- `ChapterComment`
- `ChapterCommentReaction`

Reacoes disponiveis:

- `GOSTEI`
- `SOFRI`
- `SURPRESO`
- `SUSPEITO`
- `DISCUTIR`

Regra anti-spoiler:

```text
Comentario do capitulo N so e legivel para usuario que concluiu o capitulo N.
```

## Fase 6 - Nota e resenha final do livro

Objetivos:

- Membro finaliza a leitura dando nota (1 a 5) e resenha opcional.
- Cada membro mantem uma avaliacao por livro (upsert).
- So pode avaliar quem concluiu todos os capitulos do livro.
- Livro mostra media do clube, notas individuais e resenhas.

Entidade adicionada:

- `BookReview` (pertence a um `ClubBook` e a um `User`).

Regras:

- Avaliacao exige todos os capitulos do `ClubBook` com status `FINISHED`.
- Nota e media sao visiveis para todos os membros.
- A resenha (texto) segue o anti-spoiler: so aparece para quem terminou o
  livro.

## Fase 7 - Historico do clube

Objetivos:

- Listar os livros ja finalizados pelo clube.
- Para cada livro: mes/ano, capa, media, notas e resenhas individuais.
- Mostrar os comentarios por capitulo arquivados (memoria da leitura).
- Estatisticas simples por livro.

Regras:

- Considera apenas `ClubBook` com status `FINISHED`.
- Livro finalizado nao aplica anti-spoiler: resenhas e comentarios ficam
  visiveis para os membros.

Endpoint:

- `GET /api/books/history` agrega livros finalizados, reviews (via helper
  compartilhado com a Fase 6) e comentarios por capitulo.

## Fase 8 - Redesign UX/UI e gestao

Mudancas estruturais (decididas com wireframes em `docs/wireframes/`):

- Navegacao inferior com 5 abas e botao central (Feed, Capitulos,
  Inicio = livro atual, Lidos, Perfil); Home vira a pagina do livro atual.
- Padrao lista -> pagina de detalhe: atividade (`/activity/:id`),
  capitulo (`/chapters/:id`), livro lido (`/history/:id`).
- Componentes base: `BaseButton` (primary/secondary/outline + loading),
  toast global de sucesso/erro, `StarRating` (preenchimento fracionado),
  icones `lucide-vue-next` (emojis so nas reacoes).
- Fluxo dedicado de avaliacao do livro em `/review` (estilo enquete).
- Conta: troca de senha pelo membro (`POST /api/profile/password`, exige a
  senha atual) e foto de perfil por upload (redimensionada no cliente e
  salva como data URL em `avatarUrl`).
- Admin: desativar/reativar membro (soft delete via `User.deactivatedAt`;
  conta desativada nao loga, historico preservado), redefinir senha
  (`PATCH /api/admin/users/:id`), editar capitulo sempre e excluir apenas
  sem progresso/comentarios (`PATCH/DELETE /api/admin/chapters/:id`).
- Desfazer conclusao de capitulo (`POST /api/chapters/:id/reopen`):
  FINISHED -> STARTED, comentario preservado, sem atividade nova.
- `Book.description` (opcional, informado pelo admin; some na Home e nos
  detalhes) — absorve a antiga "aba de livros".
- Deploy: uma unica serverless function (`api/index.ts` + rewrite no
  `vercel.json`) por causa do limite de 12 do plano Hobby da Vercel.

## Fase 9 - Avaliacao por capitulo

Objetivos:

- Cada membro da uma nota fracionada (1,0 a 5,0) por capitulo concluido.
- Heatmap do livro (`/books/:id/ratings`): media e satisfacao (%) por
  capitulo, com faixas de cor.

Entidade adicionada:

- `ChapterRating` (uma por membro/capitulo, upsert; `rating Float`).

Regras:

- So quem concluiu o capitulo pode dar nota (`POST /api/chapters/:id/rating`).
- Avaliar o livro exige nota em todos os capitulos (alem de conclui-los).
- Satisfacao = media/5. Faixas: 4,5-5,0 Incrivel · 4,0-4,4 Otimo ·
  3,0-3,9 Mediano · 2,0-2,9 Ruim · < 2,0 Pessimo.
- Anti-spoiler estendido: em livro CURRENT, a media de um capitulo so
  aparece para quem o concluiu (tile com cadeado); em livro FINISHED,
  todas as medias sao publicas.
- `BookReview.rating` tambem e fracionado (`Float`, uma casa decimal);
  estrelas exibem preenchimento proporcional.

Capitulos avulsos (prologo/epilogo):

- Cadastrados com numero apenas para ordenacao (0 = prologo, ultimo =
  epilogo) e exibidos pelo nome, sem "Capitulo N" (tiles "P"/"E" no
  heatmap). Deteccao pelo titulo ("Prologo"/"Epilogo").

Variaveis obrigatorias:

- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

## Persistencia

Persistencia inicial do sorteador legado: `localStorage`.

Persistencia da plataforma privada: Supabase Postgres via Prisma.

Chave principal: `clubinho-do-libro:raffle-state`.

Dados salvos:

- Livros cadastrados.
- Cor RGB de cada livro.
- Etapa atual do fluxo.
- Rotacao visual da roleta.
- Livro do mes atual.

## Sorteio

O resultado e calculado antes da animacao. A roleta apenas representa visualmente o resultado.

1. Gera um indice vencedor com `crypto.getRandomValues` quando disponivel.
2. Calcula o angulo central do segmento vencedor.
3. Soma voltas completas para criar a sensacao de roleta.
4. Aplica uma transicao CSS com desaceleracao.
5. Ao final da animacao, exibe o modal de decisao.

## Design System

Direcao visual:

- Liquid glass leve.
- Verde oliva, musgo, bege, marfim e caramelo.
- Interface moderna, aconchegante e literaria.
- Mobile first.

Principios:

- Cartoes translucidios com blur sutil.
- Contornos claros e sombras macias.
- Tipografia legivel em telas pequenas.
- Animacoes curtas e com reducao de movimento respeitada.
