import { requireSession } from '../../_lib/auth.js'
import { assertMethod, readBody, sendJson } from '../../_lib/http.js'
import { prisma } from '../../_lib/prisma.js'

interface UnsubscribeBody {
  endpoint?: string
}

/** Remove a assinatura de push do membro logado (por endpoint). */
export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['POST'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session || !session.userId) {
    return
  }

  const body = readBody<UnsubscribeBody>(req)

  if (body.endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: body.endpoint, userId: session.userId }
    })
  }

  sendJson(res, 200, { ok: true })
}
