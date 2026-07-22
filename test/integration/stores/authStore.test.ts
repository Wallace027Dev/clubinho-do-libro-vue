import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '../../../src/services/apiClient'
import { resetMockDb } from '../../../src/services/mockApi/db'
import { useAuthStore } from '../../../src/stores/authStore'
import { freshPinia } from '../support/mount'

// Integração real: store → apiClient (com o mock ligado) → "banco" em memória.
beforeEach(() => {
  resetMockDb()
  freshPinia()
})

describe('authStore', () => {
  it('login de membro válido autentica', async () => {
    const auth = useAuthStore()
    await auth.login('joao', '123456')
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.isAdmin).toBe(false)
    expect(auth.user?.login).toBe('joao')
  })

  it('login inválido lança ApiError e não autentica', async () => {
    const auth = useAuthStore()
    await expect(auth.login('joao', 'errada')).rejects.toBeInstanceOf(ApiError)
    expect(auth.isAuthenticated).toBe(false)
  })

  it('adminLogin autentica como admin', async () => {
    const auth = useAuthStore()
    await auth.adminLogin('123456')
    expect(auth.isAdmin).toBe(true)
  })

  it('sessão persiste: loadSession recupera o usuário numa store nova', async () => {
    await useAuthStore().login('maria', '123456')

    // Nova Pinia = store zerada, mas a sessão do mock persiste no localStorage.
    freshPinia()
    const reloaded = useAuthStore()
    await reloaded.loadSession()

    expect(reloaded.isAuthenticated).toBe(true)
    expect(reloaded.user?.login).toBe('maria')
  })

  it('logout encerra a sessão', async () => {
    const auth = useAuthStore()
    await auth.login('joao', '123456')
    await auth.logout()
    expect(auth.isAuthenticated).toBe(false)
  })
})
