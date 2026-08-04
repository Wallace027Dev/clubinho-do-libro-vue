import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDb, persist, resetMockDb } from '../../../src/services/mockApi/db'
import FeedView from '../../../src/views/FeedView.vue'
import { mountAt } from '../support/mount'

beforeEach(() => resetMockDb())

/**
 * Cria um livro ATUAL com os capítulos pedidos. O feed passou a escopar no livro
 * atual (anti-spoiler por card), então os comentários precisam estar em
 * capítulos deste livro para aparecer.
 */
function seedCurrentBook(chapterIds: string[]) {
  getDb().books.push({ id: 'bk', title: 'Livro Atual', author: 'Autor', description: null, coverUrl: null })
  getDb().clubBooks.push({
    id: 'cb',
    bookId: 'bk',
    status: 'CURRENT',
    selectedAt: '2026-06-01T00:00:00.000Z',
    finishedAt: null,
    selectedByUserId: null,
    finishedByUserId: null
  })
  chapterIds.forEach((id, index) => {
    getDb().chapters.push({ id, clubBookId: 'cb', number: index + 1, title: `Capítulo ${index + 1}` })
  })
}

function finishChapter(userId: string, chapterId: string, seq = 1) {
  getDb().progress.push({
    id: `p-${chapterId}-${seq}`,
    chapterId,
    userId,
    status: 'FINISHED',
    startedAt: '2026-07-01T10:00:00.000Z',
    finishedAt: '2026-07-01T11:00:00.000Z'
  })
}

/**
 * Sessão de joao + N comentários de OUTRA pessoa (maria) num capítulo do livro
 * atual que joao concluiu — o card fica destravado. Aqui só interessa a
 * paginação/sentinela.
 */
function seedSessionAndComments(count: number) {
  const joao = getDb().users.find((user) => user.login === 'joao')!
  const maria = getDb().users.find((user) => user.login === 'maria')!
  getDb().session = { userId: joao.id, role: 'MEMBER' }

  seedCurrentBook(['c1'])
  finishChapter(joao.id, 'c1')

  const start = Date.parse('2026-07-01T12:00:00.000Z')
  getDb().activities = Array.from({ length: count }, (_, i) => ({
    id: `cm-${String(i).padStart(2, '0')}`,
    actorId: maria.id,
    type: 'CHAPTER_COMMENTED',
    message: `Maria comentou (${count - i}).`,
    metadata: { chapterId: 'c1' },
    createdAt: new Date(start - i * 1000).toISOString()
  }))
  persist()
}

/** Comentário real da maria num capítulo do livro atual, com reações nele. */
function seedComentarioComReacoes(tipos: string[], chapterId = 'c1', finished = true) {
  const joao = getDb().users.find((user) => user.login === 'joao')!
  const maria = getDb().users.find((user) => user.login === 'maria')!
  getDb().session = { userId: joao.id, role: 'MEMBER' }

  seedCurrentBook([chapterId])
  if (finished) {
    finishChapter(joao.id, chapterId)
  }

  getDb().comments.push({
    id: 'cm-maria',
    chapterId,
    userId: maria.id,
    body: 'Que capítulo!',
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-01T12:00:00.000Z'
  })

  getDb().reactions = tipos.map((type, index) => ({
    id: `r-${index}`,
    commentId: 'cm-maria',
    userId: joao.id,
    type: type as 'GOSTEI',
    updatedAt: '2026-07-01T13:00:00.000Z'
  }))

  getDb().activities = [
    {
      id: 'act-cm',
      actorId: maria.id,
      type: 'CHAPTER_COMMENTED',
      message: `Maria comentou o ${chapterId}.`,
      metadata: { chapterId },
      createdAt: '2026-07-01T12:00:00.000Z'
    }
  ]
  persist()
}

describe('reações no card do feed', () => {
  it('mostra emoji e contagem por tipo', async () => {
    seedComentarioComReacoes(['GOSTEI', 'GOSTEI', 'SOFRI'])

    const { wrapper } = await mountAt(FeedView, '/feed')
    await vi.waitFor(() => expect(wrapper.findAll('.feed-card')).toHaveLength(1))

    const reacoes = wrapper.get('.feed-card-reactions').text()
    expect(reacoes).toContain('❤️ 2')
    expect(reacoes).toContain('😂 1')
  })

  it('não renderiza a linha quando o comentário não tem reação', async () => {
    seedComentarioComReacoes([])

    const { wrapper } = await mountAt(FeedView, '/feed')
    await vi.waitFor(() => expect(wrapper.findAll('.feed-card')).toHaveLength(1))

    expect(wrapper.find('.feed-card-reactions').exists()).toBe(false)
  })
})

describe('cadeado no feed (anti-spoiler)', () => {
  it('capítulo concluído: card destravado, com trecho do texto e clicável', async () => {
    seedComentarioComReacoes([], 'c1', true)

    const { wrapper } = await mountAt(FeedView, '/feed')
    await vi.waitFor(() => expect(wrapper.findAll('.feed-card')).toHaveLength(1))

    const card = wrapper.get('.feed-card')
    expect(card.find('.feed-card-preview').text()).toContain('Que capítulo!')
    expect(card.find('.feed-lock').exists()).toBe(false)
    expect(card.classes()).toContain('is-clickable')
  })

  it('capítulo não concluído: card travado, com cadeado, sem trecho e não clicável', async () => {
    seedComentarioComReacoes([], 'c1', false)

    const { wrapper } = await mountAt(FeedView, '/feed')
    await vi.waitFor(() => expect(wrapper.findAll('.feed-card')).toHaveLength(1))

    const card = wrapper.get('.feed-card')
    expect(card.find('.feed-lock').exists()).toBe(true)
    expect(card.find('.feed-card-preview').exists()).toBe(false)
    expect(card.classes()).not.toContain('is-clickable')
  })
})

describe('FeedView', () => {
  it('renderiza o primeiro lote (30) e mostra a sentinela quando há mais', async () => {
    seedSessionAndComments(35)

    const { wrapper } = await mountAt(FeedView, '/feed')

    await vi.waitFor(() => expect(wrapper.findAll('.feed-card')).toHaveLength(30))
    expect(wrapper.find('.list-sentinel').exists()).toBe(true)
  })

  it('sem mais comentários, não mostra a sentinela', async () => {
    seedSessionAndComments(5)

    const { wrapper } = await mountAt(FeedView, '/feed')

    await vi.waitFor(() => expect(wrapper.findAll('.feed-card')).toHaveLength(5))
    expect(wrapper.find('.list-sentinel').exists()).toBe(false)
  })
})
