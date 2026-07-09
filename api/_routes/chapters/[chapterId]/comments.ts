import { requireSession } from '../../../_lib/auth.js'
import { getFinishedChapterForUser } from '../../../_lib/chapterAccess.js'
import { assertMethod, readBody, sendJson } from '../../../_lib/http.js'
import { prisma } from '../../../_lib/prisma.js'

interface CommentBody {
  body?: string
}

const MAX_COMMENT_LENGTH = 420

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['GET', 'POST'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session || !session.userId) {
    return
  }

  const chapterId = req.query.chapterId as string
  const access = await getFinishedChapterForUser(chapterId, session.userId)

  if (!access) {
    sendJson(res, 403, { error: 'Comentarios liberam apenas depois de concluir o capitulo.' })
    return
  }

  if (req.method === 'GET') {
    const comments = await listComments(chapterId, session.userId)
    sendJson(res, 200, { comments })
    return
  }

  const body = readBody<CommentBody>(req)
  const commentBody = body.body?.trim()

  if (!commentBody) {
    sendJson(res, 400, { error: 'Comentario vazio.' })
    return
  }

  if (commentBody.length > MAX_COMMENT_LENGTH) {
    sendJson(res, 400, { error: `Comentario deve ter ate ${MAX_COMMENT_LENGTH} caracteres.` })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  await prisma.$transaction(async (tx) => {
    await tx.chapterComment.upsert({
      where: {
        chapterId_userId: {
          chapterId,
          userId: session.userId as string
        }
      },
      update: { body: commentBody },
      create: {
        chapterId,
        userId: session.userId as string,
        body: commentBody
      }
    })

    await tx.activity.create({
      data: {
        clubId: access.club.id,
        actorId: session.userId,
        type: 'CHAPTER_COMMENTED',
        message: `${user?.displayName || user?.login || 'Um membro'} comentou o capitulo ${access.chapter.number}.`,
        metadata: { chapterId, chapterNumber: access.chapter.number }
      }
    })
  })

  const comments = await listComments(chapterId, session.userId)
  sendJson(res, 201, { comments })
}

async function listComments(chapterId: string, viewerId: string) {
  const comments = await prisma.chapterComment.findMany({
    where: { chapterId },
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: { id: true, login: true, displayName: true, avatarUrl: true }
      },
      reactions: {
        orderBy: { updatedAt: 'desc' }
      }
    }
  })

  return comments.map((comment) => ({
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    user: comment.user,
    myReaction: comment.reactions.find((reaction) => reaction.userId === viewerId)?.type ?? null,
    reactions: countReactions(comment.reactions),
    reactionTotal: comment.reactions.length,
    recentReactions: comment.reactions.slice(0, 6).map((reaction) => ({
      type: reaction.type,
      updatedAt: reaction.updatedAt
    }))
  }))
}

function countReactions(reactions: Array<{ type: string }>) {
  return reactions.reduce<Record<string, number>>((acc, reaction) => {
    acc[reaction.type] = (acc[reaction.type] ?? 0) + 1
    return acc
  }, {})
}
