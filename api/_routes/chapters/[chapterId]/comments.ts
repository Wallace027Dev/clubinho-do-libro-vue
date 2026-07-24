import { requireSession } from '../../../_lib/auth.js'
import { assertMethod, readBody, sendJson } from '../../../_lib/http.js'
import { chapterCommentRepository } from '../../../_lib/repositories/chapterCommentRepository.js'
import {
  listChapterComments,
  submitChapterComment
} from '../../../../src/domain/services/chapterComment.js'

interface CommentBody {
  body?: string
}

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['GET', 'POST'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session || !session.userId) {
    return
  }

  const repo = chapterCommentRepository()
  const chapterId = req.query.chapterId as string

  if (req.method === 'GET') {
    const result = await listChapterComments(repo, { chapterId, userId: session.userId })

    if (!result.ok) {
      sendJson(res, result.status, { error: result.error })
      return
    }

    sendJson(res, 200, { comments: result.comments })
    return
  }

  const body = readBody<CommentBody>(req)
  const result = await submitChapterComment(repo, {
    chapterId,
    userId: session.userId,
    rawBody: body.body
  })

  if (!result.ok) {
    sendJson(res, result.status, { error: result.error })
    return
  }

  sendJson(res, 201, { comments: result.comments })
}
