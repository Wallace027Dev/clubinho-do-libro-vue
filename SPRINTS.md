# Planejamento de Sprints

## Sprint 1 - MVP local do sorteador

Objetivo: entregar uma primeira versao funcional do sorteador de livros em Vue PWA.

Entregaveis:

- Scaffold Vue 3 + Vite + TypeScript.
- Configuracao PWA inicial.
- Design tokens do tema Clubinho do Libro.
- Cadastro de livros.
- Confirmacao da lista.
- Roleta animada.
- Modal de resultado.
- Aceitar livro do mes.
- Sortear novamente.
- Persistencia local com `localStorage`.

Critérios de aceite:

- O app roda localmente.
- O fluxo completo pode ser feito em tela mobile.
- O livro aceito aparece como livro do mes atual.
- Recarregar a pagina nao apaga o livro do mes.
- Apos aceitar o livro do mes, novo sorteio fica bloqueado ate o proximo mes.

## Sprint 2 - Polimento mobile e acessibilidade

Objetivo: elevar a experiencia visual e ergonomica do MVP.

Status: concluida.

Entregaveis:

- Revisao responsiva em viewports mobile comuns.
- Estados vazios, erros, confirmacoes e bloqueio mensal.
- Suporte a `prefers-reduced-motion`.
- Navegacao por teclado no modal de resultado.
- Melhorias de foco visivel e contraste.
- Icone PWA inicial.
- Feedback haptico quando suportado.

## Sprint 3 - Historico e gestao de sorteios

Objetivo: transformar o sorteador em ferramenta recorrente do clube.

Status: iniciada.

Entregaveis:

- Historico de livros sorteados por mes.
- Edicao/remocao do livro do mes.
- Limpeza manual do livro do mes para reteste ou correcao.
- Cores RGB persistentes por livro na lista e na roleta.
- Fechamento da area de sorteio apos aceitar o livro do mes.
- Evitar repetir livros ja escolhidos, opcionalmente.
- Exportacao/importacao simples dos dados.
- Reset controlado do sorteio atual.

## Sprint 4 - Preparacao para backend

Objetivo: deixar o app pronto para sincronizacao futura sem reescrever o dominio.

Status: substituida pela Fase 1 com Supabase Postgres.

Entregaveis:

- Contratos de repositorio para dados.
- Separacao clara entre store, servicos e persistencia.
- Modelo de entidades documentado.
- Plano de migracao de `localStorage` para API.
- Testes unitarios para sorteio e persistencia.

## Sprint 5 - Fundacao social futura

Objetivo: desenhar a expansao para rede social sem implementar ainda.

Entregaveis:

- Modelagem de usuarios, clubes e membros.
- Fluxos de leitura, progresso, reacoes e resenhas.
- Regras anti-spoiler.
- Estrategia de notificacoes.
- Decisao de backend e autenticacao.

## Fase 1 - Clube privado com Supabase Postgres

Objetivo: criar a fundacao privada do clube com usuarios pre-cadastrados, admin e livro atual compartilhado.

Status: em desenvolvimento.

Entregaveis tecnicos criados:

- Prisma configurado para Supabase Postgres.
- Modelos `User`, `Club`, `Book`, `ClubBook` e `Activity`.
- API de login de membro.
- API de login admin com `ADMIN_PASSWORD`.
- API de sessao atual e logout.
- API admin para cadastrar/listar membros.
- API de perfil para apelido e foto.
- API de livro atual e finalizacao pelo admin.
- Rotas Vue para `/login`, `/admin/login`, `/admin`, `/profile` e `/`.

Pendencias para ativar em producao:

- Criar projeto Supabase.
- Configurar `DATABASE_URL`.
- Configurar `ADMIN_PASSWORD`.
- Configurar `SESSION_SECRET`.
- Rodar `npm run db:push`.
- Cadastrar o primeiro membro pelo painel admin.

## Fase 2 - Capitulos e progresso individual

Objetivo: permitir acompanhar a leitura do livro atual por capitulo.

Status: implementada no codigo, aguardando banco real para teste integrado.

Entregaveis:

- Modelo `Chapter`.
- Modelo `ChapterProgress`.
- Admin cadastra capitulos do livro atual.
- Home lista capitulos do livro atual.
- Membro inicia capitulo.
- Membro conclui capitulo.
- Feed registra inicio e conclusao de capitulos.
- API bloqueia progresso em livros que nao estao em andamento.

Pendencias para validar em producao:

- Configurar Supabase Postgres.
- Rodar `npm run db:push`.
- Criar membro admin/sessao admin.
- Cadastrar livro atual e capitulos reais.

## Fase 3 - Comentarios anti-spoiler e reacoes

Objetivo: permitir discussoes por capitulo sem expor spoilers para quem ainda nao terminou.

Status: implementada no codigo, aguardando banco real para teste integrado.

Entregaveis:

- Modelo `ChapterComment`.
- Modelo `ChapterCommentReaction`.
- Comentarios liberados somente para quem concluiu o capitulo.
- Criacao/atualizacao de comentario por capitulo.
- Listagem de comentarios por capitulo com protecao anti-spoiler.
- Cinco reacoes por comentario: `GOSTEI`, `SOFRI`, `SURPRESO`, `SUSPEITO`, `DISCUTIR`.
- Uma reacao por usuario por comentario, com troca de reacao.
- UI de comentarios dentro de capitulos concluidos.
- Aviso de bloqueio para capitulos ainda nao concluidos.

