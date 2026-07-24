import { requireSession } from '../../../_lib/auth.js'
import { assertMethod, readBody, sendJson } from '../../../_lib/http.js'
import { chapterFinishRepository } from '../../../_lib/repositories/chapterFinishRepository.js'
import { finishChapter } from '../../../../src/domain/services/chapterFinish.js'

interface FinishBody {
  finishedAt?: string
  rating?: number
}

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['POST'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session || !session.userId) {
    return
  }

  const body = (req.body ? readBody<FinishBody>(req) : {}) ?? {}

  const result = await finishChapter(chapterFinishRepository(), {
    chapterId: req.query.chapterId as string,
    userId: session.userId,
    rawRating: body.rating,
    rawFinishedAt: body.finishedAt
  })

  if (!result.ok) {
    sendJson(res, result.status, { error: result.error })
    return
  }

  sendJson(res, 200, { progress: result.progress })
}
