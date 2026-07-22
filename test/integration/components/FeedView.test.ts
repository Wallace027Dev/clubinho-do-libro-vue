import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDb, persist, resetMockDb } from '../../../src/services/mockApi/db'
import FeedView from '../../../src/views/FeedView.vue'
import { mountAt } from '../support/mount'

beforeEach(() => resetMockDb())

/** Sessão de membro real + N atividades no "banco". */
function seedSessionAndActivities(count: number) {
  const joao = getDb().users.find((user) => user.login === 'joao')!
  getDb().session = { userId: joao.id, role: 'MEMBER' }

  const start = Date.parse('2026-07-01T12:00:00.000Z')
  getDb().activities = Array.from({ length: count }, (_, i) => ({
    id: `a-${String(i).padStart(2, '0')}`,
    actorId: joao.id,
    type: 'CHAPTER_STARTED',
    message: `João iniciou o capítulo ${count - i}.`,
    metadata: null,
    createdAt: new Date(start - i * 1000).toISOString()
  }))
  persist()
}

describe('FeedView', () => {
  it('renderiza o primeiro lote (30) e mostra a sentinela quando há mais', async () => {
    seedSessionAndActivities(35)

    const { wrapper } = await mountAt(FeedView, '/feed')

    await vi.waitFor(() =>
      expect(wrapper.findAll('.feed-simple, .feed-card')).toHaveLength(30)
    )
    expect(wrapper.find('.list-sentinel').exists()).toBe(true)
  })

  it('sem mais atividades, não mostra a sentinela', async () => {
    seedSessionAndActivities(5)

    const { wrapper } = await mountAt(FeedView, '/feed')

    await vi.waitFor(() =>
      expect(wrapper.findAll('.feed-simple, .feed-card')).toHaveLength(5)
    )
    expect(wrapper.find('.list-sentinel').exists()).toBe(false)
  })
})
