import { requireSession } from '../../../_lib/auth.js'
import { getFinishedChapterForUser } from '../../../_lib/chapterAccess.js'
import { assertMethod, readBody, sendJson } from '../../../_lib/http.js'
import { prisma } from '../../../_lib/prisma.js'

interface RatingBody {
  rating?: number
}

/**
 * Nota do capítulo (1,0 a 5,0, fracionada): uma por membro por capítulo,
 * com upsert. Só quem concluiu o capítulo pode notar, e avaliar o livro
 * exige todos os capítulos notados (ver books/review.ts).
 */
export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['POST'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session || !session.userId) {
    return
  }

  const chapterId = req.query.chapterId as string
  const access = await getFinishedChapterForUser(chapterId, session.userId)

  if (!access) {
    sendJson(res, 403, { error: 'Conclua o capítulo antes de dar a sua nota.' })
    return
  }

  const body = readBody<RatingBody>(req)
  const rating = Math.round(Number(body.rating) * 10) / 10

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    sendJson(res, 400, { error: 'A nota deve ser um número entre 1 e 5.' })
    return
  }

  const saved = await prisma.chapterRating.upsert({
    where: {
      chapterId_userId: {
        chapterId: access.chapter.id,
        userId: session.userId
      }
    },
    update: { rating },
    create: {
      chapterId: access.chapter.id,
      userId: session.userId,
      rating
    }
  })

  sendJson(res, 200, { rating: saved })
}
