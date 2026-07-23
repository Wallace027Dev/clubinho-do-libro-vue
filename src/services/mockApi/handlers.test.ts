import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockDb } from './db'
import { handleMockRequest } from './handlers'

// O mock de homologação reimplementa fielmente as regras da API real
// (autenticação, autorização, anti-spoiler e gates). Testar essas regras aqui
// trava o comportamento de segurança do produto — e vale como rede de proteção
// enquanto a lógica ainda não foi extraída para uma camada de domínio única.

type Res = { status: number; body: any }
const req = (method: string, path: string, body: Record<string, unknown> = {}): Res =>
  handleMockRequest(method, path, body) as Res

const loginAdmin = () => req('POST', '/api/admin/login', { password: '123456' })
const loginMember = (login = 'joao', password = '123456') =>
  req('POST', '/api/auth/login', { login, password })
const logout = () => req('POST', '/api/auth/logout')

/** Admin cria um livro atual com N capítulos e devolve os ids. Sai da sessão. */
function seedBook(chapterCount = 1): string[] {
  loginAdmin()
  req('POST', '/api/books/current', { title: 'Mistborn', author: 'Sanderson' })
  const ids: string[] = []
  for (let i = 1; i <= chapterCount; i++) {
    ids.push(req('POST', '/api/admin/chapters', { number: i, title: `Capítulo ${i}` }).body.chapter.id)
  }
  logout()
  return ids
}

function memberId(login: string): string {
  loginAdmin()
  const users = req('GET', '/api/admin/users').body.users as Array<{ id: string; login: string }>
  logout()
  return users.find((user) => user.login === login)!.id
}

beforeEach(() => {
  resetMockDb()
})

describe('autenticação e sessão', () => {
  it('rejeita senha de membro incorreta com 401', () => {
    expect(loginMember('joao', 'errada').status).toBe(401)
  })

  it('rejeita login inexistente com 401', () => {
    expect(loginMember('ninguem', '123456').status).toBe(401)
  })

  it('bloqueia membro desativado com 403', () => {
    const id = memberId('joao')
    loginAdmin()
    req('PATCH', `/api/admin/users/${id}`, { deactivated: true })
    logout()
    expect(loginMember('joao').status).toBe(403)
  })

  it('aceita a senha de admin e devolve papel ADMIN', () => {
    const res = loginAdmin()
    expect(res.status).toBe(200)
    expect(res.body.user.role).toBe('ADMIN')
  })

  it('rejeita senha de admin incorreta com 401', () => {
    expect(req('POST', '/api/admin/login', { password: 'nope' }).status).toBe(401)
  })

  it('sem sessão, /me devolve user null e rotas protegidas dão 401', () => {
    expect(req('GET', '/api/auth/me').body.user).toBeNull()
    expect(req('GET', '/api/books/current').status).toBe(401)
    expect(req('GET', '/api/activities').status).toBe(401)
  })

  it('logout encerra a sessão', () => {
    loginMember('joao')
    expect(req('GET', '/api/auth/me').body.user).not.toBeNull()
    logout()
    expect(req('GET', '/api/auth/me').body.user).toBeNull()
  })
})

describe('rate limiting no login (anti força-bruta)', () => {
  it('bloqueia o membro com 429 após 5 tentativas de senha errada', () => {
    for (let i = 0; i < 5; i++) {
      expect(loginMember('joao', 'errada').status).toBe(401)
    }
    expect(loginMember('joao', 'errada').status).toBe(429)
    // Mesmo a senha certa fica bloqueada durante a janela.
    expect(loginMember('joao', '123456').status).toBe(429)
  })

  it('bloqueia o admin com 429 após 5 tentativas', () => {
    for (let i = 0; i < 5; i++) {
      expect(req('POST', '/api/admin/login', { password: 'errada' }).status).toBe(401)
    }
    expect(req('POST', '/api/admin/login', { password: 'errada' }).status).toBe(429)
  })

  it('login correto zera o contador', () => {
    for (let i = 0; i < 4; i++) loginMember('joao', 'errada')
    expect(loginMember('joao', '123456').status).toBe(200)
    // Depois do sucesso, 4 erros de novo não bloqueiam (contador zerado).
    for (let i = 0; i < 4; i++) {
      expect(loginMember('joao', 'errada').status).toBe(401)
    }
  })
})

describe('username normalizado para minúsculo', () => {
  it('login aceita username em maiúsculas/espacos (casa com o minúsculo)', () => {
    expect(loginMember('JOAO', '123456').status).toBe(200)
    expect(loginMember('  Maria  ', '123456').status).toBe(200)
  })

  it('admin cria membro com o login em minúsculo', () => {
    loginAdmin()
    const created = req('POST', '/api/admin/users', { login: 'Pedro', password: '123456' })
    expect(created.status).toBe(201)
    expect(created.body.user.login).toBe('pedro')
  })
})

describe('autorização — rotas de admin exigem papel ADMIN', () => {
  beforeEach(() => {
    seedBook(1)
    loginMember('joao') // membro comum
  })

  it('membro não cria livro atual (403)', () => {
    expect(req('POST', '/api/books/current', { title: 'X' }).status).toBe(403)
  })

  it('membro não cria capítulo (403)', () => {
    expect(req('POST', '/api/admin/chapters', { number: 9, title: 'X' }).status).toBe(403)
  })

  it('membro não lista membros (403)', () => {
    expect(req('GET', '/api/admin/users').status).toBe(403)
  })

  it('membro não finaliza o livro (403)', () => {
    expect(req('POST', '/api/admin/current-book/finish').status).toBe(403)
  })

  it('membro não cria outro membro (403)', () => {
    expect(req('POST', '/api/admin/users', { login: 'x', password: '123456' }).status).toBe(403)
  })
})

