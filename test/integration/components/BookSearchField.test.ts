import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BookEntryStep from '../../../src/components/BookEntryStep.vue'
import { resetMockDb } from '../../../src/services/mockApi/db'
import { useAuthStore } from '../../../src/stores/authStore'
import { useRaffleStore } from '../../../src/stores/raffleStore'
import { createTestRouter } from '../support/mount'

// O debounce é de 300ms real (o repo não usa fake timers), então a espera do
// vi.waitFor precisa de folga sobre o default de 1000ms.
const ESPERA = { timeout: 2000 }

beforeEach(() => {
  resetMockDb()
  window.localStorage.clear()
})

/** A busca é rota de admin; monta o passo 1 do sorteio já autenticado. */
async function mountEntryStepAsAdmin() {
  const pinia = createPinia()
  setActivePinia(pinia)

  await useAuthStore().adminLogin('123456')

  const router = createTestRouter()
  await router.push('/admin')
  await router.isReady()

  const wrapper = mount(BookEntryStep, { global: { plugins: [pinia, router] } })
  await flushPromises()

  return { wrapper, raffleStore: useRaffleStore() }
}

describe('busca de livro no sorteio', () => {
  it('não busca a cada tecla: espera a pausa da digitação', async () => {
    const { wrapper } = await mountEntryStepAsAdmin()

    await wrapper.get('input[type="search"]').setValue('casmurro')
    // Nada ainda: o timer do debounce não pode ter disparado neste tick.
    expect(wrapper.findAll('.book-search-item')).toHaveLength(0)

    await vi.waitFor(() => expect(wrapper.findAll('.book-search-item')).toHaveLength(2), ESPERA)
  })

  it('lista capa, título e a linha de editora, páginas e autor', async () => {
    const { wrapper } = await mountEntryStepAsAdmin()

    await wrapper.get('input[type="search"]').setValue('casmurro')
    await vi.waitFor(() => expect(wrapper.findAll('.book-search-item')).toHaveLength(2), ESPERA)

    const primeiro = wrapper.findAll('.book-search-item')[0]
    expect(primeiro.text()).toContain('Dom Casmurro')
    expect(primeiro.text()).toContain('Penguin-Companhia · 400 páginas · Machado de Assis')
    expect(primeiro.find('.book-search-cover img').attributes('src')).toContain(
      'covers.openlibrary.org'
    )
  })

  it('acha por autor e mostra o placeholder quando o livro não tem capa', async () => {
    const { wrapper } = await mountEntryStepAsAdmin()

    await wrapper.get('input[type="search"]').setValue('ondjaki')
    await vi.waitFor(() => expect(wrapper.findAll('.book-search-item')).toHaveLength(1), ESPERA)

    const item = wrapper.get('.book-search-item')
    expect(item.text()).toContain('Bom Dia, Camaradas')
    // Sem editora e sem páginas (caso brasileiro real): sobra só o autor.
    expect(item.text()).toContain('Ondjaki')
    expect(item.find('img').exists()).toBe(false)
    expect(item.find('.history-cover--empty').exists()).toBe(true)
  })

  it('escolher uma opção guarda o candidato com os metadados e a sinopse do detalhe', async () => {
    const { wrapper, raffleStore } = await mountEntryStepAsAdmin()

    await wrapper.get('input[type="search"]').setValue('casmurro')
    await vi.waitFor(() => expect(wrapper.findAll('.book-search-item')).toHaveLength(2), ESPERA)
    await wrapper.findAll('.book-search-item')[0].trigger('click')
    await vi.waitFor(() => expect(raffleStore.books).toHaveLength(1), ESPERA)

    expect(raffleStore.books[0]).toMatchObject({
      title: 'Dom Casmurro',
      author: 'Machado de Assis',
      publisher: 'Penguin-Companhia',
      pageCount: 400,
      source: 'openlibrary',
      providerId: '/works/OL1003040W'
    })
    expect(raffleStore.books[0].coverUrl).toContain('covers.openlibrary.org')
    // A sinopse só existe na rota de detalhe: se está aqui, ela foi chamada.
    expect(raffleStore.books[0].description).toContain('Bentinho')

    // Escolhido: a lista fecha e o campo volta a ficar vazio.
    expect(wrapper.findAll('.book-search-item')).toHaveLength(0)
    expect(wrapper.get('input[type="search"]').element.value).toBe('')
  })

  it('não deixa o mesmo livro entrar duas vezes', async () => {
    const { wrapper, raffleStore } = await mountEntryStepAsAdmin()

    for (let vez = 0; vez < 2; vez++) {
      await wrapper.get('input[type="search"]').setValue('casmurro')
      await vi.waitFor(() => expect(wrapper.findAll('.book-search-item')).toHaveLength(2), ESPERA)
      await wrapper.findAll('.book-search-item')[0].trigger('click')
      await flushPromises()
    }

    expect(raffleStore.books).toHaveLength(1)
  })

  it('mantém o cadastro à mão para livro que os provedores não conhecem', async () => {
    const { wrapper, raffleStore } = await mountEntryStepAsAdmin()

    expect(wrapper.find('#book-title').exists()).toBe(false)
    await wrapper.get('.text-link').trigger('click')

    await wrapper.get('#book-title').setValue('Zine da Vila')
    await wrapper.get('form.book-form').trigger('submit')

    expect(raffleStore.books).toHaveLength(1)
    expect(raffleStore.books[0]).toMatchObject({ title: 'Zine da Vila' })
    expect(raffleStore.books[0].coverUrl ?? null).toBeNull()
  })
})
