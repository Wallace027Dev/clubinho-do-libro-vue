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
      coverUrl: null,
      chapters: [],
      activity: { type: 'BOOK_SELECTED', message: 'Mistborn virou o livro atual do clube.' }
    })
  })

  it('gera as linhas de capítulo a partir da quantidade informada', () => {
    const decision = resolveSelectBook({
      hasCurrentBook: false,
      rawTitle: 'Duna',
      rawAuthor: 'Frank Herbert',
      rawDescription: null,
      rawChapterCount: 3
    })

    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    // A quantidade não é guardada em campo nenhum: ela só decide as linhas.
    expect(decision.command.chapters).toEqual([
      { number: 1, title: '' },
      { number: 2, title: '' },
      { number: 3, title: '' }
    ])
  })

  it('guarda a capa vinda da busca, trimada', () => {
    const decision = resolveSelectBook({
      hasCurrentBook: false,
      rawTitle: 'Duna',
      rawAuthor: null,
      rawDescription: null,
      rawCoverUrl: '  https://covers.exemplo/duna.jpg  '
    })

    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.command.coverUrl).toBe('https://covers.exemplo/duna.jpg')
  })

  it('recusa quantidade inválida antes de olhar o conflito de livro atual', () => {
    const decision = resolveSelectBook({
      hasCurrentBook: true,
      rawTitle: 'Duna',
      rawAuthor: null,
      rawDescription: null,
      rawChapterCount: -1
    })

    expect(decision.ok === false && decision.status).toBe(400)
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