describe('anti-spoiler — só quem concluiu o capítulo acessa', () => {
  let chapterId: string
  beforeEach(() => {
    ;[chapterId] = seedBook(1)
    loginMember('joao') // ainda não iniciou/concluiu
  })

  it('não lê comentários de capítulo não concluído (403)', () => {
    expect(req('GET', `/api/chapters/${chapterId}/comments`).status).toBe(403)
  })

  it('não comenta capítulo não concluído (403)', () => {
    expect(req('POST', `/api/chapters/${chapterId}/comments`, { body: 'oi' }).status).toBe(403)
  })

  it('não dá nota a capítulo não concluído (403)', () => {
    expect(req('POST', `/api/chapters/${chapterId}/rating`, { rating: 5 }).status).toBe(403)
  })

  it('não reage a comentário sem ter concluído o capítulo (403)', () => {
    // joão conclui e comenta; maria (sem concluir) tenta reagir.
    req('POST', `/api/chapters/${chapterId}/start`)
    req('POST', `/api/chapters/${chapterId}/finish`, { rating: 5 })
    const commentId = req('POST', `/api/chapters/${chapterId}/comments`, { body: 'oi' }).body
      .comments[0].id
    logout()
    loginMember('maria')
    expect(req('POST', `/api/comments/${commentId}/reaction`, { type: 'GOSTEI' }).status).toBe(403)
  })
})

describe('gates de avaliação e conclusão', () => {
  it('não conclui capítulo sem nota (400)', () => {
    const [chapterId] = seedBook(1)
    loginMember('joao')
    req('POST', `/api/chapters/${chapterId}/start`)
    expect(req('POST', `/api/chapters/${chapterId}/finish`, {}).status).toBe(400)
  })

  it('rejeita nota fora da faixa 1–5 (400)', () => {
    const [chapterId] = seedBook(1)
    loginMember('joao')
    req('POST', `/api/chapters/${chapterId}/start`)
    expect(req('POST', `/api/chapters/${chapterId}/finish`, { rating: 0 }).status).toBe(400)
    expect(req('POST', `/api/chapters/${chapterId}/finish`, { rating: 6 }).status).toBe(400)
  })

  it('não avalia o livro sem concluir todos os capítulos (403)', () => {
    const [c1] = seedBook(2) // dois capítulos; conclui só um
    loginMember('joao')
    req('POST', `/api/chapters/${c1}/start`)
    req('POST', `/api/chapters/${c1}/finish`, { rating: 5 })
    expect(req('POST', '/api/books/review', { rating: 5 }).status).toBe(403)
  })
})

describe('validação de entrada', () => {
  let chapterId: string
  beforeEach(() => {
    ;[chapterId] = seedBook(1)
    loginMember('joao')
    req('POST', `/api/chapters/${chapterId}/start`)
    req('POST', `/api/chapters/${chapterId}/finish`, { rating: 5 })
  })

  it('rejeita comentário vazio (400)', () => {
    expect(req('POST', `/api/chapters/${chapterId}/comments`, { body: '   ' }).status).toBe(400)
  })

  it('rejeita comentário acima de 420 caracteres (400)', () => {
    const long = 'a'.repeat(421)
    expect(req('POST', `/api/chapters/${chapterId}/comments`, { body: long }).status).toBe(400)
  })

  it('troca de senha exige a senha atual correta (401)', () => {
    expect(
      req('POST', '/api/profile/password', { currentPassword: 'errada', newPassword: 'novasenha' })
        .status
    ).toBe(401)
  })

  it('nova senha precisa ter ao menos 6 caracteres (400)', () => {
    expect(
      req('POST', '/api/profile/password', { currentPassword: '123456', newPassword: '123' }).status
    ).toBe(400)
  })

  it('admin não cria membro com senha curta (400)', () => {
    logout()
    loginAdmin()
    expect(req('POST', '/api/admin/users', { login: 'novo', password: '123' }).status).toBe(400)
  })
})

describe('não vazar conteúdo com spoiler', () => {
  it('resenha (texto) só aparece para quem terminou o livro; nota fica pública', () => {
    const [chapterId] = seedBook(1)

    // João termina, nota e resenha o livro.
    loginMember('joao')
    req('POST', `/api/chapters/${chapterId}/start`)
    req('POST', `/api/chapters/${chapterId}/finish`, { rating: 5 })
    req('POST', '/api/books/review', { rating: 5, review: 'texto com spoiler' })

    // João (terminou tudo) enxerga o texto da própria resenha.
    const asJoao = req('GET', '/api/books/current').body.currentBook.reviews[0]
    expect(asJoao.review).toBe('texto com spoiler')
    logout()

    // Maria (não terminou) vê a nota, mas o texto vem oculto.
    loginMember('maria')
    const asMaria = req('GET', '/api/books/current').body.currentBook.reviews[0]
    expect(asMaria.rating).toBe(5)
    expect(asMaria.review).toBeNull()
  })
})
