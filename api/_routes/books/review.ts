import { requireSession } from '../../_lib/auth.js'
import { assertMethod, readBody, sendJson } from '../../_lib/http.js'
import { bookReviewRepository } from '../../_lib/repositories/bookReviewRepository.js'
import { submitBookReview } from '../../../src/domain/services/bookReview.js'

interface ReviewBody {
  rating?: number
  review?: string
}

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['POST'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session || !session.userId) {
    return
  }

  const body = readBody<ReviewBody>(req)

  const result = await submitBookReview(bookReviewRepository(), {
    userId: session.userId,
    rawRating: body.rating,
    rawReview: body.review
  })

  if (!result.ok) {
    sendJson(res, result.status, { error: result.error })
    return
  }

  sendJson(res, 200, { review: result.review })
}
