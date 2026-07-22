import { expect, test } from '@playwright/test'
import { loginAs } from './support/app'

// O app já sobe com o seed (joao/maria, senha 123456), então login não precisa
// de setup extra.
test.describe('autenticação', () => {
  test('login válido entra no clube', async ({ page }) => {
    await loginAs(page, 'joao', '123456')
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()
  })

  test('login inválido mostra erro e não entra', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[autocomplete="username"]', 'joao')
    await page.fill('input[type="password"]', 'senha-errada')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page.locator('.form-error')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeHidden()
  })
})
