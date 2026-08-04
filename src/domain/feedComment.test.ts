import { describe, expect, it } from 'vitest'
import { COMMENT_PREVIEW_LENGTH, commentPreview, feedCommentView } from './feedComment'

describe('commentPreview', () => {
  it('colapsa espaços e quebras de linha numa única linha', () => {
    expect(commentPreview('Amei   esse\n\ncapítulo   demais')).toBe('Amei esse capítulo demais')
  })

  it('mantém o texto quando cabe no limite', () => {
    expect(commentPreview('curtinho')).toBe('curtinho')
  })

  it('trunca com reticências quando passa do limite', () => {
    const preview = commentPreview('a'.repeat(200))
    expect(preview.endsWith('…')).toBe(true)
    // Reticências fora, o corpo cortado tem no máximo o tamanho do limite.
    expect(preview.length).toBeLessThanOrEqual(COMMENT_PREVIEW_LENGTH + 1)
  })
})

describe('feedCommentView (anti-spoiler do feed)', () => {
  const finished = new Set(['cap-1', 'cap-2'])

  it('destrava e mostra o trecho de quem concluiu o capítulo', () => {
    const view = feedCommentView({
      finishedChapterIds: finished,
      chapterId: 'cap-1',
      body: 'Que reviravolta no final!'
    })
    expect(view).toEqual({ locked: false, bodyPreview: 'Que reviravolta no final!' })
  })

  it('trava e NÃO revela o corpo de capítulo não concluído', () => {
    const view = feedCommentView({
      finishedChapterIds: finished,
      chapterId: 'cap-9',
      body: 'spoiler pesado do assassino'
    })
    expect(view.locked).toBe(true)
    expect(view.bodyPreview).toBeNull()
  })

  it('trava quando o capítulo do comentário é desconhecido', () => {
    const view = feedCommentView({ finishedChapterIds: finished, chapterId: null, body: 'oi' })
    expect(view).toEqual({ locked: true, bodyPreview: null })
  })

  it('destravado com corpo vazio devolve preview nulo (sem travar)', () => {
    const view = feedCommentView({ finishedChapterIds: finished, chapterId: 'cap-2', body: '   ' })
    expect(view).toEqual({ locked: false, bodyPreview: null })
  })
})
