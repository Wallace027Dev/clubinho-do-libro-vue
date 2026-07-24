import { describe, expect, it } from 'vitest'
import {
  MAX_REVIEW_LENGTH,
  resolveBookReview,
  submitBookReview,
  type BookReviewCommand,
  type BookReviewRepository
} from './bookReview'

const currentBook = { clubBookId: 'cb1', bookId: 'b1', title: 'Mistborn' }
const actor = { displayName: 'Maria', login: 'maria' }

const base = {
  currentBook,
  actor,
  userId: 'u1',
  rawRating: 5,
  rawReview: 'Ótimo livro',
  finishedAllChapters: true,
  ratedAllChapters: true
}

describe('resolveBookReview (núcleo da avaliação)', () => {
  it('404 quando não há livro atual', () => {
    const decision = resolveBookReview({ ...base, currentBook: null })
    expect(decision).toEqual({ ok: false, status: 404, error: 'Não existe livro atual em andamento.' })
  })

  it('400 quando a nota é inválida', () => {
    const decision = resolveBookReview({ ...base, rawRating: 0 })
    expect(decision.ok === false && decision.status).toBe(400)
  })

  it('400 quando a resenha ultrapassa o limite', () => {
    const decision = resolveBookReview({ ...base, rawReview: 'a'.repeat(MAX_REVIEW_LENGTH + 1) })
    expect(decision).toEqual({
      ok: false,
      status: 400,
      error: `A resenha deve ter até ${MAX_REVIEW_LENGTH} caracteres.`
    })
  })

  it('403 quando não concluiu todos os capítulos', () => {
    const decision = resolveBookReview({ ...base, finishedAllChapters: false })
    expect(decision).toEqual({
      ok: false,
      status: 403,
      error: 'Conclua todos os capítulos para avaliar o livro.'
    })
  })

  it('403 quando não deu nota a todos os capítulos', () => {
    const decision = resolveBookReview({ ...base, ratedAllChapters: false })
    expect(decision).toEqual({
      ok: false,
      status: 403,
      error: 'Dê sua nota a todos os capítulos antes de avaliar o livro.'
    })
  })

  it('monta o comando (resenha vazia vira null) com mensagem e metadados', () => {
    const decision = resolveBookReview({ ...base, rawReview: '   ' })
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.command.review).toBe(null)
    expect(decision.command.activity.message).toBe('Maria avaliou Mistborn com 5,0/5.')
    expect(decision.command.activity.metadata).toEqual({ bookId: 'b1', rating: 5 })
  })
})

describe('submitBookReview (orquestrador sobre o repositório)', () => {
  function fakeRepo(overrides: Partial<BookReviewRepository<{ saved: BookReviewCommand }>> = {}) {
    const commits: BookReviewCommand[] = []
    const repo: BookReviewRepository<{ saved: BookReviewCommand }> = {
      getCurrentBook: async () => currentBook,
      getActor: async () => actor,
      userFinishedAllChapters: async () => true,
      userRatedAllChapters: async () => true,
      commitReview: async (command) => {
        commits.push(command)
        return { saved: command }
      },
      ...overrides
    }
    return { repo, commits }
  }

  it('grava quando todos os gates passam', async () => {
    const { repo, commits } = fakeRepo()
    const result = await submitBookReview(repo, { userId: 'u1', rawRating: 5, rawReview: 'top' })
    expect(result.ok).toBe(true)
    expect(commits).toHaveLength(1)
    expect(commits[0].activity.type).toBe('BOOK_REVIEWED')
  })

  it('não grava quando um gate falha', async () => {
    const { repo, commits } = fakeRepo({ userRatedAllChapters: async () => false })
    const result = await submitBookReview(repo, { userId: 'u1', rawRating: 5, rawReview: 'top' })
    expect(result.ok).toBe(false)
    expect(commits).toHaveLength(0)
  })
})
