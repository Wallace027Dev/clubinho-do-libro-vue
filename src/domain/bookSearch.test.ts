import { describe, expect, it } from 'vitest'
import {
  dedupeExternalBooks,
  MIN_SEARCH_TERM_LENGTH,
  resolveBookSearchQuery,
  type ExternalBook
} from './bookSearch'

function livro(partial: Partial<ExternalBook>): ExternalBook {
  return {
    source: 'google',
    providerId: 'id-1',
    title: 'Duna',
    authors: ['Frank Herbert'],
    publisher: 'Aleph',
    pageCount: 792,
    pageCountApproximate: false,
    isbn: '9788576573265',
    coverUrl: null,
    description: null,
    ...partial
  }
}

describe('termo da busca de livro', () => {
  it('aceita termo com o mínimo de caracteres e normaliza espaço', () => {
    expect(resolveBookSearchQuery('  dom   casmurro  ')).toEqual({
      ok: true,
      term: 'dom casmurro'
    })
  })

  it('recusa termo curto demais, vazio ou que não é texto', () => {
    expect(resolveBookSearchQuery('d').ok).toBe(false)
    expect(resolveBookSearchQuery('   ').ok).toBe(false)
    expect(resolveBookSearchQuery('').ok).toBe(false)
    expect(resolveBookSearchQuery(undefined).ok).toBe(false)
    expect(resolveBookSearchQuery(42).ok).toBe(false)
  })

  it('devolve 400 com o mínimo na mensagem', () => {
    const decision = resolveBookSearchQuery('a')
    expect(decision).toMatchObject({ ok: false, status: 400 })
    if (!decision.ok) {
      expect(decision.error).toContain(String(MIN_SEARCH_TERM_LENGTH))
    }
  })
})

describe('deduplicação dos resultados', () => {
  it('junta a mesma obra em edições diferentes, mantendo a primeira', () => {
    const resultado = dedupeExternalBooks([
      livro({ providerId: 'a', publisher: 'Aleph' }),
      livro({ providerId: 'b', publisher: 'Nova Fronteira' })
    ])

    expect(resultado).toHaveLength(1)
    expect(resultado[0].providerId).toBe('a')
  })

  it('ignora acento e caixa ao comparar', () => {
    const resultado = dedupeExternalBooks([
      livro({ providerId: 'a', title: 'Memórias Póstumas', authors: ['Machado de Assis'] }),
      livro({ providerId: 'b', title: 'memorias postumas', authors: ['MACHADO DE ASSIS'] })
    ])

    expect(resultado).toHaveLength(1)
  })

  it('mantém obras diferentes do mesmo autor', () => {
    const resultado = dedupeExternalBooks([
      livro({ providerId: 'a', title: 'Dom Casmurro', authors: ['Machado de Assis'] }),
      livro({ providerId: 'b', title: 'Quincas Borba', authors: ['Machado de Assis'] })
    ])

    expect(resultado).toHaveLength(2)
  })

  it('não quebra quando o provedor não informa autor', () => {
    const resultado = dedupeExternalBooks([
      livro({ providerId: 'a', authors: [] }),
      livro({ providerId: 'b', authors: [] })
    ])

    expect(resultado).toHaveLength(1)
  })
})
