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

/** Cria um livro ATUAL com os capítulos pedidos direto no "banco" (fixture). */
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

function finishChapter(userId: string, chapterId: string) {
  getDb().progress.push({
    id: `p-${chapterId}`,
    chapterId,
    userId,
    status: 'FINISHED',
    startedAt: '2026-07-01T10:00:00.000Z',
    finishedAt: '2026-07-01T11:00:00.000Z'
  })
}

describe('platformStore', () => {
  it('selectCurrentBook cria os capítulos e grava a capa numa tacada', async () => {
    const auth = useAuthStore()
    await auth.adminLogin('123456')
    const platform = usePlatformStore()

    await platform.selectCurrentBook('Duna', 'Frank Herbert', 'Épico de Arrakis', {
      coverUrl: 'https://covers.exemplo/duna.jpg',
      chapterCount: 3
    })

    const currentBook = platform.clubState.currentBook
    expect(currentBook?.book.coverUrl).toBe('https://covers.exemplo/duna.jpg')
    expect(currentBook?.chapters.map((chapter) => chapter.number)).toEqual([1, 2, 3])
    // Capítulo gerado nasce sem título: o admin nomeia depois.
    expect(currentBook?.chapters.every((chapter) => chapter.title === '')).toBe(true)
  })

  it('selectCurrentBook sem quantidade não cria capítulo (cadastro manual)', async () => {
    const auth = useAuthStore()
    await auth.adminLogin('123456')
    const platform = usePlatformStore()

    await platform.selectCurrentBook('Duna', '', '')

    expect(platform.clubState.currentBook?.chapters).toEqual([])
    expect(platform.clubState.currentBook?.book.coverUrl ?? null).toBeNull()
  })

  it('loadHome traz o livro atual', async () => {
    await seedBook(1)
    await useAuthStore().login('joao', '123456')
    const platform = usePlatformStore()
    await platform.loadHome()
    expect(platform.clubState.currentBook?.book.title).toBe('Mistborn')
  })

  it('finishChapter conclui e registra a nota na atividade de progresso', async () => {
    const [chapterId] = await seedBook(1)
    await useAuthStore().login('joao', '123456')
    const platform = usePlatformStore()
    await platform.loadHome()
    await platform.startChapter(chapterId)
    await platform.finishChapter(chapterId, { rating: 5 })

    const chapter = platform.clubState.currentBook!.chapters.find((item) => item.id === chapterId)
    expect(chapter?.progress[0]?.status).toBe('FINISHED')

    // A atividade CHAPTER_FINISHED (canal alerta) fica registrada com a nota.
    const finished = getDb().activities.find((a) => a.type === 'CHAPTER_FINISHED')
    expect(finished?.message).toMatch(/deu nota 5,0/)
  })

  it('loadMoreAlerts pagina o sininho de 30 em 30, sem duplicatas', async () => {
    await useAuthStore().login('joao', '123456')

    // 35 alertas injetados direto no "banco" (fixture). Tipo do canal "alerta"
    // (CHAPTER_FINISHED, ator do sistema); aqui só interessa a paginação.
    const start = Date.parse('2026-07-01T12:00:00.000Z')
    getDb().activities = Array.from({ length: 35 }, (_, i) => ({
      id: `a-${String(i).padStart(2, '0')}`,
      actorId: null,
      type: 'CHAPTER_FINISHED',
      message: `atividade ${i}`,
      metadata: null,
      createdAt: new Date(start - i * 1000).toISOString()
    }))
    persist()

    const platform = usePlatformStore()
    await platform.loadAlerts()
    expect(platform.alerts.length).toBe(30)
    expect(platform.alertsHasMore).toBe(true)

    const more = await platform.loadMoreAlerts()
    expect(platform.alerts.length).toBe(35)
    expect(platform.alertsHasMore).toBe(false)
    expect(more).toBe(false)

    const ids = platform.alerts.map((a) => a.id)
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

  it('feed = comentários de outros no livro atual; não concluído vem travado; sininho = progresso de outros', async () => {
    const joao = getDb().users.find((user) => user.login === 'joao')!
    const maria = getDb().users.find((user) => user.login === 'maria')!
    await useAuthStore().login('joao', '123456')

    // Livro atual com c1 e c2; joao concluiu só o c1.
    seedCurrentBook(['c1', 'c2'])
    finishChapter(joao.id, 'c1')

    const t = Date.parse('2026-07-01T12:00:00.000Z')
    const iso = (n: number) => new Date(t - n * 1000).toISOString()
    getDb().activities = [
      { id: 'cm-maria-c1', actorId: maria.id, type: 'CHAPTER_COMMENTED', message: 'maria comentou c1', metadata: { chapterId: 'c1' }, createdAt: iso(0) },
      { id: 'cm-joao-c1', actorId: joao.id, type: 'CHAPTER_COMMENTED', message: 'meu comentário', metadata: { chapterId: 'c1' }, createdAt: iso(1) },
      { id: 'cm-maria-c2', actorId: maria.id, type: 'CHAPTER_COMMENTED', message: 'maria comentou c2', metadata: { chapterId: 'c2' }, createdAt: iso(2) },
      { id: 'fin-maria', actorId: maria.id, type: 'CHAPTER_FINISHED', message: 'maria terminou', metadata: null, createdAt: iso(3) },
      { id: 'fin-joao', actorId: joao.id, type: 'CHAPTER_FINISHED', message: 'eu terminei', metadata: null, createdAt: iso(4) }
    ]
    persist()

    const platform = usePlatformStore()

    // Feed = comentários de OUTROS nos capítulos do livro atual: c1 (destravado)
    // e c2 (travado, porque joao não concluiu). O próprio comentário de joao sai.
    await platform.loadHome()
    expect(platform.clubState.activities.map((item) => item.id)).toEqual(['cm-maria-c1', 'cm-maria-c2'])

    const byId = Object.fromEntries(platform.clubState.activities.map((item) => [item.id, item]))
    expect(byId['cm-maria-c1'].locked).toBe(false)
    expect(byId['cm-maria-c2'].locked).toBe(true)

    // Sininho = progresso de OUTRO (o de joao é excluído).
    await platform.loadAlerts()
    expect(platform.alerts.map((item) => item.id)).toEqual(['fin-maria'])
  })
})
