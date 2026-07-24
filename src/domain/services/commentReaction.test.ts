import { describe, expect, it } from 'vitest'
import {
  reactToComment,
  resolveCommentReaction,
  type CommentReactionCommand,
  type CommentReactionRepository
} from './commentReaction'

describe('resolveCommentReaction (núcleo da reação)', () => {
  it('403 quando o comentário não está liberado (anti-spoiler)', () => {
    const decision = resolveCommentReaction({
      canReact: false,
      commentId: 'k1',
      userId: 'u1',
      rawType: 'GOSTEI'
    })
    expect(decision).toEqual({
      ok: false,
      status: 403,
      error: 'Reação liberada apenas para quem concluiu o capítulo.'
    })
  })

  it('400 quando o tipo de reação é inválido', () => {
    const decision = resolveCommentReaction({
      canReact: true,
      commentId: 'k1',
      userId: 'u1',
      rawType: 'AMEI'
    })
    expect(decision).toEqual({ ok: false, status: 400, error: 'Reação inválida.' })
  })

  it('monta o comando quando liberado e válido', () => {
    const decision = resolveCommentReaction({
      canReact: true,
      commentId: 'k1',
      userId: 'u1',
      rawType: 'SOFRI'
    })
    expect(decision).toEqual({ ok: true, command: { commentId: 'k1', userId: 'u1', type: 'SOFRI' } })
  })
})

describe('reactToComment (orquestrador sobre o repositório)', () => {
  function fakeRepo(overrides: Partial<CommentReactionRepository<{ saved: CommentReactionCommand }>> = {}) {
    const saves: CommentReactionCommand[] = []
    const repo: CommentReactionRepository<{ saved: CommentReactionCommand }> = {
      canReact: async () => true,
      saveReaction: async (command) => {
        saves.push(command)
        return { saved: command }
      },
      ...overrides
    }
    return { repo, saves }
  }

  it('grava a reação quando liberada e válida', async () => {
    const { repo, saves } = fakeRepo()
    const result = await reactToComment(repo, { commentId: 'k1', userId: 'u1', rawType: 'GOSTEI' })
    expect(result.ok).toBe(true)
    expect(saves).toEqual([{ commentId: 'k1', userId: 'u1', type: 'GOSTEI' }])
  })

  it('não grava quando o gate bloqueia', async () => {
    const { repo, saves } = fakeRepo({ canReact: async () => false })
    const result = await reactToComment(repo, { commentId: 'k1', userId: 'u1', rawType: 'GOSTEI' })
    expect(result.ok).toBe(false)
    expect(saves).toHaveLength(0)
  })
})
