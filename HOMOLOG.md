# Homologação (ambiente de teste)

A branch **`developer`** é o ambiente de homologação/testes: um deploy separado
do de produção, para validar mudanças antes de subir para `master` (produção).

Para não tocar no banco real, o build de homologação **não usa Postgres/Supabase**.
Ele roda com um **"banco" em memória no próprio navegador** (`src/services/mockApi/`),
já populado com um seed inicial. Nada do que você testa em homologação chega ao
banco de produção.

## Como o modo de homologação liga

O front decide em tempo de build pela flag `__USE_MOCK_API__` (ver `vite.config.ts`):

- `VITE_MOCK_API=true` ou `false` **sempre vence** (útil para ligar localmente);
- sem essa variável, liga **automaticamente em qualquer deploy de _Preview_ da
  Vercel** (é o caso da branch `developer`), enquanto **produção** (a branch
  `master`) segue no backend real.

Quando ligado, o `apiClient` roteia todas as chamadas `/api/*` para o mock via
`import()` dinâmico — então o **bundle de produção não carrega nada do mock**.

### Rodar o mock localmente

```bash
VITE_MOCK_API=true npm run dev:web   # só o front, sem Docker/Postgres
```

## Seed inicial

- **Admin:** acesse `/login/admin` e use a senha **`123456`**.
- **Membros:** `joao` / `123456` e `maria` / `123456`.
- **Sem livro** de início — o fluxo é: entrar como admin, **sortear** em
  `/admin/sorteio` (buscar o livro por título/autor, aceitar o vencedor
  informando quantos capítulos ele tem) e então testar a leitura como
  `joao`/`maria`. Para sortear de novo, **conclua** o livro atual no painel admin.
- **A busca de livro em homologação não usa rede.** O mock é síncrono, então ela
  responde de um **catálogo fixo** de 8 títulos (`src/services/mockApi/bookSearchSim.ts`),
  escolhidos para exercitar os casos reais: livro completo, livro com três
  autores, livro sem capa e sem número de páginas, contagem de páginas
  aproximada e título longo. Busque por "casmurro", "machado", "duna",
  "ondjaki" ou "cortiço". A chave do Google Books **não** é usada aqui.

## Persistência e reset

Os dados criados/alterados ficam no `localStorage` do navegador, então
**recarregar a página mantém a sessão e o progresso**. Para voltar ao seed:

- use o botão **"Resetar"** no selo de _Homologação_ (canto inferior), ou
- limpe o `localStorage` do site (chave `clubinho_mock_db_v1`).

## Configuração na Vercel

Como homologação usa banco em memória, **não é preciso** um Supabase separado
nem variáveis de ambiente extras para a branch `developer`:

1. Mantenha `master` como **Production Branch** (Settings → Git).
2. Faça push na `developer` — a Vercel gera um **Preview Deployment** com URL
   estável (`...-git-developer-<scope>.vercel.app`), que já sobe em modo mock.
3. Opcional: aponte um domínio próprio (ex.: `homolog.seuapp.com`) para a
   branch em Settings → Domains.

Produção (`master`) continua usando o Supabase real, conforme o
[README](README.md).
