import { createSession, setSessionCookie } from '../../_lib/auth.js'
import { assertMethod, readBody, sendJson } from '../../_lib/http.js'
import { verifyPassword } from '../../_lib/passwords.js'
import { prisma } from '../../_lib/prisma.js'

interface LoginBody {
  login?: string
  password?: string
}

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['POST'])) {
    return
  }

  const body = readBody<LoginBody>(req)
  const login = body.login?.trim()
  const password = body.password ?? ''

  if (!login || !password) {
    sendJson(res, 400, { error: 'Login e senha sao obrigatorios.' })
    return
  }

  const user = await prisma.user.findUnique({ where: { login } })

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    sendJson(res, 401, { error: 'Credenciais invalidas.' })
    return
  }

  if (user.deactivatedAt) {
    sendJson(res, 403, { error: 'Conta desativada. Fale com o administrador do clube.' })
    return
  }

  const token = await createSession({ userId: user.id, role: user.role === 'ADMIN' ? 'ADMIN' : 'MEMBER' })
  setSessionCookie(res, token)

  sendJson(res, 200, {
    user: {
      id: user.id,
      login: user.login,
      role: user.role,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl
    }
  })
}
