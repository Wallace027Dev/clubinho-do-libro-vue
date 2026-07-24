import { requireSession } from '../../../_lib/auth.js'
import { assertMethod, readBody, sendJson } from '../../../_lib/http.js'
import { commentReactionRepository } from '../../../_lib/repositories/commentReactionRepository.js'
import { reactToComment } from '../../../../src/domain/services/commentReaction.js'

interface ReactionBody {
  type?: string
}

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['POST'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session || !session.userId) {
    return
  }

  const body = readBody<ReactionBody>(req)

  const result = await reactToComment(commentReactionRepository(), {
    commentId: req.query.commentId as string,
    userId: session.userId,
    rawType: body.type
  })

  if (!result.ok) {
    sendJson(res, result.status, { error: result.error })
    return
  }

  sendJson(res, 200, { reaction: result.reaction })
}