Pendencias para validar em producao:

- Rodar `npm run db:push` apos configurar Supabase.
- Testar com dois membros em progressos diferentes.
- Confirmar que comentarios bloqueiam corretamente para quem nao concluiu.

## Fase 6 - Nota e resenha final do livro

Objetivo: permitir que cada membro finalize a leitura com nota e resenha e
que o clube veja a media e as avaliacoes individuais.

Status: implementada e validada localmente.

Entregaveis:

- Modelo `BookReview` (nota 1-5 e resenha opcional, uma por membro/livro).
- Endpoint `POST /api/books/review` com upsert (criar/editar avaliacao).
- Avaliacao liberada apenas apos concluir todos os capitulos do livro.
- Media do clube e notas individuais no `GET /api/books/current`.
- Resenha (texto) protegida por anti-spoiler: so aparece para quem terminou
  o livro; nota e media ficam visiveis para todos.
- Atividade `BOOK_REVIEWED` no feed.
- UI com selecao de estrelas, resenha e lista de avaliacoes na pagina de
  capitulos, mais a media no banner do feed.

## Fase 7 - Historico do clube

Objetivo: guardar a memoria das leituras encerradas.

Status: implementada e validada localmente.

Entregaveis:

- Endpoint `GET /api/books/history` com os livros finalizados do clube.
- Cada livro traz mes/ano, capa, media, notas e resenhas individuais.
- Comentarios por capitulo arquivados (com reacoes), sem anti-spoiler,
  pois o livro ja foi encerrado.
- Estatisticas simples: capitulos, comentarios e avaliacoes.
- Pagina "Livros lidos" (`/history`) com cards expansiveis por livro.
- Seed cria um livro finalizado de exemplo para o historico.

## Fase 8 - Melhorias de UX/UI (backlog)

Objetivo: elevar a qualidade visual e a experiencia de uso da plataforma
apos o primeiro deploy em producao.

Status: backlog, anotado em 2026-07-10. Itens ainda nao priorizados.

### 8.1 Estado de carregamento em requisicoes

- Feedback visual (spinner/skeleton e botoes desabilitados) durante toda
  chamada a API: login, feed, capitulos, comentarios, reacoes, admin.
- Evitar duplo submit enquanto a requisicao esta em andamento.

### 8.2 Botao de exclusao de usuario (admin)

- Acao de excluir membro no painel admin, com confirmacao.
- Decidir estrategia para os dados vinculados (progresso, comentarios,
  reacoes, avaliacoes, atividades): exclusao em cascata ou desativacao
  (soft delete) preservando o historico do clube. Hoje o schema nao tem
  cascata configurada, entao a exclusao direta falharia por FK.
- Novo endpoint DELETE em `/api/admin/users`.

### 8.3 Acentuacao nos textos (portugues do Brasil)

- Revisar todos os textos da interface e das mensagens da API para
  aplicar acentuacao correta (hoje muitos textos estao sem acento).
- Vale definir se docs/comentarios de codigo tambem entram na revisao.

### 8.4 Fundo com degrade radial animado

- Background da aplicacao com degrade radial que se move lentamente
  (posicao do centro do gradiente animada).
- Respeitar `prefers-reduced-motion` (desativar a animacao).
- Manter contraste e legibilidade dos cartoes translucidos por cima.

### 8.5 Componente de botao com variantes

- Criar `BaseButton` (ou `AppButton`) com variantes `primary`,
  `secondary` e `outline`, alem de estados hover/focus/disabled/loading.
- Substituir os botoes existentes aplicando a variante conforme a
  utilidade: acao principal da tela = primary; acoes de apoio =
  secondary; acoes discretas/destrutivas leves = outline.
- Integra com 8.1 (estado loading do botao).

### 8.6 Upload de imagem da galeria (perfil e livro)

- Trocar o input de URL por upload de arquivo (galeria/camera no mobile).
- Requer storage de arquivos: candidato natural e o Supabase Storage
  (bucket publico para avatares e capas), gerando a URL apos o upload.
- Validar tamanho/formato e redimensionar/comprimir no cliente antes de
  enviar (funcoes serverless tem limite de payload).

### 8.7 Aba de livros com modal de detalhes

- Nova aba/pagina listando os livros do clube.
- Ao clicar em um livro, abrir modal com nome, autor e descricao.
- O modelo `Book` hoje nao tem campo `description` — adicionar no schema
  e nos formularios do admin.

### 8.8 Aplicar layout inspirado no baixa fidelidade

- Redesenhar as telas seguindo o wireframe de baixa fidelidade como
  referencia de estrutura, aplicando o design system atual (liquid
  glass, paleta oliva/bege) com estetica moderna.
- Wireframes de referencia salvos em `docs/wireframes/` (ver o README
  da pasta para o mapeamento de cada tela para o clube).

Decisoes tomadas em 2026-07-10:

- Navegacao inferior com 5 abas e botao central destacado:
  Feed, Capitulos, Home (livro atual, botao central), Livros lidos,
  Perfil. A Home passa a ser a pagina do livro atual; o feed vira aba.
- Atividade do feed abre pagina de detalhe (como no wireframe 03), nao
  mais modal.
- Feed ganha busca textual e filtro por tipo de atividade.
- Ordem de aplicacao: 1) componentes base (BaseButton com variantes,
  toast de feedback, estados de loading — itens 8.1/8.5 + wireframe 06),
  2) navegacao inferior + feed, 3) pagina de detalhe, 4) demais telas.
