import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '../../../src/services/apiClient'
import { getDb, persist, resetMockDb } from '../../../src/services/mockApi/db'
import { useAuthStore } from '../../../src/stores/authStore'
import { usePlatformStore } from '../../../src/stores/platformStore'
import { freshPinia } from '../support/mount'

beforeEach(() => {
  resetMockDb()
  freshPinia()
})

/** Admin cria um livro atual com N capítulos e devolve os ids. Sai da sessão. */
async function seedBook(chapters = 1): Promise<string[]> {
  const auth = useAuthStore()
  await auth.adminLogin('123456')
  const platform = usePlatformStore()
  await platform.selectCurrentBook('Mistborn', 'Sanderson', '')
  for (let i = 1; i <= chapters; i++) {
    await platform.createChapter(i, `Capítulo ${i}`)
  }
  await platform.loadHome()
  const ids = (platform.clubState.currentBook?.chapters ?? []).map((chapter) => chapter.id)
  await auth.logout()
  return ids
}

describe('platformStore', () => {
  it('loadHome traz o livro atual', async () => {
    await seedBook(1)
    await useAuthStore().login('joao', '123456')
    const platform = usePlatformStore()
    await platform.loadHome()
    expect(platform.clubState.currentBook?.book.title).toBe('Mistborn')
  })

  it('finishChapter conclui e registra a nota na atividade do feed', async () => {
    const [chapterId] = await seedBook(1)
    await useAuthStore().login('joao', '123456')
    const platform = usePlatformStore()
    await platform.loadHome()
    await platform.startChapter(chapterId)
    await platform.finishChapter(chapterId, { rating: 5 })

    const chapter = platform.clubState.currentBook!.chapters.find((item) => item.id === chapterId)
    expect(chapter?.progress[0]?.status).toBe('FINISHED')

    const finished = platform.clubState.activities.find((a) => a.type === 'CHAPTER_FINISHED')
    expect(finished?.message).toMatch(/deu nota 5,0/)
  })

  it('loadMoreActivities pagina o feed de 30 em 30, sem duplicatas', async () => {
    await useAuthStore().login('joao', '123456')

    // 35 atividades injetadas direto no "banco" (fixture).
    const start = Date.parse('2026-07-01T12:00:00.000Z')
    getDb().activities = Array.from({ length: 35 }, (_, i) => ({
      id: `a-${String(i).padStart(2, '0')}`,
      actorId: null,
      type: 'CHAPTER_STARTED',
      message: `atividade ${i}`,
      metadata: null,
      createdAt: new Date(start - i * 1000).toISOString()
    }))
    persist()

    const platform = usePlatformStore()
    await platform.loadHome()
    expect(platform.clubState.activities.length).toBe(30)
    expect(platform.activitiesHasMore).toBe(true)

    const more = await platform.loadMoreActivities()
    expect(platform.clubState.activities.length).toBe(35)
    expect(platform.activitiesHasMore).toBe(false)
    expect(more).toBe(false)

    const ids = platform.clubState.activities.map((a) => a.id)
    expect(new Set(ids).size).toBe(35)
  })

  it('comentário do capítulo via store: gate, criar, reagir e recarregar', async () => {
    const [chapterId] = await seedBook(1)
    await useAuthStore().login('joao', '123456')
    const platform = usePlatformStore()

    // Sem concluir: anti-spoiler bloqueia (403 → ApiError).
    await expect(platform.loadChapterComments(chapterId)).rejects.toBeInstanceOf(ApiError)

    await platform.startChapter(chapterId)
    await platform.finishChapter(chapterId, { rating: 5 })

    const comments = await platform.submitChapterComment(chapterId, 'Comentário via store')
    expect(comments[0]?.body).toBe('Comentário via store')

    await platform.reactToComment(comments[0].id, 'GOSTEI')
    const reloaded = await platform.loadChapterComments(chapterId)
    expect(reloaded).toHaveLength(1)
    expect(reloaded[0].reactionTotal).toBe(1)
  })

  it('loadBookRatings devolve o heatmap do livro atual', async () => {
    await seedBook(1)
    await useAuthStore().login('joao', '123456')
    const platform = usePlatformStore()
    await platform.loadHome()

    const clubBookId = platform.clubState.currentBook!.id
    const ratings = await platform.loadBookRatings(clubBookId)
    expect(ratings.chapters).toHaveLength(1)
  })
})
