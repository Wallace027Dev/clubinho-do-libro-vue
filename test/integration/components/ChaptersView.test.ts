import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockDb } from '../../../src/services/mockApi/db'
import { useAuthStore } from '../../../src/stores/authStore'
import { usePlatformStore } from '../../../src/stores/platformStore'
import ChaptersView from '../../../src/views/ChaptersView.vue'
import { createTestRouter } from '../support/mount'

beforeEach(() => resetMockDb())

/** Admin define o livro atual já com N capítulos gerados (sem título). */
async function seedLivroComCapitulosGerados(chapterCount: number) {
  const pinia = createPinia()
  setActivePinia(pinia)

  const auth = useAuthStore()
  await auth.adminLogin('123456')
  await usePlatformStore().selectCurrentBook('Duna', 'Frank Herbert', '', { chapterCount })
  await auth.logout()
}

async function mountChaptersAsJoao() {
  const pinia = createPinia()
  setActivePinia(pinia)

  await useAuthStore(pinia).login('joao', '123456')

  const router = createTestRouter()
  await router.push('/chapters')
  await router.isReady()

  const wrapper = mount(ChaptersView, { global: { plugins: [pinia, router] } })
  await flushPromises()

  return wrapper
}

describe('capítulo gerado sem título', () => {
  it('aparece como "Capítulo N", sem dois-pontos nem traço sobrando', async () => {
    await seedLivroComCapitulosGerados(2)

    const wrapper = await mountChaptersAsJoao()
    const cards = wrapper.findAll('.chapter-card')

    expect(cards).toHaveLength(2)
    expect(cards[0].attributes('aria-label')).toBe('Abrir Capítulo 1')
    expect(cards[1].attributes('aria-label')).toBe('Abrir Capítulo 2')
    // Nada de "Capítulo 1 — " nem "Capítulo 1: " em nenhum texto da tela.
    expect(wrapper.text()).not.toContain('—')
    expect(wrapper.text()).not.toContain('Capítulo 1:')
  })

  it('mostra o título quando ele existe', async () => {
    await seedLivroComCapitulosGerados(1)

    // Admin nomeia o capítulo gerado, como faria no painel.
    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore()
    await auth.adminLogin('123456')
    const platform = usePlatformStore()
    await platform.loadHome()
    const chapterId = platform.clubState.currentBook!.chapters[0].id
    await platform.updateChapter(chapterId, { title: 'A Duna Vermelha' })
    await auth.logout()

    const wrapper = await mountChaptersAsJoao()

    expect(wrapper.find('.chapter-card').attributes('aria-label')).toBe(
      'Abrir Capítulo 1 — A Duna Vermelha'
    )
    expect(wrapper.text()).toContain('A Duna Vermelha')
  })
})
