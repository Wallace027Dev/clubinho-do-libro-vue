import { requireSession } from '../../_lib/auth.js'
import { assertMethod, readBody, sendJson } from '../../_lib/http.js'
import { hashPassword, verifyPassword } from '../../_lib/passwords.js'
import { prisma } from '../../_lib/prisma.js'

interface PasswordBody {
  currentPassword?: string
  newPassword?: string
}

/** Troca de senha pelo proprio membro (fase 8): exige a senha atual. */
export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['POST'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session || !session.userId) {
    return
  }

  const body = readBody<PasswordBody>(req)
  const currentPassword = body.currentPassword ?? ''
  const newPassword = body.newPassword ?? ''

  if (newPassword.length < 6) {
    sendJson(res, 400, { error: 'A nova senha precisa ter pelo menos 6 caracteres.' })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })

  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    sendJson(res, 401, { error: 'Senha atual incorreta.' })
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) }
  })

  sendJson(res, 200, { ok: true })
}
