import { requireSession } from '../../../_lib/auth.js'
import { getDefaultClub } from '../../../_lib/club.js'
import { assertMethod, sendJson } from '../../../_lib/http.js'
import { prisma } from '../../../_lib/prisma.js'

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, ['POST'])) {
    return
  }

  const session = await requireSession(req, res)

  if (!session || !session.userId) {
    return
  }

  const chapterId = req.query.chapterId as string
  const club = await getDefaultClub()
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      clubBook: {
        include: { book: true }
      }
    }
  })

  if (!chapter || chapter.clubBook.clubId !== club.id || chapter.clubBook.status !== 'CURRENT') {
    sendJson(res, 404, { error: 'Capítulo atual não encontrado.' })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  const existingProgress = await prisma.chapterProgress.findUnique({
    where: {
      chapterId_userId: {
        chapterId: chapter.id,
        userId: session.userId
      }
    }
  })
  const progress =
    existingProgress ??
    (await prisma.chapterProgress.create({
      data: {
        chapterId: chapter.id,
        userId: session.userId,
        status: 'STARTED'
      }
    }))

  if (!existingProgress) {
    await prisma.activity.create({
      data: {
        clubId: club.id,
        actorId: session.userId,
        type: 'CHAPTER_STARTED',
        message: `${user?.displayName || user?.login || 'Um membro'} iniciou o capítulo ${chapter.number}.`,
        metadata: { chapterId: chapter.id, chapterNumber: chapter.number }
      }
    })
  }

  sendJson(res, 200, { progress })
}
