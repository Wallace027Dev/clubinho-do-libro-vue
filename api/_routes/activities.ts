import { requireSession } from '../_lib/auth.js'
import { getDefaultClub } from '../_lib/club.js'
import { commentFeedPage } from '../_lib/feedActivities.js'
import { assertMethod, sendJson } from '../_lib/http.js'

/**
 * Feed (descoberta) = comentários de outras pessoas nos capítulos do livro
 * atual. Anti-spoiler: quem não concluiu o capítulo recebe o card travado (sem
 * o texto). Paginado por cursor, com busca (`q`) e filtro por capítulo
 * (`chapterId`) opcionais. O primeiro lote vem em GET /api/books/current; as
 * próximas páginas por aqui.
 */
const DEFAULT_LIMIT = 30
const MAX_LIMIT = 50

function queryString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['GET'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session) {
    return
  }

  const club = await getDefaultClub()
  const cursor = queryString(req.query.cursor)
  const q = queryString(req.query.q)
  const chapterId = queryString(req.query.chapterId)
  const rawLimit = Number(req.query.limit)
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT

  const { activities, hasMore } = await commentFeedPage(
    club.id,
    session.userId ?? null,
    cursor,
    limit,
    { q, chapterId }
  )

  sendJson(res, 200, { activities, hasMore })
}
