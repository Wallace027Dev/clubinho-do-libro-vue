import { describe, expect, it } from 'vitest'
import { chapterMessageLabel, isStandaloneChapterTitle } from './chapterLabel'

describe('rótulos de capítulo (domínio)', () => {
  it('reconhece prólogo/epílogo com e sem acento, ignorando caixa e espaços', () => {
    expect(isStandaloneChapterTitle('Prólogo')).toBe(true)
    expect(isStandaloneChapterTitle('  epilogo ')).toBe(true)
    expect(isStandaloneChapterTitle('Capítulo 1')).toBe(false)
  })

  it('monta o rótulo de mensagem do feed', () => {
    expect(chapterMessageLabel({ number: 0, title: 'Prólogo' })).toBe('o prólogo')
    expect(chapterMessageLabel({ number: 3, title: 'Rumo a Tarbean' })).toBe('o capítulo 3')
  })
})
