import { describe, expect, it } from 'vitest'
import {
  everyChapterFinished,
  everyChapterRated,
  isChapterUnlocked,
  resolveFinishedAt
} from './chapterProgress'

describe('acesso ao capítulo (anti-spoiler)', () => {
  it('libera só quem concluiu o capítulo no livro atual', () => {
    expect(isChapterUnlocked({ clubBookStatus: 'CURRENT', progressStatus: 'FINISHED' })).toBe(true)
  })

  it('bloqueia quem não concluiu o capítulo', () => {
    expect(isChapterUnlocked({ clubBookStatus: 'CURRENT', progressStatus: 'STARTED' })).toBe(false)
    expect(isChapterUnlocked({ clubBookStatus: 'CURRENT', progressStatus: undefined })).toBe(false)
  })

  it('bloqueia quando o livro não é o atual do clube', () => {
    expect(isChapterUnlocked({ clubBookStatus: 'FINISHED', progressStatus: 'FINISHED' })).toBe(false)
  })
})

describe('conclusão/avaliação de todos os capítulos', () => {
  it('exige todos concluídos e não conta livro sem capítulos', () => {
    expect(everyChapterFinished(['FINISHED', 'FINISHED'])).toBe(true)
    expect(everyChapterFinished(['FINISHED', 'STARTED'])).toBe(false)
    expect(everyChapterFinished([])).toBe(false)
  })

  it('exige nota em todos os capítulos e não conta livro sem capítulos', () => {
    expect(everyChapterRated([true, true])).toBe(true)
    expect(everyChapterRated([true, false])).toBe(false)
    expect(everyChapterRated([])).toBe(false)
  })
})

describe('horário de conclusão informado', () => {
  const now = new Date('2026-07-24T12:00:00.000Z')

  it('usa o horário informado quando é válido e não futuro', () => {
    const raw = '2026-07-24T10:00:00.000Z'
    expect(resolveFinishedAt(raw, now).toISOString()).toBe(raw)
  })

  it('cai para agora quando o horário é futuro, inválido ou ausente', () => {
    expect(resolveFinishedAt('2026-07-24T13:00:00.000Z', now)).toEqual(now)
    expect(resolveFinishedAt('não é data', now)).toEqual(now)
    expect(resolveFinishedAt(undefined, now)).toEqual(now)
    expect(resolveFinishedAt('', now)).toEqual(now)
  })
})
