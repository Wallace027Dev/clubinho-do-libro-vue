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
