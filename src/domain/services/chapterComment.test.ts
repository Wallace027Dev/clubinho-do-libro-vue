import { describe, expect, it } from 'vitest'
import {
  MAX_COMMENT_LENGTH,
  listChapterComments,
  resolveChapterComment,
  submitChapterComment,
  type ChapterCommentCommand,
  type ChapterCommentRepository
} from './chapterComment'

const chapter = { id: 'c1', number: 3, title: 'Rumo a Tarbean' }
const actor = { displayName: 'João', login: 'joao' }

describe('resolveChapterComment (núcleo do comentário)', () => {
  it('403 quando o capítulo não está liberado (anti-spoiler)', () => {
    const decision = resolveChapterComment({ chapter: null, actor, userId: 'u1', rawBody: 'oi' })
    expect(decision).toEqual({
      ok: false,
      status: 403,
      error: 'Comentários liberam apenas depois de concluir o capítulo.'
    })
  })

  it('400 para comentário vazio (ou só espaços)', () => {
    expect(resolveChapterComment({ chapter, actor, userId: 'u1', rawBody: '   ' })).toEqual({
      ok: false,
      status: 400,
      error: 'Comentário vazio.'
    })
  })

  it('400 quando ultrapassa o limite', () => {
    const decision = resolveChapterComment({
      chapter,
      actor,
      userId: 'u1',
      rawBody: 'a'.repeat(MAX_COMMENT_LENGTH + 1)
    })
    expect(decision.ok === false && decision.status).toBe(400)
  })

  it('monta o comando (texto aparado) com mensagem e metadados', () => {
    const decision = resolveChapterComment({ chapter, actor, userId: 'u1', rawBody: '  Curti!  ' })
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.command.body).toBe('Curti!')
    expect(decision.command.activity.message).toBe('João comentou o capítulo 3.')
    expect(decision.command.activity.metadata).toEqual({
      chapterId: 'c1',
      chapterNumber: 3,
      chapterTitle: 'Rumo a Tarbean'
    })
  })
})

describe('orquestradores de comentário', () => {
  function fakeRepo(overrides: Partial<ChapterCommentRepository<string[]>> = {}) {
    const commits: ChapterCommentCommand[] = []
    const repo: ChapterCommentRepository<string[]> = {
      getFinishedChapter: async () => chapter,
      getActor: async () => actor,
      commitComment: async (command) => {
        commits.push(command)
      },
      listComments: async () => ['comentário'],
      ...overrides
    }
    return { repo, commits }
  }

  it('listChapterComments bloqueia com 403 sem capítulo liberado', async () => {
    const { repo } = fakeRepo({ getFinishedChapter: async () => null })
    const result = await listChapterComments(repo, { chapterId: 'c1', userId: 'u1' })
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.status).toBe(403)
  })

  it('submitChapterComment grava e devolve a lista', async () => {
    const { repo, commits } = fakeRepo()
    const result = await submitChapterComment(repo, { chapterId: 'c1', userId: 'u1', rawBody: 'oi' })
    expect(result).toEqual({ ok: true, comments: ['comentário'] })
    expect(commits).toHaveLength(1)
  })

  it('submitChapterComment não grava quando a decisão falha', async () => {
    const { repo, commits } = fakeRepo()
    const result = await submitChapterComment(repo, { chapterId: 'c1', userId: 'u1', rawBody: '' })
    expect(result.ok).toBe(false)
    expect(commits).toHaveLength(0)
  })
})
