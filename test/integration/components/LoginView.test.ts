import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetMockDb } from '../../../src/services/mockApi/db'
import { useAuthStore } from '../../../src/stores/authStore'
import LoginView from '../../../src/views/LoginView.vue'
import { mountAt } from '../support/mount'

beforeEach(() => resetMockDb())

describe('LoginView', () => {
  it('login válido autentica e navega para a home', async () => {
    const { wrapper, router } = await mountAt(LoginView, '/login')

    await wrapper.find('input[autocomplete="username"]').setValue('joao')
    await wrapper.find('input[type="password"]').setValue('123456')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => {
      expect(useAuthStore().isAuthenticated).toBe(true)
      expect(router.currentRoute.value.path).toBe('/')
    })
  })

  it('credenciais inválidas mostram erro e não autenticam', async () => {
    const { wrapper } = await mountAt(LoginView, '/login')

    await wrapper.find('input[autocomplete="username"]').setValue('joao')
    await wrapper.find('input[type="password"]').setValue('errada')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(wrapper.find('.form-error').exists()).toBe(true))
    expect(useAuthStore().isAuthenticated).toBe(false)
  })
})
