import { requireSession } from '../../../_lib/auth.js'
import { assertMethod, readBody, sendJson } from '../../../_lib/http.js'
import { chapterRatingRepository } from '../../../_lib/repositories/chapterRatingRepository.js'
import { rateChapter } from '../../../../src/domain/services/chapterRating.js'

interface RatingBody {
  rating?: number
}

/**
 * Nota do capítulo (1,0 a 5,0, fracionada): uma por membro por capítulo,
 * com upsert. Só quem concluiu o capítulo pode notar, e avaliar o livro
 * exige todos os capítulos notados (ver books/review.ts). Regras no domínio
 * (`src/domain/services/chapterRating.ts`).
 */
export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['POST'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session || !session.userId) {
    return
  }

  const body = readBody<RatingBody>(req)

  const result = await rateChapter(chapterRatingRepository(), {
    chapterId: req.query.chapterId as string,
    userId: session.userId,
    rawRating: body.rating
  })

  if (!result.ok) {
    sendJson(res, result.status, { error: result.error })
    return
  }

  sendJson(res, 200, { rating: result.rating })
}
