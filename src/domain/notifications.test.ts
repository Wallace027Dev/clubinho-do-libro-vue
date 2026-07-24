import { describe, expect, it } from 'vitest'
import { activeMemberIds, bookSelectedNotification } from './notifications'

describe('activeMemberIds (alvo das notificações)', () => {
  const members = [
    { id: 'u1', deactivatedAt: null },
    { id: 'u2', deactivatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'u3', deactivatedAt: null }
  ]

  it('inclui só membros ativos', () => {
    expect(activeMemberIds(members)).toEqual(['u1', 'u3'])
  })

  it('exclui quem disparou o evento', () => {
    expect(activeMemberIds(members, 'u1')).toEqual(['u3'])
  })
})

describe('bookSelectedNotification', () => {
  it('monta título, corpo e destino do novo livro', () => {
    const payload = bookSelectedNotification('Mistborn')
    expect(payload.title).toContain('Novo livro')
    expect(payload.body).toContain('Mistborn')
    expect(payload.url).toBe('/')
    expect(payload.tag).toBe('book-selected')
  })
})
