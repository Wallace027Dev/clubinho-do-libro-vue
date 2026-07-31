import { describe, expect, it } from 'vitest'
import {
  chapterHeading,
  chapterShortTag,
  chapterTag,
  chapterTagFromMeta,
  chapterTagLower,
  isStandaloneChapterTitle
} from './chapters'

describe('isStandaloneChapterTitle', () => {
  it('reconhece prólogo/epílogo com e sem acento, ignorando caixa e espaços', () => {
    expect(isStandaloneChapterTitle('Prólogo')).toBe(true)
    expect(isStandaloneChapterTitle('prologo')).toBe(true)
    expect(isStandaloneChapterTitle('  Epílogo  ')).toBe(true)
    expect(isStandaloneChapterTitle('epilogo')).toBe(true)
  })

  it('não marca capítulos comuns', () => {
    expect(isStandaloneChapterTitle('Capítulo 1')).toBe(false)
    expect(isStandaloneChapterTitle('Introdução')).toBe(false)
  })
})

describe('etiquetas de capítulo', () => {
  const prologo = { number: 0, title: 'Prólogo' }
  const cap3 = { number: 3, title: 'Rumo a Tarbean' }

  it('chapterTag', () => {
    expect(chapterTag(prologo)).toBe('Prólogo')
    expect(chapterTag(cap3)).toBe('Capítulo 3')
  })

  it('chapterTagLower', () => {
    expect(chapterTagLower(prologo)).toBe('o prólogo')
    expect(chapterTagLower(cap3)).toBe('o capítulo 3')
  })

  it('chapterHeading', () => {
    expect(chapterHeading(prologo)).toBe('Prólogo')
    expect(chapterHeading(cap3)).toBe('Capítulo 3 — Rumo a Tarbean')
    // Capítulo gerado no aceite do sorteio nasce sem título.
    expect(chapterHeading({ number: 1, title: '' })).toBe('Capítulo 1')
    expect(chapterHeading({ number: 1, title: '   ' })).toBe('Capítulo 1')
  })

  it('chapterShortTag', () => {
    expect(chapterShortTag(prologo)).toBe('P')
    expect(chapterShortTag({ number: 9, title: 'Epílogo' })).toBe('E')
    expect(chapterShortTag(cap3)).toBe('C3')
  })
})

describe('chapterTagFromMeta', () => {
  it('prioriza título avulso, trata número 0 como prólogo e cai no genérico', () => {
    expect(chapterTagFromMeta(0, 'Prólogo')).toBe('Prólogo')
    expect(chapterTagFromMeta(0)).toBe('Prólogo')
    expect(chapterTagFromMeta(5)).toBe('Capítulo 5')
    expect(chapterTagFromMeta(null)).toBe('Capítulo')
  })
})
