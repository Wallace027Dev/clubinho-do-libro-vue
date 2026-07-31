import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDb, persist, resetMockDb } from '../../../src/services/mockApi/db'
import ActivityDetailView from '../../../src/views/ActivityDetailView.vue'
import { mountAt } from '../support/mount'

beforeEach(() => resetMockDb())

/**
 * Clube lendo um livro; maria concluiu o capítulo 1 e comentou, joao (que vê a
 * tela) também concluiu — então ele tem direito de ler o comentário dela.
 * Registra as duas atividades: a conclusão (canal do sininho) e o comentário
 * (canal do feed).
 */
function seedConclusaoComComentario() {
  const joao = getDb().users.find((user) => user.login === 'joao')!
  const maria = getDb().users.find((user) => user.login === 'maria')!
  getDb().session = { userId: joao.id, role: 'MEMBER' }

  getDb().books.push({
    id: 'bk',
    title: 'Duna',
    author: 'Frank Herbert',
    description: null,
    coverUrl: null
  })
  getDb().clubBooks.push({
    id: 'cb',
    bookId: 'bk',
    status: 'CURRENT',
    selectedAt: '2026-07-01T09:00:00.000Z',
    finishedAt: null,
    selectedByUserId: null,
    finishedByUserId: null
  })
  getDb().chapters.push({ id: 'c1', clubBookId: 'cb', number: 1, title: '' })

  for (const user of [joao, maria]) {
    getDb().progress.push({
      id: `pg-${user.id}`,
      chapterId: 'c1',
      userId: user.id,
      status: 'FINISHED',
      startedAt: '2026-07-01T10:00:00.000Z',
      finishedAt: '2026-07-01T11:00:00.000Z'
    })
  }

  getDb().comments.push({
    id: 'cm-maria',
    chapterId: 'c1',
    userId: maria.id,
    body: 'Que capítulo!',
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-01T12:00:00.000Z'
  })

  getDb().activities = [
    {
      id: 'act-fin',
      actorId: maria.id,
      type: 'CHAPTER_FINISHED',
      message: 'Maria terminou o capítulo 1.',
      metadata: { chapterId: 'c1', chapterNumber: 1, chapterTitle: '' },
      createdAt: '2026-07-01T11:00:00.000Z'
    },
    {
      id: 'act-cm',
      actorId: maria.id,
      type: 'CHAPTER_COMMENTED',
      message: 'Maria comentou o capítulo 1.',
      metadata: { chapterId: 'c1', chapterNumber: 1, chapterTitle: '' },
      createdAt: '2026-07-01T12:00:00.000Z'
    }
  ]
  persist()
}

describe('página da interação (alvo da notificação)', () => {
  it('abre atividade de conclusão de capítulo, que vive no sininho e não no feed', async () => {
    seedConclusaoComComentario()

    const { wrapper } = await mountAt(ActivityDetailView, '/activity/act-fin')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Maria terminou o capítulo 1.'))
    expect(wrapper.text()).not.toContain('Atividade não encontrada')
    // "mostrando o comentário caso houver": o comentário da autora do evento.
    expect(wrapper.text()).toContain('Que capítulo!')
  })

  it('sem comentário do ator, diz isso em vez de ficar vazia', async () => {
    seedConclusaoComComentario()
    getDb().comments = []
    persist()

    const { wrapper } = await mountAt(ActivityDetailView, '/activity/act-fin')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Maria terminou o capítulo 1.'))
    expect(wrapper.text()).toMatch(/ainda não deixou comentário/)
  })

  it('continua abrindo atividade de comentário, que vem do feed', async () => {
    seedConclusaoComComentario()

    const { wrapper } = await mountAt(ActivityDetailView, '/activity/act-cm')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Maria comentou o capítulo 1.'))
    expect(wrapper.text()).toContain('Que capítulo!')
  })
})
