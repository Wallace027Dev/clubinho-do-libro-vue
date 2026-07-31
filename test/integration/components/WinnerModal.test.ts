import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WinnerModal from '../../../src/components/WinnerModal.vue'
import type { ExternalBook } from '../../../src/domain/bookSearch'
import { resetMockDb } from '../../../src/services/mockApi/db'
import { useAuthStore } from '../../../src/stores/authStore'
import { usePlatformStore } from '../../../src/stores/platformStore'
import { useRaffleStore } from '../../../src/stores/raffleStore'
import { createTestRouter } from '../support/mount'

const ESPERA = { timeout: 2000 }

function livroExterno(partial: Partial<ExternalBook> = {}): ExternalBook {
  return {
    source: 'openlibrary',
    providerId: '/works/OL1003040W',
    title: 'Dom Casmurro',
    authors: ['Machado de Assis'],
    publisher: 'Penguin-Companhia',
    pageCount: 400,
    pageCountApproximate: false,
    isbn: '9788582850350',
    coverUrl: 'https://covers.openlibrary.org/b/id/647501-M.jpg',
    description: 'Bentinho, Capitu e uma dúvida.',
    ...partial
  }
}

beforeEach(() => {
  resetMockDb()
  window.localStorage.clear()
  // O modal é teleportado para o body: limpa o que sobrou do teste anterior.
  document.body.innerHTML = ''
})

/** Monta o modal com um vencedor já escolhido, logado como admin. */
async function mountModalComVencedor(book = livroExterno()) {
  const pinia = createPinia()
  setActivePinia(pinia)

  await useAuthStore().adminLogin('123456')

  const router = createTestRouter()
  await router.push('/admin')
  await router.isReady()

  const raffleStore = useRaffleStore()
  raffleStore.addCandidate(book)
  raffleStore.addCandidate(livroExterno({ providerId: '/works/OL2', title: 'O Cortiço' }))
  raffleStore.selectedBook = raffleStore.books[0]
  raffleStore.isWinnerModalOpen = true

  mount(WinnerModal, { global: { plugins: [pinia, router] } })
  await flushPromises()

  return { raffleStore, platformStore: usePlatformStore() }
}

function campoCapitulos() {
  return document.getElementById('winner-chapter-count') as HTMLInputElement
}

function botaoAceitar() {
  return document.querySelector('.winner-modal .primary-action') as HTMLButtonElement
}

async function digitarCapitulos(valor: string) {
  const campo = campoCapitulos()
  campo.value = valor
  campo.dispatchEvent(new Event('input'))
  await flushPromises()
}

describe('aceitar o vencedor', () => {
  it('mostra capa e metadados do livro sorteado', async () => {
    await mountModalComVencedor()

    const modal = document.querySelector('.winner-modal')!
    expect(modal.textContent).toContain('Dom Casmurro')
    expect(modal.textContent).toContain('Penguin-Companhia · 400 páginas · Machado de Assis')
    expect(modal.querySelector('.winner-book img')?.getAttribute('src')).toContain(
      'covers.openlibrary.org'
    )
  })

  it('cria o livro do clube com capa, autor e os N capítulos', async () => {
    const { platformStore } = await mountModalComVencedor()

    await digitarCapitulos('3')
    expect(document.getElementById('winner-chapter-hint')?.textContent).toContain(
      'Serão criados 3 capítulos'
    )

    botaoAceitar().click()
    await vi.waitFor(() => expect(platformStore.clubState.currentBook).not.toBeNull(), ESPERA)

    const currentBook = platformStore.clubState.currentBook!
    expect(currentBook.book.title).toBe('Dom Casmurro')
    expect(currentBook.book.author).toBe('Machado de Assis')
    expect(currentBook.book.coverUrl).toContain('covers.openlibrary.org')
    expect(currentBook.book.description).toContain('Bentinho')
    expect(currentBook.chapters.map((chapter) => chapter.number)).toEqual([1, 2, 3])
    expect(currentBook.chapters.every((chapter) => chapter.title === '')).toBe(true)
  })

  it('tira o vencedor da fila e mantém os outros candidatos', async () => {
    const { raffleStore, platformStore } = await mountModalComVencedor()

    await digitarCapitulos('1')
    botaoAceitar().click()
    await vi.waitFor(() => expect(platformStore.clubState.currentBook).not.toBeNull(), ESPERA)

    expect(raffleStore.books.map((book) => book.title)).toEqual(['O Cortiço'])
  })

  it('campo vazio aceita e não cria capítulo', async () => {
    const { platformStore } = await mountModalComVencedor()

    expect(document.getElementById('winner-chapter-hint')?.textContent).toContain('Sem capítulos')
    expect(botaoAceitar().disabled).toBe(false)

    botaoAceitar().click()
    await vi.waitFor(() => expect(platformStore.clubState.currentBook).not.toBeNull(), ESPERA)

    expect(platformStore.clubState.currentBook!.chapters).toEqual([])
  })

  it('bloqueia quantidade fora da faixa', async () => {
    await mountModalComVencedor()

    // '2,5' nem chega ao modelo (o input[type=number] sanitiza); '2.5' chega.
    for (const invalido of ['0', '201', '2.5']) {
      await digitarCapitulos(invalido)
      expect(botaoAceitar().disabled).toBe(true)
      expect(document.getElementById('winner-chapter-hint')?.className).toContain('form-error')
    }

    await digitarCapitulos('12')
    expect(botaoAceitar().disabled).toBe(false)
  })
})
