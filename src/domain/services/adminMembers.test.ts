import { describe, expect, it } from 'vitest'
import { normalizeLogin, resolveCreateUser, resolveUpdateUser } from './adminMembers'

describe('normalizeLogin', () => {
  it('minúsculo e sem espaços nas pontas', () => {
    expect(normalizeLogin('  JoAo  ')).toBe('joao')
    expect(normalizeLogin(42)).toBe('')
  })
})

describe('resolveCreateUser', () => {
  it('400 sem login ou senha curta', () => {
    expect(resolveCreateUser({ rawLogin: '', rawPassword: '123456', rawDisplayName: null, loginTaken: false }).ok).toBe(false)
    expect(resolveCreateUser({ rawLogin: 'joao', rawPassword: '123', rawDisplayName: null, loginTaken: false }).ok).toBe(false)
  })

  it('409 com login já usado', () => {
    const decision = resolveCreateUser({ rawLogin: 'Joao', rawPassword: '123456', rawDisplayName: null, loginTaken: true })
    expect(decision).toEqual({ ok: false, status: 409, error: 'Já existe um membro com esse login.' })
  })

  it('normaliza login e monta atividade com nome de exibição', () => {
    const decision = resolveCreateUser({ rawLogin: '  Maria ', rawPassword: '123456', rawDisplayName: ' Maria S ', loginTaken: false })
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.command.login).toBe('maria')
    expect(decision.command.displayName).toBe('Maria S')
    expect(decision.command.activity).toEqual({ type: 'MEMBER_CREATED', message: 'Maria S entrou no clube.' })
  })

  it('usa o login na mensagem quando não há nome', () => {
    const decision = resolveCreateUser({ rawLogin: 'bob', rawPassword: '123456', rawDisplayName: '', loginTaken: false })
    expect(decision.ok && decision.command.activity.message).toBe('bob entrou no clube.')
  })
})

describe('resolveUpdateUser', () => {
  it('404 quando o membro não existe', () => {
    expect(resolveUpdateUser({ userId: 'u1', userExists: false, rawDeactivated: true, rawNewPassword: undefined }).ok).toBe(false)
  })

  it('400 para nova senha curta', () => {
    const decision = resolveUpdateUser({ userId: 'u1', userExists: true, rawDeactivated: undefined, rawNewPassword: '123' })
    expect(decision.ok === false && decision.status).toBe(400)
  })

  it('400 "nada para atualizar" sem campos', () => {
    const decision = resolveUpdateUser({ userId: 'u1', userExists: true, rawDeactivated: undefined, rawNewPassword: undefined })
    expect(decision).toEqual({ ok: false, status: 400, error: 'Nada para atualizar.' })
  })

  it('monta as mudanças (desativar + nova senha)', () => {
    const decision = resolveUpdateUser({ userId: 'u1', userExists: true, rawDeactivated: true, rawNewPassword: '123456' })
    expect(decision).toEqual({ ok: true, command: { userId: 'u1', changes: { deactivated: true, newPassword: '123456' } } })
  })
})
