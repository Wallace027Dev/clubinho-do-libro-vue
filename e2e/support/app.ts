import { expect, type Page } from '@playwright/test'

const STORAGE_KEY = 'clubinho_mock_db_v1'

/**
 * Estado inicial do "banco" em memória para o E2E: membros do seed (joao/maria,
 * senha 123456), um livro atual com um capítulo e sem sessão (o login é feito
 * pela própria UI).
 */
export function buildSeed() {
  const now = Date.now()
  const iso = (offset: number) => new Date(now - offset).toISOString()
  return {
    session: null,
    users: [
      { id: 'u-joao', login: 'joao', password: '123456', role: 'MEMBER', displayName: 'João', avatarUrl: null, deactivatedAt: null, createdAt: iso(2000) },
      { id: 'u-maria', login: 'maria', password: '123456', role: 'MEMBER', displayName: 'Maria', avatarUrl: null, deactivatedAt: null, createdAt: iso(1000) }
    ],
    books: [{ id: 'bk-e2e', title: 'Mistborn', author: 'Sanderson', description: null, coverUrl: null }],
    clubBooks: [
      { id: 'cb-e2e', bookId: 'bk-e2e', status: 'CURRENT', selectedAt: iso(3000), finishedAt: null, selectedByUserId: null, finishedByUserId: null }
    ],
    chapters: [{ id: 'ch-e2e', clubBookId: 'cb-e2e', number: 1, title: 'Capítulo 1' }],
    progress: [],
    comments: [],
    reactions: [],
    ratings: [],
    reviews: [],
    activities: []
  }
}

/**
 * Injeta o estado no localStorage antes de qualquer script da página rodar
 * (o mock lê o "banco" no boot). O guard semeia só na primeira navegação e
 * preserva as mutações do app nas navegações seguintes.
 */
export async function seedApp(page: Page, db: unknown = buildSeed()) {
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, value)
      }
    },
    { key: STORAGE_KEY, value: JSON.stringify(db) }
  )
}

/** Faz login pela UI e espera a navegação inferior (autenticado) aparecer. */
export async function loginAs(page: Page, login = 'joao', password = '123456') {
  await page.goto('/login')
  await page.fill('input[autocomplete="username"]', login)
  await page.fill('input[type="password"]', password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()
}
