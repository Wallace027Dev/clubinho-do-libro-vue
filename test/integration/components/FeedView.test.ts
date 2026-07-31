import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDb, persist, resetMockDb } from '../../../src/services/mockApi/db'
import FeedView from '../../../src/views/FeedView.vue'
import { mountAt } from '../support/mount'

beforeEach(() => resetMockDb())

/**
 * Sessão de joao + N comentários de OUTRA pessoa (maria) num capítulo que joao
 * concluiu — que é o que o feed passa a mostrar. Aqui só interessa a
 * paginação/sentinela.
 */
function seedSessionAndComments(count: number) {
  const joao = getDb().users.find((user) => user.login === 'joao')!
  const maria = getDb().users.find((user) => user.login === 'maria')!
  getDb().session = { userId: joao.id, role: 'MEMBER' }

  getDb().progress.push({
    id: 'pj',
    chapterId: 'c1',
    userId: joao.id,
    status: 'FINISHED',
    startedAt: '2026-07-01T10:00:00.000Z',
    finishedAt: '2026-07-01T11:00:00.000Z'
  })

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

/** Comentário real da maria no capítulo que joao concluiu, com reações nele. */
function seedComentarioComReacoes(tipos: string[]) {
  const joao = getDb().users.find((user) => user.login === 'joao')!
  const maria = getDb().users.find((user) => user.login === 'maria')!
  getDb().session = { userId: joao.id, role: 'MEMBER' }

  getDb().progress.push({
    id: 'pj',
    chapterId: 'c1',
    userId: joao.id,
    status: 'FINISHED',
    startedAt: '2026-07-01T10:00:00.000Z',
    finishedAt: '2026-07-01T11:00:00.000Z'
  })

  getDb().comments.push({
    id: 'cm-maria',
    chapterId: 'c1',
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
      message: 'Maria comentou o capítulo 1.',
      metadata: { chapterId: 'c1' },
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
