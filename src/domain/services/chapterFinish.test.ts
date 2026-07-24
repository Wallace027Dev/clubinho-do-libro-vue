import { describe, expect, it } from 'vitest'
import {
  finishChapter,
  resolveChapterFinish,
  type ChapterFinishCommand,
  type ChapterFinishRepository
} from './chapterFinish'

const chapter = { id: 'c1', number: 3, title: 'Rumo a Tarbean' }
const actor = { displayName: 'João', login: 'joao' }
const now = new Date('2026-07-24T12:00:00.000Z')

describe('resolveChapterFinish (núcleo de conclusão)', () => {
  it('bloqueia com 404 quando não há capítulo atual', () => {
    const decision = resolveChapterFinish({
      chapter: null,
      actor,
      userId: 'u1',
      rawRating: 5,
      rawFinishedAt: undefined
    })
    expect(decision).toEqual({ ok: false, status: 404, error: 'Capítulo atual não encontrado.' })
  })

  it('exige nota de 1 a 5 (400 quando inválida ou ausente)', () => {
    for (const rawRating of [undefined, 0, 6, 'abc']) {
      const decision = resolveChapterFinish({ chapter, actor, userId: 'u1', rawRating, rawFinishedAt: undefined })
      expect(decision.ok).toBe(false)
      expect(decision.ok === false && decision.status).toBe(400)
    }
  })

  it('monta o comando com mensagem e metadados do feed', () => {
    const decision = resolveChapterFinish({
      chapter,
      actor,
      userId: 'u1',
      rawRating: 5,
      rawFinishedAt: '2026-07-24T10:00:00.000Z',
      now
    })

    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.command.rating).toBe(5)
    expect(decision.command.finishedAt.toISOString()).toBe('2026-07-24T10:00:00.000Z')
    expect(decision.command.activity.message).toBe('João terminou o capítulo 3 e deu nota 5,0.')
    expect(decision.command.activity.metadata).toEqual({
      chapterId: 'c1',
      chapterNumber: 3,
      chapterTitle: 'Rumo a Tarbean',
      rating: 5
    })
  })

  it('usa "Um membro" quando não há autor e cai para agora com horário futuro', () => {
    const decision = resolveChapterFinish({
      chapter,
      actor: null,
      userId: 'u1',
      rawRating: 4.8,
      rawFinishedAt: '2999-01-01T00:00:00.000Z',
      now
    })
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.command.activity.message).toBe('Um membro terminou o capítulo 3 e deu nota 4,8.')
    expect(decision.command.finishedAt).toEqual(now)
  })
})

describe('finishChapter (orquestrador sobre o repositório)', () => {
  /** Repositório fake em memória para exercitar leitura → decisão → gravação. */
  function fakeRepo(overrides: Partial<ChapterFinishRepository<{ committed: ChapterFinishCommand }>> = {}) {
    const commits: ChapterFinishCommand[] = []
    const repo: ChapterFinishRepository<{ committed: ChapterFinishCommand }> = {
      getCurrentChapter: async () => chapter,
      getActor: async () => actor,
      commitFinish: async (command) => {
        commits.push(command)
        return { committed: command }
      },
      ...overrides
    }
    return { repo, commits }
  }

  it('grava o comando quando a decisão é válida', async () => {
    const { repo, commits } = fakeRepo()
    const result = await finishChapter(repo, {
      chapterId: 'c1',
      userId: 'u1',
      rawRating: 5,
      rawFinishedAt: undefined,
      now
    })

    expect(result.ok).toBe(true)
    expect(commits).toHaveLength(1)
    expect(commits[0].activity.type).toBe('CHAPTER_FINISHED')
  })

  it('não grava quando a decisão falha (capítulo inexistente)', async () => {
    const { repo, commits } = fakeRepo({ getCurrentChapter: async () => null })
    const result = await finishChapter(repo, {
      chapterId: 'x',
      userId: 'u1',
      rawRating: 5,
      rawFinishedAt: undefined
    })

    expect(result).toEqual({ ok: false, status: 404, error: 'Capítulo atual não encontrado.' })
    expect(commits).toHaveLength(0)
  })
})
