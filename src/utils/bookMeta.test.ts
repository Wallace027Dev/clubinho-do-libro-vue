import { describe, expect, it } from 'vitest'
import { formatBookMeta } from './bookMeta'

describe('linha de metadados do livro', () => {
  it('junta editora, páginas e autores na ordem da listagem', () => {
    expect(
      formatBookMeta({ publisher: 'Aleph', pageCount: 792, authors: ['Frank Herbert'] })
    ).toBe('Aleph · 792 páginas · Frank Herbert')
  })

  it('junta autores múltiplos', () => {
    expect(formatBookMeta({ authors: ['Harari', 'Marcoantonio'] })).toBe('Harari, Marcoantonio')
  })

  it('marca páginas aproximadas', () => {
    expect(formatBookMeta({ pageCount: 304, pageCountApproximate: true })).toBe('≈ 304 páginas')
  })

  it('omite o que o provedor não informou', () => {
    // Caso real medido: livro brasileiro sem editora e sem páginas.
    expect(formatBookMeta({ publisher: null, pageCount: null, authors: ['Ondjaki'] })).toBe(
      'Ondjaki'
    )
    expect(formatBookMeta({ publisher: 'Record', pageCount: null, authors: [] })).toBe('Record')
  })

  it('devolve vazio quando não há metadado nenhum, para a linha não renderizar', () => {
    expect(formatBookMeta({})).toBe('')
    expect(formatBookMeta({ publisher: '   ', authors: ['  '], pageCount: 0 })).toBe('')
  })

  it('aceita o autor já juntado do candidato do sorteio', () => {
    expect(formatBookMeta({ author: 'Machado de Assis', pageCount: 1 })).toBe(
      '1 página · Machado de Assis'
    )
  })
})
