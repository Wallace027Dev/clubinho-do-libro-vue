import { expect, test } from '@playwright/test'
import { buildSeedWithoutBook, loginAsAdmin, seedApp } from './support/app'

// A animação da roleta dura 5,6s por padrão e 120ms com "reduzir movimento" —
// emular a preferência deixa o teste rápido sem mexer no código do app.
test.use({ reducedMotion: 'reduce' })

test('admin busca o livro, sorteia e o vencedor vira livro atual com capítulos', async ({
  page
}) => {
  await seedApp(page, buildSeedWithoutBook())
  await loginAsAdmin(page)

  await page.goto('/admin/sorteio')

  // --- Passo 1: montar a lista buscando por título e por autor --------------
  const busca = page.getByRole('searchbox')

  await busca.fill('casmurro')
  // A requisição sai 300ms depois da pausa; a opção aparece com capa e a linha
  // de editora · páginas · autor.
  const domCasmurro = page.getByRole('button', { name: 'Escolher Dom Casmurro', exact: true })
  await expect(domCasmurro).toBeVisible()
  await expect(domCasmurro).toContainText('Penguin-Companhia · 400 páginas · Machado de Assis')
  await expect(domCasmurro.locator('img')).toBeVisible()
  await domCasmurro.click()

  // Busca por AUTOR para o segundo candidato (LIKE, não igualdade).
  await busca.fill('herbert')
  const duna = page.getByRole('button', { name: 'Escolher Duna', exact: true })
  await expect(duna).toBeVisible()
  await duna.click()

  // Os dois candidatos entraram, com os metadados visíveis na lista.
  const candidatos = page.locator('.book-list li')
  await expect(candidatos).toHaveCount(2)
  await expect(candidatos.filter({ hasText: 'Dom Casmurro' })).toContainText('Machado de Assis')

  // --- Passo 2: sortear ----------------------------------------------------
  await page.getByRole('button', { name: 'Confirmar livros' }).click()
  await page.getByRole('button', { name: 'Sortear' }).click()

  const modal = page.getByRole('dialog')
  await expect(modal).toBeVisible()

  // Qual dos dois venceu é aleatório: leia do modal e cobre isso no fim.
  const vencedor = (await modal.locator('#winner-title').innerText()).trim()
  expect(['Dom Casmurro', 'Duna']).toContain(vencedor)

  // O modal mostra a capa e os metadados do sorteado.
  await expect(modal.locator('.winner-book img')).toBeVisible()
  await expect(modal.locator('.winner-book-meta')).toContainText('páginas')

  // --- Passo 3: aceitar informando a quantidade de capítulos ---------------
  const quantidade = page.locator('#winner-chapter-count')
  await quantidade.fill('0')
  await expect(page.getByRole('button', { name: 'Aceitar' })).toBeDisabled()

  await quantidade.fill('3')
  await expect(page.locator('#winner-chapter-hint')).toContainText('Serão criados 3 capítulos')

  await page.getByRole('button', { name: 'Aceitar' }).click()
  await expect(page.getByText('Livro atual definido!')).toBeVisible()

  // --- O que ficou registrado ---------------------------------------------
  // O sorteio trava, porque agora existe livro em andamento.
  await expect(page.getByText(/Sorteio travado enquanto houver livro em andamento/)).toBeVisible()
  await expect(page.getByText(vencedor)).toBeVisible()

  // O painel admin mostra os 3 capítulos, sem título (nomeados depois lá mesmo).
  await page.goto('/admin')
  await expect(page.locator('.chapter-kicker')).toHaveText([
    'Capítulo 1',
    'Capítulo 2',
    'Capítulo 3'
  ])
  await expect(page.locator('.chapter-untitled')).toHaveCount(3)

  // A home mostra capa, autor e sinopse que vieram da busca (a sinopse só existe
  // na rota de detalhe, então ela prova que o clique a buscou).
  await page.goto('/')
  await expect(page.getByRole('heading', { name: vencedor })).toBeVisible()
  await expect(page.getByText(/^De /)).toBeVisible()
  await expect(page.locator('.hero-copy')).not.toBeEmpty()
  await expect(page.locator('.home-hero .history-cover img')).toBeVisible()
})

test('livro fora dos catálogos entra pelo cadastro à mão', async ({ page }) => {
  await seedApp(page, buildSeedWithoutBook())
  await loginAsAdmin(page)
  await page.goto('/admin/sorteio')

  await page.getByRole('searchbox').fill('zzznaoexiste')
  await expect(page.getByText(/Nenhum livro encontrado/)).toBeVisible()

  await page.getByRole('button', { name: /Adicionar à mão/ }).click()
  await page.fill('#book-title', 'Zine da Vila')
  await page.getByRole('button', { name: 'Adicionar livro' }).click()

  await expect(page.locator('.book-list li')).toHaveCount(1)
  await expect(page.locator('.book-list li')).toContainText('Zine da Vila')
})
