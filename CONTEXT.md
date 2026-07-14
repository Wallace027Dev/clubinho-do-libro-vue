# CONTEXT.md

Panorama do projeto para dar contexto rápido a quem chega (humano ou agente).
Guia de trabalho em [AGENT.md](AGENT.md); pendências em [TODO.md](TODO.md).

## Produto

Clubinho do Libro é um **PWA privado de clube de leitura**, mobile-first. Começou como um
**sorteador do livro do mês** (client-only, `localStorage`) e evoluiu, ao longo de 9 fases,
para uma plataforma social com livro atual compartilhado, progresso por capítulo, feed de
atividades, comentários anti-spoiler, reações, notas e histórico.

## Estado atual

- **Fases 1–9 implementadas e em produção** (Vercel + Supabase). Detalhes e histórico em
  [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) e [SPRINTS.md](SPRINTS.md).
- **Sorteador reintroduzido** como ferramenta exclusiva do admin (`/admin/sorteio`):
  reaproveita a store/roleta legada (`localStorage`), com trava mensal — só sorteia quando
  vira o mês e não há livro do mês; aceitar o vencedor define o livro do mês.
- **Componentes reutilizáveis** extraídos em `src/components/ui/*` (nada de UI repetida),
  com composables e utils compartilhados.
- **Design system**: tokens centralizados (`src/styles/tokens.css`), CSS modularizado
  (`base`/`layout`/`components/*`) e um **playground interativo** em `/design` (admin) com
  galeria de componentes e edição de tokens ao vivo (cores, raios, fontes).

## Arquitetura (resumo)

```text
DEV:  Navegador → Vite (:5173) --proxy /api--> dev-server Express (:3001) → Prisma → Postgres (Docker)
PROD: Navegador → Front estático + Serverless Functions (/api) → Prisma → Supabase
```

O código de negócio em `api/` é idêntico nos dois ambientes; muda só quem o executa.

## Modelo de domínio

`User` (MEMBER/ADMIN) → `Club` → `ClubBook` (livro atual, `CURRENT`/`FINISHED`) com
`Chapter`s → `ChapterProgress` (por usuário), `ChapterComment` + `ChapterCommentReaction`
(5 tipos), `ChapterRating` (nota fracionada 1–5) e `BookReview` (nota + resenha final).
`Activity` alimenta o feed. Schema completo em `prisma/schema.prisma`.

## Regra central

**Anti-spoiler**: comentário/nota de um capítulo só é visível para quem já o concluiu;
resenha do livro só para quem terminou a leitura. Em livro `FINISHED` a restrição cai
(o histórico fica público).

## Repositório

- Remote `origin`: `clubinho-do-libro-vue` (privado). O sufixo `-vue` indica que a
  plataforma foi uma reconstrução; a versão **standalone original do sorteador** (Sprints
  1–3, testes pendentes) provavelmente vive em um repositório separado, não neste histórico.
- Branch padrão: `master`.
