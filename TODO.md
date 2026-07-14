# TODO

Pendências conhecidas. Contexto em [CONTEXT.md](CONTEXT.md); convenções em [AGENT.md](AGENT.md).

## Testes

- [ ] **Não há test runner.** A Sprint 4 previa testes unitários do sorteio e da
      persistência — nunca foram feitos. Adicionar Vitest e cobrir: `raffleStore`,
      utils (`format`, `chapters`, `reactions`), `composables/useGoBack`, e a lógica
      anti-spoiler dos handlers em `api/_routes`.

## Design system

- [ ] Migrar para tokens os valores de design ainda **inline** no CSS (vários `rgba(...)`
      de superfícies/bordas, alguns espaçamentos e tamanhos de fonte). Já centralizados:
      paleta, raios, `--font-body` e `--font-size-xl` (usado pelo `h2`). Fazer aos poucos,
      por arquivo em `src/styles/components/*`.
- [ ] Verificar o playground `/design` **ao vivo** com o stack completo (Docker + login
      admin). Até agora foi validado por `vue-tsc` + `vite build` e checagem de estilos no
      DOM, mas não por inspeção visual da página (que é admin-gated).
- [ ] Avaliar **tema escuro** (hoje `color-scheme: light`); a base de tokens já facilita.

## Produto / entrega

- [ ] Abrir PR e fazer merge da branch de trabalho na branch padrão.
- [ ] (Investigação em aberto) localizar o repositório **standalone original** do sorteador
      (Sprints 1–3), que não está no histórico deste repo — ver [CONTEXT.md](CONTEXT.md).

## Deploy

- [ ] Nada novo pendente. O fluxo segue o [README.md](README.md): Vercel + Supabase, schema
      aplicado pela URL **direta**, `DATABASE_URL` de produção pelo **pooler**
      (`?pgbouncer=true`), e **nunca** rodar o seed em produção.
