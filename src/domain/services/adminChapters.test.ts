import { describe, expect, it } from 'vitest'
import {
  resolveCreateChapter,
  resolveDeleteChapter,
  resolveUpdateChapter
} from './adminChapters'

const chapter = { id: 'c1', clubBookId: 'cb1', number: 3, title: 'Rumo a Tarbean' }

describe('resolveCreateChapter', () => {
  it('404 sem livro atual', () => {
    const decision = resolveCreateChapter({
      currentBookId: null,
      existingNumbers: [],
      rawNumber: 1,
      rawTitle: 'Cap'
    })
    expect(decision.ok === false && decision.status).toBe(404)
  })

  it('400 com número inválido ou título vazio', () => {
    expect(
      resolveCreateChapter({ currentBookId: 'cb1', existingNumbers: [], rawNumber: -1, rawTitle: 'x' })
        .ok === false
    ).toBe(true)
    expect(
      resolveCreateChapter({ currentBookId: 'cb1', existingNumbers: [], rawNumber: 1, rawTitle: '  ' })
        .ok === false
    ).toBe(true)
  })

  it('409 com número já usado', () => {
    const decision = resolveCreateChapter({
      currentBookId: 'cb1',
      existingNumbers: [1, 2],
      rawNumber: 2,
      rawTitle: 'Cap'
    })
    expect(decision).toEqual({ ok: false, status: 409, error: 'Já existe um capítulo com esse número neste livro.' })
  })

  it('monta o comando aparando o título', () => {
    const decision = resolveCreateChapter({
      currentBookId: 'cb1',
      existingNumbers: [1],
      rawNumber: 0,
      rawTitle: '  Prólogo  '
    })
    expect(decision).toEqual({ ok: true, command: { clubBookId: 'cb1', number: 0, title: 'Prólogo' } })
  })
})

describe('resolveUpdateChapter', () => {
  it('404 sem capítulo', () => {
    const decision = resolveUpdateChapter({ chapter: null, siblingNumbers: [], rawNumber: 1, rawTitle: undefined })
    expect(decision.ok === false && decision.status).toBe(404)
  })

  it('409 quando o novo número colide com irmão', () => {
    const decision = resolveUpdateChapter({ chapter, siblingNumbers: [5], rawNumber: 5, rawTitle: undefined })
    expect(decision.ok === false && decision.status).toBe(409)
  })

  it('400 "nada para atualizar" sem campos', () => {
    const decision = resolveUpdateChapter({ chapter, siblingNumbers: [], rawNumber: undefined, rawTitle: undefined })
    expect(decision).toEqual({ ok: false, status: 400, error: 'Nada para atualizar.' })
  })

  it('monta as mudanças válidas', () => {
    const decision = resolveUpdateChapter({ chapter, siblingNumbers: [], rawNumber: 4, rawTitle: ' Novo ' })
    expect(decision).toEqual({ ok: true, command: { chapterId: 'c1', changes: { number: 4, title: 'Novo' } } })
  })
})

describe('resolveDeleteChapter', () => {
  it('404 sem capítulo', () => {
    expect(resolveDeleteChapter({ chapter: null, hasMemberActivity: false }).ok).toBe(false)
  })

  it('409 quando há progresso/comentários', () => {
    const decision = resolveDeleteChapter({ chapter, hasMemberActivity: true })
    expect(decision.ok === false && decision.status).toBe(409)
  })

  it('libera a exclusão quando não há participação', () => {
    expect(resolveDeleteChapter({ chapter, hasMemberActivity: false })).toEqual({ ok: true, chapterId: 'c1' })
  })
})
