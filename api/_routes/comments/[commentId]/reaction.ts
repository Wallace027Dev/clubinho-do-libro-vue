import { ChapterCommentReactionType } from '@prisma/client'
import { requireSession } from '../../../_lib/auth.js'
import { userCanReadComment } from '../../../_lib/chapterAccess.js'
import { assertMethod, readBody, sendJson } from '../../../_lib/http.js'
import { prisma } from '../../../_lib/prisma.js'

interface ReactionBody {
  type?: ChapterCommentReactionType
}

const allowedReactions = new Set(Object.values(ChapterCommentReactionType))

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['POST'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session || !session.userId) {
    return
  }

  const commentId = req.query.commentId as string
  const comment = await userCanReadComment(commentId, session.userId)

  if (!comment) {
    sendJson(res, 403, { error: 'Reação liberada apenas para quem concluiu o capítulo.' })
    return
  }

  const body = readBody<ReactionBody>(req)

  if (!body.type || !allowedReactions.has(body.type)) {
    sendJson(res, 400, { error: 'Reação inválida.' })
    return
  }

  const reaction = await prisma.chapterCommentReaction.upsert({
    where: {
      commentId_userId: {
        commentId,
        userId: session.userId
      }
    },
    update: { type: body.type },
    create: {
      commentId,
      userId: session.userId,
      type: body.type
    }
  })

  sendJson(res, 200, { reaction })
}
