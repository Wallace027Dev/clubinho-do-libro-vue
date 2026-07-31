import { describe, expect, it } from 'vitest'
import { generatedChapters, MAX_GENERATED_CHAPTERS, resolveChapterCount } from './chapterStructure'

describe('quantidade de capítulos informada no aceite', () => {
  it('aceita a quantidade que o admin digitou', () => {
    expect(resolveChapterCount(12)).toEqual({ ok: true, count: 12 })
    expect(resolveChapterCount(1)).toEqual({ ok: true, count: 1 })
    expect(resolveChapterCount(MAX_GENERATED_CHAPTERS)).toEqual({
      ok: true,
      count: MAX_GENERATED_CHAPTERS
    })
  })

  it('trata campo ausente como zero capítulo', () => {
    // O cadastro manual do painel não manda o campo e segue criando o livro só.
    expect(resolveChapterCount(undefined)).toEqual({ ok: true, count: 0 })
    expect(resolveChapterCount(null)).toEqual({ ok: true, count: 0 })
    expect(resolveChapterCount(0)).toEqual({ ok: true, count: 0 })
  })

  it('recusa quantidade acima do teto', () => {
    const decision = resolveChapterCount(MAX_GENERATED_CHAPTERS + 1)
    expect(decision.ok).toBe(false)
    expect(decision).toMatchObject({ status: 400 })
  })

  it('recusa negativo, fracionado e o que não é número', () => {
    for (const invalid of [-1, 1.5, '12', '', {}, [], NaN, Infinity]) {
      expect(resolveChapterCount(invalid).ok).toBe(false)
    }
  })
})

describe('capítulos gerados', () => {
  it('numera de 1 a N e deixa o título vazio para o admin preencher', () => {
    expect(generatedChapters(3)).toEqual([
      { number: 1, title: '' },
      { number: 2, title: '' },
      { number: 3, title: '' }
    ])
  })

  it('não gera nada quando a quantidade é zero', () => {
    expect(generatedChapters(0)).toEqual([])
  })
})
