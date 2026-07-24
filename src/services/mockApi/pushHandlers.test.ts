import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockDb } from './db'
import { handleMockRequest } from './handlers'

// Endpoints de push no mock: exigem sessão (o membro precisa estar logado para
// registrar/cancelar a assinatura do aparelho). A entrega em si é simulada
// localmente no evento (ver pushSim), não por estes endpoints.
beforeEach(() => resetMockDb())

type Res = { status: number; body: any }
const call = (method: string, path: string, body: Record<string, unknown> = {}): Res =>
  handleMockRequest(method, path, body) as Res

function loginMember() {
  call('POST', '/api/auth/login', { login: 'joao', password: '123456' })
}

describe('push (mock)', () => {
  it('exige sessão para assinar e cancelar', () => {
    expect(call('POST', '/api/push/subscribe', { endpoint: 'x' }).status).toBe(401)
    expect(call('POST', '/api/push/unsubscribe', { endpoint: 'x' }).status).toBe(401)
  })

  it('assina e cancela com o membro logado', () => {
    loginMember()
    expect(call('POST', '/api/push/subscribe', { endpoint: 'x' }).status).toBe(201)
    expect(call('POST', '/api/push/unsubscribe', { endpoint: 'x' }).status).toBe(200)
  })
})
