import { expect, test } from '@playwright/test'
import { loginAs, seedApp } from './support/app'

// Jornada completa do membro, dirigida pela UI real com o "banco" em memória.
test('membro inicia, nota, conclui e comenta um capítulo — e vê no feed', async ({ page }) => {
  await seedApp(page)
  await loginAs(page, 'joao', '123456')

  // Abre o capítulo do livro atual.
  await page.goto('/chapters/ch-e2e')
  await page.getByRole('button', { name: 'Iniciar leitura' }).click()

  // Dá a nota (obrigatória) movendo o range; o botão de concluir habilita.
  await page.locator('input[type="range"]').evaluate((element) => {
    const input = element as HTMLInputElement
    input.value = '5'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })

  const finish = page.getByRole('button', { name: 'Concluir capítulo' })
  await expect(finish).toBeEnabled()
  await finish.click()

  // Comenta o capítulo concluído.
  await page.fill('#chapter-comment-input', 'Comentário do E2E')
  await page.getByRole('button', { name: 'Publicar comentário' }).click()
  await expect(page.getByText('Comentário do E2E')).toBeVisible()

  // O feed mostra a conclusão com a nota.
  await page.goto('/feed')
  await expect(page.getByText(/terminou o capítulo 1 e deu nota 5,0/)).toBeVisible()
})
