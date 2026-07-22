# Changelog

Histórico de versões do **Clubinho do Libro**.

O projeto ainda é um MVP em evolução, então o versionamento vive na faixa
**0.x** (nenhuma release 1.0 até a aplicação estar completa). Convenção:

- **0.MINOR.0** — um marco/grande release (novas funcionalidades).
- **0.MINOR.PATCH** — correções sobre um marco.

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/);
datas em AAAA-MM-DD. Cada versão tem uma tag `vX.Y.Z` no commit correspondente.

## [0.10.0] - 2026-07-20
### Alterado
- **Redesign visual completo — tema "Biblioteca acolhedora"** (PR #2): nova
  paleta papel/oliva quente e tipografia serif literária; fundo de papel com
  textura de linho (sem o degradê animado); painéis de papel no lugar do
  efeito _glass_, tab bar sólida, cards com sombra suave e etiquetas
  carimbadas; "fita de leitura" listrada com marcador de página; heatmap em
  faixas quentes; roleta do sorteio com borda de papel e ponteiro terracota;
  botões sólidos/fantasma, chips tracejados e inputs de papel. Também
  atualiza as cores do manifest PWA, o selo de homologação e os defaults do
  playground de design.

## [0.9.0] - 2026-07-18
### Adicionado
- **Scroll infinito** no feed (`/feed`) e na tela de capítulos (`/chapters`),
  carregando as atividades/capítulos de 30 em 30.
- Endpoint paginado `GET /api/activities` (paginação por cursor), que dá acesso
  a todo o histórico do feed — antes limitado às 30 atividades mais recentes.

## [0.8.0] - 2026-07-16
### Alterado
- A nota do capítulo passou a ser **obrigatória na conclusão** e agora aparece
  na atividade de fim de capítulo no feed — "terminou o capítulo X e deu nota
  Y" — em vez de apenas "terminou o capítulo X".

## [0.7.2] - 2026-07-14
### Corrigido
- Foto de perfil em retrato não encaixava no círculo do avatar (transbordava e
  aparecia desalinhada).

## [0.7.1] - 2026-07-14
### Corrigido
- Na tela "Livros lidos", a capa compacta invadia o título/autor do card.

## [0.7.0] - 2026-07-14
### Adicionado
- Ambiente de **homologação** com "banco" em memória no navegador (ligado nos
  deploys de Preview), com seed inicial e selo de homologação com reset.
### Alterado
- Comentário do capítulo em formulário inline com edição; foto de perfil
  quadrada (recorte central) e ampliável em modal; atividades de início/fim de
  leitura mais enxutas no feed; horário de conclusão do capítulo informável
  manualmente; remoção do botão de login de admin da tela de entrada.

## [0.6.0] - 2026-07-11
### Adicionado
- Sorteador do livro do mês no painel do admin, componentes reutilizáveis e
  design system com tokens centralizados.

## [0.5.0] - 2026-07-10
### Adicionado
- **Avaliação por capítulo (Fase 9):** nota fracionada (ex.: 4,8) com estrelas
  de preenchimento parcial, heatmap de satisfação por capítulo e prólogo/
  epílogo sem numeração na interface.

## [0.4.0] - 2026-07-10
### Alterado
- **Redesign de UX/UI (Fase 8):** navegação inferior com aba central, feed com
  busca e filtros, página de detalhe de atividade, tela de capítulos com
  detalhe e fluxo de avaliação dedicado, painel admin (gestão de membros e
  capítulos), perfil com upload de foto, troca de senha e estatísticas,
  acentuação pt-BR em toda a interface e fundo radial animado.
### Adicionado
- Base de componentes: `BaseButton` com variantes, toast global e estados de
  carregamento.

## [0.3.0] - 2026-07-09
### Adicionado
- Primeiro **deploy em produção na Vercel**, com as funções `/api`
  consolidadas em uma única função serverless.

## [0.2.0] - 2026-07-05
### Adicionado
- **Nota e resenha final do livro (Fase 6):** avaliação individual com média do
  clube e resenha protegida por anti-spoiler.
- **Histórico do clube (Fase 7):** livros finalizados com notas, resenhas e
  comentários por capítulo arquivados.

## [0.1.0] - 2026-07-05
### Adicionado
- **Núcleo do clube privado (MVP):** sorteador do livro do mês, login de membro
  e de admin, livro atual compartilhado, capítulos com progresso individual,
  comentários anti-spoiler e reações.
- Fundação técnica: Vue 3 + Vite + PWA, API serverless, Prisma + Postgres
  (Supabase) e ambiente local com Docker.

[0.10.0]: https://github.com/Wallace027Dev/clubinho-do-libro-vue/releases/tag/v0.10.0
[0.9.0]: https://github.com/Wallace027Dev/clubinho-do-libro-vue/releases/tag/v0.9.0
[0.8.0]: https://github.com/Wallace027Dev/clubinho-do-libro-vue/releases/tag/v0.8.0
[0.7.2]: https://github.com/Wallace027Dev/clubinho-do-libro-vue/releases/tag/v0.7.2
[0.7.1]: https://github.com/Wallace027Dev/clubinho-do-libro-vue/releases/tag/v0.7.1
[0.7.0]: https://github.com/Wallace027Dev/clubinho-do-libro-vue/releases/tag/v0.7.0
[0.6.0]: https://github.com/Wallace027Dev/clubinho-do-libro-vue/releases/tag/v0.6.0
[0.5.0]: https://github.com/Wallace027Dev/clubinho-do-libro-vue/releases/tag/v0.5.0
[0.4.0]: https://github.com/Wallace027Dev/clubinho-do-libro-vue/releases/tag/v0.4.0
[0.3.0]: https://github.com/Wallace027Dev/clubinho-do-libro-vue/releases/tag/v0.3.0
[0.2.0]: https://github.com/Wallace027Dev/clubinho-do-libro-vue/releases/tag/v0.2.0
[0.1.0]: https://github.com/Wallace027Dev/clubinho-do-libro-vue/releases/tag/v0.1.0
