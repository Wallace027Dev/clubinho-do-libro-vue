import { requireSession } from '../_lib/auth.js'
import { getDefaultClub } from '../_lib/club.js'
import { alertsPage } from '../_lib/feedActivities.js'
import { assertMethod, sendJson } from '../_lib/http.js'

/**
 * Sininho (modal de alertas): progresso e marcos do clube (canal `alert`) de
 * outros usuários. Paginado por cursor, como o feed.
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

  const { activities, hasMore } = await alertsPage(club.id, session.userId ?? null, cursor, limit)

  sendJson(res, 200, { alerts: activities, hasMore })
}
