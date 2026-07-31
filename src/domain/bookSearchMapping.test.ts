import { describe, expect, it } from 'vitest'
import {
  mapGoogleVolume,
  mapOpenLibraryDoc,
  mergeOpenLibraryEdition,
  openLibraryCoverUrl,
  pickOpenLibraryEdition
} from './bookSearchMapping'

describe('volume do Google Books', () => {
  const volume = {
    id: 'zyTCAlFPjgYC',
    volumeInfo: {
      title: 'Duna',
      authors: ['Frank Herbert'],
      publisher: 'Aleph',
      pageCount: 792,
      description: 'Em Arrakis...',
      industryIdentifiers: [
        { type: 'ISBN_10', identifier: '8576573261' },
        { type: 'ISBN_13', identifier: '9788576573265' }
      ],
      // O Google devolve a capa em http, que a página https bloquearia.
      imageLinks: { thumbnail: 'http://books.google.com/books/content?id=zyTC' }
    }
  }

  it('mapeia os campos e prefere o ISBN-13', () => {
    expect(mapGoogleVolume(volume)).toEqual({
      source: 'google',
      providerId: 'zyTCAlFPjgYC',
      title: 'Duna',
      authors: ['Frank Herbert'],
      publisher: 'Aleph',
      pageCount: 792,
      pageCountApproximate: false,
      isbn: '9788576573265',
      coverUrl: 'https://books.google.com/books/content?id=zyTC',
      description: 'Em Arrakis...'
    })
  })

  it('cai no ISBN-10 quando não há 13', () => {
    const raw = {
      ...volume,
      volumeInfo: {
        ...volume.volumeInfo,
        industryIdentifiers: [{ type: 'ISBN_10', identifier: '8576573261' }]
      }
    }
    expect(mapGoogleVolume(raw)?.isbn).toBe('8576573261')
  })

  it('tolera volume magro sem quebrar', () => {
    const magro = mapGoogleVolume({ id: 'abc', volumeInfo: { title: 'Só o título' } })
    expect(magro).toMatchObject({
      title: 'Só o título',
      authors: [],
      publisher: null,
      pageCount: null,
      isbn: null,
      coverUrl: null,
      description: null
    })
  })

  it('descarta volume sem id ou sem título', () => {
    expect(mapGoogleVolume({ volumeInfo: { title: 'Duna' } })).toBeNull()
    expect(mapGoogleVolume({ id: 'abc', volumeInfo: {} })).toBeNull()
    expect(mapGoogleVolume(null)).toBeNull()
  })
})

describe('obra do Open Library', () => {
  // Payload real de /search.json (Dom Casmurro).
  const doc = {
    key: '/works/OL1003040W',
    title: 'Dom Casmurro',
    author_name: ['Machado de Assis'],
    cover_i: 647501,
    number_of_pages_median: 268
  }

  it('mapeia a obra sem afirmar editora nem ISBN', () => {
    expect(mapOpenLibraryDoc(doc)).toEqual({
      source: 'openlibrary',
      providerId: '/works/OL1003040W',
      title: 'Dom Casmurro',
      authors: ['Machado de Assis'],
      publisher: null,
      pageCount: 268,
      // Mediana entre edições: a UI mostra como aproximado.
      pageCountApproximate: true,
      isbn: null,
      coverUrl: 'https://covers.openlibrary.org/b/id/647501-M.jpg',
      description: null
    })
  })

  it('fica sem capa quando a obra não tem cover_i', () => {
    expect(mapOpenLibraryDoc({ ...doc, cover_i: undefined })?.coverUrl).toBeNull()
    expect(openLibraryCoverUrl(0)).toBeNull()
  })
})

describe('escolha da edição no Open Library', () => {
  // Entradas reais de /works/OL1003040W/editions.json.
  const entries = [
    {
      key: '/books/OL62363757M',
      languages: [{ key: '/languages/por' }],
      publishers: ['Projecto Adamastor'],
      isbn_13: ['9789898698124'],
      covers: [15241023]
    },
    {
      key: '/books/OL61241820M',
      languages: [{ key: '/languages/por' }],
      publishers: ['Penguin-Companhia'],
      number_of_pages: 400,
      isbn_13: ['9788582850350'],
      covers: [15167286]
    },
    {
      key: '/books/OL52573289M',
      languages: [{ key: '/languages/eng' }],
      publishers: ['Noonday Press'],
      number_of_pages: 283
    }
  ]

  it('prefere edição em português e completa', () => {
    const edition = pickOpenLibraryEdition(entries)
    expect(edition?.key).toBe('/books/OL61241820M')
    expect(edition).toMatchObject({ publisher: 'Penguin-Companhia', pageCount: 400, isPortuguese: true })
  })

  it('cai em edição estrangeira quando não há nenhuma em português', () => {
    const edition = pickOpenLibraryEdition([entries[2]])
    expect(edition?.key).toBe('/books/OL52573289M')
    expect(edition?.isPortuguese).toBe(false)
  })

  it('desempata pela menor chave, para a escolha ser estável', () => {
    const iguais = [
      { key: '/books/OLzzzM', languages: [{ key: '/languages/por' }], publishers: ['B'], number_of_pages: 100, isbn_13: ['2'] },
      { key: '/books/OLaaaM', languages: [{ key: '/languages/por' }], publishers: ['A'], number_of_pages: 100, isbn_13: ['1'] }
    ]
    expect(pickOpenLibraryEdition(iguais)?.key).toBe('/books/OLaaaM')
    expect(pickOpenLibraryEdition(iguais.slice().reverse())?.key).toBe('/books/OLaaaM')
  })

  it('devolve nulo sem edição nenhuma', () => {
    expect(pickOpenLibraryEdition([])).toBeNull()
    expect(pickOpenLibraryEdition([{ sem: 'chave' }])).toBeNull()
  })
})

describe('obra enriquecida pela edição', () => {
  const work = mapOpenLibraryDoc({
    key: '/works/OL1003040W',
    title: 'Dom Casmurro',
    author_name: ['Machado de Assis'],
    number_of_pages_median: 268
  })!

  it('troca a mediana pelo dado da edição e deixa de ser aproximado', () => {
    const enriquecida = mergeOpenLibraryEdition(work, pickOpenLibraryEdition([
      {
        key: '/books/OL61241820M',
        languages: [{ key: '/languages/por' }],
        publishers: ['Penguin-Companhia'],
        number_of_pages: 400,
        isbn_13: ['9788582850350'],
        covers: [15167286]
      }
    ]))

    expect(enriquecida).toMatchObject({
      publisher: 'Penguin-Companhia',
      pageCount: 400,
      pageCountApproximate: false,
      isbn: '9788582850350',
      coverUrl: 'https://covers.openlibrary.org/b/id/15167286-M.jpg'
    })
  })

  it('sem edição utilizável, mantém a obra como está', () => {
    expect(mergeOpenLibraryEdition(work, null)).toEqual(work)
  })

  it('não sobrescreve a capa da obra pela da edição', () => {
    const comCapa = { ...work, coverUrl: 'https://covers.openlibrary.org/b/id/647501-M.jpg' }
    const enriquecida = mergeOpenLibraryEdition(
      comCapa,
      pickOpenLibraryEdition([{ key: '/books/OLaM', publishers: ['X'], covers: [999] }])
    )
    expect(enriquecida.coverUrl).toBe('https://covers.openlibrary.org/b/id/647501-M.jpg')
  })
})
