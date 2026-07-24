import { describe, expect, it } from 'vitest'
import { resolveFinishBook, resolveSelectBook } from './adminBook'

describe('resolveSelectBook', () => {
  it('400 sem título', () => {
    const decision = resolveSelectBook({ hasCurrentBook: false, rawTitle: '  ', rawAuthor: null, rawDescription: null })
    expect(decision).toEqual({ ok: false, status: 400, error: 'Título do livro é obrigatório.' })
  })

  it('409 quando já há livro atual', () => {
    const decision = resolveSelectBook({ hasCurrentBook: true, rawTitle: 'Mistborn', rawAuthor: null, rawDescription: null })
    expect(decision.ok === false && decision.status).toBe(409)
  })

  it('monta o comando (autor/descrição vazios viram null) com atividade', () => {
    const decision = resolveSelectBook({
      hasCurrentBook: false,
      rawTitle: ' Mistborn ',
      rawAuthor: '  ',
      rawDescription: ' Épico '
    })
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.command).toEqual({
      title: 'Mistborn',
      author: null,
      description: 'Épico',
      activity: { type: 'BOOK_SELECTED', message: 'Mistborn virou o livro atual do clube.' }
    })
  })
})

describe('resolveFinishBook', () => {
  it('404 sem livro atual', () => {
    expect(resolveFinishBook({ currentBook: null }).ok).toBe(false)
  })

  it('monta o comando com mensagem e metadados', () => {
    const decision = resolveFinishBook({
      currentBook: { clubBookId: 'cb1', bookId: 'b1', title: 'Mistborn' }
    })
    expect(decision).toEqual({
      ok: true,
      command: {
        clubBookId: 'cb1',
        activity: {
          type: 'BOOK_FINISHED',
          message: 'Mistborn foi finalizado pelo clube.',
          metadata: { bookId: 'b1' }
        }
      }
    })
  })
})
