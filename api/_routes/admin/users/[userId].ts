import { requireAdmin } from '../../../_lib/auth.js'
import { assertMethod, readBody, sendJson } from '../../../_lib/http.js'
import { hashPassword } from '../../../_lib/passwords.js'
import { prisma } from '../../../_lib/prisma.js'

interface UpdateUserBody {
  deactivated?: boolean
  newPassword?: string
}

/**
 * Gestao de um membro pelo admin (fase 8, item 8.2):
 * - deactivated true/false: desativa/reativa (soft delete — o historico
 *   de comentarios, notas e atividades do clube e preservado).
 * - newPassword: redefine a senha provisoria de quem esqueceu.
 */
export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['PATCH'])) {
    return
  }

  const session = await requireAdmin(req, res)

  if (!session) {
    return
  }

  const userId = req.query.userId as string
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    sendJson(res, 404, { error: 'Membro nao encontrado.' })
    return
  }

  const body = readBody<UpdateUserBody>(req)
  const data: { deactivatedAt?: Date | null; passwordHash?: string } = {}

  if (typeof body.deactivated === 'boolean') {
    data.deactivatedAt = body.deactivated ? new Date() : null
  }

  if (body.newPassword !== undefined) {
    if (body.newPassword.length < 6) {
      sendJson(res, 400, { error: 'A nova senha precisa ter pelo menos 6 caracteres.' })
      return
    }

    data.passwordHash = await hashPassword(body.newPassword)
  }

  if (!Object.keys(data).length) {
    sendJson(res, 400, { error: 'Nada para atualizar.' })
    return
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
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

  sendJson(res, 200, { user: updated })
}
