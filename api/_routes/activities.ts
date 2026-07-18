import { requireSession } from '../_lib/auth.js'
import { getDefaultClub } from '../_lib/club.js'
import { assertMethod, sendJson } from '../_lib/http.js'
import { prisma } from '../_lib/prisma.js'

/**
 * Feed paginado do clube (scroll infinito). Ordena por data desc com o id
 * como desempate estável, e usa paginação por cursor (id da última atividade
 * já carregada). O primeiro lote vem em GET /api/books/current; as próximas
 * páginas vêm por aqui.
 */
const DEFAULT_LIMIT = 30
const MAX_LIMIT = 50

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['GET'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session) {
    return
  }

  const club = await getDefaultClub()
  const cursor = typeof req.query.cursor === 'string' && req.query.cursor ? req.query.cursor : null
  const rawLimit = Number(req.query.limit)
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT

  const activities = await prisma.activity.findMany({
    where: { clubId: club.id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      actor: {
        select: { id: true, login: true, displayName: true, avatarUrl: true }
      }
    }
  })

  sendJson(res, 200, {
    activities: activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      message: activity.message,
      createdAt: activity.createdAt,
      actor: activity.actor,
      metadata: activity.metadata
    })),
    // Heurística padrão de cursor: veio o lote cheio, provavelmente há mais.
    hasMore: activities.length === limit
  })
}
