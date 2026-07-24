---
name: teste
description: Coordena a estratégia de testes deste repo (pirâmide unit → integração → E2E). Decide a camada certa para o que mudou e delega para "teste-unitario" ou "teste-integracao", cobrindo a regra de negócio. Use ao criar uma nova página/view, um novo componente, uma nova função util ou uma nova ação de store, ou quando precisar decidir qual tipo de teste escrever.
---

# Teste (coordenadora)

Ponto de entrada para testar mudanças neste repo. Decide **qual camada da
pirâmide** cobre o que mudou, delega para a habilidade especializada e garante
que a **regra de negócio** ficou coberta e verde.

## Pirâmide neste repo

| Camada | Cobre | Habilidade | Onde |
| --- | --- | --- | --- |
| Unitário (base) | utils/funções puras, cálculos, regras do mock | `teste-unitario` | `src/**/*.test.ts` |
| Integração (meio) | componentes, views/páginas, ações de store | `teste-integracao` | `test/integration/**/*.test.ts` |
| E2E (topo) | jornada crítica no app real + mock | Playwright | `test/e2e/**` |

## Como decidir a camada

Pergunte "o que exatamente foi criado/alterado?":

- **Função util / cálculo / etiqueta / formatação / nova regra no mock
  (`handlers.ts`)** → camada **unitária** → invoque `teste-unitario`.
- **Componente novo (`src/components/**`)** → **integração** (componente) →
  invoque `teste-integracao`.
- **Página/view nova (`src/views/**`)** → **integração** (view + store via mock)
  → invoque `teste-integracao`.
- **Ação de store nova (`src/stores/**`)** → **integração** (store → mock) →
  invoque `teste-integracao`.
- **Jornada crítica ponta a ponta** (login, concluir capítulo, anti-spoiler
  entre membros) → considere um **E2E** em `test/e2e/` além do teste de
  integração.

Uma mudança pode tocar mais de uma camada — ex.: uma view nova que usa um cálculo
novo pede **unitário** (o cálculo) **e** **integração** (a view). Cubra as duas.

## Fluxo

1. Identifique o que foi criado/alterado e a **regra de negócio** por trás (o
   que o usuário/negócio espera desse elemento — não a implementação).
2. Escolha a(s) camada(s) pela tabela acima.
3. Invoque a habilidade especializada (`teste-unitario` / `teste-integracao`)
   para escrever o teste seguindo os padrões do repo.
4. Rode `npm test` e garanta verde antes de concluir.

## Regra de manutenção (crítica)

Ao **alterar** algo já existente (refatoração, mudança de design/estilo,
renomear internos), **não altere automaticamente os testes** — em especial os
unitários. Eles são a rede de segurança e devem ser **preservados**.

Só aja sobre um teste **se ele falhar**. Quando falhar, analise e **explique**
a causa antes de mexer:

- **A falha é porque uma regra de negócio mudou** e o teste ficou
  desatualizado? → **Pergunte ao usuário** se deve atualizar o teste. Não mude
  em silêncio.
- **A falha é porque a alteração quebrou a página/código e o teste está certo**?
  → **Corrija o código**, não o teste.

Detalhe completo dessa política está no `CLAUDE.md` do projeto.

## Rodar

```bash
npm test            # unit + integration
npm run test:e2e    # Playwright (jornada no app real + mock)
```
