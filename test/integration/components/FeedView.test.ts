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
