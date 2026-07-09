import { readSession } from '../../_lib/auth.js'
import { assertMethod, sendJson } from '../../_lib/http.js'
import { prisma } from '../../_lib/prisma.js'

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['GET'])) {
    return
  }

  const session = await readSession(req)

  if (!session) {
    sendJson(res, 200, { user: null })
    return
  }

  if (session.role === 'ADMIN' && !session.userId) {
    sendJson(res, 200, { user: { id: null, login: 'admin', role: 'ADMIN', displayName: 'Admin' } })
    return
  }

  const user = session.userId
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, login: true, role: true, displayName: true, avatarUrl: true }
      })
    : null

  sendJson(res, 200, { user })
}
