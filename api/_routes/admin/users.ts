import { requireAdmin } from '../../_lib/auth.js'
import { getDefaultClub } from '../../_lib/club.js'
import { assertMethod, readBody, sendJson } from '../../_lib/http.js'
import { hashPassword } from '../../_lib/passwords.js'
import { prisma } from '../../_lib/prisma.js'

interface CreateUserBody {
  login?: string
  password?: string
  displayName?: string
}

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['GET', 'POST'])) {
    return
  }

  const session = await requireAdmin(req, res)

  if (!session) {
    return
  }

  if (req.method === 'GET') {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        login: true,
        role: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true
      }
    })

    sendJson(res, 200, { users })
    return
  }

  const body = readBody<CreateUserBody>(req)
  const login = body.login?.trim()
  const password = body.password ?? ''

  if (!login || password.length < 6) {
    sendJson(res, 400, { error: 'Informe login e senha com pelo menos 6 caracteres.' })
    return
  }

  const club = await getDefaultClub()
  const user = await prisma.user.create({
    data: {
      login,
      passwordHash: await hashPassword(password),
      displayName: body.displayName?.trim() || null
    },
    select: {
      id: true,
      login: true,
      role: true,
      displayName: true,
      avatarUrl: true,
      createdAt: true
    }
  })

  await prisma.activity.create({
    data: {
      clubId: club.id,
      type: 'MEMBER_CREATED',
      message: `${user.displayName || user.login} entrou no clube.`,
      metadata: { userId: user.id }
    }
  })

  sendJson(res, 201, { user })
}
