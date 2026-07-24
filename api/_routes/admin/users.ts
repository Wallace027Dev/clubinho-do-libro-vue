import { requireAdmin } from '../../_lib/auth.js'
import { assertMethod, readBody, sendJson } from '../../_lib/http.js'
import { prisma } from '../../_lib/prisma.js'
import { adminMembersRepository } from '../../_lib/repositories/adminMembersRepository.js'
import { createMember } from '../../../src/domain/services/adminMembers.js'

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
        deactivatedAt: true,
        createdAt: true
      }
    })

    sendJson(res, 200, { users })
    return
  }

  const body = readBody<CreateUserBody>(req)
  const result = await createMember(adminMembersRepository(), {
    rawLogin: body.login,
    rawPassword: body.password,
    rawDisplayName: body.displayName
  })

  if (!result.ok) {
    sendJson(res, result.status, { error: result.error })
    return
  }

  sendJson(res, 201, { user: result.user })
}
