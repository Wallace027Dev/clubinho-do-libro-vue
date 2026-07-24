import { requireSession } from '../../_lib/auth.js'
import { assertMethod, readBody, sendJson } from '../../_lib/http.js'
import { prisma } from '../../_lib/prisma.js'

interface SubscribeBody {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
}

/** Registra (ou atualiza) a assinatura de push do membro logado. */
export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['POST'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session || !session.userId) {
    return
  }

  const body = readBody<SubscribeBody>(req)

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    sendJson(res, 400, { error: 'Assinatura de push inválida.' })
    return
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    update: { userId: session.userId, p256dh: body.keys.p256dh, auth: body.keys.auth },
    create: {
      userId: session.userId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth
    }
  })

  sendJson(res, 201, { ok: true })
}
