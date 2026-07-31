import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockDb } from '../../../src/services/mockApi/db'
import { useAuthStore } from '../../../src/stores/authStore'
import { usePlatformStore } from '../../../src/stores/platformStore'
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

/** Executa um bloco com uma pinia própria (as stores são usadas fora da view). */
async function comPiniaPropria(task: () => Promise<void>) {
  const pinia = createPinia()
  setActivePinia(pinia)
  await task()
}

/**
 * Livro atual com 2 capítulos; joao concluiu o capítulo 1 e comentou nele.
 * Termina deslogado, para o mount autenticar do zero.
 */
async function seedComentarioDoJoaoNoLivroAtual() {
  await comPiniaPropria(async () => {
    const auth = useAuthStore()
    const platform = usePlatformStore()

    await auth.adminLogin('123456')
    await platform.selectCurrentBook('Mistborn', 'Sanderson', '')
    await platform.createChapter(1, 'Capítulo 1')
    await platform.createChapter(2, 'Capítulo 2')
    await platform.loadHome()
    const chapterId = platform.clubState.currentBook!.chapters[0].id
    await auth.logout()

    await auth.login('joao', '123456')
    await platform.startChapter(chapterId)
    await platform.finishChapter(chapterId, { rating: 5 })
    await platform.submitChapterComment(chapterId, 'Que capítulo!')
    await auth.logout()
  })
}

async function finalizarLivroAtual() {
  await comPiniaPropria(async () => {
    const auth = useAuthStore()
    await auth.adminLogin('123456')
    await usePlatformStore().finishCurrentBook()
    await auth.logout()
  })
}

function pillsDe(wrapper: { findAll: (s: string) => Array<{ text: () => string }> }) {
  return wrapper.findAll('.profile-pill').map((pill) => pill.text())
}

describe('pills de atividade do perfil', () => {
  it('conta os capítulos concluídos no livro atual', async () => {
    await seedComentarioDoJoaoNoLivroAtual()

    const { wrapper } = await mountProfileAuthenticated()

    // 2 capítulos no livro, 1 concluído.
    expect(pillsDe(wrapper)).toContain('1 Capítulos lidos')
  })

  it('conta o comentário que o membro fez no livro atual', async () => {
    await seedComentarioDoJoaoNoLivroAtual()

    const { wrapper } = await mountProfileAuthenticated()

    expect(pillsDe(wrapper)).toContain('1 Comentários')
  })

  it('mantém a conta de comentários depois de o livro ser finalizado', async () => {
    await seedComentarioDoJoaoNoLivroAtual()
    await finalizarLivroAtual()

    const { wrapper } = await mountProfileAuthenticated()

    const pills = pillsDe(wrapper)
    expect(pills).toContain('1 Comentários')
    // Vitalício: arquivar o livro não pode zerar os capítulos já lidos.
    expect(pills).toContain('1 Capítulos lidos')
  })
})

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
