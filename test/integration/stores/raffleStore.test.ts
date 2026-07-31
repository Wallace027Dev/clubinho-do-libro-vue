import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockDb } from '../../../src/services/mockApi/db'
import { useAuthStore } from '../../../src/stores/authStore'
import { usePlatformStore } from '../../../src/stores/platformStore'
import { useRaffleStore } from '../../../src/stores/raffleStore'
import { freshPinia } from '../support/mount'

beforeEach(() => {
  resetMockDb()
  // A lista de candidatos vive em localStorage: sem limpar, vaza entre testes.
  window.localStorage.clear()
  freshPinia()
})

async function adminSession() {
  await useAuthStore().adminLogin('123456')
}

describe('trava do sorteio', () => {
  it('trava enquanto o estado do clube não foi carregado', async () => {
    // Fail-closed: sem saber se há livro em andamento, não deixa sortear.
    const raffle = useRaffleStore()
    raffle.addBook('Duna')
    raffle.addBook('Fundação')

    expect(raffle.raffleLock).toBe('club-state-unknown')
    expect(raffle.canSpin).toBe(false)
    expect(raffle.canConfirmBooks).toBe(false)
  })

  it('trava com livro em andamento e libera quando o admin conclui', async () => {
    await adminSession()
    const platform = usePlatformStore()
    const raffle = useRaffleStore()

    await platform.selectCurrentBook('Mistborn', 'Sanderson', '')
    raffle.addBook('Duna')
    raffle.addBook('Fundação')

    expect(raffle.raffleLock).toBe('current-book-in-progress')
    expect(raffle.canSpin).toBe(false)

    await platform.finishCurrentBook()

    // Concluir libera na hora — não espera virar o mês.
    expect(raffle.raffleLock).toBeNull()
    expect(raffle.canSpin).toBe(true)
  })

  it('exige dois candidatos mesmo sem livro em andamento', async () => {
    await adminSession()
    const platform = usePlatformStore()
    const raffle = useRaffleStore()

    await platform.loadHome()
    raffle.addBook('Duna')

    expect(raffle.raffleLock).toBe('not-enough-candidates')
    expect(raffle.canConfirmBooks).toBe(false)
  })
})

describe('aceitar o vencedor', () => {
  it('define o livro atual do clube e tira o vencedor da fila', async () => {
    await adminSession()
    const platform = usePlatformStore()
    const raffle = useRaffleStore()

    await platform.loadHome()
    raffle.addBook('Duna')
    raffle.addBook('Fundação')
    raffle.selectedBook = raffle.books[0]

    await raffle.acceptWinner()

    expect(platform.clubState.currentBook?.book.title).toBe('Duna')
    expect(raffle.books.map((book) => book.title)).toEqual(['Fundação'])
    // E o próprio aceite já trava o sorteio seguinte.
    expect(raffle.raffleLock).toBe('current-book-in-progress')
  })
})
