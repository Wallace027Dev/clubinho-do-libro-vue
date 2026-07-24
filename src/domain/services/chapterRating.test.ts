import { describe, expect, it } from 'vitest'
import {
  rateChapter,
  resolveChapterRating,
  type ChapterRatingCommand,
  type ChapterRatingRepository
} from './chapterRating'

const chapter = { id: 'c1' }

describe('resolveChapterRating (núcleo da nota)', () => {
  it('bloqueia com 403 quem não concluiu o capítulo (anti-spoiler)', () => {
    const decision = resolveChapterRating({ chapter: null, userId: 'u1', rawRating: 5 })
    expect(decision).toEqual({
      ok: false,
      status: 403,
      error: 'Conclua o capítulo antes de dar a sua nota.'
    })
  })

  it('exige nota de 1 a 5 (400 quando inválida)', () => {
    for (const rawRating of [undefined, 0, 6, 'x']) {
      const decision = resolveChapterRating({ chapter, userId: 'u1', rawRating })
      expect(decision.ok).toBe(false)
      expect(decision.ok === false && decision.status).toBe(400)
    }
  })

  it('monta o comando com a nota normalizada', () => {
    const decision = resolveChapterRating({ chapter, userId: 'u1', rawRating: 4.85 })
    expect(decision).toEqual({ ok: true, command: { chapterId: 'c1', userId: 'u1', rating: 4.9 } })
  })
})

describe('rateChapter (orquestrador sobre o repositório)', () => {
  function fakeRepo(overrides: Partial<ChapterRatingRepository<{ saved: ChapterRatingCommand }>> = {}) {
    const saves: ChapterRatingCommand[] = []
    const repo: ChapterRatingRepository<{ saved: ChapterRatingCommand }> = {
      getFinishedChapter: async () => chapter,
      saveRating: async (command) => {
        saves.push(command)
        return { saved: command }
      },
      ...overrides
    }
    return { repo, saves }
  }

  it('grava a nota quando o capítulo está liberado e a nota é válida', async () => {
    const { repo, saves } = fakeRepo()
    const result = await rateChapter(repo, { chapterId: 'c1', userId: 'u1', rawRating: 5 })
    expect(result.ok).toBe(true)
    expect(saves).toEqual([{ chapterId: 'c1', userId: 'u1', rating: 5 }])
  })

  it('não grava quando o capítulo não está liberado', async () => {
    const { repo, saves } = fakeRepo({ getFinishedChapter: async () => null })
    const result = await rateChapter(repo, { chapterId: 'c1', userId: 'u1', rawRating: 5 })
    expect(result).toEqual({
      ok: false,
      status: 403,
      error: 'Conclua o capítulo antes de dar a sua nota.'
    })
    expect(saves).toHaveLength(0)
  })
})
