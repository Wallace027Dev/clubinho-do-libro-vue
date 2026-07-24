---
name: git-flow
description: Guardião do fluxo de git deste repo. Toda feature/alteração vive numa branch de tarefa criada a partir da developer — nunca se commita direto em master nem em developer. Commits no padrão do repo; tarefa concluída e testada é mergeada na developer; a master só recebe mudança via Pull Request (nunca merge direto). Use SEMPRE antes de criar branch, commitar, mergear ou abrir PR — e recuse operações que violem estas regras.
---

# git-flow — guardião do fluxo

Este repo segue um Git Flow simplificado. Esta habilidade é a **fonte da
verdade** de como branches, commits e merges são feitos, e **impede** os
caminhos proibidos. Invoque-a antes de qualquer operação de git que altere
histórico ou branches.

## O modelo de branches

```
master        ← só recebe merge por PR (protegida). É o que vai pra produção.
  ▲  (Pull Request, depois de testar)
developer     ← integração. Recebe merge das branches de tarefa.
  ▲  (merge quando a tarefa termina e passa nos testes)
<tipo>/<slug> ← branch de tarefa. É onde TODO commit acontece.
```

- **`master`**: protegida (`.github/workflows/proteger-master.yml`). Só muda por
  **Pull Request** vindo da `developer`. **Nunca** receba merge/push direto.
- **`developer`**: linha de integração. **Não** se commita direto nela — ela só
  recebe o **merge** de branches de tarefa concluídas.
- **branch de tarefa**: onde o trabalho é feito. Uma por feature/correção.

## Regras que a skill protege (pare se violar)

1. **Nada é commitado direto em `master` nem em `developer`.** Antes de commitar,
   cheque `git branch --show-current`. Se for `master` ou `developer`, **PARE**:
   crie/entre numa branch de tarefa e commite lá.
2. **`master` nunca recebe merge direto.** Integração na master é **só por PR**,
   com CI verde. Sem PR, não há merge na master.
3. **Não integrar com teste vermelho.** Merge na developer e abertura de PR
   exigem `npm test` verde (e `npm run check:api` / `npm run build` quando fizer
   sentido).
4. **Uma branch por tarefa.** Não misture features não relacionadas na mesma
   branch.

Se o usuário pedir algo que viole isto (ex.: "commita direto na master"),
explique a regra e ofereça o caminho correto (branch de tarefa / PR).

## Nomear a branch de tarefa

`<tipo>/<descrição-curta-em-kebab>` — em pt-BR, sem acentos no slug:

| tipo | quando |
| --- | --- |
| `feature/` | funcionalidade nova |
| `fix/` | correção de bug |
| `refactor/` | refatoração sem mudar comportamento |
| `chore/` | build, deps, config, tarefas de manutenção |
| `docs/` | só documentação |
| `test/` | só testes |

Exemplos: `feature/web-push-notificacoes`, `fix/anti-spoiler-reacao`,
`refactor/feed-store`.

## Fluxo completo (do início ao fim)

### 1. Criar a branch (sempre a partir da developer atualizada)

```bash
git fetch origin developer
git checkout -B <tipo>/<slug> origin/developer
```

### 2. Trabalhar e commitar (na branch de tarefa)

- Commits pequenos, um assunto lógico cada.
- Mensagem em **pt-BR**, no padrão do repo: primeira linha curta e imperativa
  (ex.: `Adiciona push do novo livro do mês`), corpo explicando o porquê quando
  ajudar.
- **Trailers obrigatórios** ao final da mensagem de commit (ver instruções da
  sessão para os valores exatos):
  ```
  Co-Authored-By: Claude <...>
  Claude-Session: <url da sessão>
  ```
- Antes de cada commit, confirme que **não** está em `master`/`developer`.

### 3. Concluir a tarefa → testar → merge na developer

Só depois de **verde**:

```bash
npm test            # obrigatório
npm run check:api   # quando tocar a API
npm run build       # quando tocar o front/tipos
```

Então integra na developer (sem PR — feature→developer é merge):

```bash
git fetch origin developer
git checkout developer
git merge origin/developer --ff-only        # atualiza a developer local
git merge --no-ff <tipo>/<slug>             # integra a tarefa
git push -u origin developer
```

`--no-ff` preserva o registro de que aquilo veio de uma branch de tarefa.

### 4. developer → master: SOMENTE por Pull Request, depois de testar

Nunca mergeie a `master` direto. Quando a `developer` estiver pronta para
produção e testada, abra um **PR** de `developer` para `master`:

- Verifique se já não existe um PR aberto para essa branch.
- Título e corpo descrevendo as mudanças (sem template no repo → escreva do
  zero; nunca inclua segredos/tokens no corpo).
- Deixe o CI rodar. O merge na master acontece **pelo PR**, com os checks
  verdes — a branch protection (`proteger-master.yml`) garante que só a
  `developer` mergeia na master.
- **Não** crie um PR sem o usuário pedir; mas quando o trabalho estiver pronto,
  **ofereça** abrir o PR.

## Checklist rápido

- [ ] Estou numa **branch de tarefa** (`<tipo>/<slug>`), não em master/developer?
- [ ] Commits pequenos, em pt-BR, com os trailers?
- [ ] `npm test` verde antes de integrar?
- [ ] Merge na **developer** com `--no-ff` (feature→developer)?
- [ ] Para a **master**, só **PR** — nunca merge direto?

## Casos especiais

- **PR da developer já mergeado na master?** A tarefa seguinte é trabalho novo:
  recomece a branch de tarefa a partir da `master`/`developer` atualizada; não
  empilhe em cima de histórico já mergeado.
- **Hotfix urgente:** mesmo assim, branch de tarefa (`fix/...`) → developer → PR
  para master. Sem atalho direto na master.
- **Tags/releases:** o proxy de git pode bloquear push de `refs/tags/*`; use o
  fluxo/documentação de versão do repo, não force.
