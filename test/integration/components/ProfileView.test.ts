import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockDb } from '../../../src/services/mockApi/db'
import { useAuthStore } from '../../../src/stores/authStore'
import ProfileView from '../../../src/views/ProfileView.vue'
import { createTestRouter } from '../support/mount'

beforeEach(() => resetMockDb())

/**
 * Monta a ProfileView já autenticada (como no app real: a tela só existe
 * logado), evitando os 401 do `onMounted` que carrega home/histórico.
 */
async function mountProfileAuthenticated() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const auth = useAuthStore(pinia)
  await auth.login('joao', '123456')

  const router = createTestRouter()
  await router.push('/profile')
  await router.isReady()

  const wrapper = mount(ProfileView, { global: { plugins: [pinia, router] } })
  await flushPromises()

  return { wrapper, auth }
}

describe('ProfileView', () => {
  it('mostra o cabeçalho com nome, @login e as pills de atividade', async () => {
    const { wrapper } = await mountProfileAuthenticated()

    expect(wrapper.find('.profile-hero__name').text()).toBe('João')
    expect(wrapper.find('.profile-hero__handle').text()).toBe('@joao')

    // Sem livro/histórico no seed → contadores zerados, mas as pills existem.
    const pills = wrapper.findAll('.profile-pill').map((pill) => pill.text())
    expect(pills).toContain('0 Capítulos lidos')
    expect(pills).toContain('0 Comentários')
  })
})
